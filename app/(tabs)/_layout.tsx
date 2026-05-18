// ============================================================================
// TAB LAYOUT - 4 Tabs (Now, Journal, Support, Insights)
// V5 — Team/Support moved to Settings > Care Team (Premium)
//
// Phase 33b Scope 2 (2026-05-18) — Surface 6 lavender scale reduction.
// Per Q-33b.6 lock (a), the bottom nav is now uniformly cream-default
// + sage-active across all 4 tabs. The Phase 26 F1 narrative
// (lavender-active on the Support tab to telegraph the caregiver lane)
// was superseded by website canon — nav is structural navigation, not
// content-chrome, and the canon nav uses cream-default-no-color. The
// Support tab no longer overrides tint; it inherits the screenOptions
// default (sage active / cream-muted inactive) like the other 3 tabs.
//
// Phase 26 F2 — tabBarBackground extends from a single BlurView to a
// wrapping View that also renders a 1px hairline at left: '75%' — the
// 3/4 boundary of the 4-tab equal-width layout, visually grouping You
// apart from the operational triplet (Now / Journal / Insights).
// Survives Phase 33b — structural grouping, not lane-chrome.
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
        // Phase 26 F2 — wrapping View renders both the iOS BlurView
        // (unchanged) and a 1px hairline at the 3/4 boundary between
        // Insights (3rd tab) and You (4th tab). top/bottom mirror the
        // tabBarStyle padding so the line spans the visible content
        // region only, stopping cleanly at the safe-area cushion.
        //
        // Phase 26 A.1 — divider color glassBorder (0.10) → glassHover
        // (0.06), the next-quieter alpha in the glass ladder. At 0.10
        // the line read as visible-without-going-looking-for-it, which
        // is louder than a structural marker should be. 0.06 keeps the
        // separation legible up close but lets the divider recede into
        // the bar chrome from normal scanning distance.
        tabBarBackground: () => (
          <View style={{ flex: 1 }}>
            {Platform.OS === 'ios' ? (
              <BlurView
                intensity={40}
                tint={resolvedTheme === 'light' ? 'light' : 'dark'}
                style={{ flex: 1, backgroundColor: resolvedTheme === 'light' ? 'rgba(248, 255, 254, 0.85)' : 'rgba(0, 0, 0, 0.92)' }}
              />
            ) : null}
            <View
              testID="tab-bar-divider"
              accessible={false}
              importantForAccessibility="no-hide-descendants"
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: '75%',
                top: 8,
                bottom: 28,
                width: 1,
                backgroundColor: colors.glassHover,
              }}
            />
          </View>
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
          // Phase 33b Scope 2 — Support tab no longer overrides nav
          // tints. Inherits screenOptions default (sage active /
          // cream-muted inactive) like the other 3 tabs. Phase 26 F1
          // lavender-active override retired per Q-33b.6 lock (a).
          tabBarIcon: ({ focused }) => <TabIcon name="support" focused={focused} accent={colors.accent} inactive={colors.textMuted} />,
          tabBarAccessibilityLabel: 'You tab. Your wellness and self-care',
          tabBarButtonTestID: 'tab-support',
        }}
      />
    </Tabs>
  );
}
