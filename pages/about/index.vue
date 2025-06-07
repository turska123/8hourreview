<template>
  <NuxtLayout name="default">
    <div class="max-w-2xl mx-auto px-4 py-12">
      <h1 class="text-4xl font-bold mb-4">About Me</h1>
      <p class="text-lg text-gray-700 dark:text-gray-300 mb-6">
        Hi! I'm Mika Turkia, the creator of 8 Hour Game Reviews. I play games for exactly 8 hours and share honest, concise reviews to help you decide what to play next.
      </p>
      <p class="text-lg text-gray-700 dark:text-gray-300 mb-6">
        I'm a developer passionate about open source code and user privacy. I believe that respectful, non-intrusive approaches to online interactions are key to building trust and fostering a positive community. My goal is to create and share free, open-source projects that benefit others, relying on the kindness and support of the community to sustain my work.
      </p>
      <p class="text-lg text-gray-700 dark:text-gray-300 mb-6">
        If you enjoy my work and want to support me, you can buy me a beer or coffee! Your support helps me continue creating content and maintaining this site. Every little bit helps, and I truly appreciate it:
      </p>
      <a href="https://coff.ee/mikaturkia" target="_blank" rel="noopener" class="inline-block bg-yellow-400 hover:bg-yellow-500 text-black font-semibold px-6 py-3 rounded shadow transition mb-6">
        ☕ Support me on Buy Me a Coffee
      </a>
      <div class="mt-8">
        <a href="https://github.com/turska123/8hourreview" target="_blank" rel="noopener" class="inline-block text-indigo-600 dark:text-indigo-400 hover:underline font-semibold">
          View Review Site Source Code on GitHub
        </a>
      </div>
    </div>
  </NuxtLayout>
</template>

<script setup>
useHead({
  title: 'About Me - 8 Hour Game Reviews',
  meta: [
    { name: 'description', content: 'Learn more about Mika Turkia, the creator of 8 Hour Game Reviews, and support the project.' },
    { property: 'og:title', content: 'About Me - 8 Hour Game Reviews' },
    { property: 'og:description', content: 'Learn more about Mika Turkia, the creator of 8 Hour Game Reviews, and support the project.' },
    { property: 'og:type', content: 'profile' },
    { property: 'og:image', content: '/assets/8hourreview-removebg-preview.png' },
    { property: 'og:url', content: 'https://8hourreview.com/about' },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: 'About Me - 8 Hour Game Reviews' },
    { name: 'twitter:description', content: 'Learn more about Mika Turkia, the creator of 8 Hour Game Reviews, and support the project.' },
    { name: 'twitter:image', content: '/assets/8hourreview-removebg-preview.png' }
  ]
})
</script>
