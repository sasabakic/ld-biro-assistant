/// <reference types="@cloudflare/workers-types" />

import type { Env } from './env'
import { handleVoice } from './api/voice'
import { handleHealth } from './api/health'

const worker: ExportedHandler<Env> = {
  async fetch(request, env) {
    const url = new URL(request.url)

    if (url.pathname === '/api/voice' && request.method === 'POST') {
      return handleVoice(request, env)
    }
    if (url.pathname === '/api/health' && request.method === 'GET') {
      return handleHealth(env)
    }
    if (url.pathname.startsWith('/api/')) {
      return new Response('Not Found', { status: 404 })
    }

    return env.ASSETS.fetch(request)
  },

  async scheduled(_event, env, ctx) {
    ctx.waitUntil(handleHealth(env))
  },
}

export default worker
