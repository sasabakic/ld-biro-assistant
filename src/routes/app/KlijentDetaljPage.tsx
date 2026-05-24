import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ErrorMessage, Field, Form, Formik } from 'formik'
import * as Yup from 'yup'
import {
  ArrowLeft,
  ClipboardList,
  HelpCircle,
  Loader2,
  Phone,
  Save,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { formatShortDate } from '@/lib/formatDate'
import { useClient, useUpdateClient } from '@/hooks/useClients'
import { useTicketsForClient } from '@/hooks/useTicketsForClient'
import { useColumns } from '@/hooks/useColumns'
import type { Database } from '@/lib/database.types'

type TicketType = Database['public']['Enums']['ticket_type']
type PdvCadence = 'monthly' | 'quarterly' | 'none'

const typeIcon: Record<TicketType, typeof Phone> = {
  javicu_se: Phone,
  zaduzenje: ClipboardList,
  pitanje: HelpCircle,
}

const PDV_LABELS: Record<PdvCadence, string> = {
  monthly: 'Mesečno',
  quarterly: 'Kvartalno',
  none: 'Nije PDV obveznik',
}

const editSchema = Yup.object({
  name: Yup.string().trim().required('Naziv je obavezan').max(120),
  // Pravno lice: PIB 9 cifara, MB 8 cifara.
  // Preduzetnik: ponekad se umesto njih popunjava 13-cifreni JMBG.
  pib: Yup.string()
    .trim()
    .matches(/^(\d{9}|\d{13})?$/, 'PIB mora biti 9 ili 13 cifara')
    .nullable(),
  mb: Yup.string()
    .trim()
    .matches(/^(\d{8}|\d{13})?$/, 'Matični broj mora biti 8 ili 13 cifara')
    .nullable(),
  pdv_cadence: Yup.mixed<PdvCadence>()
    .oneOf(['monthly', 'quarterly', 'none'])
    .required(),
  notes: Yup.string().nullable(),
})

export function KlijentDetaljPage() {
  const { id } = useParams<{ id: string }>()
  const client = useClient(id)
  const tickets = useTicketsForClient(id)
  const columns = useColumns()
  const updateClient = useUpdateClient()
  const [isEditing, setIsEditing] = useState(false)

  const columnNameById = new Map(
    (columns.data ?? []).map((c) => [c.id, c.name]),
  )

  if (client.isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (client.error || !client.data) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-6 md:px-6">
        <Link
          to="/app/klijenti"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Nazad na klijente
        </Link>
        <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
          Klijent nije pronađen.
        </div>
      </div>
    )
  }

  const c = client.data

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:px-6">
      <Link
        to="/app/klijenti"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Nazad na klijente
      </Link>

      {/* Header / form */}
      {!isEditing ? (
        <div className="mb-6 rounded-lg border border-border bg-background p-5 shadow-sm">
          <div className="mb-3 flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-semibold">{c.name}</h1>
              <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                {c.pib && <span>PIB: {c.pib}</span>}
                {c.mb && <span>MB: {c.mb}</span>}
                <PdvBadge cadence={(c.pdv_cadence ?? 'none') as PdvCadence} />
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent transition"
            >
              Izmeni
            </button>
          </div>
          {c.notes && (
            <div className="mt-4 border-t border-border pt-4">
              <div className="mb-1 text-xs font-medium text-muted-foreground">
                Beleške
              </div>
              <p className="whitespace-pre-wrap text-sm">{c.notes}</p>
            </div>
          )}
        </div>
      ) : (
        <Formik
          initialValues={{
            name: c.name,
            pib: c.pib ?? '',
            mb: c.mb ?? '',
            pdv_cadence: ((c.pdv_cadence ?? 'none') as PdvCadence),
            notes: c.notes ?? '',
          }}
          validationSchema={editSchema}
          onSubmit={async (values, { setSubmitting, setStatus }) => {
            setStatus(null)
            try {
              await updateClient.mutateAsync({
                id: c.id,
                patch: {
                  name: values.name.trim(),
                  pib: values.pib.trim() || null,
                  mb: values.mb.trim() || null,
                  pdv_cadence: values.pdv_cadence,
                  notes: values.notes.trim() || null,
                },
              })
              setIsEditing(false)
            } catch (err) {
              setStatus(
                err instanceof Error ? err.message : 'Greška pri čuvanju',
              )
              setSubmitting(false)
            }
          }}
        >
          {({ isSubmitting, status, errors, touched }) => (
            <Form
              noValidate
              className="mb-6 space-y-3 rounded-lg border border-border bg-background p-5 shadow-sm"
            >
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Naziv firme *
                  </label>
                  <Field
                    name="name"
                    autoFocus
                    disabled={isSubmitting}
                    className={cn(
                      'w-full rounded-md border bg-background px-3 py-2 text-sm',
                      'focus:outline-none focus:ring-2 focus:ring-primary/40',
                      touched.name && errors.name
                        ? 'border-destructive'
                        : 'border-border',
                    )}
                  />
                  <ErrorMessage
                    name="name"
                    component="div"
                    className="mt-1 text-xs text-destructive"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">PIB</label>
                  <Field
                    name="pib"
                    inputMode="numeric"
                    disabled={isSubmitting}
                    className={cn(
                      'w-full rounded-md border bg-background px-3 py-2 text-sm',
                      'focus:outline-none focus:ring-2 focus:ring-primary/40',
                      touched.pib && errors.pib
                        ? 'border-destructive'
                        : 'border-border',
                    )}
                  />
                  <ErrorMessage
                    name="pib"
                    component="div"
                    className="mt-1 text-xs text-destructive"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Matični broj
                  </label>
                  <Field
                    name="mb"
                    inputMode="numeric"
                    disabled={isSubmitting}
                    className={cn(
                      'w-full rounded-md border bg-background px-3 py-2 text-sm',
                      'focus:outline-none focus:ring-2 focus:ring-primary/40',
                      touched.mb && errors.mb
                        ? 'border-destructive'
                        : 'border-border',
                    )}
                  />
                  <ErrorMessage
                    name="mb"
                    component="div"
                    className="mt-1 text-xs text-destructive"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  PDV
                </label>
                <div
                  role="radiogroup"
                  aria-label="PDV cadence"
                  className="flex flex-wrap gap-2"
                >
                  {(['monthly', 'quarterly', 'none'] as PdvCadence[]).map((c) => (
                    <label
                      key={c}
                      className={cn(
                        'inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition',
                        'has-[input:checked]:border-primary has-[input:checked]:bg-primary/5',
                        'border-border hover:bg-accent/50',
                      )}
                    >
                      <Field
                        type="radio"
                        name="pdv_cadence"
                        value={c}
                        disabled={isSubmitting}
                        className="size-3.5"
                      />
                      {PDV_LABELS[c]}
                    </label>
                  ))}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Mesečni klijenti dobijaju tiket svakog meseca; kvartalni samo
                  u aprilu, julu, oktobru i januaru.
                </p>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Beleške</label>
                <Field
                  as="textarea"
                  name="notes"
                  rows={4}
                  disabled={isSubmitting}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              {status && (
                <div
                  role="alert"
                  className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
                >
                  {status}
                </div>
              )}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  disabled={isSubmitting}
                  className="rounded-md border border-border px-3 py-2 text-sm hover:bg-accent disabled:opacity-50"
                >
                  Otkaži
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Save className="size-4" />
                  )}
                  Sačuvaj
                </button>
              </div>
            </Form>
          )}
        </Formik>
      )}

      {/* Tickets */}
      <div className="rounded-lg border border-border bg-background">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-medium">Tiketi</h2>
        </div>

        {tickets.isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : tickets.data && tickets.data.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            Još nema tiketa za ovog klijenta.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {(tickets.data ?? []).map((t) => {
              const Icon = typeIcon[t.type]
              return (
                <li
                  key={t.id}
                  className="flex items-start gap-3 px-4 py-3"
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
                    <div className="mt-0.5 flex gap-3 text-xs text-muted-foreground">
                      <span>{columnNameById.get(t.column_id) ?? '—'}</span>
                      {t.rok && <span>rok: {formatShortDate(t.rok)}</span>}
                      {t.closed_at && (
                        <span className="text-emerald-600">završeno</span>
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

function PdvBadge({ cadence }: { cadence: PdvCadence }) {
  if (cadence === 'none') return null
  const isMonthly = cadence === 'monthly'
  return (
    <span
      className={cn(
        'rounded px-1.5 py-0.5 font-medium',
        isMonthly
          ? 'bg-emerald-100 text-emerald-800'
          : 'bg-amber-100 text-amber-800',
      )}
      title={`PDV: ${PDV_LABELS[cadence]}`}
    >
      PDV: {isMonthly ? 'M' : 'Q'}
    </span>
  )
}
