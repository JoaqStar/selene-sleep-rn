/** Bundled tab hero photography (local assets). */
export const bundledHeroImages = {
  sleep: require('@/assets/images/heroes/sleep.png'),
  learn: require('@/assets/images/heroes/learn.png'),
  community: require('@/assets/images/heroes/community.png'),
} as const;

/** Placeholder photography — swap URLs or bundle local assets later. */
export const heroImages = {
  home: 'https://images.unsplash.com/photo-1515377904043-c7bad3985559?w=800&q=80',
  sleep: 'https://images.unsplash.com/photo-1495567725209-e152f228f461?w=800&q=80',
  learn: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&q=80',
  community: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&q=80',
} as const;

export const sessionTileImages = [
  'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=400&q=80',
  'https://images.unsplash.com/photo-1520206183501-b80da4e6bf4b?w=400&q=80',
  'https://images.unsplash.com/photo-1511295420927-9c27cec3598b?w=400&q=80',
] as const;

export const circleImages = [
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&q=80',
  'https://images.unsplash.com/photo-1581579438747-1dc8d17bbce4?w=400&q=80',
  'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=400&q=80',
] as const;

export const MOCK_CIRCLES = [
  { id: 'night-owls', name: 'Night Owls', members: '1.2k members', image: circleImages[0] },
  { id: 'new-to-peri', name: 'New to Peri', members: '860 members', image: circleImages[1] },
  { id: 'hrt-me', name: 'HRT & Me', members: '2.0k members', image: circleImages[2] },
] as const;
