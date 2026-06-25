// Cloudflare Pages Functions adapter (kept for portability).
//
// This account deploys via the Workers + Static Assets model, where worker.js is
// the entry point and this file is unused. It is retained so the same backend also
// works if the project is ever deployed as a Cloudflare Pages project, where files
// in functions/ are auto-routed (this one handles /api/chat). All real logic lives
// in chat-core.js so there is a single source of truth.

import { handleChat } from '../../chat-core.js';

export async function onRequestPost(context) {
  return handleChat(context.request, context.env, context);
}

export async function onRequestGet() {
  return new Response(
    JSON.stringify({ status: 'ok', message: 'POST { email, question } to use the assistant.' }),
    { headers: { 'Content-Type': 'application/json' } }
  );
}
