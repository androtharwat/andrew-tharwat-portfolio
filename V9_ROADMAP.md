# ANDREW THARWAT STUDIO V9 — Delivery Roadmap

Status: **ACTIVE DEVELOPMENT PLAN**

This roadmap controls V9 delivery. New ideas do not automatically become active work. They go to backlog unless they are required to complete the current phase.

The live site on `main` remains untouched until the launch phase.

---

## Non-negotiable rules

1. **Brand first.** All public copy must follow `V9_BRAND_LANGUAGE.md`.
2. **One architecture.** V9 stays inside the existing Andrew portfolio repo, Vercel project and Supabase backend.
3. **No stack drift.** Do not rewrite the site into a different framework unless there is a clear technical requirement approved before implementation.
4. **No duplicate CMS.** Existing `portfolio_*` content remains the source for projects and shared content wherever appropriate.
5. **Admin-only controls.** Layout/editor controls never appear in the public visitor experience.
6. **One phase at a time.** Finish and review the current phase before expanding scope.
7. **New ideas go to backlog.** They are evaluated after the current phase, not inserted mid-build.
8. **`main` is production. `v9-development` is development.** No launch changes are made to `main` until final approval.

---

# Phase 0 — Foundation & Brand Lock

Status: **COMPLETE**

Deliverables:
- `v9-development` branch isolated from production.
- `/v9/` preview route.
- `/admin/v9.html` V9 Control Center.
- Existing Supabase project reused.
- Existing `portfolio_projects` reused.
- `portfolio_site_settings.v9_layout` created.
- `V9_BRAND_LANGUAGE.md` created as copy source of truth.
- Legacy homepage Hero copy prevented from overriding V9 brand positioning.

Acceptance criteria:
- V9 can evolve without changing the live homepage.
- Brand direction is documented and cannot be changed casually during visual experimentation.

---

# Phase 1 — Visual Foundation

Status: **NEXT**

Goal:
Create one coherent V9 visual system before polishing individual sections.

Scope:
- Final header/navigation behavior.
- Typography scale.
- Red/navy/white visual hierarchy.
- Grid and spacing system.
- Section rhythm.
- Motion principles.
- Buttons and interaction states.
- Desktop/tablet/mobile behavior.
- English/Arabic layout rules.

Acceptance criteria:
- No section looks like a separate template.
- Mobile and Arabic are designed, not patched later.
- Visual language feels like an engineering/creative studio, not a generic agency template.

No new major sections are added in this phase.

---

# Phase 2 — Studio & Capabilities

Goal:
Explain what Andrew Tharwat Studio is before showing what it offers.

Locked structure:
- Studio positioning / Hero.
- Studio manifesto.
- Capabilities.
- Four core capabilities only:
  - Safety & HSE
  - Digital Solutions
  - Creative & Brand
  - AI & Storytelling

Acceptance criteria:
- The visitor understands that the studio solves problems using connected disciplines.
- The page does not read like four disconnected service businesses.
- Copy passes `V9_BRAND_LANGUAGE.md` review.

---

# Phase 3 — Work / Case Studies

Goal:
Make real projects the proof of the studio positioning.

Scope:
- Use real `portfolio_projects` data.
- Final selected-work hierarchy.
- Featured case study behavior.
- Work filters.
- Search.
- Admin ordering.
- Admin card sizing: S / M / WIDE / XL.
- Admin visibility.
- 2 / 3 / 4 desktop column control.
- Improve case-study entry points.

Acceptance criteria:
- Work feels curated, not like a database dump.
- Project cards remain visually strong with real project titles and media.
- Admin changes persist via `v9_layout`.

---

# Phase 4 — Team Model

Goal:
Explain the studio operating model without pretending to be a large fixed agency.

Scope:
- Andrew Tharwat — Founder & Creative Systems Director.
- Specialist network.
- Role order and visibility.
- Founder/network presentation ratio.
- Visitor-facing team assembly interaction only if it improves understanding.

Acceptance criteria:
- “Different Expertise. One Direction.” is clear.
- Team presentation feels credible and flexible.
- No inflated agency language.

---

# Phase 5 — Start a Project

Goal:
Turn Contact into a useful project conversation.

Scope:
- Structured project brief.
- Problem first.
- Goal / audience / desired outcome.
- Possible expertise.
- Scope / timing.
- Contact information.
- Brief summary.
- Email workflow first.

Lead database storage is added only after spam protection and admin lead-management behavior are defined.

Acceptance criteria:
- Visitor does not need to understand studio departments before contacting us.
- Brief feels short, useful and intentional.

---

# Phase 6 — V9 Admin Integration

Goal:
Make V9 manageable from the existing Control Center ecosystem.

Scope:
- Consolidate V9 controls into the admin experience.
- Preserve Trusted Device security model.
- V9 layout settings.
- Future V9 copy fields only where editing is genuinely required.
- No public layout controls.

Acceptance criteria:
- Owner controls presentation without editing source code.
- No duplicate authentication or second backend.

---

# Phase 7 — Quality Audit

Required review areas:
- Brand-copy audit against `V9_BRAND_LANGUAGE.md`.
- English copy.
- Arabic copy and RTL.
- Desktop.
- Tablet.
- Mobile.
- Navigation.
- Forms.
- Project links.
- Image loading.
- Accessibility basics.
- Performance.
- Supabase read/write permissions.
- Admin security behavior.
- Vercel Preview verification.

Acceptance criteria:
- No prototype wording remains.
- No TODO UI is visible publicly.
- No production regression.

---

# Phase 8 — Launch

Only after explicit final approval.

Launch process:
1. Final compare of `main` vs `v9-development`.
2. Final Vercel Preview review.
3. Backup / rollback point confirmed.
4. Promote V9 homepage architecture.
5. Verify production routes and admin.
6. Verify Supabase interactions.
7. Keep rollback option until production review is complete.

---

# Backlog rule

Ideas discovered during development are recorded here or in a future backlog file.

They do **not** change the current phase unless they fix:
- a blocker;
- a security problem;
- a broken user flow;
- a direct conflict with the locked brand direction.

This rule exists specifically to prevent V9 from becoming a sequence of unrelated experiments.
