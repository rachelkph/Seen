import { Platform, useWindowDimensions } from 'react-native';

// Wide-screen web layout (sidebar, grids, wider content). Phones and the native apps never use it.
export const DESKTOP_MIN_WIDTH = 1024;

export function useIsDesktop() {
  const { width } = useWindowDimensions();
  return Platform.OS === 'web' && width >= DESKTOP_MIN_WIDTH;
}
