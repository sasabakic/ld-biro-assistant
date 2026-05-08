# LD Biro Tracker — Data Model & Screens (v1)

## Core entities

### `users`
Anyone who logs in: LD Biro owner + klijent firma staff.
```
id              uuid pk
email           text unique not null
password_hash   text
name            text
phone           text
created_at      timestamptz
last_login_at   timestamptz
```

### `firms`
LD Biro itself. v1 = one row. Schema supports multi-firm later.
```
id              uuid pk
name            text not null
owner_user_id   uuid fk -> users
created_at      timestamptz
```

### `clients`
Klijent firme she serves.
```
id              uuid pk
firm_id         uuid fk -> firms
name            text not null
pib             text
mb              text
notes           text
is_recurring    bool default false
created_at      timestamptz
archived_at     timestamptz null
```

### `client_memberships`
Which user belongs to which klijent firma.
```
client_id            uuid fk -> clients
user_id              uuid fk -> users
role                 text   -- 'primary' | 'secondary'
invited_by_user_id   uuid fk -> users
invited_at           timestamptz
accepted_at          timestamptz null
primary key (client_id, user_id)
```

### `columns`
Kanban columns per firm, reorderable, renameable.
```
id                       uuid pk
firm_id                  uuid fk -> firms
name                     text   -- 'Inbox', 'U toku', etc.
position                 int
client_visible_mapping   text   -- 'primljeno' | 'u_radu' | 'ceka_tebe' | 'gotovo' | 'hidden'
is_done                  bool default false
```
**Default seed:** Inbox / U toku / Čeka klijenta / Čeka treću stranu / Gotovo
**Client-facing labels:** Primljeno / U radu / Čeka tebe / Gotovo

### `tickets`
The heart.
```
id                    uuid pk
firm_id               uuid fk -> firms       -- denormalized for fast tenant queries
client_id             uuid fk -> clients
column_id             uuid fk -> columns
created_by_user_id    uuid fk -> users
created_via           text   -- 'voice' | 'manual' | 'portal' | 'recurring'
type                  text   -- 'pitanje' | 'zaduzenje' | 'javicu_se'
title                 text not null
description           text
rok                   timestamptz null  -- hard deadline
planirano_za          timestamptz null  -- when she plans to handle it
voice_note_url        text null
voice_transcript      text null
recurrence_rule_id    uuid fk -> recurrence_rules null
created_at            timestamptz
updated_at            timestamptz
closed_at             timestamptz null
```

> **Note:** Audio for voice-captured tickets is NOT stored. The pipeline is: client uploads audio → Worker streams to Groq Whisper → transcript to Gemini Flash-Lite → ticket inserted to DB → audio discarded. We keep `voice_transcript` (text) so she can re-read what was heard if parsing looks wrong, but never the audio file itself.

### `comments`
```
id           uuid pk
ticket_id    uuid fk -> tickets
user_id      uuid fk -> users
body         text not null
created_at   timestamptz
```

### `attachments`
```
id                    uuid pk
ticket_id             uuid fk -> tickets null
comment_id            uuid fk -> comments null
file_url              text
file_name             text
file_size             int
uploaded_by_user_id   uuid fk -> users
created_at            timestamptz
```

### `recurrence_rules`
Auto-generation of monthly/quarterly recurring tickets.
```
id                  uuid pk
client_id           uuid fk -> clients
template_title      text   -- 'PDV za {month}'
template_type       text   -- 'zaduzenje'
cadence             text   -- 'monthly' | 'quarterly' | 'annually'
day_of_period       int    -- e.g., 1 = generate on 1st of month
rok_offset_days     int    -- deadline = generation_date + offset
enabled             bool default true
last_generated_at   timestamptz null
created_at          timestamptz
```

### `activity_log`
Audit trail for client portal "what changed when" + her own debugging.
```
id           uuid pk
ticket_id    uuid fk -> tickets
user_id      uuid fk -> users
action       text   -- 'created' | 'moved' | 'commented' | 'closed' | 'reopened' | 'edited'
from_value   jsonb null
to_value     jsonb null
created_at   timestamptz
```

### `invitations`
Onboarding klijent users.
```
id                   uuid pk
client_id            uuid fk -> clients
email                text not null
invited_by_user_id   uuid fk -> users
token                text unique
expires_at           timestamptz
accepted_at          timestamptz null
created_at           timestamptz
```

---

## Why this shape

- **`columns` as data, not enum.** Rename "Čeka treću stranu" → "Čeka PURS" without a migration. Each column carries its own `client_visible_mapping` so the portal view stays coherent without a parallel taxonomy.
- **`type` is independent of column.** A `javicu_se` ticket can sit in *Inbox* or *Čeka klijenta* — type is what kind of work, column is where in the flow. Day filter (date), badge (📞 vs 📋), and column (status) each stay clean.
- **`rok` and `planirano_za` separate.** Hard deadline ≠ when she intends to handle it. Day filter shows union: due today OR scheduled today.
- **`created_via` is tracked.** Lets us measure whether portal adoption actually drops call volume.
- **`activity_log` from day one.** Cheap to add now, painful to backfill.

---

## Screen surface (minimum viable v1)

### Her side (web, mobile-responsive — same codebase)
1. **Tabla** — kanban, day-filter pills, floating mic button. Primary screen.
2. **Klijenti** — searchable list (70 rows needs search)
3. **Klijent detalj** — tabs: Tiketi / Korisnici / Recurring / Beleške
4. **Snimi** — mobile-first full-screen mic, hold-to-talk
5. **Podešavanja** — kolone, recurring pravila, profil

### Klijent side (portal)
1. **Moji zahtevi** — simplified 4-column board
2. **Detalj tiketa** — read + comment + attach
3. **Novi zahtev** — title + description + optional file

---

## Deliberately NOT in v1

- Time tracking / billing
- WhatsApp/Viber API integration
- Multi-firm (only LD Biro; schema allows later)
- Granular role permissions (Owner + Klijent suffice)
- Push notifications (in-app badges + maybe daily email digest only)
- Mobile native app (PWA first; native only if she adopts)

---

## Stack (locked in)

- **DB + auth**: Supabase Free (Postgres + RLS for tenant isolation + email/password + Google OAuth)
- **Frontend**: Vite + React + TypeScript on Cloudflare Pages — `/app/*` for her, `/portal/*` for klijenti
- **Backend (voice pipeline only)**: Cloudflare Pages Functions (Workers)
- **File storage**: Cloudflare R2 (klijent portal attachments only — voice audio never persisted)
- **Voice transcription**: Groq Whisper-Large-V3 (free tier, ~2 hours audio/day)
- **Voice → ticket parsing**: Gemini 2.5 Flash-Lite (free tier, 1,500 requests/day)
- **Health-check pinger**: free external cron (UptimeRobot / Cron-job.org) hits `/health` daily to prevent Supabase free-tier inactivity pause
- **Cost**: $0/mo at this scale
