-- LD Biro Tracker · initial schema
-- See data-model.md for the design rationale.

create extension if not exists "uuid-ossp";

-- ============================================================================
-- firms
-- ============================================================================
create table public.firms (
  id              uuid primary key default uuid_generate_v4(),
  name            text not null,
  owner_user_id   uuid not null references auth.users(id) on delete restrict,
  created_at      timestamptz not null default now()
);

create index firms_owner_idx on public.firms (owner_user_id);

-- ============================================================================
-- clients
-- ============================================================================
create table public.clients (
  id              uuid primary key default uuid_generate_v4(),
  firm_id         uuid not null references public.firms(id) on delete cascade,
  name            text not null,
  pib             text,
  mb              text,
  notes           text,
  is_recurring    boolean not null default false,
  created_at      timestamptz not null default now(),
  archived_at     timestamptz
);

create index clients_firm_idx on public.clients (firm_id) where archived_at is null;
create index clients_name_trgm_idx on public.clients using gin (name gin_trgm_ops);
create extension if not exists pg_trgm;

-- ============================================================================
-- client_memberships  (which user belongs to which klijent firma)
-- ============================================================================
create table public.client_memberships (
  client_id            uuid not null references public.clients(id) on delete cascade,
  user_id              uuid not null references auth.users(id) on delete cascade,
  role                 text not null default 'primary',
  invited_by_user_id   uuid references auth.users(id),
  invited_at           timestamptz not null default now(),
  accepted_at          timestamptz,
  primary key (client_id, user_id)
);

create index cm_user_idx on public.client_memberships (user_id) where accepted_at is not null;

-- ============================================================================
-- columns
-- ============================================================================
create type column_visibility as enum ('primljeno', 'u_radu', 'ceka_tebe', 'gotovo', 'hidden');

create table public.columns (
  id                       uuid primary key default uuid_generate_v4(),
  firm_id                  uuid not null references public.firms(id) on delete cascade,
  name                     text not null,
  position                 integer not null,
  client_visible_mapping   column_visibility not null default 'u_radu',
  is_done                  boolean not null default false
);

create index columns_firm_pos_idx on public.columns (firm_id, position);

-- ============================================================================
-- recurrence_rules
-- ============================================================================
create type cadence as enum ('monthly', 'quarterly', 'annually');

create table public.recurrence_rules (
  id                  uuid primary key default uuid_generate_v4(),
  client_id           uuid not null references public.clients(id) on delete cascade,
  template_title      text not null,
  template_type       text not null default 'zaduzenje',
  cadence             cadence not null,
  day_of_period       integer not null check (day_of_period between 1 and 31),
  rok_offset_days     integer not null default 15 check (rok_offset_days >= 0),
  enabled             boolean not null default true,
  last_generated_at   timestamptz,
  created_at          timestamptz not null default now()
);

create index rr_client_idx on public.recurrence_rules (client_id) where enabled;

-- ============================================================================
-- tickets
-- ============================================================================
create type ticket_type as enum ('pitanje', 'zaduzenje', 'javicu_se');
create type created_via_t as enum ('voice', 'manual', 'portal', 'recurring');

create table public.tickets (
  id                    uuid primary key default uuid_generate_v4(),
  firm_id               uuid not null references public.firms(id) on delete cascade,
  client_id             uuid not null references public.clients(id) on delete cascade,
  column_id             uuid not null references public.columns(id) on delete restrict,
  created_by_user_id    uuid not null references auth.users(id),
  created_via           created_via_t not null,
  type                  ticket_type not null,
  title                 text not null,
  description           text,
  rok                   timestamptz,
  planirano_za          timestamptz,
  voice_transcript      text,
  recurrence_rule_id    uuid references public.recurrence_rules(id) on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  closed_at             timestamptz
);

create index tickets_firm_idx on public.tickets (firm_id);
create index tickets_client_idx on public.tickets (client_id);
create index tickets_column_idx on public.tickets (column_id);
create index tickets_open_idx on public.tickets (firm_id, planirano_za) where closed_at is null;

-- Auto-update updated_at on row change
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger tickets_touch_updated
  before update on public.tickets
  for each row execute function public.touch_updated_at();

