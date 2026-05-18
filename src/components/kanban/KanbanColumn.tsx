import { useEffect, useMemo, useRef, useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { Loader2, Trash2 } from 'lucide-react'
import { cn } from '@/lib/cn'
import { KanbanCard } from './KanbanCard'
import { useDeleteTickets } from '@/hooks/useDeleteTickets'
import type { ColumnRow } from '@/hooks/useColumns'
import type { TicketWithClient } from '@/hooks/useTickets'

type Props = {
  column: ColumnRow
  tickets: TicketWithClient[]
}

export function KanbanColumn({ column, tickets }: Props) {
  const { isOver, setNodeRef } = useDroppable({ id: column.id })

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [confirmOpen, setConfirmOpen] = useState(false)
  const deleteTickets = useDeleteTickets()

  // Keep selection in sync if tickets disappear (e.g., dragged to another column).
  const visibleIds = useMemo(() => new Set(tickets.map((t) => t.id)), [tickets])
  useEffect(() => {
    setSelected((prev) => {
      const next = new Set<string>()
      for (const id of prev) if (visibleIds.has(id)) next.add(id)
      return next.size === prev.size ? prev : next
    })
  }, [visibleIds])

  const allSelected = tickets.length > 0 && selected.size === tickets.length
  const someSelected = selected.size > 0 && !allSelected
  const masterRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (masterRef.current) masterRef.current.indeterminate = someSelected
  }, [someSelected])

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(tickets.map((t) => t.id)))
  }

  async function confirmDelete() {
    const ids = Array.from(selected)
    try {
      await deleteTickets.mutateAsync(ids)
      setSelected(new Set())
      setConfirmOpen(false)
    } catch (err) {
      // Surface failure but keep modal open so the user can retry.
      console.error('Bulk delete failed:', err)
    }
  }

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex w-72 shrink-0 flex-col rounded-lg border border-border bg-muted/30 transition-colors',
        isOver && 'bg-accent border-primary/30',
      )}
    >
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <h3 className="text-sm font-medium">{column.name}</h3>
        <span className="text-xs text-muted-foreground tabular-nums">
          {tickets.length}
        </span>
      </div>

      <div className="flex items-center justify-between gap-2 border-b border-border bg-background/40 px-3 py-1.5">
        <label
          className={cn(
            'inline-flex items-center gap-2 text-xs',
            tickets.length === 0 && 'opacity-50',
          )}
        >
          <input
            ref={masterRef}
            type="checkbox"
            checked={allSelected}
            onChange={toggleAll}
            disabled={tickets.length === 0}
            className="size-3.5 cursor-pointer accent-primary"
          />
          Označi sve
        </label>
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          disabled={selected.size === 0 || deleteTickets.isPending}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition',
            selected.size > 0
              ? 'bg-destructive/10 text-destructive hover:bg-destructive/20'
              : 'text-muted-foreground',
            'disabled:cursor-not-allowed disabled:opacity-50',
          )}
          aria-label="Obriši izabrane"
        >
          <Trash2 className="size-3.5" />
          Obriši{selected.size > 0 ? ` (${selected.size})` : ''}
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-2">
        {tickets.map((t) => (
          <KanbanCard
            key={t.id}
            ticket={t}
            selected={selected.has(t.id)}
            onToggleSelect={toggleOne}
          />
        ))}
        {tickets.length === 0 && (
          <div className="flex h-20 items-center justify-center text-xs text-muted-foreground">
            —
          </div>
        )}
      </div>

      {confirmOpen && (
        <ConfirmDeleteDialog
          count={selected.size}
          columnName={column.name}
          pending={deleteTickets.isPending}
          error={
            deleteTickets.error instanceof Error
              ? deleteTickets.error.message
              : null
          }
          onConfirm={confirmDelete}
          onCancel={() => {
            if (!deleteTickets.isPending) {
              setConfirmOpen(false)
              deleteTickets.reset()
            }
          }}
        />
      )}
    </div>
  )
}

function ConfirmDeleteDialog({
  count,
  columnName,
  pending,
  error,
  onConfirm,
  onCancel,
}: {
  count: number
  columnName: string
  pending: boolean
  error: string | null
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-background/80 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="mx-4 w-full max-w-sm rounded-lg border border-border bg-background p-5 shadow-xl"
      >
        <h3 className="text-base font-semibold">Obrisati {count} tiket(a)?</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Iz kolone <span className="font-medium">{columnName}</span>. Ovo se ne
          može poništiti — tiketi će biti potpuno obrisani iz baze.
        </p>

        {error && (
          <div className="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="rounded-md border border-border px-3 py-2 text-sm hover:bg-accent disabled:opacity-50"
          >
            Otkaži
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
          >
            {pending && <Loader2 className="size-4 animate-spin" />}
            Obriši
          </button>
        </div>
      </div>
    </div>
  )
}
