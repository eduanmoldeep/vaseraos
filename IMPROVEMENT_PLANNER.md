# VaseraOS — Improvement Planner

16 findings from a full read of the repo (`staging` branch, 2026-09-12) — auth, the five CRUD API
routes, the D1 schema, Cloudflare bindings, and the admin UI. Grouped by area, tagged by severity
and the effort to fix, so the next work session can start at the top of a category instead of
re-deriving this. No code was changed — planning only.

**Totals:** 7 High · 5 Medium · 4 Low

## Quick wins — ship this week

Small-effort fixes, ordered by how much they de-risk everything else.

1. Guard `req.json()` in the five CRUD routes so a malformed body 400s instead of 500ing.
2. Make the society-delete cascade one `env.DB.batch()` call instead of six sequential awaits.
3. Add a GitHub Actions workflow running lint + build on every PR into `main`.
4. Add `app/error.tsx` so a render error shows the app's own UI, not Next's default crash screen.

## Security & access

### [High · Effort M] No rate limiting on login or signup
Both endpoints accept unlimited attempts from any IP. Credential stuffing and brute-force against
`verifyLogin` have no backstop — worth a KV-backed counter keyed on IP+email before this goes
further than staging traffic.
Files: `lib/auth.ts:75`, `app/api/auth/login/route.ts`, `app/api/auth/signup/route.ts`

### [High · Effort L] Admin is a single global flag — no per-society boundary
`requireAdmin` only checks the boolean; any admin account can read and write every society's data
by changing the `?society=` query param. The society switcher in the header is a UI convenience,
not an access control — it's enforced nowhere server-side.
Files: `lib/auth.ts:121`, `components/SocietySwitcher.tsx`, `app/api/*/route.ts`

### [Medium · Effort M] No audit trail for admin mutations
Society deletes, resident removals, and bill/complaint status changes leave no record of who did
it or when — only the current state survives. Matters once more than one admin account exists per
society.
Files: `app/api/societies/route.ts`, `app/api/bills/route.ts`

### [Low · Effort S] Password policy is length-only, no change/revoke flow
Signup requires 8+ characters and nothing else. There's no password-change endpoint and no way to
invalidate a compromised session short of deleting its single KV token by hand.
Files: `lib/auth.ts:59`

## Correctness & data integrity

### [High · Effort S] Unguarded `req.json()` on five CRUD routes
The auth routes wrap the parse in `.catch(() => ({}))`; the residents, bills, complaints, visitors
and notices routes don't. A malformed or empty POST body throws before validation ever runs,
returning a raw 500 instead of a 400 with a message.
Files: `app/api/residents/route.ts:20`, `bills/route.ts`, `complaints/route.ts`,
`visitors/route.ts`, `notices/route.ts`

### [High · Effort M] Numeric fields aren't validated before insert
`Number(body.amount ?? 0)` and `Number(body.members ?? 1)` turn any non-numeric input into `NaN`,
which D1 will happily store. Nothing rejects it before the row is written.
Files: `app/api/bills/route.ts:24`, `app/api/residents/route.ts:26`

### [Medium · Effort S] Society deletion isn't atomic
Deleting a society runs six sequential `await` statements across five child tables plus the parent
row. A failure partway through orphans whatever tables already ran. D1's `batch()` exists for
exactly this.
Files: `app/api/societies/route.ts` (DELETE)

### [Low · Effort S] Signup hardcodes the session cookie name
Login and logout import `SESSION_COOKIE`; signup writes the literal string `"vasera_session"`
instead. Harmless today, a silent break if the constant ever changes.
Files: `app/api/auth/signup/route.ts:11`, `lib/auth.ts:8`

## Product gaps

### [High · Effort L] Notice attachments are advertised, not built
The landing page and the notices screen both promise file attachments, the schema has an
`attachment` column, and `wrangler.jsonc` declares an R2 `UPLOADS` bucket — but no upload route
exists anywhere, so the field is dead weight and the copy overstates the product.
Files: `wrangler.jsonc` (r2_buckets), `db/schema.sql` (notices.attachment),
`app/admin/notices/page.tsx`

### [Medium · Effort M] Maintenance bills can't be generated in bulk
The only way to create a bill is one POST per flat. The actual monthly workflow for a society
admin is "generate this month's bill for every flat at once" — that operation doesn't exist yet.
Files: `app/api/bills/route.ts` (POST)

### [Low · Effort L] No resident-facing surface
Every module lives under `/admin`. A signed-up non-admin account hits a dead end — "ask your
admin" — with no self-service view of their own dues, complaints, or notices.
Files: `app/page.tsx` (non-admin branch)

## Reliability & DX

### [High · Effort M] Zero automated tests
No test runner is configured and no test files exist. The five near-identical CRUD routes are
exactly the kind of code that drifts silently without coverage.
Files: `package.json` (scripts)

### [High · Effort S] No CI
There's no `.github/` workflow, so lint and build aren't enforced before a staging → main PR
merges — despite AGENTS.md making that PR flow mandatory.
Files: `.github/workflows` (missing)

### [Medium · Effort S] No global error boundary
Neither `app/error.tsx` nor `app/global-error.tsx` exists, so an unhandled render error falls
through to Next's generic crash screen instead of the app's own styling.
Files: `app/` (missing error.tsx)

### [Medium · Effort M] Five routes repeat the same CRUD boilerplate
Residents, bills, complaints, visitors and notices each hand-roll the same requireAdmin →
D1-or-mockStore branching. A shared handler factory would cut roughly three-quarters of that code
and make the next entity type a five-minute add.
Files: `app/api/residents/route.ts`, `bills/`, `complaints/`, `visitors/`, `notices/route.ts`

### [Low · Effort S] List endpoints have no pagination
Fine at today's row counts; every `GET` fetches a full table scoped only by `society_id`. Worth a
`LIMIT`/cursor before a society's history grows large.
Files: `app/api/*/route.ts` (GET)

---
Source: full read of `app/`, `lib/`, `db/`, `wrangler.jsonc` on `staging`.
