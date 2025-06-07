<template>
  <div>
    <NuxtLayout name="default">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div class="mb-8">
          <h1 class="text-4xl font-bold mb-4">Admin Panel</h1>
          <p class="text-xl text-gray-600 dark:text-gray-400">
            Create and manage game reviews
          </p>
        </div>

        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          <form @submit.prevent="generateReview" class="space-y-6">
            <!-- Basic Info -->
            <div class="grid md:grid-cols-2 gap-6">
              <div>
                <label class="block text-sm font-medium mb-2">Game Title*</label>
                <input
                  v-model="form.title"
                  type="text"
                  required
                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                  placeholder="Enter game title"
                />
              </div>
              
              <div>
                <label class="block text-sm font-medium mb-2">Platform*</label>
                <select
                  v-model="form.platform"
                  required
                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Select Platform</option>
                  <option value="PC">PC</option>
                  <option value="PlayStation 5">PlayStation 5</option>
                  <option value="Xbox Series X/S">Xbox Series X/S</option>
                  <option value="Nintendo Switch">Nintendo Switch</option>
                  <option value="Steam Deck">Steam Deck</option>
                </select>
              </div>
            </div>

            <div class="grid md:grid-cols-2 gap-6">
              <div>
                <label class="block text-sm font-medium mb-2">Score (1-10)*</label>
                <input
                  v-model.number="form.score"
                  type="number"
                  min="1"
                  max="10"
                  step="0.1"
                  required
                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                />
              </div>
              
              <div>
                <label class="block text-sm font-medium mb-2">Release Date</label>
                <input
                  v-model="form.date"
                  type="date"
                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium mb-2">Description*</label>
              <textarea
                v-model="form.description"
                required
                rows="3"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                placeholder="Brief description of the game"
              ></textarea>
            </div>

            <div>
              <label class="block text-sm font-medium mb-2">Genres</label>
              <div class="flex flex-wrap gap-2 mb-2">
                <button
                  v-for="genre in availableGenres"
                  :key="genre"
                  type="button"
                  @click="toggleGenre(genre)"
                  :class="[
                    'px-3 py-1 text-sm rounded-full transition-colors',
                    form.genres.includes(genre)
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  ]"
                >
                  {{ genre }}
                </button>
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium mb-2">Image URL</label>
              <input
                v-model="form.image"
                type="url"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                placeholder="https://example.com/game-image.jpg"
              />
            </div>

            <!-- Pros and Cons -->
            <div class="grid md:grid-cols-2 gap-6">
              <div>
                <label class="block text-sm font-medium mb-2">Pros</label>
                <div class="space-y-2">
                  <div v-for="(pro, index) in form.pros" :key="index" class="flex gap-2">
                    <input
                      v-model="form.pros[index]"
                      type="text"
                      class="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                      placeholder="What works well..."
                    />
                    <button
                      type="button"
                      @click="form.pros.splice(index, 1)"
                      class="px-3 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded"
                    >
                      ×
                    </button>
                  </div>
                  <button
                    type="button"
                    @click="form.pros.push('')"
                    class="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
                  >
                    + Add Pro
                  </button>
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium mb-2">Cons</label>
                <div class="space-y-2">
                  <div v-for="(con, index) in form.cons" :key="index" class="flex gap-2">
                    <input
                      v-model="form.cons[index]"
                      type="text"
                      class="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                      placeholder="What doesn't work..."
                    />
                    <button
                      type="button"
                      @click="form.cons.splice(index, 1)"
                      class="px-3 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded"
                    >
                      ×
                    </button>
                  </div>
                  <button
                    type="button"
                    @click="form.cons.push('')"
                    class="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
                  >
                    + Add Con
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium mb-2">Bottom Line</label>
              <textarea
                v-model="form.bottomLine"
                rows="2"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                placeholder="Your final verdict on the game..."
              ></textarea>
            </div>

            <div>
              <label class="block text-sm font-medium mb-2">Review Content*</label>
              <textarea
                v-model="form.content"
                required
                rows="12"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white font-mono text-sm"
                placeholder="Write your review in Markdown format...

## First Impressions
Your initial thoughts after starting the game...

## Gameplay
How does it feel to play? Controls, mechanics, etc...

## Graphics and Sound
Visual and audio impressions...

## Story (if applicable)
Brief thoughts on narrative...

