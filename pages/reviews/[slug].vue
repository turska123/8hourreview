<template>
  <div>
    <NuxtLayout name="default">
      <article class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div v-if="data">
          <!-- Header -->
          <header class="mb-8">
            <div class="mb-6">
              <NuxtLink
                to="/reviews"
                class="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium"
              >
                ← Back to Reviews
              </NuxtLink>
            </div>
            
            <div v-if="data.image" class="mb-8">
              <img
                :src="data.image"
                :alt="data.title"
                class="w-full max-h-96 object-cover rounded-lg shadow-lg"
              />
            </div>

            <div class="mb-6">
              <h1 class="text-4xl md:text-5xl font-bold mb-4">{{ data.title }}</h1>
              <p class="text-xl text-gray-600 dark:text-gray-400 mb-6">{{ data.description }}</p>
              
              <div class="flex flex-wrap items-center gap-6 mb-6">
                <div class="flex items-center space-x-3">
                  <span class="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                    {{ data.score }}/10
                  </span>
                  <div class="flex">
                    <Star
                      v-for="i in 5"
                      :key="i"
                      :filled="i <= Math.round(data.score / 2)"
                      class="w-6 h-6"
                    />
                  </div>
                </div>
                
                <div class="text-gray-600 dark:text-gray-400">
                  <time>{{ formatDate(data.date) }}</time>
                </div>
                
                <div class="text-gray-600 dark:text-gray-400">
                  {{ data.platform }}
                </div>
              </div>

              <div v-if="data.genres" class="flex flex-wrap gap-2 mb-6">
                <span
                  v-for="genre in data.genres"
                  :key="genre"
                  class="px-3 py-1 bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 text-sm rounded-full"
                >
                  {{ genre }}
                </span>
              </div>
            </div>
          </header>

          <!-- Review Content -->
          <div class="prose-custom">
            <ContentRenderer :value="data" />
          </div>

          <!-- Review Summary -->
          <div class="mt-12 p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h3 class="text-xl font-semibold mb-4">8-Hour Verdict</h3>
            <div class="grid md:grid-cols-2 gap-6">
              <div v-if="data.pros">
                <h4 class="font-medium text-green-600 dark:text-green-400 mb-2">What Works</h4>
                <ul class="space-y-1">
                  <li v-for="pro in data.pros" :key="pro" class="flex items-start">
                    <svg class="w-4 h-4 text-green-500 mt-1 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                    </svg>
                    <span class="text-sm">{{ pro }}</span>
                  </li>
                </ul>
              </div>
              
              <div v-if="data.cons">
                <h4 class="font-medium text-red-600 dark:text-red-400 mb-2">What Doesn't</h4>
                <ul class="space-y-1">
                  <li v-for="con in data.cons" :key="con" class="flex items-start">
                    <svg class="w-4 h-4 text-red-500 mt-1 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                    </svg>
                    <span class="text-sm">{{ con }}</span>
                  </li>
                </ul>
              </div>
            </div>
            
            <div class="mt-6 p-4 bg-white dark:bg-gray-700 rounded border-l-4 border-indigo-500">
              <p class="font-medium text-indigo-600 dark:text-indigo-400 mb-2">Bottom Line</p>
              <p class="text-sm">{{ data.bottomLine || 'A solid gaming experience worth your time.' }}</p>
            </div>
          </div>
        </div>

        <div v-else class="text-center py-12">
          <p class="text-gray-600 dark:text-gray-400">Review not found.</p>
        </div>
      </article>
    </NuxtLayout>
  </div>
</template>

<script setup>
import { format } from 'date-fns'
import { useHead } from 'nuxt/app'
import { useRoute } from 'vue-router'

const route = useRoute()
const { data } = await useAsyncData(`review-${route.params.slug}`, () => {
  return queryContent('reviews', route.params.slug).findOne()
})

const formatDate = (date) => {
  return format(new Date(date), 'MMMM dd, yyyy')
}

useHead(() => {
  if (!data.value) return {}
  return {
    title: `${data.value.title} - 8 Hour Game Reviews`,
    meta: [
      { name: 'description', content: data.value.description },
      { property: 'og:title', content: data.value.title },
      { property: 'og:description', content: data.value.description },
      { property: 'og:type', content: 'article' },
      { property: 'og:image', content: data.value.image },
      { property: 'og:url', content: `https://8hourreview.com/reviews/${route.params.slug}` },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: data.value.title },
      { name: 'twitter:description', content: data.value.description },
      { name: 'twitter:image', content: data.value.image }
    ]
  }
})
</script>