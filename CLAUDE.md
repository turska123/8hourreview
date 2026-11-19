# 8hourreview: notes for Claude

8 Hour Game Reviews: Akim's game reviews, each written after exactly 8 hours of play. Nuxt 4 static site
(`nuxt generate`) with @nuxt/content 3 Markdown reviews, Tailwind, dark mode and an `/admin` page that builds a review's
Markdown in the browser. Run / check / publish: [README.md](README.md).

Tier **site**: content is `content/`, `public/` and `docs/`; everything else is code. This file is public on
GitHub (a mirror), so no forge address in it.

## Rules (agreed with Akim)

- **Every push to `main` is live.** The forge push-mirrors to GitLab, which mirrors `main` on to the **public**
  GitHub repo `turska123/8hourreview`, and Netlify rebuilds www.8hourreview.com from it. So: the gate before every
  push (the hook does it), nothing secret or personal in any commit, and a content push to main is a publish.
- **Don't touch Netlify, the GitLab or GitHub mirrors or DNS (GoDaddy).**
- **The GitLab Pages job is manual-only** (a `publish-*` tag pushed to the forge reaches GitLab through the mirror,
  or Build > Pipelines > Run pipeline on GitLab). Nobody uses that copy yet; don't make it run on pushes again.
- Third-party requests are allow-listed in `tests/smoke/pages.spec.ts` (`OFFSITE_ALLOWED`); anything new from another
  site fails the smoke test.
- Reviews are Markdown in `content/reviews/<slug>.md`; the front matter fields are in README "Writing a review".
- Upgrades only in upkeep (`npm install --before=<date>` picks releases old enough).

## Checking

- `tools/check.sh` (or `npm run check`): prettier, eslint, `nuxi typecheck`, `nuxt generate` (any WARN line fails),
  Playwright smoke in Firefox, npm audit of shipped deps, gitleaks. Must print `ALL CLEAN`; the pre-push hook runs it.
  Setup per machine: README.
- Tests (`tests/smoke/`): `pages.spec.ts` opens every generated page (and the 404) and fails on console
  errors/warnings, failed or off-site requests and broken links; `site.spec.ts` checks share images, the manifest and
  the not-found page; `images.spec.ts` fails on photo metadata in `public/`, `assets/` or the output.
- `audit-allowlist.json` holds build-time advisories with no fixed release in range, until **2027-01-10**: picomatch
  (dev-wiki#55), minimatch and zod (#17). An expired entry fails the check: re-check and remove, or extend with a
  reason and Akim's OK.

## State (2026-11-19)

- Live on Netlify, on the shared standard (#1), Nuxt 4 and @nuxt/content 3 (#2). Open work: forge issues.

## Where to look

| What                                | Where                                                           |
| ----------------------------------- | --------------------------------------------------------------- |
| Reviews (content)                   | `content/reviews/*.md`                                          |
| Header, footer, analytics, favicons | `layouts/default.vue`                                           |
| Home, review list, review, about    | `pages/index.vue`, `pages/reviews/`, `pages/about/`             |
| Not-found page                      | `pages/[...slug].vue`                                           |
| Review Markdown generator           | `pages/admin/index.vue`                                         |
| Static files (logo, favicons)       | `public/` (served as is; `assets/css/` is the Tailwind CSS)     |
| Site title, modules                 | `nuxt.config.ts`                                                |
| Review front matter schema          | `content.config.ts`                                             |
| Gate, audit allow-list              | `tools/check.sh`, `tools/npm-audit.mjs`, `audit-allowlist.json` |
| CI (GitLab Pages copy)              | `.gitlab-ci.yml`                                                |

## Gotchas

- **Images in templates vs meta tags:** Vite rewrites `<img src="/assets/...">` in a template but not a URL inside
  `useHead` meta. Share images (`og:image`, `twitter:image`) must be absolute `https://www.8hourreview.com/...` URLs to
  a file in `public/`; `site.spec.ts` checks it.
- **404.html is a client-rendered shell.** Without `pages/[...slug].vue`, Nuxt's router throws "Page not found"
  while starting and logs a console error. Keep the catch-all page, and keep its `setResponseStatus(..., 404)`:
  without it a broken internal link is generated as a "Page not found" page with status 200 instead of failing the
  build (`site.spec.ts` checks no generated page is the not-found page).
- **Nuxt builds aren't byte-reproducible** (chunk hashes, build id, cache timestamps). To prove a change is
  formatting-only, compare the generated HTML with those masked.
- **Content 3 keeps only schema fields.** Front matter the pages read must be in `content.config.ts`. Queries are
  `queryCollection("reviews")`, and a review's URL is its `path` (no `_path`).
- **Content 3 uses Node's built-in sqlite** (`experimental.sqliteConnector: "native"`): no native better-sqlite3,
  which the NAS VM can't build. Needs Node 22.5+ (we use 24).
- **Plain-JS `<script setup>`:** `nuxi typecheck` checks `.ts` files and `lang="ts"` blocks only (#7).
- Use www.8hourreview.com in absolute URLs; 8hourreview.com 301-redirects to it.
- The dev server runs on port 3333 (`nuxt.config.ts`), the smoke test's server on 4331.
