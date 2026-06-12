/**
 * Selene — design tokens for the redesign (Direction A).
 *
 * WHERE THIS GOES:  expo/constants/theme.ts
 * It supersedes the flat `Colors` object in constants/colors.ts — keep
 * colors.ts re-exporting from here so existing imports keep working:
 *
 *     // constants/colors.ts
 *     import { palette } from './theme';
 *     const Colors = { ...palette };          // legacy shape
 *     export default Colors;
 *
 * Everything below is plain TS — no styling lib required. Use with
 * React Native StyleSheet. Hex values match the live app one-to-one;
 * the additions (spacing/radius/type/imageTreatment) encode the
 * redesign decisions from the Selene design system.
 */

/* ---------------------------------------------------------------- *
 * 1. PALETTE  (verbatim from constants/colors.ts, + redesign roles)
 * ---------------------------------------------------------------- */
export const palette = {
  // Surfaces — layered midnight navy, darkest → lightest
  background: '#0B0E1A',
  cardBackground: '#141829',
  cardBackgroundLight: '#1A1F35',
  surface: '#1E2340',
  surfaceLight: '#252B4A',
  tabBar: '#0D1020',

  // Gold accent — "the moon"
  accent: '#C9A96E',
  accentLight: '#E0C992',
  accentDim: 'rgba(201,169,110,0.15)',   // tinted fills
  accentDim12: 'rgba(201,169,110,0.12)',
  accentBorder: 'rgba(201,169,110,0.30)', // active outline

  // Text
  text: '#E8E4DC',
  textSecondary: '#9A96A6',
  textMuted: '#6B6780',
  white: '#FFFFFF',

  // Lines
  border: 'rgba(255,255,255,0.06)',
  borderLight: 'rgba(255,255,255,0.10)',

  // Status
  error: '#E85D5D',
  like: '#E85D75',
  success: '#5DAE8B',

  // Tabs
  tabActive: '#C9A96E',
  tabInactive: '#5A5670',
} as const;

/* ---------------------------------------------------------------- *
 * 2. GRADIENTS  (use with expo-linear-gradient)
 * ---------------------------------------------------------------- */
