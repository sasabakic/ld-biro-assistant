import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ErrorMessage, Field, Form, Formik } from 'formik'
import * as Yup from 'yup'
import { Check, Loader2, Mic, RotateCcw, Square } from 'lucide-react'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'
import { useClients, type ClientRow } from '@/hooks/useClients'
import { useColumns } from '@/hooks/useColumns'
import { useFirm } from '@/hooks/useFirm'
import { useCreateTicket } from '@/hooks/useCreateTicket'

type Mode = 'save' | 'test'

type Status =
  | 'idle'
  | 'recording'
  | 'processing'
  | 'confirming'
  | 'saving'
  | 'saved'
  | 'error'

type ParsedTicket = {
  client_name: string
  matched_client_id: string | null
  type: 'pitanje' | 'zaduzenje' | 'javicu_se'
  title: string
  rok_iso: string | null
  notes: string | null
}

const TYPE_LABELS: Record<ParsedTicket['type'], string> = {
  pitanje: 'Pitanje',
  zaduzenje: 'Zaduženje',
  javicu_se: 'Javiću se',
}

const confirmSchema = Yup.object({
  client_id: Yup.string().required('Izaberi klijenta'),
  type: Yup.mixed<ParsedTicket['type']>()
    .oneOf(['pitanje', 'zaduzenje', 'javicu_se'])
    .required(),
  title: Yup.string().trim().required('Naslov je obavezan').max(120),
  rok_local: Yup.string().nullable(),
  notes: Yup.string().nullable(),
})

function findBestClientMatch(
  query: string,
  clients: ClientRow[],
): ClientRow | null {
  const q = query.trim().toLowerCase()
  if (!q || clients.length === 0) return null

  const exact = clients.find((c) => c.name.toLowerCase() === q)
  if (exact) return exact

  const substr = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      q.includes(c.name.toLowerCase()),
  )
  if (substr.length === 0) return null
  return substr.reduce((a, b) => (a.name.length <= b.name.length ? a : b))
}

