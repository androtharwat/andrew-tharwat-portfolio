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

Status: **COMPLETE**

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

Completed evidence:
- `V9_VISUAL_SYSTEM.md` is the locked visual reference.
- Readability and spacing were rebuilt from prototype sizing into production-oriented sizing.
- Responsive header and mobile navigation behavior are implemented.
- Reduced-motion behavior is supported.
- Local Chromium composition review was completed at 1440px desktop and 390px mobile with no horizontal overflow detected.
- Vercel CI build passed after the visual-system changes.

Final deployed-browser verification remains part of Phase 7 because the current Vercel connector does not have permission to open the protected preview deployment.

---

# Phase 2 — Studio & Capabilities

Status: **COMPLETE**

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

Completed evidence:
- Hero uses the locked studio positioning rather than a list of services.
- Decorative prototype metrics were replaced by the locked `THINK. CREATE. BUILD. IMPROVE.` process.
- A concise Studio statement now bridges positioning and capabilities.
- The Studio principles use only approved brand language.
- Capabilities are framed as tools assembled around the problem, not four separate businesses.
- Mobile and desktop local composition review passed without horizontal overflow.
- Vercel CI build passed after the Phase 2 implementation.

---

# Phase 3 — Work / Case Studies

Status: **COMPLETE**

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

Completed evidence:
- The section reads directly from published `portfolio_projects` data.
- HSE Awareness Series is the default flagship case study.
- The default V9 selection is curated independently from the CMS publish state; the older overlapping DO Document Smart Capture case remains in CMS but is hidden from Selected Work by default.
- The default desktop composition uses three columns with stored WIDE / M sizing to create complete editorial rows rather than equal cards.
- Filtering and search now hide the flagship presentation and show only matching results, so a fixed featured banner no longer conflicts with the selected filter.
- Admin ordering, visibility, card sizing and 2 / 3 / 4 column controls persist through `portfolio_site_settings.v9_layout`.
- Public and Admin fallbacks are aligned to the same three-column default.
- Real project-title layout QA at 1440px and 390px passed without horizontal overflow; long titles remain within one or two lines depending on viewport.
- Vercel CI build passed after the Work behavior and Admin alignment changes.

---

# Phase 4 — Team Model

Status: **COMPLETE**

Goal:
Explain the studio operating model without pretending to be a large fixed agency.

Scope:
- Andrew Tharwat — Founder & Creative Systems Director.
- Specialist network.
- Role order and visibility.
- Founder/network presentation ratio.
- Visitor-facing expertise-mix interaction only where it improves understanding.

Acceptance criteria:
- “Different Expertise. One Direction.” is clear.
- Team presentation feels credible and flexible.
- No inflated agency language.

Completed evidence:
- The team section now explains the operating model as Studio Direction → Specialist Network → Project-Specific Mix.
- Andrew Tharwat is presented as Founder & Creative Systems Director with focus on problem framing, systems thinking and creative direction.
- Specialist cards are explicitly described as areas of expertise that can be brought into a project, not a fixed staff directory.
- The previous “Assemble a Project Team” wording was replaced with an exploratory expertise-mix interaction so the visitor does not appear to be selecting employees.
- Existing Admin order, visibility and founder/network ratio controls remain compatible with the revised public presentation.
- Phase-specific CSS is layered on top of the locked visual system rather than redefining it.
- Final protected-preview browser verification remains part of Phase 7.

---

# Phase 5 — Start a Project

Status: **COMPLETE**

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

Completed evidence:
- Stored brief order is now Challenge/Outcome → Starting Point → Expertise → Scope → Contact.
- The first step asks for the real challenge and desired change rather than forcing a service category first.
- Starting Point is explicitly framed as a clue for the conversation, not a constraint on the final solution.
- Expertise selection is positioned as provisional; the final project mix is shaped after the problem is understood.
- Review behavior now focuses the live brief summary on the final step.
- Send action validates name plus at least one contact method before opening the email workflow.
- English and Arabic brief copy are handled consistently.
- No public database insert was introduced; email remains the first workflow until spam protection and lead-management behavior are defined.
- Supabase `v9_layout.brief.order` was verified after the change.
- Vercel CI build passed after the problem-first brief behavior changes.

---

# Phase 6 — V9 Admin Integration

Status: **NEXT**

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
