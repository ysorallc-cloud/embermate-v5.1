// ============================================================================
// CONSISTENCY BANNER
// Shows empty state messages with action buttons for missing data
// Used across screens to maintain consistent "add X" patterns
// ============================================================================

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../../theme/theme-tokens';

// ============================================================================
// TYPES
// ============================================================================

export interface ConsistencyBannerProps {
  type: 'empty' | 'warning' | 'error' | 'info';
  icon?: string;
  message: string;
  actionLabel?: string;
  actionRoute?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondaryAction?: () => void;
  dismissable?: boolean;
  onDismiss?: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ConsistencyBanner({
  type,
  icon,
  message,
  actionLabel,
  actionRoute,
  onAction,
  secondaryLabel,
  onSecondaryAction,
  dismissable = false,
  onDismiss,
}: ConsistencyBannerProps) {
  const router = useRouter();

  const handlePrimaryAction = () => {
    if (onAction) {
      onAction();
    } else if (actionRoute) {
      router.push(actionRoute as any);
    }
  };

  const bannerStyle = [
    styles.banner,
    type === 'empty' && styles.bannerEmpty,
    type === 'warning' && styles.bannerWarning,
    type === 'error' && styles.bannerError,
    type === 'info' && styles.bannerInfo,
  ];

  const iconStyle = [
    styles.icon,
    type === 'warning' && styles.iconWarning,
    type === 'error' && styles.iconError,
  ];

  const messageStyle = [
    styles.message,
    type === 'warning' && styles.messageWarning,
    type === 'error' && styles.messageError,
  ];

  return (
    <View style={bannerStyle}>
      {dismissable && onDismiss && (
        <TouchableOpacity style={styles.dismissButton} onPress={onDismiss}>
          <Text style={styles.dismissIcon}>×</Text>
        </TouchableOpacity>
      )}

      <View style={styles.content}>
        {icon && <Text style={iconStyle}>{icon}</Text>}
        <Text style={messageStyle}>{message}</Text>
      </View>

      <View style={styles.actions}>
        {actionLabel && (
          <TouchableOpacity
            style={[
              styles.actionButton,
              type === 'warning' && styles.actionButtonWarning,
              type === 'error' && styles.actionButtonError,
            ]}
            onPress={handlePrimaryAction}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.actionButtonText,
              type === 'warning' && styles.actionButtonTextWarning,
              type === 'error' && styles.actionButtonTextError,
            ]}>
              {actionLabel}
            </Text>
          </TouchableOpacity>
        )}

        {secondaryLabel && onSecondaryAction && (
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={onSecondaryAction}
            activeOpacity={0.7}
          >
            <Text style={styles.secondaryButtonText}>{secondaryLabel}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ============================================================================
// PRESET BANNERS
// ============================================================================

export function NoMedicationsBanner() {
  return (
    <ConsistencyBanner
      type="empty"
      icon="💊"
      message="No medications set up yet"
      actionLabel="Add medication"
      actionRoute="/medication-form"
    />
  );
}

export function NoAppointmentsBanner() {
  return (
    <ConsistencyBanner
      type="empty"
      icon="📅"
      message="No appointments scheduled"
      actionLabel="Add appointment"
      actionRoute="/appointment-form"
    />
  );
}

export function NoCarePlanBanner({ onSetup }: { onSetup?: () => void }) {
  return (
    <ConsistencyBanner
      type="empty"
      icon="📋"
      message="No Care Plan set up yet"
      actionLabel="Set up Care Plan"
      onAction={onSetup}
      actionRoute={onSetup ? undefined : '/care-plan'}
    />
  );
}

export function MedicationRemovedBanner({
  medicationName,
  onRemove,
  onDismiss,
}: {
  medicationName?: string;
  onRemove: () => void;
  onDismiss?: () => void;
}) {
  return (
    <ConsistencyBanner
      type="warning"
      icon="⚠️"
      message={medicationName ? `"${medicationName}" was removed` : 'Medication was removed'}
      actionLabel="Remove from plan"
      onAction={onRemove}
      secondaryLabel="Dismiss"
      onSecondaryAction={onDismiss}
      dismissable={!!onDismiss}
      onDismiss={onDismiss}
    />
  );
}

export function DataIntegrityBanner({
  issueCount,
  onFix,
}: {
  issueCount: number;
  onFix: () => void;
}) {
  return (
    <ConsistencyBanner
      type="warning"
      icon="🔧"
      message={`${issueCount} data issue${issueCount > 1 ? 's' : ''} found`}
      actionLabel="Review & fix"
      onAction={onFix}
    />
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  banner: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  bannerEmpty: {
    borderStyle: 'dashed',
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  bannerWarning: {
    backgroundColor: 'rgba(251, 191, 36, 0.08)',
    borderColor: 'rgba(251, 191, 36, 0.25)',
  },
  bannerError: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  bannerInfo: {
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    borderColor: 'rgba(59, 130, 246, 0.25)',
  },

  dismissButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissIcon: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.4)',
  },

  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  icon: {
    fontSize: 20,
    opacity: 0.6,
  },
  iconWarning: {
    opacity: 1,
  },
  iconError: {
    opacity: 1,
  },
  message: {
    flex: 1,
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 20,
  },
  messageWarning: {
    color: 'rgba(251, 191, 36, 0.9)',
  },
  messageError: {
    color: 'rgba(239, 68, 68, 0.9)',
  },

  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    backgroundColor: 'rgba(94, 234, 212, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(94, 234, 212, 0.3)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  actionButtonWarning: {
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    borderColor: 'rgba(251, 191, 36, 0.3)',
  },
  actionButtonError: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.accent,
  },
  actionButtonTextWarning: {
    color: '#FBBF24',
  },
  actionButtonTextError: {
    color: '#EF4444',
  },

  secondaryButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  secondaryButtonText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.5)',
  },
});

export default ConsistencyBanner;
