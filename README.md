# 8 Hour Game Reviews

Game reviews written after exactly 8 hours of play: <https://www.8hourreview.com>.

A static [Nuxt 3](https://nuxt.com) site. Reviews are Markdown files read by @nuxt/content, styled with Tailwind CSS,
with search, genre filter and sorting on the review list, a light/dark toggle, and an `/admin` page that builds a new
review's Markdown for you.

## Run it

Needs Node 24.

```bash
npm ci
npm run dev        # http://localhost:3333
```

## Check it

```bash
npx playwright install firefox   # once per machine
tools/check.sh                   # or: npm run check
```

It runs prettier, eslint, `nuxi typecheck`, `nuxt generate`, Playwright smoke tests in Firefox, `npm audit` and
gitleaks, and must end with `ALL CLEAN`. The pre-push hook runs it too (`git config core.hooksPath .githooks` once per
clone). Fix formatting with `npx prettier --write .`.

## Publish it

**Every push to `main` goes live.** GitLab mirrors `main` to GitHub (`turska123/8hourreview`), and Netlify builds
www.8hourreview.com from there with `nuxt generate`.

- Reviews and other content (`content/`, `public/`) can be pushed straight to `main` once the check passes.
- Code changes go through a merge request.
- A copy of the site can also be built to GitLab Pages, but only by hand (a `publish-*` tag or Build > Pipelines >
  Run pipeline). Nobody uses it yet.

Build locally with `npm run generate`; the site lands in `.output/public/`.

## Writing a review

1. `npm run dev`, open <http://localhost:3333/admin> and fill in the form.
2. Click "Generate Review File", copy the result and save it as `content/reviews/<slug>.md` (the slug is the URL:
   `/reviews/<slug>`).
3. Run `tools/check.sh`, commit (`content: review <game>`) and push to `main`.

Or write the file by hand:

```markdown
---
title: "Game Title"
description: "Brief description"
date: "2024-01-15"
score: 8.5
platform: "PC"
genres:
  - "Action"
  - "Adventure"
image: "https://example.com/image.jpg"
pros:
  - "Great graphics"
  - "Fun gameplay"
cons:
  - "Some bugs"
  - "Short length"
bottomLine: "Worth playing despite minor issues"
---

Your review content goes here in Markdown format...
```

Each review covers:

- **First Impressions**: initial thoughts when starting
- **Gameplay**: core mechanics, controls, feel
- **Graphics and Sound**: visual and audio quality
- **Story** (if any): narrative elements
- **Technical Performance**: bugs, performance issues
- **Conclusion**: final verdict after 8 hours

Tips for great reviews:

1. **Be honest.** 8 hours is enough to form solid first impressions.
2. **Focus on the early game.** Most players decide within the first few hours.
3. **Include screenshots.** Visual elements make reviews more engaging.
4. **Be specific.** Concrete examples beat vague statements.
5. **Consider your audience.** Write for people deciding whether to buy or play.

## Where things are

| Folder                | What                                                 |
| --------------------- | ---------------------------------------------------- |
| `content/reviews/`    | The reviews                                          |
| `pages/`              | Home, review list and review page, about, admin, 404 |
| `layouts/default.vue` | Header, footer, analytics, favicons                  |
| `components/`         | Review card, star rating, colour-mode button         |
| `assets/css/main.css` | Global styles                                        |
| `public/`             | Files served as is: logo, favicons, robots.txt       |
| `tests/smoke/`        | Playwright smoke tests                               |
| `tools/`              | `check.sh` (the gate) and its helpers                |

How the project is run (tests, issues, reviews) follows a shared way of working; notes for Claude are in
[CLAUDE.md](CLAUDE.md).

## License

MIT License - feel free to use this for your own gaming review site!

Support me on: [Buy Me A Coffee](https://coff.ee/mikaturkia).
