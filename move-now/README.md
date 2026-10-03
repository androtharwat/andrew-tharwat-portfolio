# Move Now inside ATS

Routes: `/move-now` for customers, `/move-now/admin` for the team. The supplied React screens, styles, brand assets, statuses, and follow-up workflow are retained. The footer of ATS links to the customer route.

## Build

The checked-in `assets/app.js` is the browser build; ATS remains a static site with Vercel Functions. To update the screens, run `npm install` then `npm run build` in this folder. No Site/Cloudflare runtime is required by the new code.

## Server setup

Apply `supabase/migrations/20261002170000_move_now_ats.sql` to the existing ATS Supabase project. Set Vercel's `SUPABASE_SERVICE_ROLE_KEY` as a secret. Reuse ATS's `SUPABASE_URL` and public key. Set `MOVE_NOW_OWNER_EMAIL=atstudioimpact@gmail.com`. All client and team data lives in separate `move_now_*` tables; anonymous and authenticated database roles have no direct table access. The API checks authenticated emails against the Move Now allowlist, and only the owner manages it.

Team sign-in now uses ATS's Supabase email authentication. It shares the existing ATS session and OTP length, and accepts the configured email link flow. Verify `/move-now/admin` is an approved redirect URL without changing existing ATS redirects or templates.

## Official ownership and launch — pending

The destination must first belong to the official AT Studio Supabase account. Prefer transferring the existing ATS project to its official organization, preserving the project's infrastructure. Do not create new Move Now tables in the unofficial account. If transfer is unavailable, migrate the full ATS project separately before connecting Move Now; copying only Move Now records does not migrate ATS users, files or other project data.

For Move Now exports, keep a private JSON file with complete `leads` and `admins` arrays outside Git. Run `node scripts/import-move-now.cjs --check-file <export.json>` before connecting to a destination. Once the official destination is confirmed and configured, `--apply` inserts missing records without overwriting differing existing records and verifies every imported field. `--verify` performs read-only comparison. These commands never print client records or credentials.

Export all original Move Now leads and team members through an authenticated owner session. Preserve UUIDs, details, statuses, assignments, notes, follow-up dates, and timestamps. Import and compare every row before switching traffic. Run an authenticated follow-up save and a customer request on a preview deployment. The original Site remains live until these checks pass; do not delete its database or silently move only new submissions.

The rebuilt preparation passed all 28 repository/API tests. Official account access, production credentials, schema application, actual data migration, real sign-in QA, and Vercel deployment remain pending. This preparation must not be merged into production until those checks pass. Existing public Move Now links remain on the working subdomain until launch.
