import { Dimensions, Platform } from 'react-native';

// Seen's sizes are designed against a phone's width. On the web the window can be a whole desktop,
// so sizes are based on a phone-like width instead: posters keep their phone size, and wrapping
// grids fit more columns rather than growing huge. Native apps use the real window width.
const WEB_DESIGN_WIDTH = 520;

export function designWidth() {
  const { width } = Dimensions.get('window');
  return Platform.OS === 'web' ? Math.min(width, WEB_DESIGN_WIDTH) : width;
}
