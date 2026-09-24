# ATS authentication release gate

Email OTP remains Supabase email authentication, with eight digits configured in
`auth-otp-config.js`. Both entry points use one shared Supabase client per page
through `auth-client.js`. The SDK is pinned in both HTML entry points.

## Required verification before calling authentication complete

1. Run `npm test`. These tests execute both shipped entry-point scripts with a
   fake Supabase boundary. They do NOT prove email delivery or real authentication.
2. In Supabase Auth settings, confirm email OTP length is 8 and both signup and
   magic-link email templates contain `{{ .Token }}`. Verify the actual received
   email; do not infer delivery or token length from a successful send response.
3. Resend must have a verified sending domain; SMTP From must use that domain.
   Testing-sender delivery to the account owner's address is not a launch test.
4. Test both entry points with a real, fresh code. Reject 7 digits without a verify
   request; accept 8; truncate 9; strip non-digits; preserve leading zeroes.
5. Confirm verified prospect request lookup and active client portal routing,
   including reload/session recovery. Check desktop and a real mobile viewport;
   native email autofill and numeric keyboard still need device verification.
6. Preserve console diagnostics by stage: send, verify, lookup, boot. Never log
   OTPs, access tokens, session objects, or credential request bodies.
7. Check Concierge missing-field focus and the DO case study before release.

## Database correction

The shared `studio_claim_client_by_verified_email()` function previously called
`min(uuid)`, which PostgreSQL rejected (42883). The recorded migration casts to
text for the aggregate and back to UUID, preserving existing authorization,
duplicate-account checks, and grants. Applied to the shared database on
2026-09-24. Tests confirmed unauthenticated rejection and the normal P0002 path
for a synthetic unknown email, inside a rolled-back transaction.

## Deployment limits

Preview and Production share the Supabase backend. A database or Auth settings
change can affect both even without a Git merge. Never treat Preview-only Git
changes as backend isolation. `main` remains locked pending explicit release
approval. The regression workflow runs on the active Preview branch and PRs;
its result is not a substitute for the real email release gate above.

## Outstanding external dependency

Resend returned no domains during the audit. Logs showed SMTP 550 rejection of
non-owner recipients. The user must identify an owned sending domain and provide
DNS access through a supported connection. Do not invent a domain, use another
product's identity, or disable email verification to work around delivery.
