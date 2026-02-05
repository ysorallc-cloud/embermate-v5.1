// ============================================================================
// UP NEXT CARD - Shows next upcoming task (Gold)
// Role: display - Read-only presentation of next pending task
// ============================================================================

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../../theme/theme-tokens';
import { UpNextData } from '../../types/contextCard';
import { ComponentRole, getRoleLabel, getRoleA11yHint } from '../../types/componentRoles';

interface UpNextCardProps {
  data: UpNextData;
  /** Component role - defaults to 'display' for UpNextCard */
  __role?: ComponentRole;
  /** Show role label badge */
  roleLabel?: boolean | string;
}

export const UpNextCard: React.FC<UpNextCardProps> = ({
  data,
  __role = 'display',
  roleLabel,
}) => {
  const router = useRouter();
  const displayLabel = getRoleLabel(__role, roleLabel);

  const handlePress = () => {
    // Navigate to appropriate screen based on type
    switch (data.type) {
      case 'medication':
        // Route to contextual logging if we have Care Plan data
        const extData = data as any;
        if (extData.instanceId && extData.medicationName) {
          router.push({
            pathname: '/log-medication-plan-item',
            params: {
              medicationId: extData.medicationId || extData.taskId,
              instanceId: extData.instanceId,
              scheduledTime: extData.scheduledTime || data.time,
              itemName: extData.medicationName || data.title,
              itemDosage: extData.dosage || '',
            },
          } as any);
        } else {
          // Fallback to manual logging only if no Care Plan context
          router.push('/medication-confirm');
        }
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
        <View style={styles.labelRow}>
          <Text style={styles.label}>UP NEXT</Text>
          {displayLabel && (
            <Text style={styles.roleLabel}>{displayLabel}</Text>
          )}
        </View>
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
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
    color: Colors.gold,
  },
  roleLabel: {
    fontSize: 8,
    fontWeight: '600',
    letterSpacing: 0.5,
    color: Colors.textMuted,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
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
