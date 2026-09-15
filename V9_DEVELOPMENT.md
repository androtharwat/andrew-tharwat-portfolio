# ANDREW THARWAT STUDIO — V9 Development

V9 is developed inside the existing `androtharwat/andrew-tharwat-portfolio` repository without replacing the live website until launch approval.

## Branch strategy

- `main` — current live portfolio. Do not modify for V9 development.
- `v9-development` — isolated V9 work.

## Preview routes

- `/v9/` — public V9 preview.
- `/admin/v9.html` — V9 layout control center. Uses the same existing Trusted Device authorization as the main portfolio CMS.
- `/admin/` — current portfolio CMS, unchanged.

## Existing infrastructure reused

V9 intentionally keeps the current stack:

- Static HTML / CSS / JavaScript
- Existing Vercel project and Git integration
- Existing Supabase project (`DO`)
- Existing `portfolio_*` CMS tables
- Existing `portfolio-media` storage
- Existing Trusted Device admin authorization

No duplicate Supabase project, login system, project database, or media library is introduced.

## V9 data flow

### Projects

V9 reads published items directly from `portfolio_projects` and `portfolio_categories`.

Changes made in the current project CMS therefore remain the single source of truth for both the current site and V9.

### Site content

V9 can read existing values from `portfolio_site_settings`, including `hero` and `contact`.

### V9-only layout settings

A new settings key is used inside the existing `portfolio_site_settings` table:

`v9_layout`

It stores presentation-only configuration:

- Work project order
- Work project display sizes
- Work project visibility on V9
- Desktop work column count
- Founder / specialist network width
- Specialist role order and visibility
- Project Brief step order and visibility

The current live homepage ignores this key, so these settings do not affect the old site.

## Admin behavior

`/admin/v9.html` does not create another account system. It reads the same browser Trusted Device record already used by the current Control Center and sends the same trusted-device headers to Supabase.

If a browser is not approved, the V9 Control Center asks the user to complete approval through `/admin/`.

## Start a Project

The V9 Project Brief builder currently creates a structured brief and prepares it for email using the existing contact setting.

Persistent lead storage is intentionally not enabled yet because the current database has no dedicated contact/lead table. Before enabling public lead inserts, V9 should add spam protection and a secure admin review workflow.

## Launch plan

1. Continue V9 development on `v9-development`.
2. Review the Vercel Preview Deployment and responsive behavior.
3. Finalize V9 content and layout through the V9 Control Center.
4. Add and secure persistent Project Brief leads.
5. Run final accessibility, performance, mobile, Arabic/English, and security checks.
6. Replace the root homepage only after explicit launch approval.
7. Keep the previous production commit available for instant rollback.