## Conclusion
Final thoughts after 8 hours..."
              ></textarea>
            </div>

            <div class="flex justify-between items-center pt-6 border-t">
              <button
                type="button"
                @click="resetForm"
                class="px-6 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              >
                Reset Form
              </button>
              
              <button
                type="submit"
                :disabled="isGenerating"
                class="px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span v-if="isGenerating">Generating...</span>
                <span v-else>Generate Review File</span>
              </button>
            </div>
          </form>
        </div>

        <!-- Generated Content -->
        <div v-if="generatedContent" class="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-xl font-semibold">Generated Review File</h2>
            <button
              @click="copyToClipboard"
              class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Copy to Clipboard
            </button>
          </div>
          
          <div class="bg-gray-50 dark:bg-gray-900 rounded p-4 overflow-x-auto">
            <pre class="text-sm"><code>{{ generatedContent }}</code></pre>
          </div>
          
          <div class="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded">
            <p class="text-sm text-blue-800 dark:text-blue-200">
              <strong>Instructions:</strong> Copy the content above and save it as 
              <code class="bg-blue-100 dark:bg-blue-800 px-1 rounded">{{ fileName }}</code> 
              in your <code class="bg-blue-100 dark:bg-blue-800 px-1 rounded">content/reviews/</code> directory.
            </p>
          </div>
        </div>
      </div>
    </NuxtLayout>
  </div>
</template>

<script setup>
const isGenerating = ref(false)
const generatedContent = ref('')
const fileName = ref('')

const availableGenres = [
  'Action', 'Adventure', 'RPG', 'Strategy', 'Simulation', 'Sports',
  'Racing', 'Puzzle', 'Platformer', 'Fighting', 'Shooter', 'Horror',
  'Indie', 'Multiplayer', 'Co-op', 'Open World', 'Survival'
]

const form = reactive({
  title: '',
  platform: '',
  score: 7,
  date: new Date().toISOString().split('T')[0],
  description: '',
  genres: [],
  image: '',
  pros: [''],
  cons: [''],
  bottomLine: '',
  content: ''
})

const toggleGenre = (genre) => {
  const index = form.genres.indexOf(genre)
  if (index > -1) {
    form.genres.splice(index, 1)
  } else {
    form.genres.push(genre)
  }
}

const generateSlug = (title) => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

const generateReview = () => {
  isGenerating.value = true
  
  const slug = generateSlug(form.title)
  fileName.value = `${slug}.md`
  
  const cleanPros = form.pros.filter(pro => pro.trim())
  const cleanCons = form.cons.filter(con => con.trim())
  
  const frontmatter = {
    title: form.title,
    description: form.description,
    date: form.date,
    score: form.score,
    platform: form.platform,
    genres: form.genres,
    image: form.image || undefined,
    pros: cleanPros.length > 0 ? cleanPros : undefined,
    cons: cleanCons.length > 0 ? cleanCons : undefined,
    bottomLine: form.bottomLine || undefined
  }
  
  // Remove undefined values
  Object.keys(frontmatter).forEach(key => {
    if (frontmatter[key] === undefined) {
      delete frontmatter[key]
    }
  })
  
  const yamlFrontmatter = Object.entries(frontmatter)
    .map(([key, value]) => {
      if (Array.isArray(value)) {
        return `${key}:\n${value.map(item => `  - "${item}"`).join('\n')}`
      } else if (typeof value === 'string') {
        return `${key}: "${value}"`
      } else {
        return `${key}: ${value}`
      }
    })
    .join('\n')
  
  generatedContent.value = `---
${yamlFrontmatter}
---

${form.content}`

  isGenerating.value = false
}

const copyToClipboard = async () => {
  try {
    await navigator.clipboard.writeText(generatedContent.value)
    // You could add a toast notification here
  } catch (err) {
    console.error('Failed to copy to clipboard:', err)
  }
}

const resetForm = () => {
  Object.assign(form, {
    title: '',
    platform: '',
    score: 7,
    date: new Date().toISOString().split('T')[0],
    description: '',
    genres: [],
    image: '',
    pros: [''],
    cons: [''],
    bottomLine: '',
    content: ''
  })
  generatedContent.value = ''
}

useHead({
  title: 'Admin Panel - 8 Hour Game Reviews',
  meta: [
    { name: 'robots', content: 'noindex, nofollow' }
  ]
})
</script>