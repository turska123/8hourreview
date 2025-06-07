# 8 Hour Game Reviews - Nuxt Website

A modern Nuxt.js website for publishing game reviews based on exactly 8 hours of gameplay, featuring an easy-to-use admin panel for content creation.

## Features

- 🎮 **Game Review System** - Structured reviews with scores, pros/cons, and detailed content
- 📝 **Easy Publishing** - Admin panel generates markdown files for easy content management
- 🔍 **Search & Filter** - Find reviews by title, genre, or sort by various criteria
- 🌙 **Dark Mode** - Built-in light/dark theme toggle
- 📱 **Responsive Design** - Works great on all devices
- ⚡ **Static Generation** - Fast loading with Nuxt's static site generation
- 🎨 **Modern UI** - Clean, professional design with Tailwind CSS

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` to see your site.

### 3. Create Your First Review

1. Go to `/admin` in your browser
2. Fill out the review form with game details
3. Write your review content in Markdown
4. Click "Generate Review File"
5. Copy the generated content
6. Save it as a `.md` file in the `content/reviews/` directory

### 4. Build for Production

```bash
# Generate static site
npm run generate

# Or build for server deployment
npm run build
```

## Project Structure

```
├── components/
│   ├── ColorModeButton.vue    # Dark/light mode toggle
│   ├── ReviewCard.vue         # Review preview cards
│   └── Star.vue              # Star rating component
├── content/
│   └── reviews/              # Your review markdown files go here
│       └── sample-game.md    # Example review
├── layouts/
│   └── default.vue           # Main site layout
├── pages/
│   ├── index.vue             # Homepage
│   ├── admin/
│   │   └── index.vue         # Admin panel for creating reviews
│   └── reviews/
│       ├── index.vue         # Reviews listing page
│       └── [...slug].vue     # Individual review pages
├── assets/css/
│   └── main.css              # Global styles
└── nuxt.config.ts            # Nuxt configuration
```

## Content Management

### Adding Reviews

#### Method 1: Admin Panel (Recommended)
1. Visit `/admin` on your site
2. Fill out the form with all review details
3. Write your review content in the large text area
4. Click "Generate Review File"
5. Copy and save the generated content as a `.md` file in `content/reviews/`

#### Method 2: Manual Creation
Create a new `.md` file in `content/reviews/` with this structure:

```markdown
---
title: "Game Title"
description: "Brief description"
date: "2024-01-15"
score: 8.5
platform: "PC"
genres:
  - "Action"
  - "Adventure"
image: "https://example.com/image.jpg"
pros:
  - "Great graphics"
  - "Fun gameplay"
cons:
  - "Some bugs"
  - "Short length"
bottomLine: "Worth playing despite minor issues"
---

Your review content goes here in Markdown format...
```

### Review Content Guidelines

Each review should include:
- **First Impressions** - Initial thoughts when starting
- **Gameplay** - Core mechanics, controls, feel
- **Graphics and Sound** - Visual and audio quality
- **Story** (if applicable) - Narrative elements
- **Technical Performance** - Bugs, performance issues
- **Conclusion** - Final verdict after 8 hours

## Customization

### Styling
- Edit `assets/css/main.css` for global styles
- Modify Tailwind classes in components for specific styling
- Colors and themes can be adjusted in the CSS file

### Content Structure
- Add new fields to the admin panel in `pages/admin/index.vue`
- Modify the review display in `pages/reviews/[...slug].vue`
- Update the review card component for different preview layouts

### SEO and Meta
- Update site title and description in `nuxt.config.ts`
- Modify meta tags in individual page components
- Add structured data for better search engine visibility

## Deployment

### Static Hosting (Recommended)
```bash
npm run generate
```
Deploy the `dist/` folder to:
- Netlify
- Vercel
- GitHub Pages
- Any static hosting service

### Server Deployment
```bash
npm run build
npm run preview
```

## Dependencies

- **Nuxt 3** - The main framework
- **@nuxt/content** - Content management and markdown processing
- **@nuxtjs/tailwindcss** - Utility-first CSS framework
- **@nuxtjs/color-mode** - Dark/light mode support
- **date-fns** - Date formatting utilities

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - feel free to use this for your own gaming review site!

## Tips for Great Reviews

1. **Be Honest** - 8 hours is enough to form solid first impressions
2. **Focus on Early Game** - Most players decide within the first few hours
3. **Include Screenshots** - Visual elements make reviews more engaging
4. **Be Specific** - Concrete examples are better than vague statements
5. **Consider Your Audience** - Write for people deciding whether to buy/play

## Support

If you encounter any issues or have questions:
1. Check the Nuxt.js documentation
2. Review the @nuxt/content documentation
3. Look at the example review file for formatting reference

Happy reviewing! 🎮