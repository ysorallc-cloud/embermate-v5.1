// ============================================================================
// TAB LAYOUT - 3 Tabs (Today, Hub, Family)
// Aurora redesign with glassmorphic tab bar
// ============================================================================

import { Tabs } from 'expo-router';
import { Text, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Colors } from '../_theme/theme-tokens';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Platform.OS === 'ios' ? 'transparent' : Colors.tabBarBackground,
          borderTopColor: Colors.borderLight,
          borderTopWidth: 1,
          height: 88,
          paddingBottom: 34,
          paddingTop: 8,
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
            <Text style={{
              fontSize: 24,
              opacity: focused ? 1 : 0.5,
              ...(focused && {
                textShadowColor: Colors.accentGlow,
                textShadowOffset: { width: 0, height: 0 },
                textShadowRadius: 12,
              }),
            }}>☕</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="brief"
        options={{
          title: 'HUB',
          tabBarIcon: ({ focused }) => (
            <Text style={{
              fontSize: 24,
              opacity: focused ? 1 : 0.5,
              ...(focused && {
                textShadowColor: Colors.accentGlow,
                textShadowOffset: { width: 0, height: 0 },
                textShadowRadius: 12,
              }),
            }}>🌱</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="family-tab"
        options={{
          title: 'FAMILY',
          tabBarIcon: ({ focused }) => (
            <Text style={{
              fontSize: 24,
              opacity: focused ? 1 : 0.5,
              ...(focused && {
                textShadowColor: Colors.accentGlow,
                textShadowOffset: { width: 0, height: 0 },
                textShadowRadius: 12,
              }),
            }}>🧶</Text>
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
