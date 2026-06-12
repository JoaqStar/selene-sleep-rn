import { ImageSource } from 'expo-image';

const homeHeroImages = {
  morning: require('@/assets/images/heroes/home-morning.png'),
  night: require('@/assets/images/heroes/home-night.png'),
} as const;

/** Daylight hours (6am–6pm local) use the morning walk; evening/night use stars. */
export function isHomeMorningHours(date: Date = new Date()): boolean {
  const hour = date.getHours();
  return hour >= 6 && hour < 18;
}

export function getHomeHeroImage(date: Date = new Date()): ImageSource {
  return isHomeMorningHours(date) ? homeHeroImages.morning : homeHeroImages.night;
}
