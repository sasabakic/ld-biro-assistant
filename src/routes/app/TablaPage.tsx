import { useState } from 'react'
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { Mic } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { KanbanColumn } from '@/components/kanban/KanbanColumn'
import type { Ticket, ColumnDef } from '@/components/kanban/types'

type DayFilter = 'sve' | 'danas' | 'sutra' | 'nedelja'

const filters: { id: DayFilter; label: string }[] = [
  { id: 'sve', label: 'Sve' },
  { id: 'danas', label: 'Danas' },
  { id: 'sutra', label: 'Sutra' },
  { id: 'nedelja', label: 'Nedelja' },
]

const MOCK_COLUMNS: ColumnDef[] = [
  { id: 'inbox', name: 'Inbox' },
  { id: 'u-toku', name: 'U toku' },
  { id: 'ceka-klijenta', name: 'Čeka klijenta' },
  { id: 'ceka-trecu-stranu', name: 'Čeka treću stranu' },
  { id: 'gotovo', name: 'Gotovo' },
]

const MOCK_TICKETS: Ticket[] = [
  {
    id: '1',
    columnId: 'inbox',
    clientName: 'Lukić d.o.o.',
    type: 'javicu_se',
    title: 'Javiću se za savet o bilansu',
    rok: 'Danas',
    planiranoZa: 'danas',
  },
  {
    id: '2',
    columnId: 'inbox',
    clientName: 'Marković s.p.',
    type: 'zaduzenje',
    title: 'PDV za maj',
    rok: '15. jun',
    planiranoZa: 'danas',
  },
  {
    id: '3',
    columnId: 'u-toku',
    clientName: 'Petrović s.p.',
    type: 'zaduzenje',
    title: 'PDV za maj',
    rok: '15. maj',
    planiranoZa: 'danas',
  },
  {
    id: '4',
    columnId: 'u-toku',
    clientName: 'Janić d.o.o.',
    type: 'javicu_se',
    title: 'Javiću se za savet',
    rok: 'Danas, 16h',
    planiranoZa: 'danas',
  },
  {
    id: '5',
    columnId: 'ceka-klijenta',
    clientName: 'Stojanović d.o.o.',
    type: 'zaduzenje',
    title: 'Čeka izvod od 9.5',
    rok: null,
    planiranoZa: null,
  },
]

export function TablaPage() {
  const [tickets, setTickets] = useState<Ticket[]>(MOCK_TICKETS)
  const [filter, setFilter] = useState<DayFilter>('danas')

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over) return
    const ticketId = String(active.id)
    const newColumnId = String(over.id)
    setTickets((prev) =>
      prev.map((t) => (t.id === ticketId ? { ...t, columnId: newColumnId } : t)),
    )
  }

  const visibleTickets = tickets.filter((t) => {
    if (filter === 'sve') return true
    if (filter === 'danas') return t.planiranoZa === 'danas'
    if (filter === 'sutra') return t.planiranoZa === 'sutra'
    if (filter === 'nedelja')
      return t.planiranoZa === 'danas' || t.planiranoZa === 'sutra'
    return true
  })

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

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="flex flex-1 gap-3 overflow-x-auto px-4 py-4 md:px-6">
          {MOCK_COLUMNS.map((col) => (
            <KanbanColumn
              key={col.id}
              column={col}
              tickets={visibleTickets.filter((t) => t.columnId === col.id)}
            />
          ))}
        </div>
      </DndContext>
    </div>
  )
}
