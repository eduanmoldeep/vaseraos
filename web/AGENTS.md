<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Workflow (must follow)

This file governs the `web/` Next.js/Cloudflare app specifically — the repo root is now
a monorepo (`web/` + `guardapp/`, see the root `CLAUDE.md`). All commands below assume
`cwd: web/`.

1. **Local first**: after any code change, run the build (`npx opennextjs-cloudflare build`) and show what changed (files + behavior) before any commit or deploy. Never deploy unbuilt/unshown work.
2. **Local review URL**: after building, start the local dev server (`npm run dev`) and share the localhost URL so changes can be reviewed in a browser before any staging commit, push, or deploy. Keep it running until the review is done.
2. **Staging first**: the first commit of any work goes to the `staging` branch. Never commit directly to `main`.
3. **Main via PR only**: `main` updates only through a pull request `staging` → `main`. No direct commits or pushes to `main`.
4. **Env mapping — never cross them**:
   - On `staging`: staging resources only — `npx opennextjs-cloudflare deploy --env staging` (worker `vaseraos-staging`), D1 via `npx wrangler d1 migrations apply DB --remote --env staging` (`vaseraos-db-staging`), R2 `vaseraos-uploads-staging`, KV staging id.
   - On `main` (after PR merge): prod resources only — default-env deploy (worker `vaseraos`), `npx wrangler d1 migrations apply vaseraos-db --remote`, R2 `vaseraos-uploads`, KV prod id.
   - `wrangler.jsonc` top-level = prod; `env.staging` overrides = staging. Staging and prod resources stay separate, no shared shortcuts.
