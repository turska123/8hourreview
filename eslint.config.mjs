// Lint rules (dev-wiki/standards §3): Nuxt's recommended JS + TypeScript + Vue rules. Warnings fail the check.
// Formatting is prettier's job, so Nuxt's stylistic rules stay off (the default).
import { createConfigForNuxt } from "@nuxt/eslint-config/flat";

export default createConfigForNuxt().prepend({
  ignores: [".output/", ".nuxt/", ".data/", "dist/", "node_modules/", "test-results/", "playwright-report/"],
});
