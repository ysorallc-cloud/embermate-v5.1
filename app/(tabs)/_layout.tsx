// ============================================================================
// TAB LAYOUT - 3 Tabs (Today, Hub, Family)
// Mindful redesign with focused navigation
// ============================================================================

import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { Colors } from '../_theme/theme-tokens';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.tabBarBackground,
          borderTopColor: Colors.tabBarBorder,
          borderTopWidth: 1,
          height: 88,
          paddingBottom: 34,
          paddingTop: 8,
        },
        tabBarActiveTintColor: Colors.tabBarActive,
        tabBarInactiveTintColor: Colors.tabBarInactive,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="today"
        options={{
          title: 'TODAY',
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: 24, opacity: focused ? 1 : 0.5 }}>☕</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="brief"
        options={{
          title: 'HUB',
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: 24, opacity: focused ? 1 : 0.5 }}>🌱</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="family-tab"
        options={{
          title: 'FAMILY',
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: 24, opacity: focused ? 1 : 0.5 }}>🧶</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="timeline"
        options={{
          href: null, // Hide from tab bar but keep route accessible
        }}
      />
    </Tabs>
  );
}
