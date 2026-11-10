# 8hourreview: notes for Claude

8 Hour Game Reviews: Akim's game reviews, each written after exactly 8 hours of play. Nuxt 3 static site
(`nuxt generate`) with @nuxt/content Markdown reviews, Tailwind, dark mode and an `/admin` page that builds a review's
Markdown in the browser. Run / check / publish: [README.md](README.md).

**Way of working:** the shared standard (`~/source/Repos/dev-wiki/standards/README.md`), tier **site**: content
(`content/`, `public/`, `docs/`) may go straight to `main` once the check passes; code (pages, layouts, components,
`assets/css/`, config, tests, tooling) goes through a Draft MR that Akim merges. Backlog = GitLab issues. Decisions =
wiki `Decision-log` (`glab api projects/:id/wikis/Decision-log`); don't re-propose what's listed there.

## Rules (agreed with Akim)

- **Every push to `main` is live.** GitLab push-mirrors `main` to the **public** GitHub repo `turska123/8hourreview`,
  and Netlify rebuilds www.8hourreview.com from it. So: the gate before every push (the hook does it), nothing
  secret or personal in any commit, and a content push to main is a publish.
- **Don't touch Netlify, the GitHub mirror or DNS (GoDaddy).** Moving off Netlify is idea #9.
- **The GitLab Pages job is manual-only** (`publish-*` tag or Build > Pipelines > Run pipeline). Nobody uses that
  copy yet; don't make it run on pushes again.
- Third-party requests are allow-listed in `tests/smoke/pages.spec.ts` (`OFFSITE_ALLOWED`); anything new from another
  site fails the smoke test. Whether the current ones stay is #3. No Google Fonts, ever.
- Reviews are Markdown in `content/reviews/<slug>.md`; the front matter fields are in README "Writing a review".
- Exact dependency versions, at least two weeks old (`npm install --before=<date>`). Upgrades only in upkeep (#2 is
  the Nuxt 4 / @nuxt/content 3 one).

## Checking

- `tools/check.sh` (or `npm run check`): prettier, eslint, `nuxi typecheck`, `nuxt generate` (any WARN line fails),
  Playwright smoke in Firefox, npm audit of shipped deps, gitleaks. Must print `ALL CLEAN`; the pre-push hook runs it.
- Setup per machine: `npm ci`, `npx playwright install firefox`, `git config core.hooksPath .githooks`.
- Tests (`tests/smoke/`): `pages.spec.ts` opens every generated page (and the 404) and fails on console
  errors/warnings, failed or off-site requests and broken links; `site.spec.ts` checks share images, the manifest and
  the not-found page; `images.spec.ts` fails on photo metadata in `public/`, `assets/` or the output.
- `npm audit` findings that need Nuxt 4 are in `audit-allowlist.json` (expire **2026-12-10**, #2). An expired entry
  fails the check: do #2 or re-check and extend with a reason.

## State (2026-11-10)

- Live on Netlify. Adopted the shared standard in #1 (gate, tests, docs, Pages job manual-only).
- Next: #2 Nuxt 4 + @nuxt/content 3 (clears the audit allow-list). Waiting on Akim: #3 third-party images, #4
  licence, #5 `/admin` on the live site, #8 About page name and footer year. Small: #6 admin YAML quoting bug, #7
  type-check the Vue files.

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
| Gate, audit allow-list              | `tools/check.sh`, `tools/npm-audit.mjs`, `audit-allowlist.json` |
| CI (GitLab Pages copy)              | `.gitlab-ci.yml`                                                |

## Gotchas

- **Images in templates vs meta tags:** Vite rewrites `<img src="/assets/...">` in a template but not a URL inside
  `useHead` meta. Share images (`og:image`, `twitter:image`) must be absolute `https://www.8hourreview.com/...` URLs to
  a file in `public/`; `site.spec.ts` checks it.
- **404.html is a client-rendered shell.** Without `pages/[...slug].vue`, Nuxt's router throws "Page not found"
  while starting and logs a console error. Keep the catch-all page.
- **Nuxt builds aren't byte-reproducible** (chunk hashes, build id, cache timestamps). To prove a change is
  formatting-only, compare the generated HTML with those masked.
- **Plain-JS `<script setup>`:** `nuxi typecheck` checks `.ts` files and `lang="ts"` blocks only (#7).
- Use www.8hourreview.com in absolute URLs; 8hourreview.com 301-redirects to it.
- The dev server runs on port 3333 (`nuxt.config.ts`), the smoke test's server on 4331.
