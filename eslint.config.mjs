// Lint rules (dev-wiki/standards §3): Nuxt's recommended JS + TypeScript + Vue rules. Warnings fail the check.
// Formatting is prettier's job: eslint-config-prettier (last) turns off the rules that would disagree with it,
// e.g. vue/html-self-closing wants `<img>` where prettier writes `<img />`.
import { createConfigForNuxt } from "@nuxt/eslint-config/flat";
import prettier from "eslint-config-prettier/flat";

export default createConfigForNuxt()
  .prepend({
    ignores: [
      ".output/",
      ".nuxt/",
      ".data/",
      "dist/",
      "node_modules/",
      "test-results/",
      "playwright-report/",
    ],
  })
  .append(prettier);
