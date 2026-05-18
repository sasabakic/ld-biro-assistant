/// <reference types="@cloudflare/workers-types" />

import type { Env } from '../env'

/**
 * PDV monthly automation. Two surfaces:
 *
 *   runPdvSweep(env)        — invoked by the daily Cron Trigger. For every
 *                             firm, ensures a pdv_periods row exists for the
 *                             current Belgrade month and, if the 15th is a
 *                             weekday, generates tickets immediately.
 *
 *   handlePdvDecide(...)    — invoked by the FE blocking modal. Caller
 *                             provides {period_id, chosen_rok}; we update the
 *                             period and generate tickets.
 *
 * Both use the service-role key — the cron has no user JWT, and the decision
 * endpoint runs server-side to keep ticket generation as a single atomic
 * server-controlled step (FE can't bypass cadence rules).
 */

type Firm = { id: string; owner_user_id: string }
type Client = { id: string; name: string; pdv_cadence: 'monthly' | 'quarterly' | 'none' }
type Column = { id: string }
type Period = {
  id: string
  firm_id: string
  year: number
  month: number
  status: 'pending_decision' | 'ready'
  chosen_rok: string | null
  tickets_generated_at: string | null
}

const MONTH_NAMES_SR = [
  'januar', 'februar', 'mart', 'april', 'maj', 'jun',
  'jul', 'avgust', 'septembar', 'oktobar', 'novembar', 'decembar',
]

const QUARTERLY_FILING_MONTHS = new Set([1, 4, 7, 10]) // Apr/Jul/Oct/Jan filing for prior quarter

// ---------------------------------------------------------------------------
// Public entry points
// ---------------------------------------------------------------------------

export async function runPdvSweep(env: Env): Promise<void> {
  const today = belgradeToday()
  const firms = await listFirms(env)

  for (const firm of firms) {
    try {
      await processFirm(env, firm, today)
    } catch (err) {
      // Don't let one firm break the whole sweep. Log and continue.
      console.error(`PDV sweep failed for firm ${firm.id}:`, err)
    }
  }
}

