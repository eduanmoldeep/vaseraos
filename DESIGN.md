---
name: VaseraOS
description: Housing-society management and guard-alarm platform for residents, office bearers, and guards.
colors:
  ink-zinc: "#09090b"
  ink-zinc-inverse: "#ffffff"
  ledger-indigo: "#4f46e5"
  warning-red: "#dc2626"
  surface-bg: "#ffffff"
  surface-bg-dark: "#09090b"
  neutral-border: "#e4e4e7"
  neutral-border-dark: "#27272a"
  module-residents: "#0ea5e9"
  module-maintenance: "#f59e0b"
  module-complaints: "#f43f5e"
  module-visitors: "#8b5cf6"
  module-notices: "#10b981"
typography:
  display:
    fontFamily: "var(--font-geist-sans), ui-sans-serif, system-ui"
    fontSize: "1.5rem"
    fontWeight: 600
    letterSpacing: "-0.01em"
  body:
    fontFamily: "var(--font-geist-sans), ui-sans-serif, system-ui"
    fontSize: "0.875rem"
    fontWeight: 400
  label:
    fontFamily: "var(--font-geist-sans), ui-sans-serif, system-ui"
    fontSize: "0.75rem"
    fontWeight: 500
  mono:
    fontFamily: "var(--font-geist-mono), ui-monospace"
rounded:
  sm: "6px"
  md: "8px"
  lg: "12px"
  xl: "16px"
  full: "9999px"
spacing:
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.ink-zinc}"
    textColor: "{colors.ink-zinc-inverse}"
    rounded: "{rounded.md}"
    padding: "10px 16px"
  button-accent:
    backgroundColor: "{colors.ledger-indigo}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "10px 16px"
  button-danger:
    backgroundColor: "transparent"
    textColor: "{colors.warning-red}"
    rounded: "{rounded.md}"
    padding: "10px 16px"
  card:
    backgroundColor: "{colors.surface-bg}"
    rounded: "{rounded.lg}"
    padding: "20px"
---

# Design System: VaseraOS

## Overview

**Creative North Star: "The Ledger Room"**

VaseraOS reads like a well-run back office, not a consumer app: calm, precise, unfussy. Every screen exists to be scanned fast and trusted — a resident roster, a dues ledger, a complaint queue — by people who range from a tech-fluent office bearer to a resident or guard who is not tech-savvy. The aesthetic stays simple and elegant on purpose, leaning on conventions people already know (plain forms, plain tables, a flat toolbar) rather than novel interaction patterns, so it feels immediately familiar rather than clever.

Confirmed anti-reference: not the bright, card-heavy, consumer-flashy look of MyGate/NoBrokerHood-style RWA apps. VaseraOS's edge is the guard-alarm pipeline, not decorative polish — so the interface is deliberately quiet everywhere except the one place urgency is real: the SOS alarm overlay.

**Key Characteristics:**
- Zinc-neutral ink on white (and inverted in dark mode), one indigo accent, one red danger signal.
- Flat, bordered surfaces by default; shadow is allowed on cards now too (not overlay-exclusive), used to lift emphasis rather than as a default surface treatment.
- A single consistent "module dot" color per product area (residents, maintenance, complaints, visitors, notices) repeated across the home page and admin dashboard.
- One deliberate exception to the calm palette: the full-screen SOS alarm overlay, which goes loud (deep rose, blur, siren) because that moment is the product's whole reason to exist.

## Colors

A near-monochrome zinc palette carries the UI; color is spent only on the accent, the danger signal, and per-module identity dots.

### Primary
- **Ink Zinc** (`#09090b` on light, inverts to white text on `#09090b` in dark mode / `#fff` bg → `#000` text for the inverted primary button): the default ink — body text, headings, and the primary button's fill.

### Secondary
- **Ledger Indigo** (`#4f46e5`): the one accent — focus rings, text-link color, the `accent` button variant, and text selection. Used sparingly; it marks "this is the one emphasized action/field," not general decoration.

