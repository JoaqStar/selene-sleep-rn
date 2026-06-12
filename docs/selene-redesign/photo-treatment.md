# The "dusk" photo treatment

The single most important visual move in the redesign: **every photo is layered
so any source image reads as calm evening and white serif text sits cleanly on
top.** This is what makes mixed-source placeholder photos cohere — and what will
make a real commissioned library look intentional.

## The three layers (bottom → top)

1. **The photo** — `<Image>` filling the container, slightly cooled.
2. **Navy wash** — a flat `rgba(18,22,48,0.34)` overlay (mood + desaturation).
3. **Protection gradient** — a vertical `expo-linear-gradient` that darkens
   toward the bottom so text is legible. `scrim.hero` for full-bleed heroes,
   `scrim.card` for cards.

## React Native implementation

```tsx
import { Image, View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { imageTreatment as T } from '@/constants/theme';

type Props = { source: { uri: string } | number; variant?: 'hero' | 'card'; children?: React.ReactNode };

export function Photo({ source, variant = 'card', children }: Props) {
  const scrim = variant === 'hero' ? T.scrim.hero : T.scrim.card;
  return (
    <View style={StyleSheet.absoluteFill}>
      <Image source={source} style={[StyleSheet.absoluteFill, { opacity: T.imageOpacity }]} resizeMode="cover" />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: T.navyWash }]} />
      <LinearGradient colors={scrim.colors} locations={scrim.locations} style={StyleSheet.absoluteFill} />
      {children}
    </View>
  );
}
```

Usage — a hero with a serif title overlaid:

```tsx
<View style={{ height: 320 }}>
  <Photo source={{ uri }} variant="hero" />
  <View style={{ position: 'absolute', left: 24, right: 24, bottom: 22 }}>
    <Text style={type.eyebrow}>Sleep</Text>
    <Text style={type.hero}>Evening Wind-Down</Text>
  </View>
</View>
```

## Notes
- RN `<Image>` can't true-desaturate without a filter lib; the navy wash carries
  the mood, so a saturation filter is optional. If you want it, use
  `@react-native-community/blur` or a tint, but it's not required.
- Keep the gradient ON TOP of the wash, content on top of the gradient.
- For cards, the photo container has `borderRadius: radius.lg` + `overflow:'hidden'`.
