<template>
  <div>
    <NuxtLayout name="default">
      <!-- Hero Section -->
      <section class="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div class="text-center">
            <h1 class="text-4xl md:text-6xl font-bold mb-6">
              8 Hour Game Reviews
            </h1>
            <p class="text-xl md:text-2xl mb-8 text-indigo-100">
              Honest, focused reviews after exactly 8 hours of gameplay
            </p>
            <NuxtLink
              to="/reviews"
              class="bg-white text-indigo-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
            >
              Read Reviews
            </NuxtLink>
          </div>
        </div>
      </section>

      <!-- Why 8 Hours Section -->
      <section class="py-16 bg-white dark:bg-gray-900">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="text-center mb-12">
            <h2 class="text-3xl font-bold mb-4">Why 8 Hours?</h2>
            <p class="text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              Most games show their true colors within the first 8 hours. It's enough time to get past the tutorial, 
              understand the core mechanics, and experience the game's rhythm without the commitment of a 100-hour playthrough.
            </p>
          </div>

          <div class="grid md:grid-cols-3 gap-8">
            <div class="text-center">
              <div class="bg-indigo-100 dark:bg-indigo-900 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg class="w-8 h-8 text-indigo-600 dark:text-indigo-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd" />
                </svg>
              </div>
              <h3 class="text-xl font-semibold mb-2">Consistent Timeframe</h3>
              <p class="text-gray-600 dark:text-gray-400">Every review is based on exactly 8 hours of gameplay for fair comparison.</p>
            </div>

            <div class="text-center">
              <div class="bg-green-100 dark:bg-green-900 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg class="w-8 h-8 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
              </div>
              <h3 class="text-xl font-semibold mb-2">First Impressions</h3>
              <p class="text-gray-600 dark:text-gray-400">Focus on the crucial early game experience that determines if you'll continue playing.</p>
            </div>

            <div class="text-center">
              <div class="bg-purple-100 dark:bg-purple-900 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg class="w-8 h-8 text-purple-600 dark:text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 class="text-xl font-semibold mb-2">No Bias</h3>
              <p class="text-gray-600 dark:text-gray-400">Reviews aren't influenced by marketing hype, completion bias, or sunk cost fallacy.</p>
            </div>
          </div>
        </div>
      </section>

      <!-- Latest Reviews -->
      <section class="py-16 bg-gray-50 dark:bg-gray-800">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="text-center mb-12">
            <h2 class="text-3xl font-bold mb-4">Latest Reviews</h2>
          </div>

          <div v-if="pending" class="text-center">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          </div>

          <div v-else-if="data && data.length > 0" class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <ReviewCard
              v-for="review in data.slice(0, 6)"
              :key="review._path"
              :review="review"
            />
          </div>

          <div v-else class="text-center text-gray-600 dark:text-gray-400">
            <p>No reviews yet. Check back soon!</p>
          </div>

          <div class="text-center mt-12">
            <NuxtLink
              to="/reviews"
              class="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              View All Reviews
            </NuxtLink>
          </div>
        </div>
      </section>
    </NuxtLayout>
  </div>
</template>

<script setup>
const { data, pending } = await useAsyncData('home-reviews', () => 
  queryContent('reviews')
    .sort({ date: -1 })
    .limit(6)
    .find()
)

useHead({
  title: '8 Hour Game Reviews - Honest Gaming Reviews'
})
</script>