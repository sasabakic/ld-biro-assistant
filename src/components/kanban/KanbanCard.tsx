import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { ClipboardList, HelpCircle, Phone } from 'lucide-react'
import { cn } from '@/lib/cn'
import { isOverdue } from '@/lib/dateFilter'
import { formatShortDate } from '@/lib/formatDate'
import type { TicketWithClient } from '@/hooks/useTickets'
import type { Database } from '@/lib/database.types'

type TicketType = Database['public']['Enums']['ticket_type']

const typeIcon: Record<TicketType, typeof Phone> = {
  javicu_se: Phone,
  zaduzenje: ClipboardList,
  pitanje: HelpCircle,
}

const typeLabel: Record<TicketType, string> = {
  javicu_se: 'Javiću se',
  zaduzenje: 'Zaduženje',
  pitanje: 'Pitanje',
}

type Props = { ticket: TicketWithClient }

export function KanbanCard({ ticket }: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: ticket.id })

  const Icon = typeIcon[ticket.type]
  const overdue = isOverdue(ticket)
  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        'cursor-grab rounded-md border p-3 shadow-sm active:cursor-grabbing',
        overdue
          ? 'border-red-400 bg-red-50 hover:border-red-500 motion-safe:animate-overdue-pulse'
          : 'border-border bg-background hover:border-primary/40',
        isDragging && 'opacity-50',
      )}
    >
      <div className="flex items-start gap-2">
        <Icon
          className={cn(
            'mt-0.5 size-4 shrink-0',
            overdue && 'text-red-600',
            !overdue && ticket.type === 'javicu_se' && 'text-orange-600',
            !overdue && ticket.type === 'zaduzenje' && 'text-blue-600',
            !overdue && ticket.type === 'pitanje' && 'text-violet-600',
          )}
          aria-label={typeLabel[ticket.type]}
        />
        <div className="min-w-0 flex-1">
          <div
            className={cn(
              'truncate text-xs font-medium',
              overdue ? 'text-red-700' : 'text-muted-foreground',
            )}
          >
            {ticket.client?.name ?? '—'}
          </div>
          <div
            className={cn(
              'mt-0.5 text-sm leading-snug',
              overdue && 'text-red-900',
            )}
          >
            {ticket.title}
          </div>
          {ticket.rok && (
            <div
              className={cn(
                'mt-1.5 text-xs',
                overdue
                  ? 'font-semibold text-red-700'
                  : 'text-muted-foreground',
              )}
            >
              {overdue ? 'Kasni: ' : 'rok: '}
              {formatShortDate(ticket.rok)}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
