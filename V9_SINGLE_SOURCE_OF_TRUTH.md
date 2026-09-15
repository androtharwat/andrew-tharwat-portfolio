# Andrew Tharwat Studio V9 — Single Source of Truth

Updated: 2026-09-15

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

## Working rule

One chat. One branch. One source of truth.

Before every change:
1. Read the latest `v9-unified` state.
2. Change only `v9-unified` or a short-lived branch created from it for a risky test.
3. Merge verified work back to `v9-unified` immediately.
4. Promote to `main` only after explicit release review.

Historical branches are reference-only and should not receive new work.
