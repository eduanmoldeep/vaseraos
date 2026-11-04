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
    fontSize: "1.875rem"
    fontWeight: 700
    letterSpacing: "-0.01em"
  body:
    fontFamily: "var(--font-geist-sans), ui-sans-serif, system-ui"
    fontSize: "1rem"
    fontWeight: 400
  label:
    fontFamily: "var(--font-geist-sans), ui-sans-serif, system-ui"
    fontSize: "1rem"
    fontWeight: 500
  mono:
    fontFamily: "var(--font-geist-mono), ui-monospace"
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
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
    height: "48px"
    padding: "0 20px"
  button-accent:
    backgroundColor: "{colors.ledger-indigo}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    height: "48px"
    padding: "0 20px"
  button-danger:
    backgroundColor: "transparent"
    textColor: "{colors.warning-red}"
    rounded: "{rounded.md}"
    height: "48px"
    padding: "0 20px"
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
- One deliberate exception to the calm palette: the SOS register — the resident's red Emergency SOS button and the full-screen alarm overlay (deep rose, blur, siren) — because that moment is the product's whole reason to exist.

### The Elder Test (accessibility baseline)

Many residents are elderly and use a phone. Every screen must pass this test: *could a 75-year-old with reading glasses use it one-handed, without help?* Concretely:

- **Readable:** body text is 16px minimum (`text-base`); secondary text is `zinc-600` (not `zinc-500`) for contrast; `text-xs` is never used for content.
- **Tappable:** primary controls are at least 48px tall (`min-h-12`), small ones 40px (`min-h-10`). Inputs are 16px text, which also stops iOS zooming in on focus.
- **Labelled:** every field has a visible label above it (`Field`) — never placeholder-only. Icons always come with a text label.
- **Plain words:** raw values never reach the screen. "pending_verification" → "Checking payment", "2026-09" → "September 2026", "in_progress" → "Being fixed" (`lib/labels.ts`).
- **One clear next step:** each card states where things stand in a sentence and offers one primary action. Add-forms stay collapsed behind a single button (`AddPanel`) until asked for.
- **Confirm and acknowledge:** destructive or alarming actions confirm in plain language; every save shows a green success message saying what happened.
- **Adjustable:** My account → Text size (Normal / Large / Extra large) scales the whole UI by changing the root font-size (`html[data-text-size]`).

## Colors

A near-monochrome zinc palette carries the UI; color is spent only on the accent, the danger signal, and per-module identity dots.

### Primary
- **Ink Zinc** (`#09090b` on light, inverts to white text on `#09090b` in dark mode / `#fff` bg → `#000` text for the inverted primary button): the default ink — body text, headings, and the primary button's fill.

### Secondary
- **Ledger Indigo** (`#4f46e5`): the one accent — focus rings, text-link color, the `accent` button variant, and text selection. Used sparingly; it marks "this is the one emphasized action/field," not general decoration.

### Tertiary
- **Warning Red** (`#dc2626`): the canonical danger/destructive token — delete actions, error banners, the `red` badge tone, and the complaints module dot. **The One Danger Rule.** Destructive or alarming UI uses `red-*`, never `rose-*`; `UserMenu`'s logout control currently uses `rose-600`/`rose-400` and is drift from this rule, not a second valid danger color — fix it to `red` rather than documenting two reds. The SOS alarm overlay is the sanctioned exception: it uses deep `rose-950` at high opacity specifically to read as a different register (alarm, not a normal destructive action). The resident's **Emergency SOS** trigger is the one solid `red-600` button in the system — the only place a filled red control is allowed.

### Neutral
- **Paper White / Near-Black** (`#ffffff` / `#09090b`): page and card background, flips per color scheme.
- **Zinc scale** (`zinc-50`…`zinc-950`): borders (`zinc-200` light / `zinc-800` dark), muted text (`zinc-500`), hover fills (`zinc-100` light / `zinc-800` dark), skeleton fills.

