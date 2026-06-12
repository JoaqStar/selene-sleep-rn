# Learn — `expo/app/(tabs)/learn/index.tsx` (+ `learn/[articleId].tsx`)

Menopause articles: news, science, symptom support. Vertical scroll.

## 1. Photo hero (~250px)
- `<PhotoHero variant="hero">` with soft morning imagery.
- Eyebrow `LEARN`; serif title `Learn`; muted subtitle
  "Understanding your sleep is the first step to changing it".

## 2. Category chips (horizontal)
- A horizontal row of **Chip**s: All · Understanding Your Body · Sleep Science ·
  Symptom Support. Active chip = gold-dim fill + gold text + `accentBorder`.
  Filters the list below.

## 3. Article list — `ArticleCard`s
Two variants of the SAME component:
- **With image (default):** full-width photo (~168px) with `scrim.card`, a
  category **Badge** (gold-dim, with `BookOpen` icon) pinned bottom-left of the
  photo; then padding block with serif/sans title (`type.cardTitle`+),
  standfirst (`type.base`, muted), and a footer row: gold author · muted
  `Clock` + readTime.
- **NO image (text-only):** when `image` is null, render the card with NO photo
  block — just the padded text: a category Badge at top, title, standfirst,
  author · readTime footer. (Example article: "Five Questions to Ask Your Doctor
  About HRT".) This keeps a quick-read, text-only item visually distinct but
  on-brand.

Tapping a card → article detail.

## Article Detail — `app/(tabs)/learn/[articleId].tsx`
- **If the article has an image:** photo hero (~280px, `scrim.hero`) with Back
  button (top-left) and bottom overlay = category + serif title.
- **If NO image:** text header on the navy canvas — Back button, a category
  **Badge**, serif title, standfirst (muted). No photo block.
- Byline row (below header, divided by a hairline): `Avatar` (gold initials) +
  author + "date · N min read" + a `Bookmark` icon (right).
- Body: paragraphs in `type.body` (`palette.text`), generous line-height.

## Data
Each article: `{ id, category, title, standfirst, author, readTime, date,
image: string | null, body: string[] }`. Wire to `lib/hooks/useArticlesQuery`.
The Home "Latest article" featured card links to the most recent of these.
