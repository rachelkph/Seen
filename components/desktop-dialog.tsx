import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Colors, BorderRadius, Spacing } from '@/constants/theme';

// Wide-screen web: modal screens (review, rank, edit profile, ...) open as a centered dialog over the
// dimmed page instead of a full-screen sheet. Clicking outside closes it, like swiping a sheet down.
export function DesktopDialog({ children, onDismiss }: { children: ReactNode; onDismiss: () => void }) {
  return (
    <View style={styles.backdrop}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} accessibilityLabel="Close" />
      <View style={styles.dialog}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    backgroundColor: 'rgba(30, 30, 30, 0.45)',
  },
  dialog: {
    width: '100%',
    maxWidth: 560,
    height: '100%',
    maxHeight: 760,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    backgroundColor: Colors.background,
    shadowColor: Colors.black,
    shadowOpacity: 0.25,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
  },
});
