// Generated pages for the smoke tests, read from .output/public so a new review is covered without editing any test.
import { readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

/** Where `nuxt generate` writes the site (Netlify publishes the same files). */
export const OUTPUT = ".output/public";

/**
 * URL paths of every generated page. Skips 404.html (tested separately: it's served with a 404 status) and 200.html
 * (Nuxt's SPA fallback, never linked).
 */
export function builtPages(dir = OUTPUT): string[] {
  const pages: string[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) pages.push(...builtPages(path));
    else if (name.endsWith(".html") && name !== "404.html" && name !== "200.html") {
      const url = "/" + relative(OUTPUT, path).split(sep).join("/");
      pages.push(url.replace(/index\.html$/, ""));
    }
  }
  return pages.sort();
}

/** A path that never exists, to get the 404 page. */
export const MISSING_PAGE = "/no-such-page-smoke-test/";