export async function handlePdvDecide(request: Request, env: Env): Promise<Response> {
  let body: { period_id?: string; chosen_rok?: string }
  try {
    body = await request.json()
  } catch {
    return jsonResponse({ error: 'invalid JSON' }, 400)
  }
  if (!body.period_id || !body.chosen_rok) {
    return jsonResponse({ error: 'period_id and chosen_rok required' }, 400)
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(body.chosen_rok)) {
    return jsonResponse({ error: 'chosen_rok must be YYYY-MM-DD' }, 400)
  }

  // Forward the user's JWT so RLS confirms they own this firm before we
  // proceed with service-role inserts.
  const userToken = (request.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (!userToken) return jsonResponse({ error: 'missing auth' }, 401)

  const period = await fetchPeriodAsUser(env, body.period_id, userToken)
  if (!period) return jsonResponse({ error: 'period not found or not yours' }, 404)
  if (period.status === 'ready') {
    return jsonResponse({ ok: true, already_ready: true })
  }

  await markPeriodReady(env, period.id, body.chosen_rok)
  await generateTicketsForPeriod(env, { ...period, status: 'ready', chosen_rok: body.chosen_rok })

  return jsonResponse({ ok: true })
}

// ---------------------------------------------------------------------------
// Per-firm processing
// ---------------------------------------------------------------------------

async function processFirm(env: Env, firm: Firm, today: { y: number; m: number }): Promise<void> {
  const existing = await fetchPeriod(env, firm.id, today.y, today.m)

  if (existing) {
    // Idempotent path: row exists, possibly tickets too.
    if (existing.status === 'ready' && !existing.tickets_generated_at) {
      await generateTicketsForPeriod(env, existing)
    }
    return
  }

  // No row yet — decide branch based on the 15th.
  const day15 = new Date(Date.UTC(today.y, today.m - 1, 15))
  const dow = day15.getUTCDay() // 0 = Sun, 6 = Sat
  const isWeekend = dow === 0 || dow === 6

  if (isWeekend) {
    await createPeriod(env, {
      firm_id: firm.id,
      year: today.y,
      month: today.m,
      status: 'pending_decision',
      chosen_rok: null,
    })
    return
  }

  const rok = `${today.y}-${pad(today.m)}-15`
  const period = await createPeriod(env, {
    firm_id: firm.id,
    year: today.y,
    month: today.m,
    status: 'ready',
    chosen_rok: rok,
  })
  await generateTicketsForPeriod(env, period)
}

async function generateTicketsForPeriod(env: Env, period: Period): Promise<void> {
  if (!period.chosen_rok) return
  if (period.tickets_generated_at) return

  const owner = await fetchFirmOwner(env, period.firm_id)
  if (!owner) {
    console.error(`No owner for firm ${period.firm_id}, cannot create tickets`)
    return
  }

  const inbox = await fetchInboxColumn(env, period.firm_id)
  if (!inbox) {
    console.error(`No Inbox column for firm ${period.firm_id}, cannot create tickets`)
    return
  }

  const dueThisMonth = await fetchDueClients(env, period.firm_id, period.month)

  if (dueThisMonth.length === 0) {
    await markPeriodGenerated(env, period.id)
    return
  }

  // Defensive: skip clients that already have a ticket for this period
  // (in case of partial prior run).
  const existingClientIds = await fetchExistingPeriodClientIds(env, period.id)
  const monthLabel = `${MONTH_NAMES_SR[period.month - 1]} ${period.year}`
  const rokTimestamp = `${period.chosen_rok}T16:00:00+02:00` // end-of-workday Belgrade

  const rows = dueThisMonth
    .filter((c) => !existingClientIds.has(c.id))
    .map((c) => ({
      firm_id: period.firm_id,
      client_id: c.id,
      column_id: inbox.id,
      created_by_user_id: owner.owner_user_id,
      created_via: 'recurring',
      type: 'zaduzenje',
      title: `PDV za ${monthLabel} — ${c.name}`,
      rok: rokTimestamp,
      pdv_period_id: period.id,
    }))

  if (rows.length > 0) {
    await insertTickets(env, rows)
  }

  await markPeriodGenerated(env, period.id)
}

async function fetchDueClients(env: Env, firmId: string, month: number): Promise<Client[]> {
  const all = await sbFetch<Client[]>(
    env,
    `/rest/v1/clients?firm_id=eq.${firmId}&archived_at=is.null&pdv_cadence=neq.none&select=id,name,pdv_cadence`,
    { method: 'GET' },
    'service',
  )
  return (all ?? []).filter((c) =>
    c.pdv_cadence === 'monthly' ||
    (c.pdv_cadence === 'quarterly' && QUARTERLY_FILING_MONTHS.has(month)),
  )
}

// ---------------------------------------------------------------------------
// Supabase calls
// ---------------------------------------------------------------------------

async function listFirms(env: Env): Promise<Firm[]> {
  const data = await sbFetch<Firm[]>(
    env,
    `/rest/v1/firms?select=id,owner_user_id`,
    { method: 'GET' },
    'service',
  )
  return data ?? []
}

async function fetchPeriod(env: Env, firmId: string, year: number, month: number): Promise<Period | null> {
  const data = await sbFetch<Period[]>(
    env,
    `/rest/v1/pdv_periods?firm_id=eq.${firmId}&year=eq.${year}&month=eq.${month}&select=*`,
    { method: 'GET' },
    'service',
  )
  return (data && data[0]) ?? null
}

async function fetchPeriodAsUser(env: Env, periodId: string, userToken: string): Promise<Period | null> {
  const data = await sbFetchWithToken<Period[]>(
    env,
    `/rest/v1/pdv_periods?id=eq.${periodId}&select=*`,
    { method: 'GET' },
    userToken,
  )
  return (data && data[0]) ?? null
}

async function createPeriod(
  env: Env,
  row: Omit<Period, 'id' | 'tickets_generated_at'>,
): Promise<Period> {
  // Use upsert-style insert with on_conflict to safely re-run.
  const data = await sbFetch<Period[]>(
    env,
    `/rest/v1/pdv_periods?on_conflict=firm_id,year,month`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        prefer: 'return=representation,resolution=ignore-duplicates',
      },
      body: JSON.stringify(row),
    },
    'service',
  )
  if (data && data[0]) return data[0]

  // Conflict — fetch the existing row.
  const existing = await fetchPeriod(env, row.firm_id, row.year, row.month)
  if (!existing) throw new Error('createPeriod: insert + refetch both failed')
  return existing
}

