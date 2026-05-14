# LD Biro Tracker

Voice-first ticket tracker for an interrupt-driven accounting workflow.
She records a voice note after each call → Whisper transcribes → Gemini parses → ticket lands in her kanban. Klijenti can also submit tickets via portal.

**Stack** (all free tier):
- Vite + React + TypeScript on Cloudflare Pages
- Cloudflare Pages Functions for the voice pipeline
- Supabase Free (Postgres + auth + RLS)
- Groq Whisper-Large-V3 (transcription)
- Gemini 2.5 Flash-Lite (transcript → structured ticket)
- Cloudflare R2 for klijent attachments only (audio is never stored)

See `data-model.md` for schema rationale and `walkthrough-za-sestru.md` for the user-facing day-in-the-life narrative.

---

## Quick start (local dev)

### 1. Install Bun

```bash
brew install oven-sh/bun/bun
```

### 2. Install dependencies

```bash
bun install
```

### 3. Create the Supabase project

1. Go to <https://supabase.com>, create a new project (Free tier)
2. In the SQL editor, paste and run `supabase/migrations/0001_init.sql`
3. Then run `supabase/migrations/0002_seed_columns.sql`
4. Settings → API → copy `Project URL` and `anon public` key

### 4. Get API keys

- **Groq**: <https://console.groq.com> → API Keys → Create. Free tier covers ~2 hours of audio per day.
- **Gemini**: <https://aistudio.google.com/apikey> → Create API key. Free tier: 1,500 requests/day on Flash-Lite.

### 5. Configure environment

```bash
cp .env.example .env
cp .env.example .dev.vars
```

Fill in the keys in both files:
- `.env` is read by Vite (client-side, only `VITE_*` vars are exposed)
- `.dev.vars` is read by `wrangler` for Pages Functions during local dev

### 6. Run

**Two ways to run locally, depending on what you're working on:**

| Command | Port | Use when | Limitation |
|---|---|---|---|
| `bun run dev` | 5173 | UI work, kanban, klijenti, login | `/api/*` returns 404 (no Pages Functions) |
| `bun run pages:dev` | 8788 | Anything that calls `/api/*` (voice mic, health) | Slightly slower hot reload |

`pages:dev` starts wrangler on port **8788**, which proxies non-function requests to Vite (auto-spawned on 5173) and handles `/api/*` via the `functions/` directory. So you visit `http://localhost:8788/...` and everything works including the voice endpoints.

---

## Deploy

### Cloudflare Pages

1. Cloudflare dashboard → Workers & Pages → Create → Pages → Connect Git
2. Build command: `bun run build`
3. Build output directory: `dist`
4. Environment variables (Production):
   - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (build-time, baked into bundle)
   - `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `GROQ_API_KEY`, `GEMINI_API_KEY` (runtime, used by Pages Functions)
5. Custom domain: point your subdomain (e.g. `tracker.yourdomain.com`) at the Pages project

### Health-check cron (prevent Supabase pause)

Sign up for free at <https://uptimerobot.com> or <https://cron-job.org>. Add a daily HTTP GET to `https://tracker.yourdomain.com/api/health`. This ping keeps the Supabase free-tier project from auto-pausing after 7 days of inactivity.

---

## Project layout

```
src/
├── routes/
│   ├── app/        # her side (kanban, klijenti, snimi, podešavanja)
│   ├── portal/     # klijent side (zahtevi, novi zahtev, tiket)
│   └── auth/
├── layouts/        # AppLayout (sidebar nav), PortalLayout, AuthLayout
├── components/
│   └── kanban/     # KanbanColumn, KanbanCard, types
├── lib/            # supabase client, cn, types
├── router.tsx
└── main.tsx

functions/api/
├── voice.ts        # POST audio → Groq → Gemini → parsed ticket
└── health.ts       # GET, used by external uptime cron

supabase/migrations/
├── 0001_init.sql       # tables, RLS, helpers
└── 0002_seed_columns.sql  # default kanban columns on new firm
```

---

## Cost

$0/month at the projected usage (~50 tickets/day). All services on free tier.
