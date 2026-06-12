# Community — `expo/app/(tabs)/community/index.tsx`

Support feed: members post, like, comment. Vertical scroll.

## 1. Photo hero (~250px)
- `<PhotoHero variant="hero">` with an older-women-friends photo (warm, real,
  midlife — not stocky).
- Eyebrow `COMMUNITY`; serif title `Community`; muted subtitle
  "One space for support, questions, and shared wisdom".
- Top row: gold Moon (left), Search (right).

## 2. Circles for you (horizontal rail)
- Section title `Circles for you` (`type.section`).
- Horizontal row of wide **PhotoTile**s (~160×110, `radius.card`, `scrim.card`):
  circle name (white 14/600) + member-count sub. e.g. "Night Owls · 1.2k
  members", "New to Peri · 860 members", "HRT & Me · 2.0k members".

## 3. Topic chips (horizontal)
- **Chip** row: All · Insomnia · Hot Flashes · Symptoms · Spirituality. Active =
  gold. Filters the feed.

## 4. Post feed — `CommunityPostCard`
Each card (`cardBackground`, `radius.lg`):
- header: `Avatar` (gold initials) + username (15/600) + timestamp (muted) +
  up to 3 topic tag pills (right, gold-light "tag" Badges)
- body text (`type.base`)
- actions row: **Like** (lucide `Heart`; fills `palette.like` + count when
  liked, toggles locally) · **Comment** (lucide `MessageCircle` + count).

## 5. Compose FAB
- A solid-gold round **IconButton** (lucide `Plus`, ~lg) pinned bottom-right,
  `elevation.fab`. Sticky over the feed. → opens the composer.

## Data
Posts: `{ userName, timeAgo, text, tags[], likes, comments, liked }`.
Wire to the existing Stream chat hooks (`lib/hooks/useStreamChat`,
`lib/stream/channels`).
