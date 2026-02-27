// ============================================================================
// TAB LAYOUT - 4 Tabs (Now, Journal, Understand, Support)
// V4 with renamed navigation for clarity
// ============================================================================

import { Tabs } from 'expo-router';
import { View, Text, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Colors } from '../../theme/theme-tokens';

const TabIcon = ({ icon, focused }: { icon: string; focused: boolean }) => (
  <View
    style={{ alignItems: 'center' }}
    accessible={false}
    importantForAccessibility="no-hide-descendants"
  >
    <Text style={{
      fontSize: 24,
      opacity: focused ? 1 : 0.5,
      transform: [{ scale: focused ? 1.1 : 1 }],
      ...(focused && Platform.OS === 'ios' && {
        textShadowColor: Colors.accentGlow,
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 12,
      }),
    }}>
      {icon}
    </Text>
    {focused && (
      <View style={{
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: Colors.accent,
        marginTop: 4,
      }} />
    )}
  </View>
);

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Platform.OS === 'ios' ? 'transparent' : 'rgba(4, 15, 14, 0.95)',
          borderTopColor: Colors.glassBorder,
          borderTopWidth: 1,
          paddingTop: 8,
          paddingBottom: 28,
          height: 80,
          position: 'absolute',
        },
        tabBarBackground: () => (
          Platform.OS === 'ios' ? (
            <BlurView
              intensity={40}
              tint="dark"
              style={{ flex: 1, backgroundColor: 'rgba(5, 22, 20, 0.85)' }}
            />
          ) : null
        ),
        tabBarActiveTintColor: Colors.accent,
        tabBarInactiveTintColor: Colors.textMuted,
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
          tabBarIcon: ({ focused }) => <TabIcon icon="☀️" focused={focused} />,
          tabBarAccessibilityLabel: 'Now tab. What is happening right now',
          tabBarButtonTestID: 'tab-now',
        }}
      />
      <Tabs.Screen
        name="journal"
        options={{
          title: 'Journal',
          tabBarIcon: ({ focused }) => <TabIcon icon="📖" focused={focused} />,
          tabBarAccessibilityLabel: 'Journal tab. Review care history and daily summary',
          tabBarButtonTestID: 'tab-journal',
        }}
      />
      <Tabs.Screen
        name="understand"
        options={{
          title: 'Understand',
          tabBarIcon: ({ focused }) => <TabIcon icon="📊" focused={focused} />,
          tabBarAccessibilityLabel: 'Understand tab. View health patterns and insights',
          tabBarButtonTestID: 'tab-understand',
        }}
      />
      <Tabs.Screen
        name="support"
        options={{
          title: 'Team',
          tabBarIcon: ({ focused }) => <TabIcon icon="👥" focused={focused} />,
          tabBarAccessibilityLabel: 'Support tab. Manage care circle and family',
          tabBarButtonTestID: 'tab-support',
        }}
      />
      <Tabs.Screen
        name="timeline"
        options={{
          href: null, // Hidden route
        }}
      />
      <Tabs.Screen
        name="family-tab"
        options={{
          href: null, // Redirect old route to care
        }}
      />
    </Tabs>
  );
}
