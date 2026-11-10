// Every built page loads with a clean browser log: no console errors or warnings, no uncaught exceptions, no failed
// requests, no requests to other sites, no broken internal links. The 404 page too, where only its own 404 status is
// expected.
import { test, expect, type APIRequestContext, type Page } from "@playwright/test";
import { builtPages, MISSING_PAGE } from "./pages";

/**
 * Off-site URLs a page may load (a prefix each). Anything else is a privacy problem: sites self-host everything
 * (fonts too, never Google Fonts). Tests never touch the real network (standards §5): allowed requests get an empty
 * answer, the rest are aborted and reported. Whether these third-party images should stay is open (#3).
 */
const OFFSITE_ALLOWED: string[] = [
  // Simple Analytics: cookieless page-view counter, plus its badge in the footer.
  "https://scripts.simpleanalyticscdn.com/",
  "https://queue.simpleanalyticscdn.com/",
  "https://simpleanalyticsbadges.com/",
  // "Buy me a beer" button image in the footer.
  "https://img.buymeacoffee.com/",
  // Review header images come from the games' press/creator kits.
  "https://creators.expedition33.com/",
];

/** Collects everything that would make the browser log dirty. Call before navigating. */
async function watchLog(page: Page, local: string, expected404 = ""): Promise<string[]> {
  const problems: string[] = [];
  // Every request to another site is aborted (no real network) and, unless allowed, reported.
  await page.route(
    (url) => url.origin !== local,
    (route) => {
      const url = route.request().url();
      if (OFFSITE_ALLOWED.some((prefix) => url.startsWith(prefix))) return route.fulfill({ status: 204 });
      problems.push(`off-site request: ${url}`);
      return route.abort();
    },
  );
  page.on("console", (msg) => {
    if (msg.type() === "error" || msg.type() === "warning")
      problems.push(`console ${msg.type()}: ${msg.text()}`);
  });
  page.on("pageerror", (err) => problems.push(`uncaught: ${err.message}`));
  page.on("requestfailed", (req) => {
    if (new URL(req.url()).origin === local) problems.push(`request failed: ${req.url()}`);
  });
  page.on("response", (res) => {
    const expected = expected404 && new URL(res.url()).pathname === expected404;
    if (res.status() >= 400 && !expected) problems.push(`HTTP ${res.status()}: ${res.url()}`);
  });
  return problems;
}

async function brokenLinks(page: Page, request: APIRequestContext): Promise<string[]> {
  const links = await page.$$eval("a[href]", (as) =>
    as.map((a) => a.getAttribute("href") ?? "").filter((h) => h.startsWith("/") && !h.startsWith("//")),
  );
  const broken: string[] = [];
  for (const href of new Set(links)) {
    const res = await request.get(href.split("#")[0]);
    if (!res.ok()) broken.push(`broken link ${href} (HTTP ${res.status()})`);
  }
  return broken;
}

for (const path of builtPages()) {
  test(`page ${path} loads with a clean log and working links`, async ({ page, request, baseURL }) => {
    const problems = await watchLog(page, new URL(baseURL!).origin);
    await page.goto(path, { waitUntil: "networkidle" });
    problems.push(...(await brokenLinks(page, request)));
    expect(problems).toEqual([]);
  });
}

test("a missing page gets the 404 page with a 404 status, a clean log and working links", async ({
  page,
  request,
  baseURL,
}) => {
  const problems = await watchLog(page, new URL(baseURL!).origin, MISSING_PAGE);
  const res = await page.goto(MISSING_PAGE, { waitUntil: "networkidle" });
  expect(res?.status()).toBe(404);
  problems.push(...(await brokenLinks(page, request)));
  expect(problems).toEqual([]);
});
