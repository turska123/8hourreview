<!-- Any URL without a page. Without this, Nuxt's router throws "Page not found" while the app starts (404.html is a
     client-rendered shell), which logs a console error and shows Nuxt's bare error page instead of the site's.
     The host still answers these URLs with 404.html and a 404 status. -->
<template>
  <NuxtLayout name="default">
    <div class="max-w-2xl mx-auto px-4 py-20 text-center">
      <h1 class="text-4xl font-bold mb-4">Page not found</h1>
      <p class="text-lg text-gray-600 dark:text-gray-400 mb-8">
        This page doesn't exist. Maybe it ran out of its 8 hours.
      </p>
      <NuxtLink
        to="/reviews"
        class="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors"
      >
        Browse the reviews
      </NuxtLink>
    </div>
  </NuxtLayout>
</template>

<script setup>
// A 404 status while prerendering: then a broken internal link fails `nuxt generate` instead of being written out as
// a "Page not found" page with status 200 (a soft 404). 404.html is still generated (it's a client-rendered shell).
if (import.meta.server) setResponseStatus(useRequestEvent(), 404);

useHead({
  title: "Page not found - 8 Hour Game Reviews",
  meta: [{ name: "robots", content: "noindex" }],
});
</script>
