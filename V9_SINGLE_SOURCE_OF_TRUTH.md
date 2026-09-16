# Andrew Tharwat Studio V9 — Single Source of Truth

Updated: 2026-09-16

## Canonical development branch

All V9 work is based on:

`v9-unified`

This branch is the single source of truth for:
- Public V9
- Studio OS
- Prospect / Client Access
- Client Portal
- Studio operational database integration

Historical branches such as `v9-development`, `v9-client-ops`, `v9-public-release` and `v9-client-ops-*` are reference-only.

## Production

`main` is production. It already contains an earlier V9 launch state, but new unified work must not be promoted to `main` until the final end-to-end test is completed and explicitly approved.

## Public V9

Public scope includes:
- `/v9/`
- Studio / Capabilities / Work / Team / Contact
- responsive desktop/mobile
- English / Arabic + RTL
- public Case Studies
- Public Project Brief
- V9 Layout Control

Public Project Brief now writes directly to Studio OS through `studio_submit_public_lead` and returns a real request ID. After submission, the visitor receives a `TRACK REQUEST / CLIENT ACCESS` link.

## Prospect / Client Access

Pre-client access is available at:

`/client-access/`

This is the commercial bridge between Public V9 and the full Client Portal.

Verified flow:
1. Visitor submits Public Project Brief.
2. Lead appears in Studio OS.
3. Visitor signs in to Client Access with the same verified email using email OTP.
4. Before a proposal exists, Client Access shows request status.
5. When Studio sends a proposal, Client Access shows scope, deliverables, timeline, revisions, total amount, deposit percentage, terms and validity.
6. The prospect can accept or decline the proposal.
7. Acceptance creates the live deposit payment record.
8. Deposit status remains visible to the prospect.
9. After the Studio confirms the paid deposit, `studio_admin_convert_lead` creates the Client + Project.
10. The same authenticated account becomes eligible for the full Client Portal.

Security:
- prospect access is email-ownership based
- `studio_portal_access_context` and `studio_portal_proposal_action` require `authenticated`
- `anon` execution is explicitly revoked
- client/prospect access never exposes internal notes or unrelated client data

## Studio OS

Primary route:

`/admin/studio-v9.html`

Studio OS uses Trusted Device access and protected `studio_*` records.

Live responsibilities:
- Leads: public capture, manual capture, review, qualification, lost reason, internal notes
- Proposals: create, edit, save, send
- Client decision: prospect-side accept/decline
- Commercial: deposit creation and manual payment confirmation
- Conversion: accepted proposal + confirmed deposit → Client + Project
- Clients: live client records
- Projects: stage-driven workspace and client-visible updates
- Reviews: publish review versions and collect approval/change requests
- Revisions: client request + admin completion + reopened review version
- Files: private project storage, signed access, client uploads, review files and final-delivery release
- Final payment: outstanding balance request, confirmation, Deployment transition
- Completion: cannot become `Completed` until at least one `final_delivery` file is `client_visible`
- Portfolio: Studio OS Portfolio nav opens the existing live CMS

Production UX hardening:
- dead Notifications control is hidden
- unsupported Testimonials module is hidden
- Quick Actions route to real live modules
- Quick Create exposes Lead + Proposal only
- Client and Project cannot be created manually outside the controlled Proposal → Deposit → Conversion workflow
- Studio OS fails closed if live Supabase cannot be confirmed; demo data is never shown as operational truth

## Client Portal

Full client workspace:

`/client-v9/`

Client Portal uses Supabase Auth / email OTP and `auth.uid()` ownership.

Client features:
- Home / current project
- My Projects
- public project-stage timeline
- client-visible Studio updates
- payment summary and payment records
- private files and client upload
- review / approval
- request changes
- revision history
- Start New Project for existing clients
- Account details

The Client Portal becomes active only after a real Client record exists. A verified email is claimed through `studio_claim_client_by_verified_email`.

## Database integrity added 2026-09-16

Important workflow protections now include:
- `sync_review_revision_stage_ledger`
- `enforce_review_stage_integrity`
- `studio_prospect_portal_access`
- `lock_prospect_portal_rpc_acl`
- `require_final_delivery_before_completion`

The database now enforces:
- one active awaiting-review item per project
- correct Client Review ↔ Revisions stage-ledger sync
- authenticated-only prospect/client portal RPCs
- final delivery before Completed status

## Payments

Current production workflow is manual payment confirmation:
- Client/prospect sees the payment amount and status.
- Payment is completed outside the platform using the Studio's payment method.
- Studio confirms payment in Studio OS.
- Confirmation triggers the next operational state automatically.

No online card/payment-gateway integration is assumed or simulated.

## Email / OTP external dependency

Email OTP is implemented correctly in the application, but production delivery requires a Custom SMTP provider in Supabase Auth.

Supabase Default SMTP is not suitable for real client access because it only delivers to pre-authorized project-team addresses.

Release requirement:
- configure Custom SMTP in Supabase Authentication
- verify the Magic Link / OTP template contains `{{ .Token }}` and sends a 6-digit code
- then test with a completely new external email address

This is the only remaining external-provider configuration required before a clean real-account end-to-end test.

## Operational data state

Studio operational data was intentionally reset after QA preparation.

Current clean state:
- Leads: 0
- Proposals: 0
- Clients: 0
- Projects: 0
- Payments: 0
- Reviews: 0
- Revisions: 0
- Files: 0

Identity counters were reset so the next real test starts from:
- `ATS-L-0001`
- `ATS-P-0001`
- `ATS-C-0001`
- `ATS-PRJ-0001`
- `ATS-PAY-0001`
- `ATS-REVW-0001`

No test Client/Project/Payment data should remain before the user's final clean test.

## Final clean test sequence

After Custom SMTP is configured, test from a brand-new email account:

1. Open Public V9.
2. Submit Project Brief.
3. Confirm Lead `ATS-L-0001` appears in Studio OS.
4. Open Client Access from the request confirmation.
5. Request OTP and sign in with the new email.
6. Confirm request status is visible.
7. In Studio OS: Start Review → Qualify → Create Proposal → Send Proposal.
8. Return to Client Access and refresh.
9. Review and Accept Proposal.
10. Confirm Deposit Due appears.
11. In Studio OS: confirm deposit payment.
12. Confirm Client + Project are created.
13. Return with the same account and open Client Portal.
14. Advance project stages and post a client-visible update.
15. Upload/share a review file.
16. Client requests changes.
17. Admin completes Revision #1 and publishes V2.
18. Client approves V2.
19. Create and confirm Final Payment.
20. Move to Deployment.
21. Upload and release Final Delivery.
22. Complete project.
23. Verify completed project remains visible to the client and public portfolio workflow is unaffected.

## Validation status

- Public V9 build: successful on prior verified unified commits.
- Client Access code is committed on `v9-unified`.
- Studio OS hardening changes are committed on `v9-unified`.
- Supabase schema / RLS / RPC / stage integrity were audited.
- Studio OS was visually opened from an approved Trusted Device and showed `LIVE SUPABASE DATA` / `DB LIVE`.
- Connected Vercel preview browsing remains unavailable to the tool because of account/scope authorization; browser-level final acceptance will be performed by the user.

## Working rule

One chat. One branch. One source of truth.

Before every future change:
1. Read latest `v9-unified`.
2. Make changes only on `v9-unified` unless an explicitly isolated risky test is required.
3. Keep operational schema/RLS changes documented here.
4. Promote to `main` only after final clean test + explicit release approval.
