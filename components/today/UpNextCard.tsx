// ============================================================================
// UP NEXT CARD - Shows next upcoming task (Gold)
// ============================================================================

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../../app/_theme/theme-tokens';
import { UpNextData } from '../../types/contextCard';

interface UpNextCardProps {
  data: UpNextData;
}

export const UpNextCard: React.FC<UpNextCardProps> = ({ data }) => {
  const router = useRouter();

  const handlePress = () => {
    // Navigate to appropriate screen based on type
    switch (data.type) {
      case 'medication':
        router.push('/medication-confirm');
        break;
      case 'appointment':
        router.push('/calendar');
        break;
      default:
        // General task - navigate to timeline or do nothing
        break;
    }
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.8}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={`Up next: ${data.title}`}
    >
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>{data.icon}</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.label}>UP NEXT</Text>
        <Text style={styles.title}>{data.title}</Text>
        <Text style={styles.subtitle}>{data.subtitle}</Text>
      </View>

      <Text style={styles.arrow}>→</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.goldLight,
    borderWidth: 1,
    borderColor: Colors.goldBorder,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  icon: {
    fontSize: 22,
  },
  content: {
    flex: 1,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
    color: Colors.gold,
    marginBottom: 2,
  },
  title: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.gold,
    marginTop: 1,
  },
  arrow: {
    fontSize: 18,
    color: Colors.gold,
    marginLeft: 8,
  },
});
