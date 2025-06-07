<template>
  <div>
    <NuxtLayout name="default">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div class="mb-8">
          <h1 class="text-4xl font-bold mb-4">Game Reviews</h1>
          <p class="text-xl text-gray-600 dark:text-gray-400">
            All our reviews based on exactly 8 hours of gameplay
          </p>
        </div>

        <!-- Search and Filter -->
        <div class="mb-8 bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div class="grid md:grid-cols-3 gap-4">
            <div>
              <label class="block text-sm font-medium mb-2">Search Games</label>
              <input
                v-model="searchQuery"
                type="text"
                placeholder="Search by title..."
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium mb-2">Genre</label>
              <select
                v-model="selectedGenre"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
              >
                <option value="">All Genres</option>
                <option v-for="genre in availableGenres" :key="genre" :value="genre">
                  {{ genre }}
                </option>
              </select>
            </div>
            
            <div>
              <label class="block text-sm font-medium mb-2">Sort By</label>
              <select
                v-model="sortBy"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
              >
                <option value="date">Newest First</option>
                <option value="score">Highest Score</option>
                <option value="title">Title A-Z</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Reviews Grid -->
        <div v-if="pending" class="text-center py-12">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
        </div>

        <div v-else-if="filteredReviews.length > 0" class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <ReviewCard
            v-for="review in filteredReviews"
            :key="review._path"
            :review="review"
          />
        </div>

        <div v-else class="text-center py-12">
          <p class="text-gray-600 dark:text-gray-400 text-lg">
            No reviews found matching your criteria.
          </p>
        </div>
      </div>
    </NuxtLayout>
  </div>
</template>

<script setup>
const searchQuery = ref('')
const selectedGenre = ref('')
const sortBy = ref('date')

const { data: reviews, pending } = await useAsyncData('all-reviews', () => 
  queryContent('reviews').find()
)

const availableGenres = computed(() => {
  if (!reviews.value) return []
  const genres = new Set()
  reviews.value.forEach(review => {
    review.genres?.forEach(genre => genres.add(genre))
  })
  return Array.from(genres).sort()
})

const filteredReviews = computed(() => {
  if (!reviews.value) return []
  
  let filtered = reviews.value

  // Search filter
  if (searchQuery.value) {
    filtered = filtered.filter(review =>
      review.title.toLowerCase().includes(searchQuery.value.toLowerCase())
    )
  }

  // Genre filter
  if (selectedGenre.value) {
    filtered = filtered.filter(review =>
      review.genres?.includes(selectedGenre.value)
    )
  }

  // Sort
  return filtered.sort((a, b) => {
    switch (sortBy.value) {
      case 'score':
        return b.score - a.score
      case 'title':
        return a.title.localeCompare(b.title)
      case 'date':
      default:
        return new Date(b.date) - new Date(a.date)
    }
  })
})

useHead({
  title: 'All Game Reviews - 8 Hour Game Reviews'
})
</script>