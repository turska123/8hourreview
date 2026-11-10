// Site-wide rules for what share previews, installs and lost visitors see: og:image/twitter:image are absolute
// same-site URLs (or a review's own off-site image) that resolve to a built file, the web manifest has names and
// working icons, and a missing page shows a "not found" page inside the site layout. The first two read the
// generated files (raw-HTML rules belong in a file scan, not a page test); the last needs the browser because
// 404.html is a client-rendered SPA shell.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { test, expect } from "@playwright/test";
import { builtPages, MISSING_PAGE, OUTPUT } from "./pages";

/** The live site's canonical origin (8hourreview.com 301-redirects here). */
const SITE = "https://www.8hourreview.com";

/** The built file a same-site URL path is served from, or null if there isn't one. */
function builtFile(urlPath: string): string | null {
  const path = join(OUTPUT, decodeURIComponent(urlPath));
  if (!existsSync(path)) return null;
  if (!statSync(path).isDirectory()) return path;
  const index = join(path, "index.html");
  return existsSync(index) ? index : null;
}

/** The generated HTML file for a page URL path from builtPages(). */
function pageFile(urlPath: string): string {
  return join(OUTPUT, urlPath.endsWith("/") ? urlPath + "index.html" : urlPath);
}

/** Every generated .html file (404.html and 200.html included: they are pages too). */
function htmlFiles(dir = OUTPUT): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return htmlFiles(path);
    return name.endsWith(".html") ? [path] : [];
  });
}

/** Undoes the HTML entities a URL in an attribute can carry. */
function decodeEntities(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

/** The attributes of every tag with this name, in any attribute order and quoting style. */
function tags(html: string, tag: string): Record<string, string>[] {
  const found: Record<string, string>[] = [];
  for (const [element] of html.matchAll(new RegExp(`<${tag}\\b[^>]*>`, "gi"))) {
    const attrs: Record<string, string> = {};
    for (const m of element.matchAll(/([^\s=/<>"']+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g))
      attrs[m[1].toLowerCase()] = decodeEntities(m[2] ?? m[3] ?? m[4] ?? "");
    found.push(attrs);
  }
  return found;
}

test("every og:image and twitter:image on every page is an absolute www.8hourreview.com URL to a built file", () => {
  const problems: string[] = [];
  for (const file of htmlFiles()) {
    const page = relative(OUTPUT, file).split(sep).join("/");
    for (const meta of tags(readFileSync(file, "utf8"), "meta")) {
      const key = meta.property ?? meta.name ?? "";
      if (key !== "og:image" && key !== "twitter:image") continue;
      const content = meta.content ?? "";
      let url: URL;
      try {
        url = new URL(content); // Throws on a relative URL: those aren't allowed at all.
      } catch {
        problems.push(`${page}: ${key} is not an absolute URL: "${content}"`);
        continue;
      }
      const sameSite = url.hostname === "8hourreview.com" || url.hostname.endsWith(".8hourreview.com");
      // A review's own off-site image (from its front matter) may stay off-site; same-site ones must resolve.
      if (!sameSite) continue;
      if (url.origin !== SITE) problems.push(`${page}: ${key} is not on ${SITE}: ${content}`);
      else if (!builtFile(url.pathname))
        problems.push(`${page}: ${key} ${content} is not a file in ${OUTPUT}`);
    }
  }
  expect(problems).toEqual([]);
});

test("the web manifest has a name and short_name, and every icon in it is a built file", () => {
  const manifestPath = "/fav/site.webmanifest";
  const problems: string[] = [];

  // Every page links the manifest.
  for (const path of builtPages()) {
    const links = tags(readFileSync(pageFile(path), "utf8"), "link").filter((link) =>
      (link.rel ?? "").split(/\s+/).includes("manifest"),
    );
    const hrefs = links.map((link) => new URL(link.href ?? "", SITE + path).pathname);
    if (!hrefs.includes(manifestPath)) problems.push(`page ${path} doesn't link ${manifestPath}`);
  }

  const file = builtFile(manifestPath);
  expect(file, `${manifestPath} is not in ${OUTPUT}`).not.toBeNull();
  const manifest = JSON.parse(readFileSync(file!, "utf8")) as {
    name?: unknown;
    short_name?: unknown;
    icons?: { src?: unknown }[];
  };
  for (const key of ["name", "short_name"] as const) {
    const value = manifest[key];
    if (typeof value !== "string" || value.trim() === "") problems.push(`manifest ${key} is empty`);
  }
  const icons = manifest.icons ?? [];
  if (icons.length === 0) problems.push("manifest has no icons");
  for (const icon of icons) {
    const src = typeof icon.src === "string" ? icon.src : "";
    // Browsers resolve icon src against the manifest's own URL, not the page's.
    const url = new URL(src, SITE + manifestPath);
    if (url.origin !== SITE || !builtFile(url.pathname))
      problems.push(`manifest icon "${src}" (${url.href}) is not a file in ${OUTPUT}`);
  }
  expect(problems).toEqual([]);
});

test('a missing page shows a "not found" page inside the site layout, with a link to /reviews', async ({
  page,
  baseURL,
}) => {
  const local = new URL(baseURL!).origin;
  // No real network (standards §5): off-site requests get an empty answer. pages.spec.ts checks the log is clean.
  await page.route(
    (url) => url.origin !== local,
    (route) => route.fulfill({ status: 204 }),
  );
  await page.goto(MISSING_PAGE, { waitUntil: "networkidle" });

  // The site layout: its header nav is there.
  for (const name of [/^home$/i, /^reviews$/i, /^about$/i])
    await expect(page.getByRole("link", { name }).first()).toBeVisible();

  const main = page.locator("main");
  await expect(main.getByRole("heading", { name: /not found/i }).first()).toBeVisible();
  await expect(main.locator('a[href="/reviews"], a[href="/reviews/"]').first()).toBeVisible();
});

/** The text of every <h1> in a page's <main> (the whole page if it has no <main>), tags stripped. */
function mainHeadings(html: string): string[] {
  const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1] ?? html;
  return [...main.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map(([, inner]) =>
    decodeEntities(inner.replace(/<[^>]*>/g, "")).trim(),
  );
}

test("no generated page is the not-found page (a broken internal link must fail the build)", () => {
  // Nuxt's crawler follows a mistyped link (e.g. /review) and writes the not-found page there: a soft 404 that
  // the live site serves with status 200. Only the real 404.html and 200.html shells may be it.
  const shells = new Set([join(OUTPUT, "404.html"), join(OUTPUT, "200.html")]);
  const soft404s = htmlFiles()
    .filter((file) => !shells.has(file))
    .filter((file) => mainHeadings(readFileSync(file, "utf8")).some((h) => /not found/i.test(h)))
    .map((file) => relative(OUTPUT, file).split(sep).join("/"));
  expect(soft404s).toEqual([]);
});

test("the home page, the About page and every review page have an og:image and a twitter:image", () => {
  const reviews = builtPages().filter((path) => /^\/reviews\/[^/]+\/$/.test(path));
  expect(reviews.length, "no review pages were generated").toBeGreaterThan(0);
  const missing: string[] = [];
  for (const path of ["/", "/about/", ...reviews]) {
    const metas = tags(readFileSync(pageFile(path), "utf8"), "meta");
    for (const key of ["og:image", "twitter:image"]) {
      const found = metas.some((meta) => (meta.property ?? meta.name) === key && (meta.content ?? "") !== "");
      if (!found) missing.push(`page ${path} has no ${key}`);
    }
  }
  expect(missing).toEqual([]);
});
