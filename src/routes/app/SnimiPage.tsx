import { useRef, useState } from 'react'
import { Mic, Square } from 'lucide-react'
import { cn } from '@/lib/cn'

type Status = 'idle' | 'recording' | 'processing' | 'parsed' | 'error'

type ParsedTicket = {
  client_name: string
  type: 'pitanje' | 'zaduzenje' | 'javicu_se'
  title: string
  rok: string | null
  notes: string | null
}

export function SnimiPage() {
  const [status, setStatus] = useState<Status>('idle')
  const [parsed, setParsed] = useState<ParsedTicket | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  async function startRecording() {
    setErrorMsg(null)
    setParsed(null)
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
      setErrorMsg(err instanceof Error ? err.message : 'Greška pri pristupu mikrofonu')
      setStatus('error')
    }
  }

  function stopRecording() {
    recorderRef.current?.stop()
    setStatus('processing')
  }

  async function uploadAudio() {
    try {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
      const form = new FormData()
      form.append('audio', blob, 'voice.webm')

      const res = await fetch('/api/voice', {
        method: 'POST',
        body: form,
      })
      if (!res.ok) {
        throw new Error(`Server error: ${res.status}`)
      }
      const data = (await res.json()) as ParsedTicket
      setParsed(data)
      setStatus('parsed')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Greška pri obradi snimka')
      setStatus('error')
    }
  }

  return (
    <div className="flex h-full flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        <h1 className="mb-8 text-center text-2xl font-semibold">Snimi</h1>

        <div className="flex flex-col items-center gap-6">
          <button
            type="button"
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onMouseLeave={() => status === 'recording' && stopRecording()}
            onTouchStart={startRecording}
            onTouchEnd={stopRecording}
            disabled={status === 'processing'}
            className={cn(
              'flex size-40 items-center justify-center rounded-full',
              'border-4 transition-all select-none touch-none',
              status === 'recording'
                ? 'border-destructive bg-destructive/10 scale-105'
                : 'border-primary bg-primary text-primary-foreground hover:scale-105',
              status === 'processing' && 'opacity-50 cursor-wait',
            )}
            aria-label={status === 'recording' ? 'Pusti da završiš' : 'Drži i pričaj'}
          >
            {status === 'recording' ? (
              <Square className="size-12" />
            ) : (
              <Mic className="size-16" />
            )}
          </button>

          <p className="text-center text-sm text-muted-foreground">
            {status === 'idle' && 'Drži i pričaj'}
            {status === 'recording' && 'Snimanje... pusti da završiš'}
            {status === 'processing' && 'Obrađujem...'}
            {status === 'parsed' && 'Gotovo!'}
            {status === 'error' && (errorMsg ?? 'Greška')}
          </p>

          {parsed && (
            <div className="w-full rounded-lg border border-border bg-background p-4">
              <div className="text-xs font-medium text-muted-foreground">Klijent</div>
              <div className="mb-2">{parsed.client_name}</div>
              <div className="text-xs font-medium text-muted-foreground">Tip</div>
              <div className="mb-2 capitalize">{parsed.type.replace('_', ' ')}</div>
              <div className="text-xs font-medium text-muted-foreground">Naslov</div>
              <div className="mb-2">{parsed.title}</div>
              {parsed.rok && (
                <>
                  <div className="text-xs font-medium text-muted-foreground">Rok</div>
                  <div className="mb-2">{parsed.rok}</div>
                </>
              )}
              {parsed.notes && (
                <>
                  <div className="text-xs font-medium text-muted-foreground">Beleška</div>
                  <div>{parsed.notes}</div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
