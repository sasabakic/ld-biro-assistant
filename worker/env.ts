/// <reference types="@cloudflare/workers-types" />

export interface Env {
  GROQ_API_KEY: string
  GEMINI_API_KEY: string
  SUPABASE_URL: string
  SUPABASE_ANON_KEY: string
  ASSETS: Fetcher
}
