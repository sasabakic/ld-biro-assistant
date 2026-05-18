-- ============================================================================
-- 0003_pdv.sql
--
-- Per-client PDV cadence + monthly auto-generated reminder tickets.
--
-- pdv_periods is one row per (firm, year, month). It anchors idempotency for
-- the daily cron (unique constraint) and acts as the persistent "waiting on
-- decision" state when the 15th of the month falls on a weekend.
-- ============================================================================

-- 1) Client-level cadence
alter table public.clients
  add column pdv_cadence text not null default 'none'
    check (pdv_cadence in ('monthly', 'quarterly', 'none'));

create index clients_pdv_cadence_idx
  on public.clients (firm_id, pdv_cadence)
  where archived_at is null and pdv_cadence <> 'none';

comment on column public.clients.pdv_cadence is
  'monthly = ticket every month; quarterly = only Apr/Jul/Oct/Jan (Serbian quarters); none = no PDV reminder';

-- 2) Per-(firm, month) period record
create table public.pdv_periods (
  id                       uuid primary key default gen_random_uuid(),
  firm_id                  uuid not null references public.firms(id) on delete cascade,
  year                     int  not null,
  month                    int  not null check (month between 1 and 12),
  status                   text not null default 'pending_decision'
    check (status in ('pending_decision', 'ready')),
  chosen_rok               date,
  decided_at               timestamptz,
  tickets_generated_at     timestamptz,
  created_at               timestamptz not null default now(),
  unique (firm_id, year, month)
);

create index pdv_periods_pending_idx
  on public.pdv_periods (firm_id)
  where status = 'pending_decision';

comment on table public.pdv_periods is
  'One row per (firm, year, month). Created by daily cron. status=pending_decision means the 15th of that month is a weekend and the owner must pick the rok manually before tickets are generated.';

-- 3) Back-link from tickets to the PDV period that generated them
alter table public.tickets
  add column pdv_period_id uuid references public.pdv_periods(id) on delete set null;

create index tickets_pdv_period_idx on public.tickets (pdv_period_id) where pdv_period_id is not null;

-- 4) RLS for pdv_periods — owner-only
alter table public.pdv_periods enable row level security;

create policy pdv_periods_owner_all on public.pdv_periods
  for all
  using (firm_id = public.current_user_firm_id())
  with check (firm_id = public.current_user_firm_id());
