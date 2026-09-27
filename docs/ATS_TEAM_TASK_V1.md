# ATS Team + Task Engine V1

## Audit — 27 September 2026

Base: `v9-client-ops` at `d0e66e2`. Static HTML/CSS/JavaScript with Supabase JS.
Existing Studio OS uses trusted-device headers checked by `portfolio_device_is_trusted()`;
client portal uses Supabase Auth and client ownership RLS. Preserve both.
The admin UI mirrors existing live operations into legacy local storage. The new engine
never uses that mirror for authorization, tasks, balances, or project IDs.

Live schema inspected in project `sivyynuhluhvjcdicwxn` (shared with DO):
`studio_projects`, clients, proposals, payments, updates, reviews, revisions, approvals,
files, activity already exist. `studio_service_catalog` and diagnostic solution tasks
also exist; these are not execution tasks and must not be recreated. Team, execution
tasks, workstreams, and token ledger do not exist at audit time.

## V1 decisions

- Reuse Studio OS shell and trusted-device administration. Member portal is another
  route in this same repository, with verified email OTP and administrator-created membership.
- Membership type is descriptive, never ownership or administrative authorization.
- One owner + one named member reviewer. Admin approval required by default.
  Reviewer can return work; acceptance delegation is an explicit per-task setting.
- Available work is skill/level/availability/permission/capacity filtered in RLS.
- Assigned, in progress, and review consume capacity. Default 2; configurable per member.
- All mutations use one transactional command API. A transaction advisory lock serializes
  pilot-scale mutations; task locks and state checks stop double claims/credits.
- New tables grant SELECT only. No browser role has direct INSERT/UPDATE/DELETE.
  Sensitive functions live in an unexposed schema, behind invoker RPC wrappers;
  each call rechecks the trusted device or current active membership.
- Reservation is released on unassignment/acceptance. Acceptance creates one earned
  entry. Rework never creates a credit. Bonus requires admin, reason and unique request ID.
- Assignment history lives in append-only task events; avoid a redundant assignment table.
- Base tokens/scope/skill/dependencies only editable while available. Active task deadline
  may change with a recorded reason. Accepted task evidence/earned tokens are immutable.
- Dependencies must be in the same project and acyclic. Blocked tasks cannot start/claim.
- Unclaimed threshold stored per task, default 24 hours; Founder Queue is computed at read time.
- No cash valuation, payable balances, distribution, or project closeout in this milestone.
  Wallet clearly states that earned tokens are not cash and settlement is not enabled.
- No AI diagnosis, pricing automation, ownership model, banking, or public-site redesign.

## Security baseline

Before changes the Security Advisor reports existing publicly executable definer functions
and password protection disabled, plus six intentionally/possibly deny-all tables.
Do not conflate these existing notices with the new engine or alter unrelated DO tables.
Remediation: https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable

## Pilot flow

Admin → Team & Tasks → add member (name/email/type/skills/level/capacity).
Member signs in through `/team-v9/`; a verified auth email links to the preapproved membership.
Admin creates a task on an existing project with output, reviewer and acceptance criteria.
Member takes, starts and submits evidence. Reviewer returns with categorized reason or
admin accepts. Wallet shows reserved → earned, with full immutable event history.

Deployment and verification results are recorded below when complete.

## Verified result

- 39 PostgreSQL/PGlite integration assertions passed: RLS isolation, verified membership,
  skill/level/dependency eligibility, capacity, self-review rejection, acceptance gate,
  repeated claims/acceptance, immutable history, exact wallet totals, bonus deduplication,
  member revocation, admin capacity override and accepted-scope immutability.
- Chromium browser exercised the actual UI and PostgreSQL command engine: create/edit task,
  8-digit OTP form, member claim/start/submit, admin acceptance and earned wallet display.
  Auth delivery and HTTP transport were test doubles; no real email was sent.
- Desktop 1440px and member wallet at 390px checked visually; no page errors or mobile overflow.
- Migration applied to the existing Supabase project. All seven new tables have RLS and
  read policies; neither anon nor authenticated has direct write privileges.
- Live anonymous read/action checks passed. Security Advisor counts unchanged from baseline;
  no findings reference the new engine tables/functions.
- Public website, client portal scripts, existing auth and `main` are unchanged.

## Repeating tests

Install `@electric-sql/pglite@0.3.14` in a disposable directory, then set
`ATS_PGLITE_MODULE` to its `dist/index.js` and run `node tests/team-engine.test.mjs`.
Browser test: `node tests/team-ui.test.cjs`; additionally set `ATS_SUPABASE_UMD` to
`@supabase/supabase-js@2.57.4/dist/umd/supabase.js`, and
`CODEX_PRIMARY_RUNTIME_NODE_MODULES` to a directory containing Playwright.
Optional `ATS_CHROMIUM_PATH` / `ATS_CHROMIUM_MODULE` select an installed browser.
`ATS_TEST_ARTIFACTS` sets the screenshot directory. The UI test starts its own local
HTTP server and uses only disposable PostgreSQL data. Never apply `tests/fixtures` live.

## Pilot limitations

No real team members or tasks were seeded into production. Admin must add the approved
members, then create a task on an existing project. Member login still needs a real
email delivery check in the user's environment. A trusted browser must be approved for
the Preview origin through the existing admin workflow. All V1 members must use a
separate reviewer; a founder can contribute as a member but cannot review their own task.

The existing operations branch is older than the public Preview branch. It is the required
base for this feature and must not be merged wholesale into main without reconciling
those branches. Full financial closeout and cash settlement remain the next milestone.
