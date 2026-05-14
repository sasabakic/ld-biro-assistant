/// <reference types="@cloudflare/workers-types" />

/**
 * POST /api/voice
 *
 * Body: multipart/form-data with:
 *   - `audio` (file, required): webm/ogg/mp3/wav
 *   - `clients_json` (string, optional): JSON array of `{ id, name }` for
 *     closed-set client matching. When present, Gemini tries to pick one
 *     of these by ID rather than emitting free-text.
 *
 * Query:
 *   - `?transcribe_only=1` — skip Gemini, return only the raw transcript
 *     (used by the test-mic playground)
 *
 * Pipeline: audio → Groq Whisper-Large-V3 → Gemini Flash-Lite → parsed ticket.
 * Audio is processed in-memory and discarded — never stored.
 *
 * Returns: { transcript, parsed } where parsed = ParsedTicket.
 *   The FE shows a confirmation card and inserts the ticket directly via
 *   supabase-js. The worker stays minimal — no auth forwarding, no DB writes.
 *
 * Prompt design (for cost & cache efficiency):
 *   - The systemInstruction is kept stable across calls — only the clients
 *     list changes (rarely). This maximizes implicit prefix caching.
 *   - Per-call dynamic state (current Belgrade time = the anchor for
 *     relative date math, plus the transcript itself) lives in the user
 *     message. That's where it belongs and it doesn't bust the cache.
 *
 * Env (Cloudflare Pages secrets):
 *   GROQ_API_KEY      — https://console.groq.com
 *   GEMINI_API_KEY    — https://aistudio.google.com
 */

interface Env {
  GROQ_API_KEY: string
  GEMINI_API_KEY: string
}

type KnownClient = { id: string; name: string }

type ParsedTicket = {
  client_name: string
  matched_client_id: string | null
  type: 'pitanje' | 'zaduzenje' | 'javicu_se'
  title: string
  rok_iso: string | null
  notes: string | null
}

const BELGRADE_TZ = 'Europe/Belgrade'
const MAX_CLIENTS = 500 // sanity cap on prompt size

function nowBelgradeLabel(): string {
  return new Intl.DateTimeFormat('sr-Latn', {
    timeZone: BELGRADE_TZ,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date())
}

function todayInBelgradeIso(): string {
  const now = new Date()
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: BELGRADE_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
  const parts = fmt.formatToParts(now)
  const get = (t: string) => parts.find((p) => p.type === t)!.value
  const date = `${get('year')}-${get('month')}-${get('day')}`
  const time = `${get('hour')}:${get('minute')}:${get('second')}`
  const local = Date.parse(`${date}T${time}Z`)
  const offsetMin = Math.round((local - now.getTime()) / 60000)
  const sign = offsetMin >= 0 ? '+' : '-'
  const abs = Math.abs(offsetMin)
  const oh = String(Math.floor(abs / 60)).padStart(2, '0')
  const om = String(abs % 60).padStart(2, '0')
  return `${date}T${time}${sign}${oh}:${om}`
}

/**
 * Stable across calls (cache-friendly). Only changes when the clients list
 * itself changes (rare). Sorted alphabetically by the FE to keep ordering
 * deterministic.
 */
function systemPrompt(knownClients: KnownClient[]): string {
  const clientsBlock =
    knownClients.length > 0
      ? `Poznati klijenti u sistemu (ID — naziv):\n${knownClients
          .map((c) => `- ${c.id} — ${c.name}`)
          .join('\n')}`
      : 'Nema poznatih klijenata u sistemu.'

  return `Ti si asistent koji pretvara kratke glasovne beleške računovođe u strukturisane tikete.

${clientsBlock}

Ulaz je transkript glasovne poruke na srpskom (latinica). Whisper ponekad pogrešno čuje srpske dijakritike (č, ć, š, đ, ž) — budi tolerantan i fokusiraj se na značenje, ne na doslovan tekst.

Vrati STROGO validan JSON sa poljima:

- client_name (string): ime klijenta kako ga je korisnik izgovorio (nominativ ako je moguće). Za prikaz na ekranu.

- matched_client_id (string ili null): ID klijenta iz liste iznad ako si SIGURAN da se to ime poklapa. Pravila:
    * Tolerantan budi prema padežima: "Markoviću sam rekla" → traži "Marković".
    * Skraćeni oblici prolaze: "Petrović" → "Petrović Konsalting d.o.o." (ako je jedini Petrović).
    * Manje Whisper greške ignoriši: "Markovic" → "Marković".
    * Ako više klijenata može biti, ili nema dovoljno dobrog poklapanja → null.
    * Nikad ne izmišljaj ID koji nije u listi.

- type ('pitanje' | 'zaduzenje' | 'javicu_se'):
    * 'javicu_se' — računovođa će se javiti klijentu kasnije (poziv u budućnosti)
    * 'zaduzenje' — novi posao sa rokom ili konkretnim deliverableom
    * 'pitanje' — brzo pitanje koje je već odgovoreno tokom poziva
    Ako nije jasno, izaberi 'pitanje' kao default.

- title (string, najviše 80 karaktera): kratak naslov tiketa. Ne ponavljaj ime klijenta u naslovu jer je već u client_name.

- rok_iso (string ili null): ISO 8601 timestamp u Europe/Belgrade timezone, sa eksplicitnim offsetom (+02:00 leti / +01:00 zimi). Koristi "Anchor" iz user message-a kao trenutno vreme za izračunavanje relativnih datuma. Primeri:
    "danas do 16h" → isti datum kao anchor, T16:00:00, sa offsetom anchora
    "sutra ujutru" → anchor + 1 dan, T09:00:00
    "15. jun" → 2026-06-15T00:00:00 sa offsetom anchora
    Ako rok nije pomenut, null.

- notes (string ili null): dodatni kontekst koji ne staje u title. Ako nije bitno, null.

Vrati SAMO JSON, bez objašnjenja, bez code-fence-a, bez ničega okolo.`
}

/**
 * Per-call dynamic content. Goes in user message (not systemInstruction)
 * so it doesn't bust the prefix cache.
 */
function userMessage(transcript: string): string {
  return `Anchor: ${todayInBelgradeIso()} (${nowBelgradeLabel()})

Transkript:
${transcript}`
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const transcribeOnly =
      new URL(request.url).searchParams.get('transcribe_only') === '1'

    if (!env.GROQ_API_KEY) {
      return jsonError('Server nije konfigurisan: nedostaje GROQ_API_KEY.', 500)
    }
    if (!transcribeOnly && !env.GEMINI_API_KEY) {
      return jsonError('Server nije konfigurisan: nedostaje GEMINI_API_KEY.', 500)
    }

    const form = await request.formData()
    const audio = form.get('audio')
    if (!(audio instanceof File)) {
      return jsonError('Nedostaje audio fajl.', 400)
    }

    const transcript = await transcribeWithGroq(audio, env.GROQ_API_KEY)
    if (!transcript) {
      return jsonError('Transkripcija nije uspela.', 502)
    }
    if (transcript.length < 2) {
      return jsonError('Snimak je prekratak. Probaj ponovo.', 400)
    }

    if (transcribeOnly) {
      return jsonOk({ transcript })
    }

    const clientsJson = form.get('clients_json')
    const knownClients = parseClientsJson(clientsJson)

    const parsed = await parseWithGemini(
      transcript,
      knownClients,
      env.GEMINI_API_KEY,
    )
    if (!parsed) {
      return jsonError('Parsiranje nije uspelo.', 502)
    }

    // Defense in depth: reject any matched_client_id that wasn't in the list
    // we sent. Prevents Gemini from inventing IDs.
    if (
      parsed.matched_client_id &&
      !knownClients.some((c) => c.id === parsed.matched_client_id)
    ) {
      parsed.matched_client_id = null
    }

    return jsonOk({ transcript, parsed })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Nepoznata greška'
    return jsonError(message, 500)
  }
}

