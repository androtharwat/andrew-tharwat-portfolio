# Move Now inside ATS

Routes: `/move-now` for customers, `/move-now/admin` for the team. The supplied React screens, styles, brand assets, statuses, and follow-up workflow are retained. The footer of ATS links to the customer route.

## Build

The checked-in `assets/app.js` is the browser build; ATS remains a static site with Vercel Functions. To update the screens, run `npm install` then `npm run build` in this folder. No Site/Cloudflare runtime is required by the new code.

## Server setup

Apply `supabase/migrations/20261002170000_move_now_ats.sql` to the existing ATS Supabase project. Set Vercel's `SUPABASE_SECRET_KEY` as a server-only secret; the legacy `SUPABASE_SERVICE_ROLE_KEY` remains supported as a fallback. Reuse ATS's `SUPABASE_URL` and public key. Set `MOVE_NOW_OWNER_EMAIL=atstudioimpact@gmail.com`. All client and team data lives in separate `move_now_*` tables; anonymous and authenticated database roles have no direct table access. The API checks authenticated emails against the Move Now allowlist, and only the owner manages it. Both legacy `req.query` and native request URLs preserve API routing, search filters and pagination.

Team sign-in now uses ATS's Supabase email authentication. It shares the existing ATS session and OTP length, and accepts the configured email link flow. Verify `/move-now/admin` is an approved redirect URL without changing existing ATS redirects or templates.

## Migration status — 2026-10-03

The existing ATS project `sivyynuhluhvjcdicwxn` has been transferred to the official `atstudioimpact` organization (`wfqtzdihbebqpkktansh`). The official email is confirmed as Owner and the project is `ACTIVE_HEALTHY`. Its reference and region are unchanged.

The Move Now migration is applied. A complete, untruncated snapshot of the original Site's D1 database was imported using the authenticated database connection in one transaction. Existing conflicting records would have aborted the transaction. Exact JSON comparison verified all fields in one lead, zero additional admin rows, and one submission counter (`window` maps to `window_start`). The original Site is still live; repeat export and reconcile any new submissions or follow-up edits before cutting over traffic.

Permissions were verified: RLS is enabled, direct table access is revoked from `anon` and `authenticated`, and the rate-limit/stats functions are invoker functions executable only by `service_role`. The advisor's informational no-policy findings are intentional for these server-only tables. Other existing ATS advisor findings are outside this migration.

For Move Now exports, keep a private JSON file with complete `leads` and `admins` arrays outside Git. Run `node scripts/import-move-now.cjs --check-file <export.json>` before connecting to a destination. Once the official destination is confirmed and configured, `--apply` inserts missing records without overwriting differing existing records and verifies every imported field. `--verify` performs read-only comparison. These commands never print client records or credentials.

Export all original Move Now leads and team members through an authenticated owner session. Preserve UUIDs, details, statuses, assignments, notes, follow-up dates, and timestamps. Import and compare every row before switching traffic. Run an authenticated follow-up save and a customer request on a preview deployment. The original Site remains live until these checks pass; do not delete its database or silently move only new submissions.

All 29 repository/API tests pass, including native Vercel request URL parsing with a modern Supabase secret key. Live admin sign-in and delivery remain unverified. The dashboard currently shows email OTP length 8 and custom Gmail SMTP enabled. Auth Site URL and the sole allowed redirect still point to the legacy Vercel domain; add the exact official `/move-now/admin` redirect while preserving existing redirects before launch.

Vercel's connected access returned 403 for team `at-studio4`; no server credential has been configured or new production deployment made. Server environment setup, a real customer submission and authenticated dashboard/follow-up checks are still required before merging. Existing public Move Now links remain on the working subdomain until launch.
