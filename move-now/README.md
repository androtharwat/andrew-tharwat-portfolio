# Move Now on official ATS infrastructure

Move Now operates independently of the ATS homepage. Customer intake is `/move-now`, team requests and follow-up are `/move-now/admin`, and the call-center copilot is `/move-now/call-center`. Team authentication uses the existing ATS Supabase email OTP session and server-verified membership. Only the official owner manages the team.

## Build and server setup

Run `npm ci` at the repository root for server dependencies. Run `npm ci --prefix move-now`, `npm run build --prefix move-now`, and `move-now/node_modules/.bin/tsc -p move-now/tsconfig.json` for the React browser build. The checked-in `assets/app.js` is served by static Vercel routes; API resources run through `/api/move-now`.

The official Supabase project is `sivyynuhluhvjcdicwxn`, transferred to the official organization without changing its reference. Server-only Vercel `SUPABASE_SECRET_KEY` is configured for Production and Preview; the legacy service-role variable remains supported. Owner email is `atstudioimpact@gmail.com`. The official `/move-now/admin` Auth redirect is approved and preserves existing ATS redirects. Email code sign-in also works directly on the call-center page.

Migrations in `supabase/migrations` define isolated `move_now_*` tables. Direct access is revoked from `anon` and `authenticated`; RLS is enabled with intentionally no client policies. Invoker RPCs are executable only by the server role. API operations independently verify the authenticated email against the team allowlist.

## Requests and calls

The customer form retains six distinct service paths with service-specific required fields. Ready-unit sale and rental are additional staff CRM choices. Old `buy`, `rent`, and `both` requests remain readable. Existing request assignments are preserved when a call is linked to them; unassigned requests and newly created requests are assigned to the verified employee who completes the call.

Each call has a UUID, raw notes, editable CRM fields, five compass stations, the next question, a recap, and the verified employee identity. Drafts can be saved and reopened from the employee's last 50 calls. Session-local recovery supplements server draft saving. Manual edits lock the field against later AI updates and persist across reopen. Uncertain fields are excluded from completed stations and fallback recaps; critical uncertain contact/service/payment fields block publishing.

Call completion and lead creation/update happen in one database transaction. Expected timestamps and completed-call checks reject stale or repeated saves. Completed calls are read-only; follow-up continues in the request dashboard. No calls or WhatsApp messages are sent automatically.

## Actual AI integration

`server/move-now-ai.cjs` uses the AI SDK with AI Gateway and `openai/gpt-5.4-nano` structured output. Vercel runtime OIDC is used by default; an optional server-only `AI_GATEWAY_API_KEY` is supported by the SDK. This model is eligible for the current free AI Gateway credits; the live catalog must be checked before changing models. No key reaches the browser. Never commit credentials or purchase credits automatically.

Analysis starts after 1.1 seconds without typing. It receives cumulative notes, previous CRM data, and employee-locked fields. The prompt covers Egyptian Arabic, Franco, the free ROI/valuation and engineering-visit hook, all service paths, and explicit confirmation of timing/WhatsApp. Notes are treated as data, not instructions. Financial offers and returns are never guaranteed.

Before model generation, a unique pending run is stored. Results, token usage, model, estimated cost, and state are persisted, with authenticated access at the copilot resource's run ID. Exact repeated inputs use a stored result. Server limits are 20 attempts per employee per minute and 500 per team per Cairo day, with a 25-second generation timeout and no retries. These are usage limits, not a provider spending guarantee. Credit/provider failures display a clear error while preserving manual CRM and draft saving.

## Validation

Repository tests cover authentication, the six customer flows, call actor verification, pending/result persistence, caching, rate limiting, CRM validation, and uncertain fields. A rolled-back database integration check verifies draft saving, optimistic concurrency, atomic lead creation, and completed-call immutability. Runtime browser verification must additionally confirm actual model access and the authenticated save/reopen/dashboard flow.

The original Site now redirects visitors to the official routes; its database remains preserved. Imported source records and follow-up values were reconciled at cutover. Private exports belong outside Git. `scripts/import-move-now.cjs --check-file`, `--apply`, and `--verify` preserve IDs and reject divergent records rather than silently overwriting them.
