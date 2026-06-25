// Cloudflare Worker entry (Workers + Static Assets model).
//
// Routing:
//   - POST /api/chat -> the AI assistant (chat-core.js)
//   - GET  /api/chat -> a small health message
//   - everything else -> served from the static site via the ASSETS binding
//
// The ASSETS binding and the assets directory are declared in wrangler.toml.

import { handleChat, handleVerifyStart, handleVerifyCheck } from './chat-core.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/api/verify/start' && request.method === 'POST') {
      return handleVerifyStart(request, env, ctx);
    }
    if (url.pathname === '/api/verify/check' && request.method === 'POST') {
      return handleVerifyCheck(request, env, ctx);
    }

    if (url.pathname === '/api/chat') {
      if (request.method === 'POST') {
        return handleChat(request, env, ctx);
      }
      if (request.method === 'GET') {
        return new Response(
          JSON.stringify({ status: 'ok', message: 'POST to use the assistant.' }),
          { headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response('Method not allowed', { status: 405 });
    }

    // Serve the static portfolio site (index.html, chat.html, css/js, assets, ...)
    return env.ASSETS.fetch(request);
  }
};
