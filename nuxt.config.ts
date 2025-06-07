// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },
  modules: [
    '@nuxt/content',
    '@nuxtjs/tailwindcss',
    '@nuxtjs/color-mode',
    '@vueuse/nuxt'
  ],
  devServer: {
    port: 3333,
  },
  content: {
    highlight: {
      theme: 'github-dark',
      preload: ['javascript', 'typescript', 'json']
    },
    markdown: {
      anchorLinks: false
    }
  },
  colorMode: {
    classSuffix: ''
  },
  css: ['~/assets/css/main.css'],
  app: {
    head: {
      title: '8 Hour Game Reviews',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Honest game reviews after 8 hours of gameplay' }
      ]
    }
  }
})

