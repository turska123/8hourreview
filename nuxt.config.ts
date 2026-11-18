// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },
  modules: ["@nuxt/content", "@nuxtjs/tailwindcss", "@nuxtjs/color-mode", "@vueuse/nuxt"],
  devServer: {
    port: 3333,
  },
  content: {
    // Node's built-in sqlite (Node 22.5+): no native better-sqlite3 build, which this stack's NAS VM can't run.
    experimental: { sqliteConnector: "native" },
    renderer: { anchorLinks: false },
    build: {
      markdown: {
        highlight: {
          theme: "github-dark",
          langs: ["javascript", "typescript", "json"],
        },
      },
    },
  },
  colorMode: {
    classSuffix: "",
  },
  css: ["~/assets/css/main.css"],
  // @nuxtjs/tailwindcss adds tailwindcss/nesting, which Nuxt 4 can't resolve (a build warning). The CSS has no nesting.
  postcss: {
    plugins: { "tailwindcss/nesting": false },
  },
  // Rolldown warns when plugins take most of a build's time ([PLUGIN_TIMINGS]). On this small site that depends on
  // the machine's load, and check.sh fails on any WARN line, so the gate would fail at random.
  vite: {
    build: {
      rolldownOptions: { checks: { bundlerTimings: false } },
    },
  },
  app: {
    head: {
      title: "8 Hour Game Reviews",
      meta: [
        { charset: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        { name: "description", content: "Honest game reviews after 8 hours of gameplay" },
      ],
    },
  },
});
