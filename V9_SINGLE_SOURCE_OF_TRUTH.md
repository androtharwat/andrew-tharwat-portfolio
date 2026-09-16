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

`main` is the production branch and is promoted from verified `v9-unified` commits only.

Current production release includes:
- Public V9
- Studio OS live runtime
- Client Access
- Client Portal
- Arabic/English public UX

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
- `/client-access/`
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

Client Operations uses protected `studio_*` tables with RLS. Admin operations reuse Trusted Device access. Client Access / Client Portal use Supabase Auth / email OTP and ownership via `auth.uid()`.

Operational tables are clean until a real request is intentionally submitted.

## Verified unified state — 2026-09-16

### Public V9

- Public V9, responsive/RTL, Work, Team and Project Brief are present in `v9-unified`.
- Public Project Brief writes leads through `studio_submit_public_lead`.
- Case Studies use the database-backed project layer.
- Arabic language switching updates `lang` + `dir=rtl` and persists through localStorage.
- Published portfolio projects have Arabic titles, excerpts, descriptions and tags.
- `v9-arabic-polish.js` completes Arabic localization for dynamic brief controls, expertise labels, summary values and featured-work labels.

### Studio OS live runtime

Studio OS keeps the established V9 UI shell while live adapters persist operational mutations to Supabase.

Explicit live modules include:
- `studio-v9-sales-live.js`
- `studio-v9-live-db.js`
- `studio-v9-projects-live.js`
- `studio-v9-review-live.js`
- `studio-v9-files-live.js`
- `studio-v9-final-payment-live.js`
- `studio-v9-ux-live.js` (loaded by the live runtime)

Verified live responsibilities:
- Leads: public submission, manual Studio OS capture, review, qualification, lost reason and internal notes.
- Proposals: draft/save/send persistence.
- Commercial: proposal acceptance, deposit creation, payment confirmation.
- Conversion: paid deposit → Client + Project through `studio_admin_convert_lead`.
- Projects: stage advancement and client-visible project updates persist to Supabase.
- Reviews/Revisions: client decisions use live RPC; admin revision completion is live.
- Files: private project storage, signed access, client-visible review/final-delivery controls.
- Final payment: outstanding balance creation, payment confirmation and Deployment transition.
- Client Access: request tracking, proposal acceptance/decline and deposit status before client conversion.
- Client Portal: email OTP, ownership claim, RLS-scoped projects/payments/updates/reviews/revisions/files.

### Review / revision integrity

Database migrations added on 2026-09-16 keep `studio_project_stages` aligned when a client requests revisions or a new review is published. Only one `awaiting_review` record is allowed per project, and review publication is restricted to valid workflow stages.

### Completion integrity

A project cannot be treated as fully completed unless the final-delivery requirements are satisfied. Final delivery remains locked behind full payment and Deployment/Completed-stage controls.

### Current operational data snapshot

At the latest reset:
- Leads: 0
- Proposals: 0
- Clients: 0
- Projects: 0
- Payments: 0
- Reviews: 0
- Revisions: 0
- Files: 0

The next real website request starts the live sequence from the beginning.

### Latest validation

- Production was promoted from `v9-unified` to `main` by fast-forward.
- A pre-unified production backup branch exists for rollback.
- Vercel build checks passed for the unified release and the Arabic hardening update.
- Supabase schema, RLS policies, private client-file bucket and core RPCs were audited.

## Remaining external release gate

Custom outbound email delivery for new-client OTP still requires a verified sender domain / SMTP configuration. The application workflow is deployed; the external mail sender must be configured before unrestricted real-client OTP delivery.

## Working rule

One chat. One branch. One source of truth.

Before every change:
1. Read the latest `v9-unified` state.
2. Change only `v9-unified` or a short-lived branch created from it for a risky test.
3. Merge verified work back to `v9-unified` immediately.
4. Promote verified releases to `main` only after release approval.

Historical branches are reference-only and should not receive new work.