function isoToDatetimeLocal(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function datetimeLocalToIso(local: string): string | null {
  if (!local) return null
  const d = new Date(local)
  if (isNaN(d.getTime())) return null
  return d.toISOString()
}

export function SnimiPage() {
  const [status, setStatus] = useState<Status>('idle')
  const [mode, setMode] = useState<Mode>('save')
  const [parsed, setParsed] = useState<ParsedTicket | null>(null)
  const [transcript, setTranscript] = useState<string | null>(null)
  const [testTranscript, setTestTranscript] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const firm = useFirm()
  const clients = useClients()
  const columns = useColumns()
  const createTicket = useCreateTicket()

  const inboxColumn = useMemo(
    () => columns.data?.find((c) => c.position === 1) ?? null,
    [columns.data],
  )

  const bestMatch = useMemo(() => {
    if (!parsed) return null
    // Prefer Gemini's closed-set match if it returned a valid id.
    if (parsed.matched_client_id) {
      const fromGemini = (clients.data ?? []).find(
        (c) => c.id === parsed.matched_client_id,
      )
      if (fromGemini) return fromGemini
    }
    // Fallback: client-side fuzzy match on the raw extracted name.
    return findBestClientMatch(parsed.client_name, clients.data ?? [])
  }, [parsed, clients.data])

  async function startRecording(targetMode: Mode) {
    setErrorMsg(null)
    if (targetMode === 'save') {
      setParsed(null)
      setTranscript(null)
    }
    setMode(targetMode)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
        void uploadAudio()
      }
      recorder.start()
      recorderRef.current = recorder
      setStatus('recording')
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Greška pri pristupu mikrofonu',
      )
      setStatus('error')
    }
  }

  function stopRecording() {
    if (recorderRef.current && recorderRef.current.state === 'recording') {
      recorderRef.current.stop()
      setStatus('processing')
    }
  }

  async function uploadAudio() {
    try {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
      const formData = new FormData()
      formData.append('audio', blob, 'voice.webm')

      // For the save flow, send the known clients so Gemini can match against
      // them directly (handles Serbian morphology, short forms, etc).
      // Test mode skips this — it only transcribes.
      if (mode === 'save' && clients.data && clients.data.length > 0) {
        const minimal = clients.data.map((c) => ({ id: c.id, name: c.name }))
        formData.append('clients_json', JSON.stringify(minimal))
      }

      const url =
        mode === 'test' ? '/api/voice?transcribe_only=1' : '/api/voice'
      const res = await fetch(url, { method: 'POST', body: formData })
      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as
          | { error?: string }
          | null
        throw new Error(err?.error ?? `Server error: ${res.status}`)
      }

      if (mode === 'test') {
        const data = (await res.json()) as { transcript: string }
        setTestTranscript(data.transcript)
        setStatus('idle')
        return
      }

      const data = (await res.json()) as {
        transcript: string
        parsed: ParsedTicket
      }
      setTranscript(data.transcript)
      setParsed(data.parsed)
      setStatus('confirming')
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Greška pri obradi snimka',
      )
      setStatus('error')
    }
  }

  function reset() {
    setStatus('idle')
    setParsed(null)
    setTranscript(null)
    setErrorMsg(null)
  }

  // ============================================================
  // SAVED — success state for full-pipeline save
  // ============================================================
  if (status === 'saved') {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="w-full max-w-md text-center">
          <div className="mb-4 inline-flex size-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <Check className="size-8" />
          </div>
          <h1 className="text-xl font-semibold">Tiket sačuvan</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pojavio se u Inbox-u na tabli.
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Mic className="size-4" />
              Snimi još jedan
            </button>
            <Link
              to="/app/tabla"
              className="inline-flex items-center rounded-md border border-border px-4 py-2 text-sm hover:bg-accent"
            >
              Vidi tablu
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // ============================================================
  // CONFIRMING — review parsed ticket, edit, save
  // ============================================================
  if (status === 'confirming' || status === 'saving') {
    return renderConfirmForm()
  }

  // ============================================================
  // IDLE / RECORDING / PROCESSING / ERROR
  // — two buttons: main mic (save) + test mic (transcribe-only)
  // ============================================================
  const isSaveActive = mode === 'save'
  const isTestActive = mode === 'test'
  const isBusy =
    status === 'recording' || status === 'processing'

  return (
    <div className="mx-auto flex h-full max-w-md flex-col items-center justify-center px-4 py-6">
      <h1 className="mb-8 text-2xl font-semibold">Snimi</h1>

      {/* Main mic — full pipeline */}
      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onMouseDown={() => startRecording('save')}
          onMouseUp={() => isSaveActive && stopRecording()}
          onMouseLeave={() =>
            isSaveActive && status === 'recording' && stopRecording()
          }
          onTouchStart={() => startRecording('save')}
          onTouchEnd={() => isSaveActive && stopRecording()}
          disabled={isBusy && !isSaveActive}
          className={cn(
            'flex size-40 items-center justify-center rounded-full',
            'border-4 select-none touch-none transition-all',
            isSaveActive && status === 'recording'
              ? 'border-destructive bg-destructive/10 scale-105'
              : 'border-primary bg-primary text-primary-foreground hover:scale-105',
            isBusy && !isSaveActive && 'opacity-30 cursor-not-allowed',
            isSaveActive && status === 'processing' && 'opacity-50 cursor-wait',
          )}
          aria-label={
            isSaveActive && status === 'recording'
              ? 'Pusti da završiš'
              : 'Drži i pričaj'
          }
        >
          {isSaveActive && status === 'recording' ? (
            <Square className="size-12" />
          ) : isSaveActive && status === 'processing' ? (
            <Loader2 className="size-12 animate-spin" />
          ) : (
            <Mic className="size-16" />
          )}
        </button>

        <p className="text-sm text-muted-foreground">
          {isSaveActive && status === 'recording' && 'Snimanje... pusti da završiš'}
          {isSaveActive && status === 'processing' && 'Obrađujem...'}
          {!isSaveActive || status === 'idle' || status === 'error'
            ? 'Drži i pričaj'
            : null}
        </p>
      </div>

      {/* Error */}
      {status === 'error' && (
        <div className="mt-4 flex flex-col items-center gap-2">
          <p className="text-sm text-destructive">{errorMsg ?? 'Greška'}</p>
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent"
          >
            <RotateCcw className="size-4" />
            Probaj ponovo
          </button>
        </div>
      )}

      {/* Divider */}
      <div className="my-8 flex w-full items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs uppercase tracking-wider text-muted-foreground">
          Test mic
        </span>
        <div className="h-px flex-1 bg-border" />
      </div>

      {/* Test mic — transcribe only, no save */}
      <div className="flex w-full flex-col items-center gap-3">
        <p className="text-center text-xs text-muted-foreground">
          Vidi kako te Whisper čuje. Ne čuva ništa.
        </p>
        <button
          type="button"
          onMouseDown={() => startRecording('test')}
          onMouseUp={() => isTestActive && stopRecording()}
          onMouseLeave={() =>
            isTestActive && status === 'recording' && stopRecording()
          }
          onTouchStart={() => startRecording('test')}
          onTouchEnd={() => isTestActive && stopRecording()}
          disabled={isBusy && !isTestActive}
          className={cn(
            'flex size-20 items-center justify-center rounded-full',
            'border-2 select-none touch-none transition-all',
            isTestActive && status === 'recording'
              ? 'border-destructive bg-destructive/10 scale-105'
              : 'border-border bg-background hover:border-primary',
            isBusy && !isTestActive && 'opacity-30 cursor-not-allowed',
            isTestActive && status === 'processing' && 'opacity-50 cursor-wait',
          )}
          aria-label={
            isTestActive && status === 'recording'
              ? 'Pusti da završiš test'
              : 'Test mic'
          }
        >
          {isTestActive && status === 'recording' ? (
            <Square className="size-6 text-destructive" />
          ) : isTestActive && status === 'processing' ? (
            <Loader2 className="size-6 animate-spin" />
          ) : (
            <Mic className="size-7" />
          )}
        </button>

        {testTranscript && (
          <div className="mt-2 w-full rounded-md border border-border bg-muted/30 p-3">
            <div className="mb-1 text-xs font-medium text-muted-foreground">
              Whisper čuo:
            </div>
            <p className="whitespace-pre-wrap text-sm italic">
              "{testTranscript}"
            </p>
            <button
              type="button"
              onClick={() => setTestTranscript(null)}
              className="mt-2 text-xs text-muted-foreground hover:text-foreground"
            >
              Obriši
            </button>
          </div>
        )}
      </div>
    </div>
  )

  // ============================================================
  // Confirm form renderer — extracted for clarity
  // ============================================================
  function renderConfirmForm() {
    const noClients = (clients.data?.length ?? 0) === 0
    const inboxMissing = !inboxColumn || !firm.data

    if (noClients) {
      return (
        <div className="mx-auto max-w-md p-6">
          <div className="rounded-lg border border-border bg-background p-6 text-center">
            <h1 className="text-lg font-semibold">Nemaš još klijenata</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Pre nego što snimiš tiket, dodaj makar jednog klijenta.
            </p>
            <div className="mt-4 flex justify-center gap-2">
              <Link
                to="/app/klijenti"
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Idi na Klijenti
              </Link>
              <button
                type="button"
                onClick={reset}
                className="rounded-md border border-border px-3 py-2 text-sm hover:bg-accent"
              >
                Otkaži
              </button>
            </div>
          </div>
        </div>
      )
    }

    if (inboxMissing) {
      return (
        <div className="mx-auto max-w-md p-6">
          <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
            Firma ili Inbox kolona nedostaju u bazi. Proveri Supabase postavku.
          </div>
        </div>
      )
    }

    return (
      <div className="mx-auto max-w-2xl px-4 py-6 md:px-6">
        <h1 className="mb-1 text-2xl font-semibold">Potvrdi tiket</h1>
        <p className="mb-4 text-sm text-muted-foreground">
          Pogledaj šta sam razumeo. Ispravi ako treba pre čuvanja.
        </p>

        {transcript && (
          <details className="mb-4 rounded-md border border-border bg-muted/30 p-3 text-sm">
            <summary className="cursor-pointer text-xs text-muted-foreground">
              Originalni transkript
            </summary>
            <p className="mt-2 italic">{transcript}</p>
          </details>
        )}

        <Formik
          initialValues={{
            client_id: bestMatch?.id ?? '',
            type: parsed!.type,
            title: parsed!.title,
            rok_local: isoToDatetimeLocal(parsed!.rok_iso),
            notes: parsed!.notes ?? '',
          }}
          validationSchema={confirmSchema}
          onSubmit={async (
            values,
            { setStatus: setFormStatus, setSubmitting },
          ) => {
            setFormStatus(null)
            setStatus('saving')

            const {
              data: { user },
            } = await supabase.auth.getUser()
            if (!user) {
              setFormStatus('Sesija je istekla. Prijavi se ponovo.')
              setStatus('confirming')
              setSubmitting(false)
              return
            }

            try {
              await createTicket.mutateAsync({
                firm_id: firm.data!.id,
                client_id: values.client_id,
                column_id: inboxColumn!.id,
                created_by_user_id: user.id,
                created_via: 'voice',
                type: values.type,
                title: values.title.trim(),
                description: values.notes.trim() || null,
                rok: datetimeLocalToIso(values.rok_local),
                voice_transcript: transcript,
              })
              setStatus('saved')
            } catch (err) {
              setFormStatus(
                err instanceof Error ? err.message : 'Greška pri čuvanju',
              )
              setStatus('confirming')
              setSubmitting(false)
            }
          }}
        >
          {({ isSubmitting, status: formStatus, errors, touched, values }) => (
            <Form
              noValidate
              className="space-y-4 rounded-lg border border-border bg-background p-5 shadow-sm"
            >
              <div>
                <label
                  htmlFor="client_id"
                  className="mb-1 block text-sm font-medium"
                >
                  Klijent *
                </label>
                <Field
                  as="select"
                  id="client_id"
                  name="client_id"
                  disabled={isSubmitting}
                  className={cn(
                    'w-full rounded-md border bg-background px-3 py-2 text-sm',
                    'focus:outline-none focus:ring-2 focus:ring-primary/40',
                    touched.client_id && errors.client_id
                      ? 'border-destructive'
                      : 'border-border',
                  )}
                >
                  <option value="">— izaberi —</option>
                  {(clients.data ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Field>
                <ErrorMessage
                  name="client_id"
                  component="div"
                  className="mt-1 text-xs text-destructive"
                />
                {parsed && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Razumeo sam: "{parsed.client_name}"
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Tip</label>
                <div className="flex gap-2">
                  {(['javicu_se', 'zaduzenje', 'pitanje'] as const).map((t) => (
                    <label
                      key={t}
                      className={cn(
                        'flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm',
                        values.type === t
                          ? 'border-primary bg-primary/5 font-medium'
                          : 'border-border hover:bg-accent/50',
                      )}
                    >
                      <Field
                        type="radio"
                        name="type"
                        value={t}
                        disabled={isSubmitting}
                        className="sr-only"
                      />
                      {TYPE_LABELS[t]}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label
                  htmlFor="title"
                  className="mb-1 block text-sm font-medium"
                >
                  Naslov *
                </label>
                <Field
                  id="title"
                  name="title"
                  disabled={isSubmitting}
                  className={cn(
                    'w-full rounded-md border bg-background px-3 py-2 text-sm',
                    'focus:outline-none focus:ring-2 focus:ring-primary/40',
                    touched.title && errors.title
                      ? 'border-destructive'
                      : 'border-border',
                  )}
                />
                <ErrorMessage
                  name="title"
                  component="div"
                  className="mt-1 text-xs text-destructive"
                />
              </div>

              <div>
                <label
                  htmlFor="rok_local"
                  className="mb-1 block text-sm font-medium"
                >
                  Rok
                </label>
                <Field
                  id="rok_local"
                  name="rok_local"
                  type="datetime-local"
                  disabled={isSubmitting}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Ostavi prazno ako nema roka.
                </p>
              </div>

              <div>
                <label
                  htmlFor="notes"
                  className="mb-1 block text-sm font-medium"
                >
                  Beleška
                </label>
                <Field
                  as="textarea"
                  id="notes"
                  name="notes"
                  rows={3}
                  disabled={isSubmitting}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              {formStatus && (
                <div
                  role="alert"
                  className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
                >
                  {formStatus}
                </div>
              )}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={reset}
                  disabled={isSubmitting}
                  className="rounded-md border border-border px-3 py-2 text-sm hover:bg-accent disabled:opacity-50"
                >
                  Otkaži
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Check className="size-4" />
                  )}
                  Sačuvaj
                </button>
              </div>
            </Form>
          )}
        </Formik>
      </div>
    )
  }
}
