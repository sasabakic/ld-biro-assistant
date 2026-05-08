import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { Phone, ClipboardList, HelpCircle } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { Ticket, TicketType } from './types'

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

type Props = {
  ticket: Ticket
}

export function KanbanCard({ ticket }: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: ticket.id })

  const Icon = typeIcon[ticket.type]

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
        'cursor-grab rounded-md border border-border bg-background p-3 shadow-sm',
        'hover:border-primary/40 active:cursor-grabbing',
        isDragging && 'opacity-50',
      )}
    >
      <div className="flex items-start gap-2">
        <Icon
          className={cn(
            'mt-0.5 size-4 shrink-0',
            ticket.type === 'javicu_se' && 'text-orange-600',
            ticket.type === 'zaduzenje' && 'text-blue-600',
            ticket.type === 'pitanje' && 'text-violet-600',
          )}
          aria-label={typeLabel[ticket.type]}
        />
        <div className="min-w-0 flex-1">
          <div className="text-xs font-medium text-muted-foreground">
            {ticket.clientName}
          </div>
          <div className="mt-0.5 text-sm leading-snug">{ticket.title}</div>
          {ticket.rok && (
            <div className="mt-1.5 text-xs text-muted-foreground">
              rok: {ticket.rok}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
