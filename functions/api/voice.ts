/// <reference types="@cloudflare/workers-types" />

/**
 * POST /api/voice
 *
 * Body: multipart/form-data with `audio` file (webm/ogg/mp3/wav).
 * Pipeline: audio → Groq Whisper-Large-V3 → Gemini Flash-Lite → parsed ticket.
 * Audio is processed in-memory and discarded — never stored.
 *
 * Env (Cloudflare Pages secrets):
 *   GROQ_API_KEY      — https://console.groq.com
 *   GEMINI_API_KEY    — https://aistudio.google.com
 */

interface Env {
  GROQ_API_KEY: string
  GEMINI_API_KEY: string
}

type ParsedTicket = {
  client_name: string
  type: 'pitanje' | 'zaduzenje' | 'javicu_se'
  title: string
  rok: string | null
  notes: string | null
}

const SYSTEM_PROMPT = `Ti si asistent koji pretvara kratke glasovne beleške računovođe u strukturisane tikete.
Ulazni tekst je kratak (1-3 rečenice) opis na srpskom (latinica) onoga što je klijent tražio ili rekao na pozivu.

Vrati STROGO validan JSON sa sledećim poljima:
- client_name (string): ime klijenta/firme. Sačuvaj nominativ ako možeš.
- type ('pitanje' | 'zaduzenje' | 'javicu_se'):
    - 'javicu_se' ako računovođa kaže da će se nekome javiti kasnije (poziv kasnije)
    - 'zaduzenje' ako je novi posao sa rokom ili deliverableom
    - 'pitanje' ako je brzo pitanje koje je već odgovoreno
- title (string): kratak opis (do 80 karaktera).
- rok (string ili null): rok ako je pomenut ("danas do 16h", "15. juni", "sutra ujutru"...). Inače null.
- notes (string ili null): dodatni kontekst koji nije stao u title. Inače null.

Vrati SAMO JSON, bez teksta okolo, bez code fence-a.`

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    if (!env.GROQ_API_KEY || !env.GEMINI_API_KEY) {
      return jsonError('Server nije konfigurisan: nedostaju API ključevi.', 500)
    }

    const form = await request.formData()
    const audio = form.get('audio')
    if (!(audio instanceof File)) {
      return jsonError('Nedostaje audio fajl.', 400)
    }

    // 1. Transcribe via Groq Whisper-Large-V3
    const transcript = await transcribeWithGroq(audio, env.GROQ_API_KEY)
    if (!transcript) {
      return jsonError('Transkripcija nije uspela.', 502)
    }

    // 2. Parse via Gemini Flash-Lite
    const parsed = await parseWithGemini(transcript, env.GEMINI_API_KEY)
    if (!parsed) {
      return jsonError('Parsiranje nije uspelo.', 502)
    }

    // 3. TODO: Insert ticket via Supabase service role using firm_id from session.
    //    For now, return parsed ticket so the FE can show the confirm card.
    return new Response(JSON.stringify(parsed), {
      headers: { 'content-type': 'application/json' },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Nepoznata greška'
    return jsonError(message, 500)
  }
}

async function transcribeWithGroq(audio: File, apiKey: string): Promise<string | null> {
  const form = new FormData()
  form.append('file', audio, audio.name || 'voice.webm')
  form.append('model', 'whisper-large-v3')
  form.append('language', 'sr')
  form.append('response_format', 'json')

  const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: { authorization: `Bearer ${apiKey}` },
    body: form,
  })
  if (!res.ok) return null
  const data = (await res.json()) as { text?: string }
  return data.text?.trim() ?? null
}

async function parseWithGemini(
  transcript: string,
  apiKey: string,
): Promise<ParsedTicket | null> {
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`

  const body = {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{ role: 'user', parts: [{ text: transcript }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          client_name: { type: 'STRING' },
          type: { type: 'STRING', enum: ['pitanje', 'zaduzenje', 'javicu_se'] },
          title: { type: 'STRING' },
          rok: { type: 'STRING', nullable: true },
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
    return JSON.parse(text) as ParsedTicket
  } catch {
    return null
  }
}

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}
