import { useState } from 'react'
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { Link } from 'react-router-dom'
import { Loader2, Mic } from 'lucide-react'
import { cn } from '@/lib/cn'
import { matchesDayFilter, type DayFilter } from '@/lib/dateFilter'
import { useColumns } from '@/hooks/useColumns'
import { useTickets } from '@/hooks/useTickets'
import { useMoveTicket } from '@/hooks/useMoveTicket'
import { KanbanColumn } from '@/components/kanban/KanbanColumn'

const filters: { id: DayFilter; label: string }[] = [
  { id: 'sve', label: 'Sve' },
  { id: 'danas', label: 'Danas' },
  { id: 'sutra', label: 'Sutra' },
  { id: 'nedelja', label: 'Nedelja' },
]

export function TablaPage() {
  const [filter, setFilter] = useState<DayFilter>('danas')

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

  const visibleTickets = (tickets.data ?? []).filter((t) =>
    matchesDayFilter(t, filter),
  )

  const isLoading = columns.isLoading || tickets.isLoading
  const hasError = columns.error || tickets.error
  const noColumns = !isLoading && !hasError && (columns.data?.length ?? 0) === 0

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-border bg-background px-4 py-3 md:px-6">
        <div className="flex items-center gap-2">
          {filters.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                'rounded-full px-3 py-1.5 text-sm transition-colors',
                filter === f.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
            >
              {f.label}
            </button>
          ))}
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