-- ============================================================================
-- comments
-- ============================================================================
create table public.comments (
  id           uuid primary key default uuid_generate_v4(),
  ticket_id    uuid not null references public.tickets(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete restrict,
  body         text not null,
  created_at   timestamptz not null default now()
);

create index comments_ticket_idx on public.comments (ticket_id, created_at);

-- ============================================================================
-- attachments
-- ============================================================================
create table public.attachments (
  id                    uuid primary key default uuid_generate_v4(),
  ticket_id             uuid references public.tickets(id) on delete cascade,
  comment_id            uuid references public.comments(id) on delete cascade,
  file_url              text not null,
  file_name             text not null,
  file_size             integer not null,
  uploaded_by_user_id   uuid not null references auth.users(id),
  created_at            timestamptz not null default now(),
  check (ticket_id is not null or comment_id is not null)
);

create index attachments_ticket_idx on public.attachments (ticket_id) where ticket_id is not null;

-- ============================================================================
-- activity_log
-- ============================================================================
create table public.activity_log (
  id           uuid primary key default uuid_generate_v4(),
  ticket_id    uuid not null references public.tickets(id) on delete cascade,
  user_id      uuid not null references auth.users(id),
  action       text not null,
  from_value   jsonb,
  to_value     jsonb,
  created_at   timestamptz not null default now()
);

create index activity_ticket_idx on public.activity_log (ticket_id, created_at);

-- ============================================================================
-- invitations
-- ============================================================================
create table public.invitations (
  id                   uuid primary key default uuid_generate_v4(),
  client_id            uuid not null references public.clients(id) on delete cascade,
  email                text not null,
  invited_by_user_id   uuid not null references auth.users(id),
  token                text not null unique default replace(uuid_generate_v4()::text, '-', ''),
  expires_at           timestamptz not null default now() + interval '14 days',
  accepted_at          timestamptz,
  created_at           timestamptz not null default now()
);

create index invitations_token_idx on public.invitations (token) where accepted_at is null;

-- ============================================================================
-- helper functions for RLS
-- ============================================================================
create or replace function public.current_user_firm_id() returns uuid
language sql stable security definer set search_path = public, auth as $$
  select id from public.firms where owner_user_id = auth.uid() limit 1;
$$;

create or replace function public.current_user_client_ids() returns setof uuid
language sql stable security definer set search_path = public, auth as $$
  select client_id from public.client_memberships
  where user_id = auth.uid() and accepted_at is not null;
$$;

-- ============================================================================
-- RLS policies
-- ============================================================================
alter table public.firms enable row level security;
alter table public.clients enable row level security;
alter table public.client_memberships enable row level security;
alter table public.columns enable row level security;
alter table public.recurrence_rules enable row level security;
alter table public.tickets enable row level security;
alter table public.comments enable row level security;
alter table public.attachments enable row level security;
alter table public.activity_log enable row level security;
alter table public.invitations enable row level security;

-- firms: owner sees their own firm
create policy firms_owner_all on public.firms
  for all using (owner_user_id = auth.uid())
  with check (owner_user_id = auth.uid());

-- clients: owner sees all firm's clients; klijent users see their own client row
create policy clients_owner_all on public.clients
  for all using (firm_id = public.current_user_firm_id())
  with check (firm_id = public.current_user_firm_id());

create policy clients_member_select on public.clients
  for select using (id in (select public.current_user_client_ids()));

-- client_memberships
create policy cm_owner_all on public.client_memberships
  for all using (
    client_id in (select id from public.clients where firm_id = public.current_user_firm_id())
  );

create policy cm_self_select on public.client_memberships
  for select using (user_id = auth.uid());

-- columns: owner only
create policy columns_owner_all on public.columns
  for all using (firm_id = public.current_user_firm_id())
  with check (firm_id = public.current_user_firm_id());

-- recurrence_rules: owner only
create policy rr_owner_all on public.recurrence_rules
  for all using (
    client_id in (select id from public.clients where firm_id = public.current_user_firm_id())
  );

-- tickets: owner sees firm's tickets; klijent users see their client's tickets
create policy tickets_owner_all on public.tickets
  for all using (firm_id = public.current_user_firm_id())
  with check (firm_id = public.current_user_firm_id());

create policy tickets_member_select on public.tickets
  for select using (client_id in (select public.current_user_client_ids()));

create policy tickets_member_insert on public.tickets
  for insert with check (
    client_id in (select public.current_user_client_ids())
    and created_via = 'portal'
  );

-- comments: same scoping as tickets
create policy comments_owner_all on public.comments
  for all using (
    ticket_id in (select id from public.tickets where firm_id = public.current_user_firm_id())
  );

create policy comments_member_select on public.comments
  for select using (
    ticket_id in (
      select id from public.tickets
      where client_id in (select public.current_user_client_ids())
    )
  );

create policy comments_member_insert on public.comments
  for insert with check (
    user_id = auth.uid()
    and ticket_id in (
      select id from public.tickets
      where client_id in (select public.current_user_client_ids())
    )
  );

-- attachments: same scoping
create policy attachments_owner_all on public.attachments
  for all using (
    coalesce(
      ticket_id in (select id from public.tickets where firm_id = public.current_user_firm_id()),
      false
    )
  );

create policy attachments_member_select on public.attachments
  for select using (
    coalesce(
      ticket_id in (
        select id from public.tickets
        where client_id in (select public.current_user_client_ids())
      ),
      false
    )
  );

-- activity_log: owner sees all; klijent users see only their tickets' log
create policy activity_owner_select on public.activity_log
  for select using (
    ticket_id in (select id from public.tickets where firm_id = public.current_user_firm_id())
  );

create policy activity_owner_insert on public.activity_log
  for insert with check (user_id = auth.uid());

create policy activity_member_select on public.activity_log
  for select using (
    ticket_id in (
      select id from public.tickets
      where client_id in (select public.current_user_client_ids())
    )
  );

-- invitations: owner only
create policy invitations_owner_all on public.invitations
  for all using (
    client_id in (select id from public.clients where firm_id = public.current_user_firm_id())
  );
