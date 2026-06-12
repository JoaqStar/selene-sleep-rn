# Selene redesign — implementation specs (Direction A)

This folder is the developer handoff for the **image-forward redesign** of the
Selene app. It translates the HTML/React mockups (built in the Selene design
system) into instructions for the real **React Native / Expo** app
(`JoaqStar/selene-sleep-rn`, `expo/`).

> The mockups are HTML/React-DOM and can't be committed as-is (RN has no
> `<div>`/CSS). Implement these screens with `View` / `Text` / `Image` /
> `Pressable` + `StyleSheet`, pulling all values from `constants/theme.ts`.

## What's in here
- **`../../expo/constants/theme.ts`** — the design tokens (drop into `expo/constants/`).
- **`../../.cursor/rules/selene-design.mdc`** — Cursor auto-context rules (drop into repo root `.cursor/rules/`).
- **`photo-treatment.md`** — the "dusk" photo-layering recipe (read first).
- **`home.md`, `sleep.md`, `learn.md`, `community.md`** — per-screen specs.

## How to use with Cursor
1. Copy `theme.ts`, the `.cursor/rules` file, and this `docs/` folder into the repo.
2. Open Cursor. The rules load automatically.
3. For each screen, `@`-mention the relevant spec (e.g. `@docs/selene-redesign/home.md`)
   and ask Cursor to implement/refactor that screen's file
   (e.g. `expo/app/(tabs)/(home)/index.tsx`).
4. Review against the mockup screenshots.

## Files each screen maps to (in the existing repo)
| Screen     | Repo file |
|------------|-----------|
| Home       | `expo/app/(tabs)/(home)/index.tsx` |
| Sleep      | `expo/app/(tabs)/sleep/index.tsx` |
| Learn      | `expo/app/(tabs)/learn/index.tsx` + `learn/[articleId].tsx` (article detail) |
| Community  | `expo/app/(tabs)/community/index.tsx` |
| Player     | `expo/app/player.tsx` |
| Components | `expo/components/{ArticleCard,SessionCard,CommunityPostCard,ScreenHeader}.tsx` |

## New components to add
- `components/Photo.tsx` — the dusk treatment wrapper (see photo-treatment.md).
- `components/PhotoHero.tsx` — full-bleed hero (photo + scrim + serif title).
- A **session detail** screen — new route, e.g. `app/(tabs)/sleep/[sessionId].tsx`.
- ArticleCard gains a **no-image variant** (text-only card).

## Global notes
- Keep `constants/colors.ts` working by re-exporting from `theme.ts` (see header
  comment in theme.ts).
- Load the serif via `@expo-google-fonts/newsreader` (weights 300/400) in the
  root layout's font-loading block. FLAG: confirm Newsreader or swap for a
  licensed display face.
- Icons: `lucide-react-native` (already a dependency).
- Photos in mockups are royalty-free Unsplash placeholders — replace with a
  licensed/commissioned library; the treatment keeps any source on-brand.
