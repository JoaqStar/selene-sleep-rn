# Home — `expo/app/(tabs)/(home)/index.tsx`

Image-forward landing screen. Top to bottom inside a single vertical
`ScrollView` (the screen sits on `gradients.appBackground`).

## 1. Hero (full-bleed photo, ~384px tall)
- `<PhotoHero variant="hero">` with a calm, women-centred photo.
- Top row over the photo: gold **Moon** glyph (left), **Settings** icon (right),
  both inset `spacing['2xl']` (24), below the status bar (~54px top).
- Bottom-left overlay:
  - Eyebrow (`type.eyebrow`): contextual time, e.g. `SUNDAY · 9:41 PM`.
  - Serif greeting (`type.hero`): `Good evening,\nJane` (two lines).

## 2. Latest article (the featured slot — replaces old "Tonight's wind-down")
- Section row: eyebrow `LATEST ARTICLE` (left) + gold `All articles` link
  (right → navigates to Learn tab).
- **FeaturedArticleCard**: a photo card ~252px tall, `radius.lg`,
  `scrim.card` treatment. Bottom-left overlay:
  - small gold category (`palette.accentLight`), e.g. "Sleep Science"
  - serif title (`type.titleSerif`, fontSize ~21), e.g.
    "Why You Wake at 3am — and How to Make Peace With It"
  - footer row: `author · readTime` (muted white) + gold **"Read article →"**.
- Tapping → opens the **article detail** (`learn/[articleId]`) for the most
  recent article. Source the latest item from the articles query/list.

## 3. More to explore (horizontal rail)
- Section row: `More to explore` (`type.section`) + gold `See all` (→ Sleep).
- Horizontal `ScrollView` of **PhotoTile**s (~150×192, `radius.card`,
  `scrim.card`): title (white, 14/600) + small duration sub. e.g.
  "Quiet the Mind · 10 min", "Golden Hour Calm · 8 min", "Deep Rest · 12 min".

## 4. 3am strip
- A single tappable row, `radius.card`, `palette.accentDim12` fill,
  `palette.accentBorder` 1px border:
  - `AlertCircle` gold icon · text "Awake at 3am? **We've got you.**" (the
    second clause gold/medium) · `ChevronRight` muted. → navigates to 3am mode.

## Behaviour
- Press feedback on all cards: scale `motion.pressScale`.
- No large blocks of body text on this screen — it's a visual launcher.
