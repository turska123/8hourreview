// Smoke test config (dev-wiki/standards §5): serves the generated site and opens every page in headless Firefox.
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/smoke",
  fullyParallel: true,
  forbidOnly: true,
  retries: 0,
  use: { baseURL: "http://127.0.0.1:4331" },
  projects: [{ name: "firefox", use: { browserName: "firefox" } }],
  webServer: {
    // tools/check.sh generates first; this only serves .output/public (see serve.mjs for why it isn't `nuxt preview`).
    command: "node tests/smoke/serve.mjs 4331",
    url: "http://127.0.0.1:4331",
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
