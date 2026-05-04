// ============================================================================
// TAB LAYOUT - 4 Tabs (Now, Journal, Support, Insights)
// V5 — Team/Support moved to Settings > Care Team (Premium)
// ============================================================================

import { Tabs } from 'expo-router';
import { View, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';

type TabName = 'now' | 'journal' | 'support' | 'understand';

const TAB_ICONS: Record<TabName, { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap }> = {
  now: { active: 'sunny', inactive: 'sunny-outline' },
  journal: { active: 'document-text', inactive: 'document-text-outline' },
  support: { active: 'heart', inactive: 'heart-outline' },
  understand: { active: 'pulse', inactive: 'pulse-outline' },
};

const TabIcon = ({
  name,
  focused,
  accent,
  inactive,
}: {
  name: TabName;
  focused: boolean;
  accent: string;
  inactive: string;
}) => (
  <View
    style={{ alignItems: 'center' }}
    accessible={false}
    importantForAccessibility="no-hide-descendants"
  >
    <Ionicons
      name={focused ? TAB_ICONS[name].active : TAB_ICONS[name].inactive}
      size={22}
      color={focused ? accent : inactive}
    />
    {focused && (
      <View style={{
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: accent,
        marginTop: 4,
      }} />
    )}
  </View>
);

export default function TabLayout() {
  const { colors, resolvedTheme } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Platform.OS === 'ios' ? 'transparent' : colors.background,
          borderTopColor: colors.glassBorder,
          borderTopWidth: 1,
          paddingTop: 8,
          paddingBottom: 28, // allow: tap-target padding (Apple HIG ≥44pt)
          height: 80,
          position: 'absolute',
        },
        tabBarBackground: () => (
          Platform.OS === 'ios' ? (
            <BlurView
              intensity={40}
              tint={resolvedTheme === 'light' ? 'light' : 'dark'}
              style={{ flex: 1, backgroundColor: resolvedTheme === 'light' ? 'rgba(248, 255, 254, 0.85)' : 'rgba(0, 0, 0, 0.92)' }}
            />
          ) : null
        ),
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '500',
        },
      }}
    >
      <Tabs.Screen
        name="now"
        options={{
          title: 'Now',
          tabBarIcon: ({ focused }) => <TabIcon name="now" focused={focused} accent={colors.accent} inactive={colors.textMuted} />,
          tabBarAccessibilityLabel: 'Now tab. What is happening right now',
          tabBarButtonTestID: 'tab-now',
        }}
      />
      <Tabs.Screen
        name="journal"
        options={{
          title: 'Journal',
          tabBarIcon: ({ focused }) => <TabIcon name="journal" focused={focused} accent={colors.accent} inactive={colors.textMuted} />,
          tabBarAccessibilityLabel: 'Journal tab. Review care history and daily summary',
          tabBarButtonTestID: 'tab-journal',
        }}
      />
      <Tabs.Screen
        name="understand"
        options={{
          title: 'Insights',
          tabBarIcon: ({ focused }) => <TabIcon name="understand" focused={focused} accent={colors.accent} inactive={colors.textMuted} />,
          tabBarAccessibilityLabel: 'Insights tab. View health patterns and insights',
          tabBarButtonTestID: 'tab-understand',
        }}
      />
      <Tabs.Screen
        name="support"
        options={{
          title: 'You',
          tabBarIcon: ({ focused }) => <TabIcon name="support" focused={focused} accent={colors.accent} inactive={colors.textMuted} />,
          tabBarAccessibilityLabel: 'You tab. Your wellness and self-care',
          tabBarButtonTestID: 'tab-support',
        }}
      />
    </Tabs>
  );
}
