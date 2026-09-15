# ANDREW THARWAT STUDIO V9 — Visual System

Status: **LOCKED FOUNDATION FOR V9**

This document is the visual counterpart to `V9_BRAND_LANGUAGE.md`.

The purpose of Phase 1 is not to decorate individual sections. It is to make every section feel like one coherent studio system.

---

## 1. Visual character

V9 should feel:

- engineered;
- cinematic;
- precise;
- modern;
- confident;
- useful;
- human enough to avoid looking like a software dashboard.

It should **not** feel:

- like a generic agency template;
- like four separate mini-websites;
- like a neon cyberpunk portfolio;
- like an HSE corporate portal;
- like a dashboard placed on a public website;
- overloaded with effects or decorative AI visuals.

---

## 2. Core palette

### Primary background
`#031018` / `#04121c`

Near-black navy. This is the main environmental color.

### Secondary navy
`#071b29` / `#071d2a`

Used for cards, contained surfaces and interactive areas.

### Structural navy
`#0a2e45`

Used sparingly for depth and hover states.

### Primary accent
`#ef233c`

Andrew Tharwat Studio red. Used for hierarchy, active states and meaningful emphasis.

### Bright red
`#ff4c5e`

Used only for small high-energy details and contrast.

### Primary text
`#f5f8fa`

### Secondary text
Approximately `#8ea2ad` to `#a8b8c1`

Rule: **red is an accent, not a background theme.** Large red surfaces should be rare.

---

## 3. Typography

### English
Montserrat.

### Arabic
Alexandria.

Typography should create hierarchy through scale and weight before color.

Public body copy must remain readable. Do not use the 6–9px prototype text sizes from earlier experiments.

Guidelines:
- Hero: large, dense, high-impact.
- Section headings: strong but clearly below Hero level.
- Body copy: approximately 14–17px depending on context.
- Metadata: approximately 9–11px.
- Navigation: approximately 10–12px.

Avoid excessive letter spacing in Arabic.

---

## 4. Layout

Maximum main content width: approximately 1480px.

Horizontal gutters are fluid and increase with viewport size.

Sections use generous vertical rhythm instead of decorative separators.

Primary desktop pattern:
- strong editorial heading area;
- supporting manifesto/context block;
- functional content below.

Mobile must be intentionally recomposed into one column rather than simply compressed desktop.

---

## 5. Grid language

The subtle engineering grid may appear in selected areas such as Hero, Work and Contact.

Rules:
- very low opacity;
- never compete with text or project imagery;
- no grid on every surface;
- acts as engineering structure, not decoration.

---

## 6. Shape language

Primary large containers: 22–28px radius.

Controls and smaller cards: 10–16px radius.

Pills are reserved for:
- filters;
- tags;
- compact selectors.

Do not turn every UI element into a pill.

---

## 7. Borders and depth

Use light translucent borders instead of heavy strokes.

Primary panel border: approximately `rgba(255,255,255,.10)`.

Red borders are interaction/selection signals, not standard decoration.

Shadows stay deep and soft. Avoid glow-heavy effects.

---

## 8. Buttons

### Primary action
Light/white surface with dark text, or red when interaction/hover requires stronger urgency.

### Secondary action
Dark translucent surface with subtle border.

### Header CTA
Red gradient/accent is acceptable because it is the single high-priority navigation action.

Button language should be action-oriented and consistent with `V9_BRAND_LANGUAGE.md`.

---

## 9. Imagery

Imagery should support real projects and Andrew Tharwat Studio, not act as generic filler.

Treatment:
- slightly controlled saturation;
- cinematic contrast;
- dark overlays only where needed for copy legibility;
- minimal artificial effects;
- project imagery remains recognisable.

Founder photography should feel integrated with the same lighting/color environment as the rest of V9.

---

## 10. Motion

Motion principle: **quiet confidence.**

Use:
- short vertical entrance motion;
- slight image scale on hover;
- restrained card lift;
- clear state transitions.

Avoid:
- continuous floating objects;
- excessive parallax;
- spinning or pulsing decorative elements;
- motion that delays access to content.

Respect `prefers-reduced-motion`.

---

## 11. Cards

Cards are functional content containers, not decorative boxes.

Every card should justify its border/background through one of these roles:
- capability;
- project;
- team role;
- input/selection;
- brief summary.

Avoid nested cards without a functional reason.

---

## 12. Work presentation

Projects are the visual proof layer of the studio.

Project imagery should dominate before text.

The layout may vary through S / M / WIDE / XL cards, but typography, padding, image treatment and interaction remain consistent.

Admin layout variation must never make the public grid look accidental.

---

## 13. Arabic / RTL

Arabic is a first-class layout, not a translated overlay.

Requirements:
- right-aligned editorial headings where natural;
- reverse directional overlays where required;
- control icons positioned correctly;
- avoid forced English tracking/letter spacing;
- maintain visual weight equal to English;
- CTA arrows must follow reading direction when copy is localized.

---

## 14. Mobile

Mobile is a distinct composition state.

Requirements:
- one-column content flow;
- strong readable Hero without oversized overflow;
- full-width primary actions;
- 14px+ body copy in major explanatory areas;
- project card sizes collapse predictably;
- horizontal scroll permitted only for intentionally step-based controls such as Project Brief progress;
- no hidden critical navigation path.

---

## 15. Accessibility baseline

- Visible keyboard focus.
- Adequate text contrast.
- Buttons/links large enough to use on touch screens.
- Meaningful interactive states beyond color alone where possible.
- Reduced-motion support.
- Semantic heading order should be preserved during future section refinement.

---

## 16. Phase 1 acceptance criteria

Phase 1 is complete when:

1. Hero, Capabilities, Work, Team and Contact visibly belong to one design system.
2. Text sizes are production-readable.
3. Desktop, tablet and mobile have intentional layout rules.
4. Arabic/RTL has explicit styling rules.
5. Motion is restrained and reduced-motion compatible.
6. Red/navy/white hierarchy is consistent.
7. No new feature or section has been introduced during visual-foundation work.

After this point, section-level visual refinement must use this file as the base rather than redefining the design system per section.
