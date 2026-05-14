# LD Biro Tracker — Work Remaining

> Self-directed instructions for picking this project back up cold.
> Read `data-model.md` and `walkthrough-za-sestru.md` first if you haven't. They are the source of truth for design intent.

---

## Where you are right now (status as of 2026-05-09)

**Done:**
- ✅ Project scaffolded (Vite + React 19 + TS, Tailwind v4, dnd-kit, Formik+Yup, TanStack Query, React Router v7)
- ✅ Git initialized; commits on `main`: scaffold → Supabase setup → TODO/gitignore tightening
- ✅ Supabase CLI installed; project linked (`project-ref msmmqvhuaottexqypcwa`)
- ✅ Both migrations applied to remote (`0001_init.sql`, `0002_seed_columns.sql`)
- ✅ TypeScript types generated from live schema → `src/lib/database.types.ts`
- ✅ `.env` and `.dev.vars` filled with Supabase URL + anon key (Vite and wrangler both reach Supabase)
- ✅ `.dev.vars` added to `.gitignore` (was a leak risk)

**Pending bootstrap — exactly two manual steps remain:**

1. **Create the owner user.** Supabase dashboard → Authentication → Users → "Add user" → her email + a password → ✅ "Auto Confirm User". Copy the generated `user_id` (UUID format `xxxxxxxx-xxxx-...`).

2. **Insert the firm row pointing to that user_id.** Supabase dashboard → SQL Editor:
   ```sql
   insert into public.firms (name, owner_user_id)
   values ('LD Biro', '<paste-the-user-id-from-step-1>');
   ```
   The `firms_seed_columns` trigger from migration 0002 fires automatically and creates the 5 default kanban columns. Verify it worked: Table Editor → `columns` should show 5 rows (Inbox, U toku, Čeka klijenta, Čeka treću stranu, Gotovo).

After those two, Supabase is 100% ready. The app's UI still shows **mock data** because the React code isn't wired to live queries yet — that is the first coding task.

