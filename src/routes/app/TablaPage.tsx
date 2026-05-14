import { useState } from 'react'
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Loader2, Mic } from 'lucide-react'
import { cn } from '@/lib/cn'
import {
  activeFilterLabel,
  matchesFilter,
  type TabFilter,
} from '@/lib/dateFilter'
import { useColumns } from '@/hooks/useColumns'
import { useTickets } from '@/hooks/useTickets'
import { useMoveTicket } from '@/hooks/useMoveTicket'
import { KanbanColumn } from '@/components/kanban/KanbanColumn'

const pillFilters: { filter: TabFilter; label: string }[] = [
  { filter: { type: 'sve' }, label: 'Sve' },
  { filter: { type: 'danas' }, label: 'Danas' },
  { filter: { type: 'sutra' }, label: 'Sutra' },
]

export function TablaPage() {
  const [filter, setFilter] = useState<TabFilter>({ type: 'danas' })

  const columns = useColumns()
  const tickets = useTickets()
  const move = useMoveTicket()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over) return
    const id = String(active.id)
    const columnId = String(over.id)
    move.mutate({ id, columnId })
  }

  function shiftWeek(delta: number) {
    setFilter((prev) => {
      const current = prev.type === 'week' ? prev.weekOffset : 0
      return { type: 'week', weekOffset: current + delta }
    })
  }

  function jumpToThisWeek() {
    setFilter({ type: 'week', weekOffset: 0 })
  }

  const isPillActive = (f: TabFilter) =>
    f.type !== 'week' && filter.type === f.type
  const isWeekMode = filter.type === 'week'

  // The label between the arrows. Always shows something contextual:
  //   sve   → "Sve"
  //   danas → today's date
  //   sutra → tomorrow's date
  //   week  → date range of the active week
  const navLabel = activeFilterLabel(filter)

  const visibleTickets = (tickets.data ?? []).filter((t) =>
    matchesFilter(t, filter),
  )

  const isLoading = columns.isLoading || tickets.isLoading
  const hasError = columns.error || tickets.error
  const noColumns = !isLoading && !hasError && (columns.data?.length ?? 0) === 0

  return (
    <div className="flex h-full flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-background px-4 py-3 md:px-6">
        <div className="flex flex-wrap items-center gap-2">
          {/* Pill filters */}
          <div className="flex items-center gap-2">
            {pillFilters.map(({ filter: f, label }) => (
              <button
                key={f.type}
                onClick={() => setFilter(f)}
                className={cn(
                  'rounded-full px-3 py-1.5 text-sm transition-colors',
                  isPillActive(f)
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground',
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Week navigator */}
          <div className="flex items-center gap-1 rounded-full bg-muted/50 p-1">
            <button
              type="button"
              onClick={() => shiftWeek(-1)}
              aria-label="Prethodna nedelja"
              className="rounded-full p-1.5 text-muted-foreground hover:bg-background hover:text-foreground transition-colors"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              onClick={jumpToThisWeek}
              className={cn(
                'rounded-full px-3 py-1 text-sm transition-colors tabular-nums',
                isWeekMode
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-background hover:text-foreground',
              )}
              title={
                isWeekMode
                  ? filter.weekOffset !== 0
                    ? 'Klikni za povratak na ovu nedelju'
                    : undefined
                  : 'Klikni za nedeljni pregled'
              }
            >
              {navLabel}
            </button>
            <button
              type="button"
              onClick={() => shiftWeek(1)}
              aria-label="Sledeća nedelja"
              className="rounded-full p-1.5 text-muted-foreground hover:bg-background hover:text-foreground transition-colors"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>

        <Link
          to="/app/snimi"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Mic className="size-4" />
          Snimi
        </Link>
      </header>

      {isLoading && (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {hasError && (
        <div className="flex flex-1 items-center justify-center px-6">
          <div className="max-w-md text-center">
            <p className="text-sm font-medium text-destructive">
              Greška pri učitavanju table.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Pokušaj da osvežiš stranicu. Ako greška ostane, proveri da li je
              tvoja firma postavljena u Supabase-u.
            </p>
          </div>
        </div>
      )}

      {noColumns && (
        <div className="flex flex-1 items-center justify-center px-6">
          <div className="max-w-md text-center">
            <p className="text-sm font-medium">Tabla još nije postavljena.</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Nema kolona za tvoju firmu. Proveri da firma postoji u bazi.
            </p>
          </div>
        </div>
      )}

      {!isLoading && !hasError && !noColumns && (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div className="flex flex-1 gap-3 overflow-x-auto px-4 py-4 md:px-6">
            {columns.data!.map((col) => (
              <KanbanColumn
                key={col.id}
                column={col}
                tickets={visibleTickets.filter((t) => t.column_id === col.id)}
              />
            ))}
          </div>
        </DndContext>
      )}
    </div>
  )
}