### Module Dots (signature, non-frontmatter roles)
- **Sky** (`#0ea5e9`) — Residents
- **Amber** (`#f59e0b`) — Maintenance (also the Impersonation banner's full-width warning color)
- **Rose** (`#f43f5e`) — Complaints
- **Violet** (`#8b5cf6`) — Visitors
- **Emerald** (`#10b981`) — Notices

**Dots became coloured icons.** Navigation uses labelled lucide icons (`components/icons.tsx`, one `Icon name=…` vocabulary for the whole app) instead of bare dots, because a dot carries meaning only by colour, which fails colour-blind and low-vision users. In the committee sidebar and phone menu each section's icon keeps its module colour (`lib/adminNav.ts` → `color`) as a secondary cue; the text label always carries the meaning. Module colours are never promoted to a full background or button colour.

## Typography

**Display/Body Font:** Geist (`var(--font-geist-sans)`), system-ui fallback
**Mono Font:** Geist Mono (`var(--font-geist-mono)`), used where monospaced alignment matters (not yet broadly applied)

**Character:** A plain, highly legible grotesque doing all the work — no display face, no personality font. Hierarchy comes from weight and size steps, not typographic flourish.

### Hierarchy
- **Title** (700, `text-2xl` → `sm:text-3xl`, tight tracking): page headers (`PageHeader`'s `title`).
- **Section** (600, `text-xl`): card and section headings (`Section`, home cards).
- **Key figure** (700, `text-3xl`): amounts and counts people came to see ("₹7,000 to pay", `Stat`).
- **Body** (400, 1rem/`text-base`, `leading-[1.55]`): default UI copy, form labels, list rows. Notice bodies use `text-lg`.
- **Muted** (400, `text-base`/`text-sm`, zinc-600 / dark zinc-400): subtitles, hints under fields, metadata lines.
- **Badge** (600, `text-sm`): status pills.

## Layout

- **Resident shell** (`components/ResidentShell.tsx`, `app/(resident)/layout.tsx`): society name + flat on top; five big labelled tabs — Home, Dues, Complaints, Notices, Account — fixed to the bottom on phones and under the header on wider screens. Single column, `max-w-3xl`.
- **Committee shell** (`app/admin/layout.tsx`): desktop sidebar grouped by job (Today / Money / People / Platform, from `lib/adminNav.ts`); on phones a single "Menu" button opens a full-screen list where every section has a one-line description. Office bearers get "My home" to reach their own resident view.
- **Pages** are stacked `Card`s. Lists filter with `Tabs` (with counts) instead of per-row status dropdowns, and each row offers the one next step as a button ("Start work on it" → "Mark as fixed").
- **Forms** use `Field` labels in a single column on phones (`grid gap-4`, `sm:grid-cols-2/3` on wider screens) and live inside `AddPanel` until opened.
- Spacing runs on Tailwind's default scale: `gap-3`/`gap-4` between elements, `p-5` card padding, `mt-8` between sections. Everything is rem-based so the text-size setting scales spacing too.

## Elevation & Depth

Mostly flat and bordered: `border-zinc-200`/`border-zinc-800` does the separation work, not shadow. Shadow is available for emphasis on cards (not overlay-exclusive) but should stay occasional — reach for a border first, a shadow only when a surface needs to visually lift off the page (the account dropdown's `shadow-lg`, the SOS overlay's `shadow-2xl`).

### Shadow Vocabulary
- **Floating menu** (`shadow-lg`): dropdown/overlay panels like the account menu.
- **Alarm overlay** (`shadow-2xl`): the SOS modal card, paired with a full-screen `backdrop-blur-sm` scrim — reserved for the one screen that must interrupt everything.

## Shapes

- **`rounded-xl` (12px)** — buttons, inputs, choice pills, menu rows: the most common radius now that controls are 48px tall.
- **`rounded-2xl` (16px)** — cards, banners, dropdown panels, the SOS button and alarm card: anything that reads as a "container."
- **`rounded-full`** — avatars, badges/pills, status dots.

## Components

### Buttons (`components/ui.tsx` → `Button`, `LinkButton`, `buttonClass`)
- **Shape:** `rounded-xl`, `font-semibold`. Sizes: `sm` (`min-h-10 text-sm`), `md` default (`min-h-12 text-base`), `lg` (`min-h-14 text-lg`) for the main action of a screen. Optional leading `icon`.
- **Never disabled without a reason:** prefer leaving a button pressable and showing a plain error ("Please choose the payment screenshot first.") over a greyed-out button that gives no explanation.
- **Primary:** Ink Zinc fill, inverted in dark mode (`bg-zinc-950 text-white` / `dark:bg-white dark:text-black`) — the default action.
- **Accent:** Ledger Indigo fill (`bg-indigo-600`, hover `indigo-500`) — reserved for the single emphasized action on a view.
- **Secondary:** bordered ghost (`border-zinc-300`, hover fill `zinc-100`) — the non-default action.
- **Danger:** text-only red, hover tint (`text-red-600 hover:bg-red-50`) — no filled danger button exists; destructive actions stay visually quiet until confirmed.
- **Ghost:** underlined text link (`text-zinc-600 underline`) — lowest-emphasis action.
- **Busy state:** swaps label for a spinner + optional `busyText`; never disables without a visible reason.

### Badges
- **Style:** `rounded-full`, `px-3 py-1`, `text-sm font-semibold`. Text always comes from `lib/labels.ts` status maps (plain words, never raw enum values).
- **Tones:** `zinc` (default/neutral), `green`, `amber`, `red`, `blue` — each a `100`-background/`800`-text pair in light, `900/40`-background/`200`-text in dark.

### Cards
- **Corner Style:** `rounded-2xl` (16px).
- **Background / border:** white with `zinc-200` border (dark: `zinc-950` / `zinc-800`) — the border is the primary depth cue.
- **Variants via props, not classes:** `tone` (`default | amber | green | red | indigo`) and `padding` (`none | sm | md | lg`). Passing a conflicting `bg-*`/`p-*` className does not reliably win in Tailwind, so don't.

### Inputs / Fields (`Field` + `Input`, `Textarea`, `Select` — shared `fieldClass`)
- **Style:** `rounded-xl`, `min-h-12`, `text-base`, bordered (`zinc-400`/`zinc-600` dark — visible against white), white/`zinc-900` dark fill.
- **`Field`:** visible label above, optional "(optional)" marker, hint below. Wraps the control in a `<label>`; pass `htmlFor` instead when the field also contains a button (e.g. Show password) so the button text doesn't leak into the field's accessible name.
- **`ChoiceGroup`:** big radio pills for picking one of ≤6 options (complaint kind, visitor reason, owner/tenant) — easier than a dropdown.
- **`FilePicker`:** a large dashed "Choose screenshot" target that shows the chosen file's name.
- **Focus:** border flips to Ledger Indigo plus a soft `ring-4` indigo glow at 20% opacity.
- **Disabled:** `opacity-60` with `cursor-not-allowed`.

### Navigation / Account Menu (`UserMenu`)
- Avatar-initial circle + name, opens a `rounded-2xl` bordered panel with `shadow-lg` (full-width on phones). Rows are `min-h-11` with icons: My home, My account & text size, alerts switch, Get help, Suggest an improvement, Log out (red).
- Residents don't get this dropdown — the Account tab (`/me`) holds the same things as full-size cards.

### Other building blocks
- **`AddPanel`** — one "+ Add …" button that opens the form in an indigo-ringed card with Cancel; the form collapses itself on success.
- **`Tabs`** — segmented filter with counts ("To approve 1 · Unpaid 5 · Paid 2").
- **`ToggleChip`** — on/off pill with a check mark, used for committee roles.
- **`SuccessBanner` / `ErrorBanner`** — green `role=status` / red `role=alert`, `text-base`, with an icon and a plain sentence.
- **`Stat`** — label + `text-3xl` figure, optionally a link.
- **Overlays inside the sticky headers render through a portal to `<body>`** — the header's `backdrop-blur` otherwise becomes the containing block for `position: fixed` children.

### Module Dot (signature component)
- A small `rounded-full` solid-color dot (8–10px) preceding a module's title on the home and admin dashboards. One fixed color per module (see Colors → Module Dots); never reused for anything else.

### Emergency SOS button (resident Home)
- Full-width solid `red-600` button, `min-h-20`, alert icon, "Emergency SOS" in `text-2xl` bold with a one-line explanation. Always the first thing on Home.
- Opens a confirm dialog (same rose scrim as the alarm) with a large "Yes, send alert" and "No, go back". After sending, the button is replaced by a live status card ("Alerting the guard now…" → "A guard is on the way").

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
- **Do** favor familiar, conventional UI patterns (bottom tabs, plain forms, plain buttons, lists) over novel interaction design — the audience includes elderly, non-tech-savvy residents and guards.
- **Do** pass the Elder Test on every new screen: 16px+ text, 48px targets, visible labels, plain words, one clear next step.
- **Do** route every status/period/amount through `lib/labels.ts`.

### Don't:
- **Don't** use `rose-*` for destructive UI outside the SOS overlay — `red-*` is the canonical danger token; fix `UserMenu`'s logout color rather than copying it elsewhere.
- **Don't** add a second accent color; Ledger Indigo stays the only emphasis color outside module dots and the SOS overlay.
- **Don't** give the SOS alarm overlay's intensity (deep scrim, blur, siren) to any other screen — it would cheapen the one moment it's supposed to mark as different.
- **Don't** introduce decorative/novel UI patterns in pursuit of "delight" — simplicity and familiarity are the design goal for this audience, not visual excitement.
- **Don't** use `text-xs`, placeholder-only fields, icon-only buttons, or status dropdowns on list rows.
- **Don't** show an always-open "add" form at the top of a page — put it in `AddPanel`.
