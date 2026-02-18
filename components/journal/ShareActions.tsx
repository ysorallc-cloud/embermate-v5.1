import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Share, ActivityIndicator } from 'react-native';
import { Colors, Spacing, BorderRadius } from '../../theme/theme-tokens';
import { logAuditEvent, AuditEventType, AuditSeverity } from '../../utils/auditLog';
import { buildShareSummary } from '../../utils/careSummaryBuilder';
import { logError } from '../../utils/devLog';

interface Props {
  onShare: () => void;
  onExport?: () => void;
}

export function ShareActions({ onShare, onExport }: Props) {
  const [sharing, setSharing] = useState(false);

  const confirmShare = () => {
    Alert.alert(
      'Share Care Brief?',
      'A redacted summary will be shared (no specific vitals, dosages, or medical details). Only share with trusted caregivers or healthcare providers.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Share',
          onPress: doShare,
        },
      ]
    );
  };

  const doShare = async () => {
    try {
      setSharing(true);
      const summary = await buildShareSummary();

      let text = `📋 Care Brief — ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}\n\n`;
      text += `💊 ${summary.medsStatus}\n`;
      text += `🩺 ${summary.vitalsStatus}\n`;
      text += `😊 ${summary.wellnessStatus}\n`;
      text += `🍽️ ${summary.mealsStatus}\n`;
      if (summary.attentionCount > 0) {
        text += `⚠️ ${summary.attentionCount} item${summary.attentionCount > 1 ? 's' : ''} need attention\n`;
      }
      if (summary.nextAppointment) {
        text += `📅 ${summary.nextAppointment}\n`;
      }
      text += `\n---\n🔒 CONFIDENTIAL — This is a redacted summary from EmberMate.\nFor full details, request the complete Care Brief from the caregiver.`;

      await Share.share({ message: text, title: 'Care Brief Summary' });
      logAuditEvent(AuditEventType.CARE_BRIEF_SHARED, 'Care Brief shared via text (redacted)', AuditSeverity.WARNING, { format: 'text', redacted: true });
    } catch (error) {
      logError('ShareActions.doShare', error);
    } finally {
      setSharing(false);
    }
  };

  const confirmExport = () => {
    Alert.alert(
      'Export Full Care Brief?',
      'This will open the full Care Brief with sensitive health information including medications, vitals, and medical conditions. Ensure the recipient is authorized to receive this information.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Export',
          onPress: () => {
            logAuditEvent(AuditEventType.CARE_BRIEF_EXPORTED, 'Care Brief exported as PDF', AuditSeverity.WARNING, { format: 'pdf' });
            onExport?.();
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.primaryButton}
        onPress={confirmShare}
        activeOpacity={0.7}
        disabled={sharing}
        accessibilityLabel="Share redacted summary"
        accessibilityRole="button"
        accessibilityState={{ disabled: sharing }}
      >
        {sharing ? (
          <ActivityIndicator size="small" color={Colors.accent} />
        ) : (
          <Text style={styles.primaryButtonText}>{'\uD83D\uDCE4'} Share Summary (Redacted)</Text>
        )}
      </TouchableOpacity>

      {onExport && (
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={confirmExport}
          activeOpacity={0.7}
          accessibilityLabel="Export full care brief"
          accessibilityRole="button"
        >
          <Text style={styles.secondaryButtonText}>{'\uD83D\uDCCB'} Export Full Care Brief</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  primaryButton: {
    backgroundColor: Colors.sageBorder,
    borderWidth: 1,
    borderColor: Colors.accentBorder,
    borderRadius: BorderRadius.lg,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.accent,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.glassActive,
    borderRadius: BorderRadius.lg,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
});