export const gradients = {
  // App background, top → bottom
  appBackground: {
    colors: ['#0B0E1A', '#121630', '#1A1040'],
    locations: [0, 0.55, 1],
  },
  // Player sheet
  player: {
    colors: ['#0A0D18', '#12102A', '#1A1240'],
    locations: [0, 0.5, 1],
  },
  // 3am / promo card — violet diagonal (start/end + angle via `start`/`end`)
  violetCard: {
    colors: ['#1A1040', '#251845', '#1A1040'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
} as const;

/* ---------------------------------------------------------------- *
 * 3. SPACING  (4px base)
 * ---------------------------------------------------------------- */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 28,
  '4xl': 40,
  screenGutter: 24,  // horizontal screen padding (redesign uses 24, was 20)
  cardPadding: 18,
} as const;

/* ---------------------------------------------------------------- *
 * 4. RADII
 * ---------------------------------------------------------------- */
export const radius = {
  sm: 12,
  card: 14,
  lg: 16,
  pill: 20,
  full: 999,
} as const;

/* ---------------------------------------------------------------- *
 * 5. TYPOGRAPHY
 * Two families. The UI/body face is the native system font (already
 * the app default — nothing to load). The display face is an
 * editorial serif used LIGHT for hero/screen titles & image overlays.
 *
 * SERIF SETUP (expo-font): load "Newsreader" (Google Fonts, OFL) at
 * weights 300/400 and map to fontFamily 'Newsreader_300Light' etc.
 * via @expo-google-fonts/newsreader. Falls back to system serif.
 * --> Confirm the serif with the team or swap for a licensed face.
 * ---------------------------------------------------------------- */
export const fonts = {
  // System sans — leave fontFamily undefined to get SF Pro / Roboto
  sans: undefined as string | undefined,
  // Editorial serif (light) — hero & screen titles, photo overlays
  displayLight: 'Newsreader_300Light',
  displayRegular: 'Newsreader_400Regular',
  displayItalic: 'Newsreader_400Regular_Italic',
} as const;

export const weight = {
  light: '300',
  regular: '400',
  medium: '500',
  semibold: '600',
} as const;

/** Ready-to-spread text styles (RN TextStyle-compatible). */
export const type = {
  // Serif display
  hero:    { fontFamily: fonts.displayLight, fontSize: 34, lineHeight: 38, letterSpacing: 0.4, color: palette.text },
  display: { fontFamily: fonts.displayLight, fontSize: 28, lineHeight: 32, letterSpacing: 0.5, color: palette.text },
  titleSerif: { fontFamily: fonts.displayLight, fontSize: 22, lineHeight: 26, color: palette.text },
  // Sans UI
  section: { fontSize: 20, fontWeight: weight.semibold, letterSpacing: 0.3, color: palette.text },
  cardTitle: { fontSize: 17, fontWeight: weight.semibold, color: palette.text },
  body:    { fontSize: 16, lineHeight: 26, color: palette.text },          // article copy
  base:    { fontSize: 15, lineHeight: 21, color: palette.text },
  meta:    { fontSize: 13, color: palette.textSecondary },
  small:   { fontSize: 12, color: palette.textMuted },
  // Uppercase gold eyebrow ("LATEST ARTICLE", "SLEEP MEDITATION")
  eyebrow: { fontSize: 11, fontWeight: weight.semibold, letterSpacing: 1.5, textTransform: 'uppercase', color: palette.accentLight },
} as const;

/* ---------------------------------------------------------------- *
 * 6. ELEVATION  (depth = layered navy + hairline, NOT drop shadow)
 * ---------------------------------------------------------------- */
export const elevation = {
  // The ONLY real shadows in the app:
  fab: { shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 24, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  moonGlow: { shadowColor: '#C9A96E', shadowOpacity: 0.25, shadowRadius: 32, shadowOffset: { width: 0, height: 0 }, elevation: 6 },
} as const;

/* ---------------------------------------------------------------- *
 * 7. IMAGE TREATMENT  ("dusk" — the heart of the redesign)
 * Every photo gets: slight desaturation + a navy multiply wash + a
 * protection gradient, so any source photo reads as calm evening and
 * white text sits cleanly on top. Implement as layers (see
 * docs/selene-redesign/photo-treatment.md):
 *   <Image style={StyleSheet.absoluteFill} />               (the photo)
 *   <View  style={[absoluteFill, {backgroundColor: navyWash}]}/> (wash)
 *   <LinearGradient colors={scrim.hero|.card} ... />        (protection)
 * ---------------------------------------------------------------- */
export const imageTreatment = {
  // Apply to the <Image>: subtle cool-down. (RN: opacity only; for true
  // desaturation use a tint overlay — the navyWash below handles mood.)
  imageOpacity: 0.92,
  // Navy multiply-style wash laid over the photo
  navyWash: 'rgba(18,22,48,0.34)',
  // Protection gradients (use with expo-linear-gradient, vertical)
  scrim: {
    hero: {
      colors: ['rgba(11,14,26,0.40)', 'rgba(11,14,26,0.12)', 'rgba(11,14,26,0.92)', '#0B0E1A'],
      locations: [0, 0.36, 0.86, 1],
    },
    card: {
      colors: ['rgba(11,14,26,0.10)', 'rgba(11,14,26,0.94)'],
      locations: [0.3, 1],
    },
  },
} as const;

/* ---------------------------------------------------------------- *
 * 8. MOTION
 * ---------------------------------------------------------------- */
export const motion = {
  pressScale: 0.97,      // cards press-in
  iconPressScale: 0.9,   // icon buttons
  durationFast: 150,
  durationPress: 200,
  durationEnter: 600,
  // Reanimated/Easing: easeSoft ≈ Easing.bezier(0.22,1,0.36,1)
  //                     spring  ≈ Easing.bezier(0.34,1.56,0.64,1)
} as const;

export const theme = {
  palette, gradients, spacing, radius, fonts, weight, type, elevation, imageTreatment, motion,
} as const;

export default theme;
