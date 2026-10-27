import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Spacing } from '@/constants/theme';
import { DesktopSidebar } from '@/components/desktop-sidebar';
import { useIsDesktop } from '@/hooks/use-is-desktop';

// Web icons are font glyphs with taller line boxes than SF Symbols, so the bar needs extra room there.
const TAB_BAR_HEIGHT = Platform.OS === 'web' ? 68 : 60;

// Wide-screen web: how wide each tab's content may grow, centered beside the sidebar.
const DESKTOP_CONTENT_WIDTH = {
  index: 680, // feed reads best as a column
  discover: 1120,
  lists: 1000,
  leaderboard: 720,
  profile: 900,
} as const;

function desktopScene(maxWidth: number) {
  return { width: '100%', maxWidth, alignSelf: 'center', backgroundColor: Colors.background } as const;
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const isDesktop = useIsDesktop();

  return (
    <Tabs
      // Wide-screen web: a left sidebar instead of the bottom tab bar.
      tabBar={isDesktop ? (props) => <DesktopSidebar {...props} /> : undefined}
      screenOptions={{
        tabBarPosition: isDesktop ? 'left' : 'bottom',
        headerShown: false,
        tabBarActiveTintColor: Colors.stamp,
        tabBarInactiveTintColor: Colors.tabIconDefault,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: Colors.background,
          borderTopWidth: 0,
          elevation: 0,
          height: TAB_BAR_HEIGHT + insets.bottom,
          paddingTop: Spacing.sm,
          paddingBottom: insets.bottom + (Platform.OS === 'web' ? Spacing.sm : 0),
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '500',
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          sceneStyle: isDesktop ? desktopScene(DESKTOP_CONTENT_WIDTH.index) : undefined,
          title: 'Feed',
          tabBarIcon: ({ color }) => (
            <IconSymbol name="doc.text" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          sceneStyle: isDesktop ? desktopScene(DESKTOP_CONTENT_WIDTH.discover) : undefined,
          title: 'Discover',
          tabBarIcon: ({ color }) => (
            <IconSymbol name="magnifyingglass" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="lists"
        options={{
          sceneStyle: isDesktop ? desktopScene(DESKTOP_CONTENT_WIDTH.lists) : undefined,
          title: 'Lists',
          tabBarIcon: ({ color }) => (
            <IconSymbol name="list.bullet" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          sceneStyle: isDesktop ? desktopScene(DESKTOP_CONTENT_WIDTH.leaderboard) : undefined,
          title: 'Ranks',
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol name={focused ? 'trophy.fill' : 'trophy'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          sceneStyle: isDesktop ? desktopScene(DESKTOP_CONTENT_WIDTH.profile) : undefined,
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol name={focused ? 'person.fill' : 'person'} size={24} color={color} />
          ),
        }}
      />
      {/* Hide explore from tab bar */}
      <Tabs.Screen
        name="explore"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