function parseClientsJson(raw: FormDataEntryValue | null): KnownClient[] {
  if (typeof raw !== 'string' || !raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter(
        (c): c is KnownClient =>
          c &&
          typeof c.id === 'string' &&
          typeof c.name === 'string' &&
          c.id.length > 0 &&
          c.name.length > 0,
      )
      .slice(0, MAX_CLIENTS)
  } catch {
    return []
  }
}

async function transcribeWithGroq(
  audio: File,
  apiKey: string,
): Promise<string | null> {
  const form = new FormData()
  form.append('file', audio, audio.name || 'voice.webm')
  form.append('model', 'whisper-large-v3')
  form.append('language', 'sr')
  form.append('response_format', 'json')

  const res = await fetch(
    'https://api.groq.com/openai/v1/audio/transcriptions',
    {
      method: 'POST',
      headers: { authorization: `Bearer ${apiKey}` },
      body: form,
    },
  )
  if (!res.ok) return null
  const data = (await res.json()) as { text?: string }
  return data.text?.trim() ?? null
}

async function parseWithGemini(
  transcript: string,
  knownClients: KnownClient[],
  apiKey: string,
): Promise<ParsedTicket | null> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`

  const body = {
    systemInstruction: { parts: [{ text: systemPrompt(knownClients) }] },
    contents: [
      { role: 'user', parts: [{ text: userMessage(transcript) }] },
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          client_name: { type: 'STRING' },
          matched_client_id: { type: 'STRING', nullable: true },
          type: {
            type: 'STRING',
            enum: ['pitanje', 'zaduzenje', 'javicu_se'],
          },
          title: { type: 'STRING' },
          rok_iso: { type: 'STRING', nullable: true },
          notes: { type: 'STRING', nullable: true },
        },
        required: ['client_name', 'type', 'title'],
      },
      temperature: 0.1,
    },
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) return null
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[]
  }
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) return null
  try {
    const parsed = JSON.parse(text) as ParsedTicket
    if (typeof parsed.matched_client_id === 'undefined') {
      parsed.matched_client_id = null
    }
    return parsed
  } catch {
    return null
  }
}

function jsonOk(body: unknown) {
  return new Response(JSON.stringify(body), {
    headers: { 'content-type': 'application/json' },
  })
}

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}
