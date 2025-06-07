<template>
  <div class="min-h-screen flex flex-col">
    <!-- Header -->
    <header class="bg-white dark:bg-gray-800 shadow-sm">
      <nav class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-16">
          <div class="flex items-center">
            <NuxtLink to="/" class="flex items-center">
              <img src="/assets/8hourreview-removebg-preview.png" alt="8HR Reviews Logo" class="h-20 w-auto mr-2" />
            </NuxtLink>
          </div>
          
          <div class="flex items-center space-x-6">
            <NuxtLink to="/" class="text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400">
              Home
            </NuxtLink>
            <NuxtLink to="/reviews" class="text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400">
              Reviews
            </NuxtLink>
            <NuxtLink to="/about" class="text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400">
              About
            </NuxtLink>
            <ColorModeButton />
          </div>
        </div>
      </nav>
    </header>

    <!-- Main Content -->
    <main class="flex-1">
      <slot />
    </main>

    <!-- Footer -->
    <footer class="bg-gray-100 dark:bg-gray-800 mt-12 relative">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div class="text-center text-gray-600 dark:text-gray-400">
          <p>&copy; 2024 8 Hour Game Reviews. All rights reserved.</p>
          <p class="mt-2 text-sm">Honest reviews after exactly 8 hours of gameplay.</p>
        </div>
      </div>
      <a
  href="https://dashboard.simpleanalytics.com/?utm_source=&utm_content=badge&affiliate=tebup"
  referrerpolicy="origin"
  class="absolute bottom-0 left-0"
  target="_blank">
  <picture>
    <source
      srcset="https://simpleanalyticsbadges.com/?mode=dark"
      media="(prefers-color-scheme: dark)"
    />
    <img
      src="https://simpleanalyticsbadges.com/?mode=light"
      alt="Simple Analytics Badge"
      loading="lazy"
      referrerpolicy="no-referrer"
      crossorigin="anonymous"
    />
  </picture>
</a>
    </footer>
  </div>
</template>

<script setup>
useHead({
  htmlAttrs: {
    lang: 'en'
  },
  script: [
    {
      src: "https://scripts.simpleanalyticscdn.com/latest.js",
      async: true
    }
  ],
  noscript: [
    {
      children: '<img src="https://queue.simpleanalyticscdn.com/noscript.gif" alt="" referrerpolicy="no-referrer-when-downgrade"/>'
    }
  ],
  link: [
    { rel: 'icon', href: '/favicon.ico' },
    { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/fav/favicon-32x32.png' },
    { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/fav/favicon-16x16.png' },
    { rel: 'apple-touch-icon', sizes: '180x180', href: '/fav/apple-touch-icon.png' },
    { rel: 'manifest', href: '/fav/site.webmanifest' },
    { rel: 'shortcut icon', href: '/fav/favicon.ico' }
  ]
})
</script>