async function markPeriodReady(env: Env, periodId: string, chosenRok: string): Promise<void> {
  await sbFetch(
    env,
    `/rest/v1/pdv_periods?id=eq.${periodId}`,
    {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        status: 'ready',
        chosen_rok: chosenRok,
        decided_at: new Date().toISOString(),
      }),
    },
    'service',
  )
}

async function markPeriodGenerated(env: Env, periodId: string): Promise<void> {
  await sbFetch(
    env,
    `/rest/v1/pdv_periods?id=eq.${periodId}`,
    {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tickets_generated_at: new Date().toISOString() }),
    },
    'service',
  )
}

async function fetchFirmOwner(env: Env, firmId: string): Promise<Firm | null> {
  const data = await sbFetch<Firm[]>(
    env,
    `/rest/v1/firms?id=eq.${firmId}&select=id,owner_user_id`,
    { method: 'GET' },
    'service',
  )
  return (data && data[0]) ?? null
}

async function fetchInboxColumn(env: Env, firmId: string): Promise<Column | null> {
  const data = await sbFetch<Column[]>(
    env,
    `/rest/v1/columns?firm_id=eq.${firmId}&order=position.asc&limit=1&select=id`,
    { method: 'GET' },
    'service',
  )
  return (data && data[0]) ?? null
}

async function fetchExistingPeriodClientIds(env: Env, periodId: string): Promise<Set<string>> {
  const data = await sbFetch<{ client_id: string }[]>(
    env,
    `/rest/v1/tickets?pdv_period_id=eq.${periodId}&select=client_id`,
    { method: 'GET' },
    'service',
  )
  return new Set((data ?? []).map((r) => r.client_id))
}

async function insertTickets(env: Env, rows: unknown[]): Promise<void> {
  await sbFetch(
    env,
    `/rest/v1/tickets`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(rows),
    },
    'service',
  )
}

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

async function sbFetch<T = unknown>(
  env: Env,
  path: string,
  init: RequestInit,
  auth: 'service' | 'anon',
): Promise<T | null> {
  const key = auth === 'service' ? env.SUPABASE_SERVICE_ROLE_KEY : env.SUPABASE_ANON_KEY
  const res = await fetch(`${env.SUPABASE_URL}${path}`, {
    ...init,
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`,
      ...(init.headers ?? {}),
    },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Supabase ${init.method} ${path} → ${res.status}: ${text}`)
  }
  if (res.status === 204) return null
  const text = await res.text()
  return text ? (JSON.parse(text) as T) : null
}

async function sbFetchWithToken<T = unknown>(
  env: Env,
  path: string,
  init: RequestInit,
  userToken: string,
): Promise<T | null> {
  const res = await fetch(`${env.SUPABASE_URL}${path}`, {
    ...init,
    headers: {
      apikey: env.SUPABASE_ANON_KEY,
      authorization: `Bearer ${userToken}`,
      ...(init.headers ?? {}),
    },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Supabase (user) ${init.method} ${path} → ${res.status}: ${text}`)
  }
  if (res.status === 204) return null
  const text = await res.text()
  return text ? (JSON.parse(text) as T) : null
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

// ---------------------------------------------------------------------------
// Time helpers (Belgrade)
// ---------------------------------------------------------------------------

function belgradeToday(): { y: number; m: number } {
  // 'sv-SE' gives ISO-like YYYY-MM-DD when combined with timeZone.
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Belgrade',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const y = Number(parts.find((p) => p.type === 'year')?.value)
  const m = Number(parts.find((p) => p.type === 'month')?.value)
  return { y, m }
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}
