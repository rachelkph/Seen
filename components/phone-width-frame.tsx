import type { ReactNode } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Colors } from '@/constants/theme';
import { useIsDesktop } from '@/hooks/use-is-desktop';

// Seen is designed for a phone. On the website, medium-width windows show it as a centered,
// phone-width column instead of stretching it edge to edge. Desktop widths get the sidebar
// layout instead (see useIsDesktop), and native apps render children as-is.
const MAX_WIDTH = 520;

export function PhoneWidthFrame({ children }: { children: ReactNode }) {
  const isDesktop = useIsDesktop();
  if (Platform.OS !== 'web' || isDesktop) return <>{children}</>;
  return (
    <View style={styles.backdrop}>
      <View style={styles.column}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: Colors.backgroundSecondary,
  },
  column: {
    flex: 1,
    width: '100%',
    maxWidth: MAX_WIDTH,
    backgroundColor: Colors.background,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
});
