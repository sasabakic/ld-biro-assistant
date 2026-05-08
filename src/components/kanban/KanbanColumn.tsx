import { useDroppable } from '@dnd-kit/core'
import { cn } from '@/lib/cn'
import type { ColumnDef, Ticket } from './types'
import { KanbanCard } from './KanbanCard'

type Props = {
  column: ColumnDef
  tickets: Ticket[]
}

export function KanbanColumn({ column, tickets }: Props) {
  const { isOver, setNodeRef } = useDroppable({ id: column.id })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex w-72 shrink-0 flex-col rounded-lg border border-border bg-muted/30 transition-colors',
        isOver && 'bg-accent border-primary/30',
      )}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <h3 className="text-sm font-medium">{column.name}</h3>
        <span className="text-xs text-muted-foreground tabular-nums">
          {tickets.length}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-2">
        {tickets.map((t) => (
          <KanbanCard key={t.id} ticket={t} />
        ))}
        {tickets.length === 0 && (
          <div className="flex h-20 items-center justify-center text-xs text-muted-foreground">
            —
          </div>
        )}
      </div>
    </div>
  )
}
