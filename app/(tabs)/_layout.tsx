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
import { View, Text, Platform } from 'react-native';
import { useEffect, useState } from 'react';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { getCaregiverProfile } from '../../storage/caregiverProfileRepo';

// F7 C6c-A — Option D dusty active color for the You tab. Other tabs
// stay on the sage accent.
const DUSTY = '#6b8cae';

// F7 C6c-A — caregiver-avatar TabIcon for the You tab. Renders a 22px
// circle with the caregiver's initial letter in dusty blue, or a heart
// glyph fallback when no caregiver name is set.
function YouTabIcon({ focused, caregiverInitial }: { focused: boolean; caregiverInitial: string | null }) {
  const baseStyle = {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  };
  const activeStyle = {
    backgroundColor: 'rgba(107, 140, 174, 0.15)',
    borderColor: DUSTY,
  };
  const inactiveStyle = {
    backgroundColor: 'rgba(107, 140, 174, 0.06)',
    borderColor: 'rgba(107, 140, 174, 0.20)',
  };
  const activeLetter = { color: DUSTY, fontSize: 11, fontWeight: '500' as const };
  const inactiveLetter = { color: 'rgba(107, 140, 174, 0.40)', fontSize: 11, fontWeight: '500' as const };

  return (
    <View
      style={{ alignItems: 'center' }}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      <View style={[baseStyle, focused ? activeStyle : inactiveStyle]}>
        {caregiverInitial ? (
          <Text style={focused ? activeLetter : inactiveLetter}>{caregiverInitial}</Text>
        ) : (
          <Ionicons
            name={focused ? 'heart' : 'heart-outline'}
            size={12}
            color={focused ? DUSTY : 'rgba(107, 140, 174, 0.40)'}
          />
        )}
      </View>
      {focused && (
        <View style={{
          width: 4,
          height: 4,
          borderRadius: 2,
          backgroundColor: DUSTY,
          marginTop: 4,
        }} />
      )}
    </View>
  );
}

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

  // F7 C6c-A — caregiver name feeds the You tab's avatar circle.
  // Fallback to null → heart-glyph icon (per Option D spec).
  const [caregiverInitial, setCaregiverInitial] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    getCaregiverProfile()
      .then((profile) => {
        if (cancelled) return;
        const name = profile?.name?.trim() ?? '';
        setCaregiverInitial(name.length > 0 ? name.charAt(0).toUpperCase() : null);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

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
            {/* F7 C6c-A — Option D separator. 32pt height, vertically
                centered in the visible bar region (~52pt tall after
                paddingTop:8 / paddingBottom:28 on the 80pt outer).
                Color lifts from the prior glassHover (alpha 0.06) →
                glassBorder (alpha 0.10) per Option D's "rgba(244,221,
                184,0.1)" rule — visually equivalent to the literal
                spec value, routed through the canonical glass-family
                token so the divider stays a structural marker, not a
                brand color. Always visible regardless of active tab. */}
            <View
              testID="tab-bar-divider"
              accessible={false}
              importantForAccessibility="no-hide-descendants"
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: '75%',
                top: 18, // allow: centers 32pt rule in the visible region
                width: 1,
                height: 32, // allow: F7 C6c-A Option D separator height
                backgroundColor: colors.glassBorder,
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
          // F7 C6c-A Option D — the You tab gets a per-tab active
          // tint override (dusty blue #6b8cae) so the active label
          // reads in the caregiver-lane color, distinct from the sage
          // operational triplet. tabBarIcon is the new YouTabIcon
          // (avatar circle with caregiver initial or heart fallback).
          //
          // Phase 33b Scope 2's "no nav-tint override" rule
          // (Q-33b.6 lock a) intentionally relaxes here for Option D —
          // the You tab is the caregiver-self space and the F7
          // canon-dusty palette explicitly carries the caregiver lane
          // on this surface.
          tabBarActiveTintColor: DUSTY,
          tabBarIcon: ({ focused }) => <YouTabIcon focused={focused} caregiverInitial={caregiverInitial} />,
          tabBarAccessibilityLabel: 'You tab. Your wellness and self-care',
          tabBarButtonTestID: 'tab-support',
        }}
      />
    </Tabs>
  );
}
