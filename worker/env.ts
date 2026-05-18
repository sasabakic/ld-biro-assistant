/// <reference types="@cloudflare/workers-types" />

export interface Env {
  GROQ_API_KEY: string
  GEMINI_API_KEY: string
  SUPABASE_URL: string
  SUPABASE_ANON_KEY: string
  // Required for the daily cron + /api/pdv/decide — bypasses RLS to operate
  // without a user JWT. Must be set as a dashboard Secret, never in wrangler.toml.
  SUPABASE_SERVICE_ROLE_KEY: string
  ASSETS: Fetcher
}
