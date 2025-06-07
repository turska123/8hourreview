<template>
  <div class="bg-white dark:bg-gray-900 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
    <div v-if="review.image" class="aspect-video bg-gray-200 dark:bg-gray-700 overflow-hidden">
      <img
        :src="review.image"
        :alt="review.title"
        class="w-full h-full object-cover"
      />
    </div>
    
    <div class="p-6">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center space-x-2">
          <span class="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
            {{ review.score }}/10
          </span>
          <div class="flex">
            <Star
              v-for="i in 5"
              :key="i"
              :filled="i <= Math.round(review.score / 2)"
              class="w-4 h-4"
            />
          </div>
        </div>
        <span class="text-sm text-gray-500 dark:text-gray-400">
          {{ formatDate(review.date) }}
        </span>
      </div>
      
      <h3 class="text-xl font-semibold mb-2 line-clamp-2">
        <NuxtLink
          :to="review._path"
          class="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
        >
          {{ review.title }}
        </NuxtLink>
      </h3>
      
      <p class="text-gray-600 dark:text-gray-400 mb-4 line-clamp-3">
        {{ review.description }}
      </p>
      
      <div class="flex items-center justify-between">
        <div class="flex flex-wrap gap-2">
          <span
            v-for="genre in review.genres?.slice(0, 2)"
            :key="genre"
            class="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-xs rounded-full"
          >
            {{ genre }}
          </span>
        </div>
        
        <NuxtLink
          :to="review._path"
          class="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium text-sm"
        >
          Read Review →
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup>
import { format } from 'date-fns'

defineProps({
  review: {
    type: Object,
    required: true
  }
})

const formatDate = (date) => {
  return format(new Date(date), 'MMM dd, yyyy')
}
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>