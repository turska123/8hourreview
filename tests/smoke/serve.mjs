// Serves .output/public (what `nuxt generate` makes) for the smoke test (dev-wiki/standards §5), like Netlify does:
// static files, unknown paths get 404.html with a 404 status. Not `nuxt preview`: that starts a Nitro server, which
// isn't what visitors get. Copied from the Astro stack (same server, different folder). No dependencies.
// Usage: node tests/smoke/serve.mjs [port]   (directory URLs serve index.html; unknown paths get 404.html with 404)
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve, sep } from "node:path";

const ROOT = resolve(".output/public");
const PORT = Number(process.argv[2] ?? 4329);
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml",
  ".webmanifest": "application/manifest+json",
};

async function resolveFile(urlPath) {
  try {
    // Inside the try: a bad escape (a mistyped % in an href) must be a 404, not a crash that fails every later test.
    const path = normalize(join(ROOT, decodeURIComponent(urlPath)));
    // Stay inside the output folder: "/..%2fdist-other/" would pass a plain startsWith(ROOT).
    if (path !== ROOT && !path.startsWith(ROOT + sep)) return null;
    const info = await stat(path);
    return info.isDirectory() ? join(path, "index.html") : path;
  } catch {
    return null;
  }
}

createServer(async (req, res) => {
  const urlPath = new URL(req.url ?? "/", "http://localhost").pathname;
  const file = await resolveFile(urlPath);
  try {
    if (!file) throw new Error("not found");
    const body = await readFile(file);
    res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" });
    res.end(body);
  } catch {
    const notFound = await readFile(join(ROOT, "404.html")).catch(() => Buffer.from("not found"));
    res.writeHead(404, { "content-type": TYPES[".html"] });
    res.end(notFound);
  }
}).listen(PORT, "127.0.0.1", () => console.log(`serving .output/public on http://127.0.0.1:${PORT}`));
