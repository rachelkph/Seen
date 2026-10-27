import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { IconSymbol, type IconSymbolName } from '@/components/ui/icon-symbol';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '@/constants/theme';

// Wide-screen web navigation: the tab bar as a left sidebar, plus Notifications and Settings.
// Used as the Tabs `tabBar` when useIsDesktop() is true; phones keep the bottom tab bar.
export const SIDEBAR_WIDTH = 232;

export function DesktopSidebar({ state, descriptors, navigation }: BottomTabBarProps) {
  const router = useRouter();

  const tabs = state.routes.filter((route) => {
    const itemStyle = StyleSheet.flatten(descriptors[route.key].options.tabBarItemStyle);
    return itemStyle?.display !== 'none'; // tabs with href: null (e.g. explore) are hidden
  });

  return (
    <View style={styles.sidebar}>
      <Text style={styles.wordmark}>Seen</Text>

      <View style={styles.items}>
        {tabs.map((route) => {
          const { options } = descriptors[route.key];
          const focused = state.routes[state.index].key === route.key;
          const color = focused ? Colors.stamp : Colors.tabIconDefault;
          const label = typeof options.title === 'string' ? options.title : route.name;

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
          };

          return (
            <Pressable key={route.key} onPress={onPress} style={[styles.item, focused && styles.itemFocused]}>
              {options.tabBarIcon?.({ focused, color, size: 22 })}
              <Text style={[styles.label, { color }]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.footer}>
        <SidebarLink icon="bell" label="Notifications" onPress={() => router.push('/notifications')} />
        <SidebarLink icon="gearshape" label="Settings" onPress={() => router.push('/settings')} />
      </View>
    </View>
  );
}

function SidebarLink({ icon, label, onPress }: { icon: IconSymbolName; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.item}>
      <IconSymbol name={icon} size={22} color={Colors.tabIconDefault} />
      <Text style={[styles.label, { color: Colors.tabIconDefault }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: SIDEBAR_WIDTH,
    height: '100%',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.background,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: Colors.border,
  },
  wordmark: {
    fontFamily: Fonts.serifBold,
    fontSize: 34,
    color: Colors.stamp,
    paddingHorizontal: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  items: {
    gap: Spacing.xs,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  itemFocused: {
    backgroundColor: Colors.cardBackground,
  },
  label: {
    fontFamily: Fonts.sansMedium,
    fontSize: FontSizes.md,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  footer: {
    marginTop: 'auto',
    gap: Spacing.xs,
  },
});
