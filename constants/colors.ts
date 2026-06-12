import { palette, gradients } from './theme';

const Colors = {
  ...palette,
  overlay: 'rgba(11, 14, 26, 0.85)',
  gradientStart: gradients.appBackground.colors[0],
  gradientMid: gradients.appBackground.colors[1],
  gradientEnd: gradients.appBackground.colors[2],
  playerGradientStart: gradients.player.colors[0],
  playerGradientEnd: gradients.player.colors[2],
};

export default Colors;
