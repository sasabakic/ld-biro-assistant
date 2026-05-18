import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Archive,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  HelpCircle,
  Loader2,
  Phone,
  Search,
  X,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { useClients } from '@/hooks/useClients'
import {
  useArchivedTickets,
  type ArchiveFilters,
} from '@/hooks/useArchivedTickets'
import type { Database } from '@/lib/database.types'

type TicketType = Database['public']['Enums']['ticket_type']

const typeIcon: Record<TicketType, typeof Phone> = {
  javicu_se: Phone,
  zaduzenje: ClipboardList,
  pitanje: HelpCircle,
}

const PAGE_SIZE = 50

const dateLong = new Intl.DateTimeFormat('sr-Latn', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
})

export function ArhivaPage() {
  const clients = useClients()
  const [filters, setFilters] = useState<ArchiveFilters>({
    clientId: null,
    from: null,
    to: null,
    query: '',
  })
  const [queryDraft, setQueryDraft] = useState('')
  const [page, setPage] = useState(0)

  // Debounce keyword input by 350ms.
  useEffect(() => {
    const t = setTimeout(() => {
      setFilters((f) => (f.query === queryDraft ? f : { ...f, query: queryDraft }))
      setPage(0)
    }, 350)
    return () => clearTimeout(t)
  }, [queryDraft])

  // Reset page whenever non-keyword filters change.
  useEffect(() => {
    setPage(0)
  }, [filters.clientId, filters.from, filters.to])

  const archive = useArchivedTickets(filters, page, PAGE_SIZE)
  const totalPages = archive.data?.totalPages ?? 1
  const totalCount = archive.data?.totalCount ?? 0

  const clientOptions = useMemo(
    () => (clients.data ?? []).map((c) => ({ id: c.id, name: c.name })),
    [clients.data],
  )

  const anyFilter =
    !!filters.clientId || !!filters.from || !!filters.to || !!filters.query

  function resetFilters() {
    setQueryDraft('')
    setFilters({ clientId: null, from: null, to: null, query: '' })
    setPage(0)
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-6">
      <div className="mb-4 flex items-center gap-2">
        <Archive className="size-5 text-muted-foreground" />
        <h1 className="text-2xl font-semibold">Arhiva</h1>
        {!archive.isLoading && (
          <span className="ml-2 text-sm text-muted-foreground tabular-nums">
            {totalCount.toLocaleString('sr-Latn')} tiket(a)
          </span>
        )}
      </div>

      {/* Filter bar */}
      <div className="mb-4 grid gap-3 rounded-lg border border-border bg-background p-4 shadow-sm md:grid-cols-4">
        <div className="md:col-span-2">
          <label htmlFor="archive-q" className="mb-1 block text-xs font-medium text-muted-foreground">
            Ključna reč
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id="archive-q"
              type="search"
              value={queryDraft}
              onChange={(e) => setQueryDraft(e.target.value)}
              placeholder="Naslov, opis ili transkript..."
              className="w-full rounded-md border border-border bg-background py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
        </div>

        <div>
          <label htmlFor="archive-client" className="mb-1 block text-xs font-medium text-muted-foreground">
            Klijent
          </label>
          <select
            id="archive-client"
            value={filters.clientId ?? ''}
            onChange={(e) =>
              setFilters((f) => ({ ...f, clientId: e.target.value || null }))
            }
            className="w-full rounded-md border border-border bg-background px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="">Svi klijenti</option>
            {clientOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor="archive-from" className="mb-1 block text-xs font-medium text-muted-foreground">
              Od
            </label>
            <input
              id="archive-from"
              type="date"
              value={filters.from ?? ''}
              onChange={(e) =>
                setFilters((f) => ({ ...f, from: e.target.value || null }))
              }
              className="w-full rounded-md border border-border bg-background px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div>
            <label htmlFor="archive-to" className="mb-1 block text-xs font-medium text-muted-foreground">
              Do
            </label>
            <input
              id="archive-to"
              type="date"
              value={filters.to ?? ''}
              onChange={(e) =>
                setFilters((f) => ({ ...f, to: e.target.value || null }))
              }
              className="w-full rounded-md border border-border bg-background px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
        </div>

        {anyFilter && (
          <div className="md:col-span-4">
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" /> Resetuj filtere
            </button>
          </div>
        )}
      </div>

      {/* Results */}
      {archive.isLoading && !archive.data && (
        <div className="flex justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {archive.error && (
        <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
          Greška pri učitavanju arhive.
        </div>
      )}

      {archive.data && archive.data.rows.length === 0 && (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <p className="text-sm font-medium">Nema tiketa.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {anyFilter
              ? 'Pokušaj sa drugim filterima.'
              : 'Završeni tiketi će se pojaviti ovde sutradan.'}
          </p>
        </div>
      )}

      {archive.data && archive.data.rows.length > 0 && (
        <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-background">
          {archive.data.rows.map((t) => {
            const Icon = typeIcon[t.type]
            return (
              <li key={t.id}>
                <Link
                  to={`/app/klijent/${t.client_id}`}
                  className="flex items-start gap-3 px-4 py-3 hover:bg-accent/40 transition-colors"
                >
                  <Icon
                    className={cn(
                      'mt-0.5 size-4 shrink-0',
                      t.type === 'javicu_se' && 'text-orange-600',
                      t.type === 'zaduzenje' && 'text-blue-600',
                      t.type === 'pitanje' && 'text-violet-600',
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm">{t.title}</div>
                    <div className="mt-0.5 flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span className="font-medium">
                        {t.client?.name ?? '—'}
                      </span>
                      {t.closed_at && (
                        <span>završeno: {dateLong.format(new Date(t.closed_at))}</span>
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}

      {/* Pagination */}
      {archive.data && totalPages > 1 && (
        <Paginator
          page={page}
          totalPages={totalPages}
          onChange={setPage}
          loading={archive.isFetching}
        />
      )}
    </div>
  )
}

function Paginator({
  page,
  totalPages,
  onChange,
  loading,
}: {
  page: number
  totalPages: number
  onChange: (p: number) => void
  loading: boolean
}) {
  // Show: first, last, current, current ± 1. Ellipses elsewhere.
  const pages = useMemo(() => {
    const set = new Set<number>([0, totalPages - 1, page, page - 1, page + 1])
    return Array.from(set)
      .filter((p) => p >= 0 && p < totalPages)
      .sort((a, b) => a - b)
  }, [page, totalPages])

  return (
    <div className="mt-4 flex items-center justify-center gap-1">
      <button
        type="button"
        onClick={() => onChange(Math.max(0, page - 1))}
        disabled={page === 0 || loading}
        className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
      >
        <ChevronLeft className="size-4" />
        Prethodna
      </button>

      {pages.map((p, i) => {
        const prev = pages[i - 1]
        const ellipsis = prev !== undefined && p - prev > 1
        return (
          <span key={p} className="flex items-center">
            {ellipsis && (
              <span className="px-1.5 text-xs text-muted-foreground">...</span>
            )}
            <button
              type="button"
              onClick={() => onChange(p)}
              disabled={loading}
              className={cn(
                'min-w-[2rem] rounded-md px-2 py-1 text-sm tabular-nums transition',
                p === page
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                'disabled:opacity-50',
              )}
            >
              {p + 1}
            </button>
          </span>
        )
      })}

      <button
        type="button"
        onClick={() => onChange(Math.min(totalPages - 1, page + 1))}
        disabled={page >= totalPages - 1 || loading}
        className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
      >
        Sledeća
        <ChevronRight className="size-4" />
      </button>
    </div>
  )
}
