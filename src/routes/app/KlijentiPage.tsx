import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ErrorMessage, Field, Form, Formik } from 'formik'
import * as Yup from 'yup'
import { Loader2, Plus, Search, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useClients, useCreateClient } from '@/hooks/useClients'
import { useFirm } from '@/hooks/useFirm'

const clientSchema = Yup.object({
  name: Yup.string().trim().required('Naziv je obavezan').max(120, 'Predugačko'),
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
  is_recurring: Yup.boolean(),
  notes: Yup.string().nullable(),
})

export function KlijentiPage() {
  const [search, setSearch] = useState('')
  const [addOpen, setAddOpen] = useState(false)

  const firm = useFirm()
  const clients = useClients()
  const createClient = useCreateClient()

  const filtered = useMemo(() => {
    const list = clients.data ?? []
    const q = search.trim().toLowerCase()
    if (!q) return list
    return list.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.pib?.includes(q) ?? false) ||
        (c.mb?.includes(q) ?? false),
    )
  }, [clients.data, search])

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:px-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Klijenti</h1>
        <button
          type="button"
          onClick={() => setAddOpen((o) => !o)}
          className={cn(
            'inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium',
            'bg-primary text-primary-foreground hover:bg-primary/90 transition',
          )}
        >
          {addOpen ? <X className="size-4" /> : <Plus className="size-4" />}
          {addOpen ? 'Otkaži' : 'Dodaj klijenta'}
        </button>
      </div>

      {addOpen && (
        <Formik
          initialValues={{
            name: '',
            pib: '',
            mb: '',
            is_recurring: false,
            notes: '',
          }}
          validationSchema={clientSchema}
          onSubmit={async (values, { resetForm, setSubmitting, setStatus }) => {
            setStatus(null)
            if (!firm.data) {
              setStatus('Firma još nije pronađena. Osveži stranicu.')
              setSubmitting(false)
              return
            }
            try {
              await createClient.mutateAsync({
                firm_id: firm.data.id,
                name: values.name.trim(),
                pib: values.pib.trim() || null,
                mb: values.mb.trim() || null,
                is_recurring: values.is_recurring,
                notes: values.notes.trim() || null,
              })
              resetForm()
              setAddOpen(false)
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
              className="mb-6 space-y-3 rounded-lg border border-border bg-background p-4 shadow-sm"
            >
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label
                    htmlFor="name"
                    className="mb-1 block text-sm font-medium"
                  >
                    Naziv firme *
                  </label>
                  <Field
                    id="name"
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

                <div className="flex items-end gap-3">
                  <label className="flex items-center gap-2 text-sm">
                    <Field
                      name="is_recurring"
                      type="checkbox"
                      disabled={isSubmitting}
                      className="size-4"
                    />
                    Stalni klijent (mesečni/kvartalni posao)
                  </label>
                </div>

                <div>
                  <label htmlFor="pib" className="mb-1 block text-sm font-medium">
                    PIB
                  </label>
                  <Field
                    id="pib"
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
                  <label htmlFor="mb" className="mb-1 block text-sm font-medium">
                    Matični broj
                  </label>
                  <Field
                    id="mb"
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
                <label htmlFor="notes" className="mb-1 block text-sm font-medium">
                  Beleške
                </label>
                <Field
                  as="textarea"
                  id="notes"
                  name="notes"
                  rows={2}
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
                  onClick={() => setAddOpen(false)}
                  disabled={isSubmitting}
                  className="rounded-md border border-border px-3 py-2 text-sm hover:bg-accent disabled:opacity-50"
                >
                  Otkaži
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !firm.data}
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                  Sačuvaj
                </button>
              </div>
            </Form>
          )}
        </Formik>
      )}

      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Pretraži po nazivu, PIB-u ili matičnom broju..."
          className="w-full rounded-md border border-border bg-background py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      {clients.isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {clients.error && (
        <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
          Greška pri učitavanju klijenata.
        </div>
      )}

      {clients.data && clients.data.length === 0 && (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <p className="text-sm font-medium">Još nemaš klijenata.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Klikni "Dodaj klijenta" da uneseš prvog.
          </p>
        </div>
      )}

      {clients.data && clients.data.length > 0 && filtered.length === 0 && (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Nema rezultata za "{search}".
        </div>
      )}

      {filtered.length > 0 && (
        <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-background">
          {filtered.map((c) => (
            <li key={c.id}>
              <Link
                to={`/app/klijent/${c.id}`}
                className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-accent/50 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{c.name}</div>
                  <div className="mt-0.5 flex gap-3 text-xs text-muted-foreground">
                    {c.pib && <span>PIB: {c.pib}</span>}
                    {c.mb && <span>MB: {c.mb}</span>}
                    {c.is_recurring && (
                      <span className="text-blue-600">stalni</span>
                    )}
                  </div>
                </div>
                {c.pdv_cadence === 'monthly' && (
                  <span
                    title="PDV: mesečno"
                    className="shrink-0 rounded bg-emerald-100 px-1.5 py-0.5 text-xs font-medium text-emerald-800"
                  >
                    M
                  </span>
                )}
                {c.pdv_cadence === 'quarterly' && (
                  <span
                    title="PDV: kvartalno"
                    className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800"
                  >
                    Q
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
