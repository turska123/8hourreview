import { defineCollection, defineContentConfig, z } from "@nuxt/content";

// One collection: the reviews in content/reviews/. The schema lists the front matter the pages read, so those fields
// are typed and kept in the content database (Nuxt Content 3 drops unknown keys from queries otherwise).
export default defineContentConfig({
  collections: {
    reviews: defineCollection({
      type: "page",
      source: "reviews/*.md",
      schema: z.object({
        date: z.string(),
        platform: z.string().optional(),
        score: z.number().optional(),
        genres: z.array(z.string()).optional(),
        image: z.string().optional(),
        pros: z.array(z.string()).optional(),
        cons: z.array(z.string()).optional(),
        bottomLine: z.string().optional(),
      }),
    }),
  },
});
