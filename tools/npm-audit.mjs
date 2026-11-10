// npm audit with an allow-list (dev-wiki/standards §3): every advisory of moderate or higher fails, unless
// audit-allowlist.json lists its GHSA id with an issue and an expiry date. Expired entries fail, and so do
// entries whose advisory is gone (remove them). Apps audit everything, dev tools included; static sites pass
// --omit=dev to audit only what ships. Copied from kattelu.
// Usage: node tools/npm-audit.mjs [npm audit flags]   (exit 0 = clean)
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const LEVELS = ["info", "low", "moderate", "high", "critical"];
const MIN_LEVEL = LEVELS.indexOf("moderate");

function audit() {
  try {
    return JSON.parse(execFileSync("npm", ["audit", "--json", ...process.argv.slice(2)], {
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    }));
  } catch (err) {
    // npm audit exits 1 when it finds anything; the report is still on stdout.
    if (err.stdout) return JSON.parse(err.stdout);
    throw err;
  }
}

const report = audit();
// No report (registry unreachable, npm error): that's a failed audit, never "nothing found".
if (report.error || typeof report.metadata?.vulnerabilities !== "object") {
  console.log(`npm audit didn't produce a report: ${JSON.stringify(report.error ?? report).slice(0, 300)}`);
  process.exit(1);
}

const allowlist = JSON.parse(readFileSync("audit-allowlist.json", "utf8"));
const today = new Date().toISOString().slice(0, 10);
const found = new Map(); // GHSA id -> "package (severity): title"
for (const [name, vuln] of Object.entries(report.vulnerabilities ?? {})) {
  for (const via of vuln.via) {
    if (typeof via !== "object" || LEVELS.indexOf(via.severity) < MIN_LEVEL) continue;
    const id = via.url.split("/").at(-1);
    found.set(id, `${name} (${via.severity}): ${via.title} ${via.url}`);
  }
}

const problems = [];
for (const [id, text] of found) {
  const entry = allowlist[id];
  if (!entry) problems.push(`not allowed: ${text}`);
  // Compared as text, so anything but YYYY-MM-DD would never expire.
  else if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.expires ?? ""))
    problems.push(`allow-list entry needs "expires": "YYYY-MM-DD": ${id}`);
  else if (entry.expires < today)
    problems.push(`allow-list entry expired ${entry.expires}: ${id} (${entry.issue})`);
}
for (const id of Object.keys(allowlist)) {
  if (!found.has(id)) problems.push(`allow-list entry no longer needed, remove it: ${id}`);
}

for (const line of problems) console.log(line);
for (const id of found.keys())
  if (allowlist[id] && !problems.some((p) => p.includes(id)))
    console.log(`allowed until ${allowlist[id].expires}: ${id}`);
process.exit(problems.length ? 1 : 0);
