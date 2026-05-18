import { useCallback, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/cn'

type PendingPeriod = {
  id: string
  year: number
  month: number
}

const MONTH_NAMES_SR = [
  'januar', 'februar', 'mart', 'april', 'maj', 'jun',
  'jul', 'avgust', 'septembar', 'oktobar', 'novembar', 'decembar',
]

/**
 * Mounts inside AppLayout. If any pdv_periods row is pending_decision for the
 * owner's firm, renders a non-dismissible modal that walks her through each
 * period in chronological order. Pickable rok: Friday before the 15th or
 * Monday after. On submit, POSTs to /api/pdv/decide which marks the period
 * ready and generates all tickets for that month server-side.
 */
export function PdvDecisionGate() {
  const queryClient = useQueryClient()

  const { data: pending } = useQuery({
    queryKey: ['pdv_pending'],
    queryFn: async (): Promise<PendingPeriod[]> => {
      const { data, error } = await supabase
        .from('pdv_periods')
        .select('id, year, month')
        .eq('status', 'pending_decision')
        .order('year', { ascending: true })
        .order('month', { ascending: true })
      if (error) throw error
      return data ?? []
    },
    refetchOnWindowFocus: true,
    // Re-check periodically — if the cron creates a new pending row while the
    // app is open, she shouldn't have to refresh manually.
    refetchInterval: 60_000,
  })

  const decide = useMutation({
    mutationFn: async ({ periodId, rok }: { periodId: string; rok: string }) => {
      const { data: sess } = await supabase.auth.getSession()
      const token = sess.session?.access_token
      if (!token) throw new Error('Niste prijavljeni.')

      const res = await fetch('/api/pdv/decide', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ period_id: periodId, chosen_rok: rok }),
      })
      if (!res.ok) {
        const body = await res.text()
        throw new Error(`Greška ${res.status}: ${body}`)
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['pdv_pending'] })
      void queryClient.invalidateQueries({ queryKey: ['tickets'] })
    },
  })

  const current = pending?.[0]
  if (!current) return null

  return (
    <PdvDecisionModal
      period={current}
      submitting={decide.isPending}
      error={decide.error instanceof Error ? decide.error.message : null}
      onChoose={(rok) => decide.mutate({ periodId: current.id, rok })}
    />
  )
}

function PdvDecisionModal({
  period,
  submitting,
  error,
  onChoose,
}: {
  period: PendingPeriod
  submitting: boolean
  error: string | null
  onChoose: (rok: string) => void
}) {
  const monthLabel = `${MONTH_NAMES_SR[period.month - 1]} ${period.year}`

  // The 15th is a Saturday or Sunday — compute the adjacent Friday + Monday.
  const friday = useCallback(() => {
    return adjacentWorkday(period.year, period.month, 15, -1)
  }, [period])
  const monday = useCallback(() => {
    return adjacentWorkday(period.year, period.month, 15, +1)
  }, [period])

  const [picked, setPicked] = useState<string | null>(null)
  const handlePick = (date: string) => {
    setPicked(date)
    onChoose(date)
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pdv-decision-title"
        className="mx-4 w-full max-w-md rounded-lg border border-border bg-background p-6 shadow-xl"
      >
        <div className="mb-4 flex items-start gap-3">
          <div className="rounded-full bg-amber-100 p-2">
            <AlertTriangle className="size-5 text-amber-700" />
          </div>
          <div className="flex-1">
            <h2 id="pdv-decision-title" className="text-lg font-semibold">
              PDV rok za {monthLabel}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              15. {MONTH_NAMES_SR[period.month - 1]} pada u vikend. Izaberi rok
              za sve PDV tikete ovog meseca:
            </p>
          </div>
        </div>

        <div className="grid gap-2">
          <DateChoice
            label={`Petak ${friday().d}. ${MONTH_NAMES_SR[friday().mIdx]}`}
            iso={friday().iso}
            picked={picked}
            disabled={submitting}
            onPick={handlePick}
          />
          <DateChoice
            label={`Ponedeljak ${monday().d}. ${MONTH_NAMES_SR[monday().mIdx]}`}
            iso={monday().iso}
            picked={picked}
            disabled={submitting}
            onPick={handlePick}
          />
        </div>

        {submitting && (
          <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Generišem tikete...
          </div>
        )}

        {error && !submitting && (
          <div className="mt-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}
      </div>
    </div>
  )
}

function DateChoice({
  label,
  iso,
  picked,
  disabled,
  onPick,
}: {
  label: string
  iso: string
  picked: string | null
  disabled: boolean
  onPick: (iso: string) => void
}) {
  const isPicked = picked === iso
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onPick(iso)}
      className={cn(
        'w-full rounded-md border px-4 py-3 text-left text-sm transition',
        isPicked
          ? 'border-primary bg-primary/10'
          : 'border-border hover:bg-accent',
        'disabled:opacity-60',
      )}
    >
      {label}
    </button>
  )
}

/**
 * Walk back (or forward) from day-15 until landing on a weekday.
 * step = -1 for previous Friday, +1 for next Monday.
 */
function adjacentWorkday(
  y: number,
  m: number,
  startDay: number,
  step: -1 | 1,
): { d: number; mIdx: number; iso: string } {
  // Use UTC math to avoid local-timezone shifts; we only care about the
  // calendar date, not the wall clock.
  let date = new Date(Date.UTC(y, m - 1, startDay))
  while (true) {
    date = new Date(date.getTime() + step * 86400000)
    const dow = date.getUTCDay()
    if (dow !== 0 && dow !== 6) break
  }
  const dd = date.getUTCDate()
  const mm = date.getUTCMonth()
  const yyyy = date.getUTCFullYear()
  const iso = `${yyyy}-${String(mm + 1).padStart(2, '0')}-${String(dd).padStart(2, '0')}`
  return { d: dd, mIdx: mm, iso }
}
