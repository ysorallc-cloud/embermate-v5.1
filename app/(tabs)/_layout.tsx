// ============================================================================
// TAB LAYOUT - 4 Tabs (Today, Log, Hub, Care Team)
// V3 with expanded navigation
// ============================================================================

import { Tabs } from 'expo-router';
import { View, Text, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Colors } from '../_theme/theme-tokens';

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
        name="today"
        options={{
          title: 'Today',
          tabBarIcon: ({ focused }) => <TabIcon icon="☀️" focused={focused} />,
          tabBarAccessibilityLabel: 'Today tab',
          tabBarButtonTestID: 'tab-today',
        }}
      />
      <Tabs.Screen
        name="log"
        options={{
          title: 'Log',
          tabBarIcon: ({ focused }) => <TabIcon icon="✏️" focused={focused} />,
          tabBarAccessibilityLabel: 'Log tab. Record medications, vitals, and activities',
          tabBarButtonTestID: 'tab-log',
        }}
      />
      <Tabs.Screen
        name="brief"
        options={{
          title: 'Hub',
          tabBarIcon: ({ focused }) => <TabIcon icon="📊" focused={focused} />,
          tabBarAccessibilityLabel: 'Hub tab. View health summary and insights',
          tabBarButtonTestID: 'tab-hub',
        }}
      />
      <Tabs.Screen
        name="care"
        options={{
          title: 'Care Team',
          tabBarIcon: ({ focused }) => <TabIcon icon="👥" focused={focused} />,
          tabBarAccessibilityLabel: 'Care Team tab. Manage family members and caregivers',
          tabBarButtonTestID: 'tab-care-team',
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
