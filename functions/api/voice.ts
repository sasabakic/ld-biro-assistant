/// <reference types="@cloudflare/workers-types" />

/**
 * POST /api/voice
 *
 * Body: multipart/form-data with:
 *   - `audio` (file, required): webm/ogg/mp3/wav
 *   - `clients_json` (string, optional): JSON array of `{ id, name }` for
 *     closed-set client matching. When present, Gemini tries to pick one
 *     of these by ID rather than emitting free-text. Significantly more
 *     robust against Serbian morphology and Whisper mishearings.
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

function systemPrompt(knownClients: KnownClient[]): string {
  const clientsBlock =
    knownClients.length > 0
      ? `Poznati klijenti u sistemu (ID — naziv):\n${knownClients
          .map((c) => `- ${c.id} — ${c.name}`)
          .join('\n')}`
      : 'Nema poznatih klijenata u sistemu.'

  return `Ti si asistent koji pretvara kratke glasovne beleške računovođe u strukturisane tikete.

Trenutno vreme: ${nowBelgradeLabel()} (Europe/Belgrade)
Anchor ISO (koristi isti timezone offset u izlazu): ${todayInBelgradeIso()}

${clientsBlock}

Ulaz je kratak (1-3 rečenice) tekst na srpskom (latinica) koji opisuje šta je klijent tražio ili šta računovođa planira posle poziva.

Vrati STROGO validan JSON sa poljima:

- client_name (string): ime klijenta kako ga je korisnik izgovorio (nominativ ako možeš). Ovo je za prikaz na ekranu — ne mora biti tačan naziv iz sistema.

- matched_client_id (string ili null): ID klijenta iz liste iznad ako si SIGURAN da se to ime poklapa. Tolerantan budi prema padežima i deklinaciji ("Markoviću" se odnosi na "Marković"), kao i prema kraćim oblicima ("Petrović" se odnosi na "Petrović Konsalting d.o.o." ako je to jedini Petrović u listi). Ako je više klijenata sa sličnim imenom i nije jasno koji, ili ako uopšte nema dovoljno dobrog poklapanja, vrati null.

- type ('pitanje' | 'zaduzenje' | 'javicu_se'):
    * 'javicu_se' ako računovođa kaže da će se nekome javiti kasnije
    * 'zaduzenje' ako je novi posao sa rokom ili deliverableom
    * 'pitanje' ako je brzo pitanje koje je već odgovoreno

- title (string, do 80 karaktera): kratak naslov tiketa.

- rok_iso (string ili null): ISO 8601 timestamp u Europe/Belgrade timezone (uključi offset, npr. +02:00 leti).
    Pretvori relativne fraze u apsolutni timestamp koristeći anchor iznad.
    Primeri: "danas do 16h" → istog dana u 16:00:00 sa offsetom; "sutra ujutru" → sutra u 09:00:00; "15. jun" → 2026-06-15T00:00:00 sa offsetom.
    Ako rok nije pomenut, vrati null.

- notes (string ili null): dodatni kontekst koji ne staje u title.

Vrati SAMO JSON, bez teksta okolo, bez code-fence-a.`
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

    // Parse optional clients list — used by Gemini for closed-set matching.
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

    // Defense in depth: only return matched_client_id if it's actually in the
    // list we sent. Prevents Gemini from inventing IDs.
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
    const valid = parsed
      .filter(
        (c): c is KnownClient =>
          c &&
          typeof c.id === 'string' &&
          typeof c.name === 'string' &&
          c.id.length > 0 &&
          c.name.length > 0,
      )
      .slice(0, MAX_CLIENTS)
    return valid
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
    contents: [{ role: 'user', parts: [{ text: transcript }] }],
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
    // Older payloads might not include matched_client_id — normalize to null.
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