**First coding task when you return: [#1 Wire authentication](#1-wire-authentication).**
- LoginPage form (Formik + `supabase.auth.signInWithPassword`)
- `useSession()` hook in `src/lib/auth.ts`
- Auth guard in `AppLayout` (redirect to `/login` if no session, redirect klijent users to `/portal`)
- Auth guard in `PortalLayout` (require valid `client_memberships` row)
- After: log in as the owner you just created → kanban renders → ready to wire live data (task #2)

**Sanity check before coding:** `bun run dev` should boot to `http://localhost:5173` without console errors. The kanban will display mock cards but Supabase is now reachable in the background — open DevTools network tab and you should see no failed requests on idle.

**API keys still needed (not blocking until you build voice flow):**
- Groq API key → <https://console.groq.com> → paste into `GROQ_API_KEY` in `.dev.vars`
- Gemini API key → <https://aistudio.google.com/apikey> → paste into `GEMINI_API_KEY` in `.dev.vars`

**Deploy not yet set up (do after auth + live kanban work):**
- Cloudflare Pages project not yet created
- Same env vars need to be configured in Cloudflare dashboard (Settings → Environment Variables, mark each as "secret")
- UptimeRobot/Cron-job.org daily ping → `https://tracker.<domain>/api/health` once deployed
- Custom subdomain (e.g. `tracker.<domain>`) → CNAME to Pages project

**Reference IDs (don't paste anywhere public except where listed):**
- Supabase project ref: `msmmqvhuaottexqypcwa` (public, in URL — fine to commit)
- Supabase URL: `https://msmmqvhuaottexqypcwa.supabase.co` (public)
- Supabase anon key: in `.env` / `.dev.vars` (public per Supabase, but kept out of git via `.gitignore`)
- Supabase service_role key: NOT used in v1. If ever needed, treat like a root password.

---

## Project at a glance

Voice-first ticket tracker for an interrupt-driven accounting workflow. Owner (Sasa's sister at LD Biro, Serbia) records voice notes after client calls; Whisper transcribes; Gemini parses into structured tickets; tickets land in a kanban with day-filtered focus view. Klijent firms (~70 active) get a portal where they can submit and track their own tickets.

**Volume:** ~50 calls/day, ~70 stalnih klijenata. **Cost target:** $0/mo (all free tier).
**Stack:** Vite + React 19 + TS · Cloudflare Pages + Pages Functions · Supabase Free · Groq Whisper-Large-V3 · Gemini 2.5 Flash-Lite. Bun 1.3.13. Tailwind v4. dnd-kit, Formik+Yup, TanStack Query, React Router v7.

## What's already done (don't redo)

- Vite + React + TS scaffolded; `bun install`, `bun run dev`, `bun run build`, `bun run typecheck` all work
- Tailwind v4 wired via `@tailwindcss/vite` (config inline in `src/index.css`)
- Routing structure (`/app/*` for owner, `/portal/*` for klijent, `/login` for auth)
- Layouts: `AppLayout` (responsive sidebar/bottom-nav), `PortalLayout`, `AuthLayout`
- Kanban skeleton with **mock data** in `TablaPage` — dnd-kit drag/drop between columns, day filter pills, type badges (📞/📋/❓)
- Voice capture page (`SnimiPage`) with `MediaRecorder` — hold-to-talk, posts to `/api/voice`, shows parsed-card preview
- Pages Function `functions/api/voice.ts` — accepts audio multipart, calls Groq Whisper, calls Gemini Flash-Lite with structured-output schema, returns parsed ticket. **Does NOT persist to DB yet** (TODO marked in file).
- Pages Function `functions/api/health.ts` — daily uptime cron target
- Full Supabase schema in `supabase/migrations/0001_init.sql` — 10 tables, RLS policies, helper functions `current_user_firm_id()` and `current_user_client_ids()`
- `0002_seed_columns.sql` — trigger that auto-creates default 5 kanban columns on every new firm row
- README, `.env.example`, `wrangler.toml`

---

## Table of contents

1. [One-time setup (pre-launch)](#one-time-setup-pre-launch)
2. [Active dev tasks, in dependency order](#active-dev-tasks-in-dependency-order)
   - [1. Wire authentication](#1-wire-authentication)
   - [2. Replace mock kanban data with live Supabase queries](#2-replace-mock-kanban-data-with-live-supabase-queries)
   - [3. Persist voice-captured tickets to DB](#3-persist-voice-captured-tickets-to-db)
   - [4. Klijenti list + detail pages](#4-klijenti-list--detail-pages)
   - [5. Invitation flow for klijent users](#5-invitation-flow-for-klijent-users)
   - [6. Portal pages (klijent side)](#6-portal-pages-klijent-side)
   - [7. Activity log writes](#7-activity-log-writes)
   - [8. Recurring ticket generator](#8-recurring-ticket-generator)
   - [9. End-of-day review flow](#9-end-of-day-review-flow)
   - [10. Podešavanja page (settings)](#10-podešavanja-page-settings)
   - [11. shadcn-style component primitives](#11-shadcn-style-component-primitives)
   - [12. File attachments via R2](#12-file-attachments-via-r2)
3. [Cross-cutting concerns](#cross-cutting-concerns)
4. [Deferred / open questions](#deferred--open-questions)
5. [Testing checklist before handing to her](#testing-checklist-before-handing-to-her)

---

## One-time setup (pre-launch)

Reference for the full bootstrap. Most of this is already done — see "Where you are right now" above for current status.

1. **Supabase project** — created via dashboard (Free tier), then linked locally:
   - `brew install supabase/tap/supabase`
   - `supabase login` (run in a real Terminal — non-TTY can't OAuth)
   - `supabase init` in project root → creates `supabase/config.toml`
   - `supabase link --project-ref <ref>`
   - `supabase db push` → applies all migrations from `supabase/migrations/`
   - `supabase gen types typescript --linked > src/lib/database.types.ts` → regenerate after any schema change
   - Dashboard → Settings → Authentication → Providers → enable Email (default); Google OAuth deferred
   - Dashboard → Authentication → Users → "Add user" with auto-confirm to create the owner user
   - Dashboard → SQL Editor (or `supabase db remote query`):
     ```sql
     insert into public.firms (name, owner_user_id) values ('LD Biro', '<owner-user-id>');
     ```
     The `firms_seed_columns` trigger creates the default 5 kanban columns automatically.
2. **Groq API key** — <https://console.groq.com> → API Keys → Create. Free tier ~2hr audio/day. Goes into `GROQ_API_KEY` in `.dev.vars` (local) and Cloudflare Pages env (prod).
3. **Gemini API key** — <https://aistudio.google.com/apikey> → Create. Free tier 1,500 req/day on Flash-Lite. Goes into `GEMINI_API_KEY` in same places.
4. **Local env:** `cp .env.example .env && cp .env.example .dev.vars`, then fill in:
   - `.env` is for Vite (only `VITE_*` keys are read; only those reach the browser bundle)
   - `.dev.vars` is for `wrangler pages dev` (Pages Functions)
   - Both are gitignored.
5. **Cloudflare Pages:**
   - Connect Git repo
   - Build command `bun run build`, output dir `dist`
   - Production env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `GROQ_API_KEY`, `GEMINI_API_KEY`
   - Custom domain: subdomain (e.g., `tracker.<domain>`) → CNAME to Pages project
6. **Daily uptime cron** — UptimeRobot or Cron-job.org → daily HTTP GET to `https://tracker.<domain>/api/health`. Critical to prevent Supabase 7-day inactivity pause.

---

## Active dev tasks, in dependency order

### 1. Wire authentication

**Why first:** every other feature needs `auth.uid()` available. RLS policies depend on it. Mock data hides this cost.

**Files to touch:**
- `src/routes/auth/LoginPage.tsx` — currently a stub with a TODO. Build the form.
- `src/layouts/AppLayout.tsx` — add session guard (redirect to `/login` if no session).
- `src/layouts/PortalLayout.tsx` — same guard, plus check that the user is a klijent member (i.e., `current_user_client_ids()` returns at least one row).
- New: `src/lib/auth.ts` — `useSession()` hook wrapping `supabase.auth.onAuthStateChange`.

**Pattern:**
```tsx
// src/lib/auth.ts
import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'

export function useSession() {
  const [session, setSession] = useState<Session | null | undefined>(undefined) // undefined = loading
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])
  return session
}
```

In `AppLayout`, gate render on `useSession()`:
- `undefined` → show loading skeleton
- `null` → `<Navigate to="/login" replace />`
- session present → render `<Outlet />`

For the `/portal` side, add a second check: query `client_memberships` for `user_id = session.user.id and accepted_at is not null`. If none, the user is the owner (or unrelated) — redirect to `/app`.

**LoginPage form:** Formik + Yup, two fields (email + password). On submit, `supabase.auth.signInWithPassword({ email, password })`. On success, react to `onAuthStateChange` (router will re-render and AppLayout/PortalLayout decide where to send them).

**Routing decision after login:** owner → `/app/tabla`, klijent member → `/portal/zahtevi`. Pick a strategy:
- Option A: a `/dispatch` route that checks `current_user_firm_id()` vs `current_user_client_ids()` and redirects.
- Option B: AppLayout itself redirects klijent users to `/portal`. Simpler.
- Pick B unless we hit a real reason for A.

**Sign-up:** for v1, owner is created manually (see one-time setup). Klijent users sign up via invitation flow (task #5), not directly. So no public signup form.

**Sign-out:** add to a header dropdown later. For now a simple button somewhere — `await supabase.auth.signOut()`.

**Gotchas:**
- `supabase.auth.getSession()` returns `null` while still hydrating from localStorage on first render. Use the `undefined` sentinel above to avoid flashing the login page.
- Google OAuth: `supabase.auth.signInWithOAuth({ provider: 'google' })`. Requires configuring redirect URL in Supabase dashboard. Defer to v1.1.

---

### 2. Replace mock kanban data with live Supabase queries

**Why before voice persistence:** lets us see the kanban update when voice tickets are inserted.

**Files:**
- `src/routes/app/TablaPage.tsx` — currently has `MOCK_COLUMNS` and `MOCK_TICKETS`. Replace with TanStack Query hooks.
- New: `src/hooks/useColumns.ts`, `src/hooks/useTickets.ts`, `src/hooks/useMoveTicket.ts`.

**Queries:**
```ts
// useColumns
supabase.from('columns').select('*').order('position')

// useTickets — open tickets only (closed_at is null)
supabase.from('tickets').select(`
  id, client_id, column_id, type, title, rok, planirano_za, closed_at,
  client:clients(name)
`).is('closed_at', null)
```

**Day filter math:**
The current mock uses string `'danas' | 'sutra' | null`. Real `planirano_za` is `timestamptz`. Filter logic should be:

```ts
import { startOfDay, endOfDay, addDays } from 'date-fns'
import { utcToZonedTime } from 'date-fns-tz' // need to add this dep

const TZ = 'Europe/Belgrade'

function inRange(t: Ticket, filter: DayFilter) {
  const today = startOfDay(utcToZonedTime(new Date(), TZ))
  const dayMatches = (date: string | null, day: Date) =>
    date && startOfDay(utcToZonedTime(new Date(date), TZ)).getTime() === day.getTime()

  if (filter === 'sve') return true
  if (filter === 'danas') {
    return dayMatches(t.planirano_za, today) || dayMatches(t.rok, today)
  }
  // sutra: today + 1
  // nedelja: today..today+6
}
```

Add `date-fns-tz` dependency: `bun add date-fns-tz`.

**Drag-drop persistence:**
```ts
// useMoveTicket — optimistic update
const mutation = useMutation({
  mutationFn: ({ id, columnId }) =>
    supabase.from('tickets').update({ column_id: columnId }).eq('id', id),
  onMutate: ({ id, columnId }) => {
    // optimistic update of cached list
    queryClient.setQueryData(['tickets'], (old) =>
      old?.map(t => t.id === id ? { ...t, column_id: columnId } : t)
    )
  },
  onError: () => queryClient.invalidateQueries({ queryKey: ['tickets'] }), // revert
})
```

Replace the `setTickets` call in `handleDragEnd` with `mutation.mutate({ id, columnId })`.

**Realtime subscriptions (optional, v1.1):**
`supabase.channel('tickets').on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, ...)` — useful for two-tab sync but not required for v1.

**Gotchas:**
- The `client_id` on a ticket needs to resolve to a client name. Use Supabase's nested-select syntax (`client:clients(name)`) or a join hook.
- RLS: owner sees all firm tickets via `tickets_owner_all` policy. No special handling needed.
- Empty state: when there are 0 tickets, show a friendly "Snimi prvi tiket" CTA pointing to `/app/snimi`.

---

### 3. Persist voice-captured tickets to DB

**File:** `functions/api/voice.ts`. The TODO is already marked. The function currently returns parsed JSON; it should also insert.

**Two design decisions to nail:**

**a) Auth context in the Worker.**
The Pages Function needs to act *as the user* so RLS applies cleanly. Strategy:
1. Frontend sends `Authorization: Bearer <session.access_token>` with the audio upload.
2. Worker forwards that token when calling Supabase REST (PostgREST) — standard Supabase JWT auth.
3. RLS policies use `auth.uid()` derived from the JWT. The owner's `current_user_firm_id()` resolves correctly.

```ts
// in voice.ts after parsing:
const authHeader = request.headers.get('authorization') ?? ''
const supabaseRes = await fetch(`${env.SUPABASE_URL}/rest/v1/tickets`, {
  method: 'POST',
  headers: {
    apikey: env.SUPABASE_ANON_KEY,
    authorization: authHeader, // user's JWT, not anon
    'content-type': 'application/json',
    prefer: 'return=representation',
  },
  body: JSON.stringify({
    firm_id, // resolved separately, see below
    client_id, // resolved separately
    column_id, // default to Inbox column id
    created_via: 'voice',
    type: parsed.type,
    title: parsed.title,
    description: parsed.notes,
    rok: parseRok(parsed.rok), // string → timestamptz
    voice_transcript: transcript,
  }),
})
```

Add `SUPABASE_URL` and `SUPABASE_ANON_KEY` to `Env` interface in `voice.ts`.

**b) Client name resolution.**
Gemini extracts `client_name` as free-text. We need to map to `clients.id`. Two-step strategy:
1. Look up by exact-ish match in the firm's clients (case-insensitive, ILIKE on `name`).
2. If 0 matches → return parsed ticket with `unmatched_client_name` and let the FE render a "pick the client" picker before saving.
3. If exactly 1 match → auto-link, save, done.
4. If >1 match → return candidates, FE picker shows them.

```ts
// fuzzy match query
const { data: candidates } = await supabaseFetch(`/rest/v1/clients?select=id,name&firm_id=eq.${firmId}&name=ilike.*${encodeURIComponent(parsed.client_name)}*`, authHeader)
```

For v1, simplest: if 1 exact match (case-insensitive), auto-link; otherwise return parsed without inserting and let the FE prompt. The current `SnimiPage` already shows a parsed-card preview — extend it to include a client picker if `unmatched_client_name` is present.

**Default column resolution:**
Voice tickets land in the firm's "Inbox" column. Look up by `firm_id` + position=1, or by name='Inbox'. Cache this in a hook (it doesn't change often).

**Date parsing:**
Gemini may return `rok` as Serbian text ("danas do 16h", "15. juni", "sutra ujutru"). Two options:
- Have Gemini emit ISO 8601 strings directly (update the prompt + schema).
- Parse the text in the Worker with a small helper.

**Recommendation:** force Gemini to emit `rok_iso` as ISO 8601 (or null) by updating the schema and prompt. Cheaper and more reliable than parsing Serbian strings. Then `parseRok` becomes trivial.

**Gotchas:**
- The `tickets_member_insert` RLS policy is for *klijent users* submitting via portal (it requires `created_via = 'portal'`). The owner inserting via voice goes through `tickets_owner_all`, which is permissive.
- If you switch to service-role auth instead of user JWT, you bypass RLS entirely — risky. Stick with user JWT.

---

### 4. Klijenti list + detail pages

**Files:** `src/routes/app/KlijentiPage.tsx`, `src/routes/app/KlijentDetaljPage.tsx`.

**KlijentiPage:**
- Table or card grid of all clients (70 max — search/filter mandatory)
- Search-as-you-type filter on `name` (Postgres `ILIKE` is fine; the `pg_trgm` GIN index in migration 0001 makes it fast)
- "Dodaj klijenta" button → modal with form (name, pib, mb, is_recurring, notes)
- Click row → `/app/klijent/:id`

**KlijentDetaljPage tabs:**
- **Tiketi** — filtered list of tickets for this client, all statuses
- **Korisnici** — list of `client_memberships`, "Pozovi korisnika" button (see task #5)
- **Recurring** — list of `recurrence_rules`, edit/add/delete
- **Beleške** — `notes` field, big textarea, save on blur

**Pattern:** TanStack Query for each tab's data, lazy-load on tab activation.

**Gotchas:**
- Archiving (soft delete) sets `archived_at`. Don't actually `DELETE` — accountants need history.
- Adding a client should be instant (one form). Don't gate with confirmation modals.

---

### 5. Invitation flow for klijent users

**Files:**
- `KlijentDetaljPage` Korisnici tab — list + invite button
- New page: `src/routes/auth/AcceptInvitePage.tsx` — `/invite/:token`
- New Pages Function: `functions/api/invite/send.ts` — sends invite email
- Possibly: `functions/api/invite/accept.ts` — server-side acceptance

**Flow:**
1. Owner clicks "Pozovi korisnika" on KlijentDetaljPage → modal asks for email
2. Owner submits → row inserted into `invitations` (token auto-generated by default)
3. Worker sends email via Resend or Supabase email (decide; see below)
4. Klijent receives email with link `https://tracker.<domain>/invite/<token>`
5. They click → AcceptInvitePage:
   - Looks up invitation by token (use service role since user isn't authed yet)
   - Shows email, asks for password (Formik form)
   - Calls `supabase.auth.signUp({ email, password })`
   - On success: insert `client_memberships` row with the new user's id, set `accepted_at = now()` on invitation
   - Redirect to `/portal/zahtevi`

**Email sending — pick one:**
- **Supabase email** (free, basic templates) — easiest, uses Supabase's auth flow with `inviteUserByEmail()`. But that creates a user immediately, not what we want for a custom invitation flow.
- **Resend** (3,000 emails/mo free) — clean API, recommended.
- **Plunk / Postmark** — alternatives.

**Recommendation:** Resend. Add `RESEND_API_KEY` env var. Custom domain DKIM is required for production deliverability but not for testing.

**Gotchas:**
- Token security: don't accept expired tokens (`expires_at`). Don't accept already-used tokens.
- Email content in Serbian. Subject like "Pozvani ste u LD Biro portal".
- If Supabase email is enough for v1, you might skip Resend entirely — but you lose flow control.

---

### 6. Portal pages (klijent side)

Files: `src/routes/portal/MojiZahteviPage.tsx`, `TiketDetaljPage.tsx`, `NoviZahtevPage.tsx`.

**MojiZahteviPage:**
- Simplified 4-column kanban: *Primljeno / U radu / Čeka tebe / Gotovo*
- Read-only — klijent doesn't drag (their column is determined by owner's mapping)
- Maps to owner columns via `columns.client_visible_mapping`. Two owner columns may map to the same klijent column.
- Click ticket → `/portal/zahtev/:id`

**TiketDetaljPage:**
- Title, type, status, rok
- Comment thread (read all comments + add new comment)
- Attachment list + upload
- "Označi rešenim za mene" button — only meaningful if it's in *Čeka tebe*; transitions back to owner side via comment

**NoviZahtevPage:**
- Formik form: title (required), description (required, textarea), file (optional)
- On submit: insert into `tickets` with `created_via = 'portal'`, `column_id = <Inbox>`
- RLS policy `tickets_member_insert` enforces this works only if `created_via = 'portal'` and `client_id` is in user's memberships
- Show success toast → redirect to `/portal/zahtev/<new-id>`

**Gotchas:**
- The klijent doesn't choose their own `client_id` — derive from `current_user_client_ids()` (in v1, klijent users belong to exactly one client; pick the only one).
- For multi-client klijent users (v2), add a client picker.
- Default `column_id` for portal tickets: the firm's Inbox column. Look up via the `firm_id` of the chosen client.

---

### 7. Activity log writes

**Why:** the klijent portal's "what changed when" depends on this. Also useful for owner to debug "who moved this and when."

**Triggers vs. application code:** I left this as application-code responsibility (no DB triggers) for explicit control.

**Where to write:**
- Ticket creation → `created`
- Drag between columns → `moved` (from_value: `{column_id: old}`, to_value: `{column_id: new}`)
- Closing → `closed`
- Reopening → `reopened`
- Editing (title, rok, etc.) → `edited`
- New comment → `commented` (no from/to needed)

Create a helper `src/lib/activity.ts`:
```ts
export async function logActivity(ticketId: string, action: string, from?: any, to?: any) {
  await supabase.from('activity_log').insert({
    ticket_id: ticketId,
    user_id: (await supabase.auth.getUser()).data.user?.id,
    action,
    from_value: from ?? null,
    to_value: to ?? null,
  })
}
```

Call from useMoveTicket, ticket update mutations, etc.

**Gotchas:**
- Best-effort: don't block the user if activity_log insert fails. Catch and log.
- Eventually: consider a DB trigger on `tickets` for moves — single source of truth. Defer until activity_log gets more uses.

---

### 8. Recurring ticket generator

**Why:** ~70 stalnih klijenata × monthly PDV + quarterly = a lot of repetitive tickets she'd have to create manually. Auto-generation is core to "less stress."

**Where to run:** Cloudflare Cron Triggers (free, daily). Add to `wrangler.toml`:
```toml
[triggers]
crons = ["0 6 * * *"]  # 6 AM UTC daily = 7-8 AM Belgrade
```

Add a scheduled handler — note that Pages Functions support scheduled triggers via a different file structure, OR you can deploy a separate Worker. **For Pages, easier path is a separate Worker** since Pages Functions don't natively support cron triggers (as of 2025).

**Recommendation:** create a small standalone Cloudflare Worker (separate from Pages) that runs daily, queries `recurrence_rules` where today matches `day_of_period`, and inserts tickets. Use Supabase service role for this worker (no user context).

**Logic:**
```ts
// for each rule where enabled and (today.day == rule.day_of_period for monthly,
//                                   or today.day == rule.day_of_period and (current_month % 3 == rule_quarter_offset) for quarterly,
//                                   or today.day_of_year == rule.day_of_year for annually)
// insert ticket:
//   title = template_title with {month}/{quarter} interpolation
//   client_id = rule.client_id
//   firm_id = rule's client's firm_id
//   column_id = firm's Inbox column
//   type = 'zaduzenje'
//   created_via = 'recurring'
//   rok = today + rule.rok_offset_days
//   recurrence_rule_id = rule.id
// update rule.last_generated_at
```

**Gotchas:**
- Idempotency: if the worker runs twice the same day, don't double-create. Check `last_generated_at >= startOfDay(today)` before inserting.
- Edge case: month with fewer days than `day_of_period` (e.g., rule says day 31, February has 28). Decision: clamp to last day of month.
- Locale: month names. Use `Intl.DateTimeFormat('sr-Latn', { month: 'long' })` to interpolate "PDV za mart".

---

### 9. End-of-day review flow

**Why:** her own answer — she finds satisfaction in "čekiranje uspešno odrađenog." This is the dopamine moment.

**Trigger:** when she opens the app after, say, 16:00, OR explicitly via a "Završi dan" button. Show a modal/page listing all tickets in `Danas` filter that are NOT in the `is_done` column.

**For each:** 3 buttons — *Završi*, *Pomeri za sutra*, *Ostavi*.

**Implementation:**
- New component `src/components/EndOfDayReview.tsx`
- Triggered from a button in AppLayout's header, or auto-pop after time threshold (defer auto-popup)
- For *Pomeri za sutra*: update `planirano_za` to `+ 1 day`
- For *Završi*: move to is_done column AND set `closed_at = now()`

**Reward UX:** when she closes a ticket via this flow, brief animation (e.g., card fades green and slides away) + a daily counter (e.g., "12 od 14 završeno"). She values the count.

---

### 10. Podešavanja page (settings)

**Files:** `src/routes/app/PodesavanjaPage.tsx`.

**Sections:**
- **Profil** — display name, email, change password
- **Firma** — name, logo (deferred), default column for new tickets
- **Kolone** — drag-reorder list of columns, rename, edit `client_visible_mapping`, add/remove (block remove if any tickets reference it)
- **Recurring pravila** — table of all rules across all clients, add/edit/disable
- **Sign out** button

**Gotchas:**
- Renaming a column doesn't break anything (column_id is the FK), but it does change what klijenti see if `client_visible_mapping` doesn't compensate.
- Deleting a column: enforce FK; require move-tickets-elsewhere first.

---

### 11. shadcn-style component primitives

I installed Radix packages but did NOT generate the wrappers. Wrap as you need them. shadcn's classic set:
- `Button`, `Input`, `Label`, `Textarea`, `Select`, `Dialog`, `DropdownMenu`, `Popover`, `Toast`, `Card`, `Badge`

Use the official shadcn CLI or copy from <https://ui.shadcn.com/> (their Tailwind v4 variants). Place in `src/components/ui/`.

Don't pre-generate all of them — wrap on first use. Avoid unused-component sprawl.

---

### 12. File attachments via R2

**Why:** klijent portal lets them attach PDFs (izvodi, fakture). R2 is free 10GB, S3-compatible.

**Files:**
- New Pages Function `functions/api/upload.ts` — receives a file via multipart, stores in R2, inserts row into `attachments` table
- FE: file picker in `NoviZahtevPage` and `TiketDetaljPage`'s comment box

**Pattern:**
- Bind R2 in `wrangler.toml`:
  ```toml
  [[r2_buckets]]
  binding = "ATTACHMENTS"
  bucket_name = "ld-biro-attachments"
  ```
- In Worker: `await env.ATTACHMENTS.put(key, file.stream(), { httpMetadata: { contentType: file.type } })`
- Generate signed URLs (expiring) via Worker for downloads — don't expose bucket publicly
- Insert into `attachments` table with `file_url` = the signed-URL endpoint, `file_name`, `file_size`

**Gotchas:**
- Cap file size in the Worker (10 MB? 25 MB?) before streaming — check `Content-Length`.
- Validate file type: PDF, JPG, PNG, DOCX, XLSX. Reject executables.
- Filename sanitization for the key (random uuid prefix + sanitized name).

---

## Cross-cutting concerns

### Timezone
- DB stores everything in UTC (`timestamptz`). Display in `Europe/Belgrade`.
- Use `date-fns-tz` for conversions in the FE.
- Worker tickets: when inserting, use `new Date().toISOString()` (UTC) — Supabase converts on read.

### RLS gotchas
- The owner's RLS uses `current_user_firm_id()` which returns null if she somehow doesn't own a firm row. After signup, MAKE SURE the firm row is created (one-time setup step).
- Klijent users with `accepted_at IS NULL` see *nothing* — `current_user_client_ids()` filters those out. This is by design (pending invitations don't grant access).
- Service-role keys bypass RLS — never expose them to the client. They live only in Cloudflare Worker env.

### Auth session JWT in Worker
- For Pages Functions that need to act as the user, forward `Authorization: Bearer <token>` from the FE.
- For Pages Functions that need to act as service-role (invitation acceptance, recurring generator), use `SUPABASE_SERVICE_ROLE_KEY` (add to env).

### Audio format
- `MediaRecorder` defaults: Chrome/Edge → `audio/webm;codecs=opus`, Safari → `audio/mp4;codecs=mp4a.40.2`.
- Groq Whisper accepts both. Don't hard-code a format, let the browser pick.
- Specify `audioBitsPerSecond: 64000` for smaller uploads (voice notes don't need high bitrate).

### Serbian language quality (LLM)
- Watch surname declension in Gemini extraction. "Marković zvao" → `client_name: "Marković"` is correct. "Markoviću sam rekla" (dative) → should still extract "Marković" not "Markoviću".
- If Flash-Lite drops surnames or genders, switch to Gemini Flash (~$1/mo) or Claude Haiku 4.5 (~$2.25/mo).

### Optimistic updates
- Drag-drop: optimistic. Voice ticket creation: not optimistic (we wait for parse + insert).
- Comments: optimistic.
- Closing: optimistic with undo (5-second toast offering revert).

---

## Client aliases / nicknames (deferred)

Once voice usage stabilizes, add an `aliases` field to `clients` (Postgres `text[]` or jsonb) so each client can have alternative names she'd use in speech ("Marko" for "Marković Konsalting d.o.o.", "Petar" for "Petrović s.p.", etc.). 

**Implementation when ready:**
1. Migration: `alter table public.clients add column aliases text[] not null default array[]::text[];`
2. UI on KlijentDetaljPage: chip-style aliases editor (add/remove)
3. SnimiPage: include aliases in the `clients_json` sent to the voice Worker, e.g. `{ id, name, aliases: ["Marko", "Markoviću"] }`
4. Worker prompt: tell Gemini that aliases are alternative names for matching. Returned `matched_client_id` remains the canonical row.

No schema migration needed until you actually want this. Just a sentence to remember: aliases drop in trivially because the Gemini-driven matching is already a closed-set problem.

---

## Deferred / open questions

- **WhatsApp/Viber integration** — explicitly out of scope for v1. Revisit after she validates the core flow.
- **"Hitno" priority** — flagged in walkthrough question for her. Wait for her answer before implementing.
- **"Čeka treću stranu" column** — already in default seed; reconsider after her feedback on whether she actually distinguishes from "Čeka klijenta".
- **Native mobile app** — only if she actually uses the PWA daily. Add `manifest.json` + service worker for installability first.
- **Dark mode** — not in v1. Add later if she asks.
- **Multi-firm support** — schema supports it (`firms` table), but FE assumes one firm. Don't build multi-firm UI until there's a real second firm.
- **Push notifications** — Web Push or just daily email digest. Defer until she has a workflow rhythm.
- **Notification preferences** — maybe she doesn't want emails. Ask before building.
- **Time tracking / billing** — not LD Biro Tracker's job. Hard "no" for v1; resist scope creep.

---

## Testing checklist before handing to her

When you think it's ready, validate against these realistic scenarios. If any fail or feel awkward, fix before showing her.

- [ ] **Cold start, owner side:** open app → login → kanban renders within 1 second
- [ ] **Voice capture, happy path:** hold mic, say a sentence in Serbian, release → parsed card shows → save → ticket appears in Inbox
- [ ] **Voice capture, ambiguous client:** say "Marković" but two Markovićs exist → picker appears, she picks one
- [ ] **Voice capture, new client:** say a name that doesn't exist → option to "Add new client" inline, then save ticket
- [ ] **Drag-drop:** move ticket between columns → persists across reload
- [ ] **Day filter:** "Danas" shows only today; tomorrow's ticket doesn't appear; drag a tomorrow ticket onto today by editing planirano_za
- [ ] **End-of-day review:** click button at 17:00 → shows incomplete Danas tickets → close 2, defer 1 → tomorrow they're all where expected
- [ ] **Klijent invite flow:** owner invites a klijent's email → klijent gets email → clicks → sets password → lands in portal seeing only their tickets
- [ ] **Klijent submit:** new zahtev with file attachment → appears in owner's Inbox with PORTAL badge
- [ ] **Klijent comment:** adds a comment → owner sees it
- [ ] **Recurring generation:** manually trigger the cron → on day 1 of month, all monthly rules generate tickets → no duplicates if triggered twice
- [ ] **Health endpoint:** `curl /api/health` → 200 OK with timestamp
- [ ] **Mobile (her phone):** all primary flows work — kanban scroll, mic capture, drag, day filter
- [ ] **Vacation simulation:** disable all activity for 8+ days, then visit → if uptime cron is wired correctly, no pause; without cron, project is paused (proves the cron matters)
- [ ] **Network failure on voice:** unplug WiFi mid-recording → graceful error, audio not lost (saved to indexedDB? — defer, just show "pokušaj ponovo")
- [ ] **JS error budget:** open DevTools, click around 10 minutes — no red errors

If she signals it's working, schedule a check-in 1 week later to capture friction points before they pile up.