### Tertiary
- **Warning Red** (`#dc2626`): the canonical danger/destructive token — delete actions, error banners, the `red` badge tone, and the complaints module dot. **The One Danger Rule.** Destructive or alarming UI uses `red-*`, never `rose-*`; `UserMenu`'s logout control currently uses `rose-600`/`rose-400` and is drift from this rule, not a second valid danger color — fix it to `red` rather than documenting two reds. The SOS alarm overlay is the sanctioned exception: it uses deep `rose-950` at high opacity specifically to read as a different register (alarm, not a normal destructive action).

### Neutral
- **Paper White / Near-Black** (`#ffffff` / `#09090b`): page and card background, flips per color scheme.
- **Zinc scale** (`zinc-50`…`zinc-950`): borders (`zinc-200` light / `zinc-800` dark), muted text (`zinc-500`), hover fills (`zinc-100` light / `zinc-800` dark), skeleton fills.

### Module Dots (signature, non-frontmatter roles)
- **Sky** (`#0ea5e9`) — Residents
- **Amber** (`#f59e0b`) — Maintenance (also the Impersonation banner's full-width warning color)
- **Rose** (`#f43f5e`) — Complaints
- **Violet** (`#8b5cf6`) — Visitors
- **Emerald** (`#10b981`) — Notices

**The One Dot Per Module Rule.** Each product module keeps exactly one identity color, used only as a small rounded dot/indicator on home and admin dashboards — never promoted to a full background or button color for that module.

## Typography

**Display/Body Font:** Geist (`var(--font-geist-sans)`), system-ui fallback
**Mono Font:** Geist Mono (`var(--font-geist-mono)`), used where monospaced alignment matters (not yet broadly applied)

**Character:** A plain, highly legible grotesque doing all the work — no display face, no personality font. Hierarchy comes from weight and size steps, not typographic flourish.

### Hierarchy
- **Title** (600, 1.5rem/`text-2xl`, tight tracking): page headers (`PageHeader`'s `title`).
- **Body** (400, 0.875rem/`text-sm`): default UI copy, form labels, table cells.
- **Subtitle/Muted** (400, 0.875rem/`text-sm`, zinc-500): `PageHeader` subtitle, empty states, helper text.
- **Label** (500, 0.75rem/`text-xs`): badges, uppercase micro-labels (e.g. "SOS ALARM" in the alarm overlay).

## Layout

Single-column admin shell with a left/top nav (`adminNav.ts`-driven) and content area built from stacked `Card`s. Forms lay out as a responsive grid (`grid gap-3 sm:grid-cols-4` pattern) that collapses to one column on mobile. Dashboards use a repeating dot-indicator row/grid for module shortcuts and stat tiles. Spacing rhythm runs on Tailwind's default scale at `gap-3`/`gap-4` between elements and `p-5`/`p-6` internal card padding — no custom spacing scale beyond Tailwind defaults.

## Elevation & Depth

Mostly flat and bordered: `border-zinc-200`/`border-zinc-800` does the separation work, not shadow. Shadow is available for emphasis on cards (not overlay-exclusive) but should stay occasional — reach for a border first, a shadow only when a surface needs to visually lift off the page (the account dropdown's `shadow-lg`, the SOS overlay's `shadow-2xl`).

### Shadow Vocabulary
- **Floating menu** (`shadow-lg`): dropdown/overlay panels like the account menu.
- **Alarm overlay** (`shadow-2xl`): the SOS modal card, paired with a full-screen `backdrop-blur-sm` scrim — reserved for the one screen that must interrupt everything.

## Shapes

- **`rounded-lg` (8px)** — default for buttons, inputs, menu items: the most common radius in the system.
- **`rounded-xl` (12px)** — cards, dropdown panels, error banners: anything that reads as a "container."
- **`rounded-2xl` (16px)** — the SOS alarm card only, slightly softer to read as a distinct, calmer object inside an urgent scrim.
- **`rounded-full`** — avatars, badges/pills, status dots.

## Components

### Buttons (`components/ui.tsx` → `Button`)
- **Shape:** `rounded-lg` (8px), `px-4 py-2.5 text-sm` at default size, `px-2.5 py-1.5 text-xs` at `sm`.
- **Primary:** Ink Zinc fill, inverted in dark mode (`bg-zinc-950 text-white` / `dark:bg-white dark:text-black`) — the default action.
- **Accent:** Ledger Indigo fill (`bg-indigo-600`, hover `indigo-500`) — reserved for the single emphasized action on a view.
- **Secondary:** bordered ghost (`border-zinc-300`, hover fill `zinc-100`) — the non-default action.
- **Danger:** text-only red, hover tint (`text-red-600 hover:bg-red-50`) — no filled danger button exists; destructive actions stay visually quiet until confirmed.
- **Ghost:** underlined text link (`text-zinc-600 underline`) — lowest-emphasis action.
- **Busy state:** swaps label for a spinner + optional `busyText`; never disables without a visible reason.

### Badges
- **Style:** `rounded-full`, `px-2.5 py-0.5`, `text-xs font-medium`.
- **Tones:** `zinc` (default/neutral), `green`, `amber`, `red`, `blue` — each a `100`-background/`800`-text pair in light, `900/40`-background/`200`-text in dark.

### Cards
- **Corner Style:** `rounded-xl` (12px).
- **Background:** white / `zinc-950` dark.
- **Border:** `zinc-200` light / `zinc-800` dark — the primary depth cue.
- **Internal Padding:** `p-5`.

### Inputs / Fields (`Input`, `Textarea`, `Select` — shared `fieldClass`)
- **Style:** `rounded-lg`, bordered (`zinc-300`/`zinc-700` dark), white/`zinc-900` dark fill.
- **Focus:** border flips to Ledger Indigo plus a soft `ring-2` indigo glow at 20% opacity — the only place a glow effect is used.
- **Disabled:** `opacity-60` with `cursor-not-allowed`.

### Navigation / Account Menu (`UserMenu`)
- Avatar-initial circle (`rounded-full`, zinc-800 fill) + name, opens a `rounded-xl` bordered panel with `shadow-lg`.
- Menu items are `rounded-lg` rows with a `zinc-100`/`zinc-800` hover fill; the destructive "Log out" row is the one place needing the red-not-rose fix (see Colors → Tertiary).

### Module Dot (signature component)
- A small `rounded-full` solid-color dot (8–10px) preceding a module's title on the home and admin dashboards. One fixed color per module (see Colors → Module Dots); never reused for anything else.

### SOS Alarm Overlay (signature component — the product's core differentiator)
- **Trigger context:** a resident's panic signal, surfaced live to whoever is viewing an admin/resident screen via `SosWatcher`.
- **Style:** full-screen fixed overlay, `bg-rose-950/80` scrim with `backdrop-blur-sm`; centered `rounded-2xl` white/`zinc-900` card, `shadow-2xl`, `max-w-sm`.
- **Content:** uppercase red micro-label ("SOS alarm"), bold status line ("Resident needs help" / "Guard is on the way"), flat number, single full-width `danger`-variant `Button` to resolve.
- **Audio:** a looping `<audio>` siren plays while the overlay is active — the one place sound is part of the design.
- **The Loud Exception Rule.** This is the only screen allowed to break the system's calm register. Nothing else in VaseraOS should use this intensity of color, blur, or motion.

## Do's and Don'ts

### Do:
- **Do** keep the palette near-monochrome (zinc ink + one indigo accent) everywhere except module dots and the SOS overlay.
- **Do** use `red-*` for every destructive/danger surface — button, color, badge tone, banner.
- **Do** default to a border for separation; reach for shadow only to lift a genuinely floating or emphasized surface.
- **Do** favor familiar, conventional UI patterns (plain forms, plain buttons, plain tables) over novel interaction design — the audience includes non-tech-savvy residents and guards.
- **Do** keep exactly one identity color per module, expressed only as a small dot indicator.

### Don't:
- **Don't** use `rose-*` for destructive UI outside the SOS overlay — `red-*` is the canonical danger token; fix `UserMenu`'s logout color rather than copying it elsewhere.
- **Don't** add a second accent color; Ledger Indigo stays the only emphasis color outside module dots and the SOS overlay.
- **Don't** give the SOS alarm overlay's intensity (deep scrim, blur, siren) to any other screen — it would cheapen the one moment it's supposed to mark as different.
- **Don't** introduce decorative/novel UI patterns in pursuit of "delight" — simplicity and familiarity are the design goal for this audience, not visual excitement.
