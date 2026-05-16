/// <reference types="@cloudflare/workers-types" />

import type { Env } from '../env'

/**
 * GET /api/health
 *
 * Endpoint hit daily by an external uptime cron (UptimeRobot, Cron-job.org)
 * to keep the Supabase free-tier project from auto-pausing after 7 days idle.
 *
 * Touches the DB so Supabase counts the project as "active".
 */
export async function handleHealth(env: Env): Promise<Response> {
  try {
    if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
      return json({ ok: false, reason: 'missing-env' }, 500)
    }

    const res = await fetch(`${env.SUPABASE_URL}/rest/v1/firms?select=id&limit=1`, {
      headers: {
        apikey: env.SUPABASE_ANON_KEY,
        authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
      },
    })

    return json({
      ok: res.ok,
      status: res.status,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown'
    return json({ ok: false, error: message }, 500)
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}
