# Andrew Tharwat Studio V9 — Single Source of Truth

Updated: 2026-09-16

## Canonical development branch

From this point forward, all V9 work must be based on:

`v9-unified`

This branch contains both:
- the latest Public V9 website from `v9-development`
- Studio OS + Client Portal from `v9-client-ops`

Do not continue feature development directly on `v9-development`, `v9-client-ops`, `v9-public-release`, or any `v9-client-ops-*` temporary branch unless explicitly recovering historical work.

## Production

`main` is the production branch. It already contains a V9 launch commit, but it is not the current source of truth for ongoing V9 development.

Do not push experimental work directly to `main`.

## Public V9 scope

- `/v9/`
- Studio sections
- Capabilities
- Work / Portfolio
- Team
- Contact
- visual identity
- responsive layout
- Arabic / English
- animations and public UX
- V9 Layout Control
- Public Project Brief → live Studio OS lead submission
- database-backed Case Study pages

## Studio OS / Client Operations scope

- `/admin/studio-v9.html`
- `/admin/studio-v9*`
- `/client-v9/`
- Leads
- Proposals
- Clients
- Projects
- Payments
- Reviews / Approvals / Revisions
- Client Portal
- Client file delivery

## Supabase state

Client Operations uses protected `studio_*` tables with RLS. Admin operations reuse Trusted Device access. Client Portal uses Supabase Auth / email OTP and client ownership via `auth.uid()`.

Current operational data should be treated as test data until a real client is intentionally onboarded.

## Verified unified state — 2026-09-16

### Public V9

- Public V9, bilingual UX, responsive/RTL, Work, Team and Project Brief are present in `v9-unified`.
- Public Project Brief writes leads through `studio_submit_public_lead`.
- Case Studies use the database-backed project layer.
- `main` already routes the production homepage to `/v9/`, but new unified work is not promoted to `main` automatically.

### Studio OS live runtime

Studio OS keeps the established V9 UI shell while live adapters persist operational mutations to Supabase.

Explicit live modules loaded by `/admin/studio-v9.html`:
- `studio-v9-sales-live.js`
- `studio-v9-live-db.js`
- `studio-v9-projects-live.js`
- `studio-v9-review-live.js`
- `studio-v9-files-live.js`
- `studio-v9-final-payment-live.js`

Verified live responsibilities:
- Leads: public submission, manual Studio OS capture, review, qualification, lost reason and internal notes.
- Proposals: draft/save/send persistence.
- Commercial: proposal acceptance, deposit creation, payment confirmation.
- Conversion: paid deposit → Client + Project through `studio_admin_convert_lead`.
- Projects: stage advancement and client-visible project updates persist to Supabase.
- Reviews/Revisions: client decisions use live RPC; admin revision completion is live.
- Files: private project storage, signed access, client-visible review/final-delivery controls.
- Final payment: outstanding balance creation, payment confirmation and Deployment transition.
- Client Portal: email OTP, ownership claim, RLS-scoped projects/payments/updates/reviews/revisions/files.

### Review / revision integrity

Database migrations added on 2026-09-16:
- `sync_review_revision_stage_ledger`
- `enforce_review_stage_integrity`

The database now keeps `studio_project_stages` aligned when a client requests revisions or a new review is published. Only one `awaiting_review` record is allowed per project, and review publication is restricted to valid workflow stages.

### Current test data snapshot

At the latest audit:
- Leads: 1
- Proposals: 0
- Clients: 0
- Projects: 0
- Payments: 0
- Reviews: 0
- Revisions: 0
- Files: 0

Existing test lead:
- `ATS-L-0003`
- status: `new`
- fit: `high`
- source: `studio_os_test`

Do not treat this record as a real client.

### Latest validation

- Latest Studio OS code changes on `v9-unified` received a successful Vercel build.
- Vercel preview browsing from the connected tool is currently blocked by account/scope authorization, so visual runtime verification must not be claimed until tested from an approved browser.
- Supabase schema, RLS policies, private client-file bucket and core RPCs were audited.

## Remaining release gates

Before promoting the unified system to `main`:

1. Open `/admin/studio-v9.html` from an approved Trusted Device and confirm the banner shows `LIVE SUPABASE DATA`.
2. Run `ATS-L-0003` through the full live journey: New → Reviewing → Qualified → Proposal → Accepted → Deposit Paid → Client + Project.
3. Verify Project Workspace stage changes and client-visible updates survive reload.
4. Verify Client Portal OTP with a controlled client email.
5. Test one real private file upload, review approval / revision request, revised version, final payment and final delivery release.
6. Complete final Public V9 desktop/mobile + EN/AR smoke test.
7. Only after explicit release approval, promote verified `v9-unified` changes to `main`.

## Working rule

One chat. One branch. One source of truth.

Before every change:
1. Read the latest `v9-unified` state.
2. Change only `v9-unified` or a short-lived branch created from it for a risky test.
3. Merge verified work back to `v9-unified` immediately.
4. Promote to `main` only after explicit release review.

Historical branches are reference-only and should not receive new work.
