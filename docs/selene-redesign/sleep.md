# Sleep — `expo/app/(tabs)/sleep/index.tsx` (+ new session detail route)

Browse guided sleep meditations. Vertical scroll on `gradients.appBackground`.

## 1. Photo hero (~250px)
- `<PhotoHero variant="hero">` with night/moon imagery.
- Eyebrow `SLEEP`; serif title `Evening Wind-Down` (`type.hero`/`display`);
  one-line muted subtitle: "Prepare your body and mind for deep, restorative sleep".
- Top row: gold Moon (left), Search icon (right).

## 2. Featured tonight
- Eyebrow `FEATURED TONIGHT`.
- A large **FeatureCard** (photo, ~224px, `scrim.card`): serif title
  ("Yoga Nidra: Sweet Dreams") + meta ("20 min · with Hilary") + a **solid gold
  round Play** button (lucide `Play`, filled). Tap → opens Player.

## 3. All sessions (list)
Section heading `All sessions`, then a **session row** per meditation. IMPORTANT
redesign change: the row shows **no inline description** — instead a **"More
info" button**. Row layout (`cardBackground` gradient card, `radius.lg`, padding 12):
- left: 76×76 rounded thumbnail (`radius.sm`)
- middle: title (`type.cardTitle`) · gold "instructor · N min" · a small
  **"More info ›"** pill button (surface bg, `borderLight`, `ChevronRight`)
- right: gold-dim round **Play** icon button (fills/plays → Player)

`More info` → navigate to the **Session Detail** screen.

## Session Detail — NEW route `app/(tabs)/sleep/[sessionId].tsx`
- Photo hero (~300px, `scrim.hero`): Back button (top-left, translucent dark
  circle, lucide `ArrowLeft`); bottom overlay eyebrow `SLEEP MEDITATION` + serif
  title.
- Body (`spacing['2xl']` padding):
  - meta row: gold `User` + instructor · muted `Clock` + duration
  - tag pills (`Badge` "tag" variant): e.g. "Guided", "Body scan"
  - 1–2 short paragraphs (`type.body`, `textSecondary`) describing the session.
- Sticky footer: full-width gold **Button** "Play session" (lucide Play, left
  icon) → opens Player and dismisses the detail.

## Data
Each session: `{ title, instructor, minutes, image, tags[], about: string[] }`.
Wire to the existing sessions query (`lib/hooks/useSessionsQuery`).
