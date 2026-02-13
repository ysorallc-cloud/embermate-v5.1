// ============================================================================
// HandoffCard — Today's Summary snapshot for the Journal tab
// Vertical status lines layout — only shows rows with data
// ============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { navigate } from '../../lib/navigate';
import { Colors, Spacing, BorderRadius } from '../../theme/theme-tokens';
import { buildTodaySummary, TodaySummary } from '../../utils/careSummaryBuilder';
import { useDataListener } from '../../lib/events';
import { logError } from '../../utils/devLog';

// ============================================================================
// TYPES
// ============================================================================

interface StatusLine {
  emoji: string;
  label: string;
  value: string;
  flagged?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function HandoffCard() {
  const router = useRouter();
  const [summary, setSummary] = useState<TodaySummary | null>(null);

  const loadSummary = useCallback(async () => {
    try {
      const data = await buildTodaySummary();
      setSummary(data);
    } catch (error) {
      logError('HandoffCard.loadSummary', error);
    }
  }, []);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  // Refresh when any data changes
  useDataListener(
    useCallback(() => {
      loadSummary();
    }, [loadSummary])
  );

  if (!summary) return null;

  const {
    medsAdherence, vitalsReading, mealsStatus, moodArc,
    orientation, painLevel, appetite,
    overdueItems, flaggedItems, nextAppointment,
  } = summary;

  // Build status lines — only include rows with data
  const lines: StatusLine[] = [];

  // Meds: always show (even 0/0)
  const hasMedFlag = medsAdherence.taken < medsAdherence.total;
  lines.push({
    emoji: '\u{1F48A}',
    label: 'Meds',
    value: `${medsAdherence.taken} of ${medsAdherence.total} taken`,
    flagged: hasMedFlag,
  });

  // Vitals
  if (vitalsReading) {
    lines.push({ emoji: '\u{1F4CA}', label: 'Vitals', value: vitalsReading });
  }

  // Meals
  if (mealsStatus) {
    let value = `${mealsStatus.logged} of ${mealsStatus.total}`;
    if (mealsStatus.overdueNames.length > 0) {
      value += ` (${mealsStatus.overdueNames[0]} overdue)`;
    }
    lines.push({
      emoji: '\u{1F37D}\uFE0F',
      label: 'Meals',
      value,
      flagged: mealsStatus.overdueNames.length > 0,
    });
  }

  // Mood arc
  if (moodArc) {
    lines.push({ emoji: '\u{1F60A}', label: 'Mood', value: moodArc });
  }

  // Orientation
  if (orientation) {
    const orientationFlagged = orientation !== 'Alert & Oriented';
    lines.push({ emoji: '\u{1F9E0}', label: 'Orientation', value: orientation, flagged: orientationFlagged });
  }

  // Pain
  if (painLevel) {
    lines.push({ emoji: '\u{1FA7A}', label: 'Pain', value: painLevel, flagged: painLevel === 'Severe' });
  }

  // Appetite
  if (appetite) {
    const appetiteFlagged = appetite === 'Poor' || appetite === 'Refused';
    lines.push({ emoji: '\u{1F372}', label: 'Appetite', value: appetite, flagged: appetiteFlagged });
  }

  const formatAppointmentDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerLabel}>TODAY'S SUMMARY</Text>
        <TouchableOpacity
          onPress={() => navigate('/care-summary-export')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Share care summary"
          accessibilityRole="button"
        >
          <Text style={styles.shareText}>Share {'\u2197'}</Text>
        </TouchableOpacity>
      </View>

      {/* Vertical Status Lines */}
      <View style={styles.statusList}>
        {lines.map((line) => (
          <View key={line.label} style={styles.statusRow}>
            <Text style={styles.statusEmoji}>{line.emoji}</Text>
            <Text style={styles.statusLabel}>{line.label}:</Text>
            <Text style={[styles.statusValue, line.flagged && styles.statusValueFlagged]}>
              {line.value}
            </Text>
          </View>
        ))}
      </View>

      {/* Next Appointment */}
      {nextAppointment && (
        <View style={styles.appointmentRow}>
          <Text style={styles.appointmentLabel}>NEXT APPT</Text>
          <Text style={styles.appointmentValue}>
            {nextAppointment.provider} ({nextAppointment.specialty}) &mdash;{' '}
            {formatAppointmentDate(nextAppointment.date)}
          </Text>
        </View>
      )}

      {/* Overdue + Flagged Items */}
      {(overdueItems.length > 0 || flaggedItems.length > 0) && (
        <View style={styles.flaggedRow}>
          {overdueItems.map((item, i) => (
            <View key={`overdue-${i}`} style={styles.flagPill}>
              <Text style={styles.flagPillText}>{item} overdue</Text>
            </View>
          ))}
          {flaggedItems.map((item, i) => (
            <View key={`flag-${i}`} style={styles.flagPill}>
              <Text style={styles.flagPillText}>{item}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Footer Link */}
      <TouchableOpacity
        style={styles.footerLink}
        onPress={() => navigate('/care-brief')}
        activeOpacity={0.7}
        accessibilityLabel="View full care brief"
        accessibilityRole="link"
      >
        <Text style={styles.footerLinkText}>View Full Brief &rarr;</Text>
      </TouchableOpacity>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.glassHover,
    borderWidth: 1,
    borderColor: Colors.border,
    borderLeftWidth: 4,
    borderLeftColor: Colors.accentBorder,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  headerLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: Colors.textMuted,
  },
  shareText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.sageSoft,
  },

  // Vertical status lines
  statusList: {
    marginBottom: Spacing.md,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  statusEmoji: {
    fontSize: 15,
    width: 24,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginRight: 6,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textPrimary,
    flex: 1,
  },
  statusValueFlagged: {
    color: Colors.amber,
  },

  // Appointment row
  appointmentRow: {
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  appointmentLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: Colors.textMuted,
    marginBottom: 2,
  },
  appointmentValue: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
  },

  // Flagged items
  flaggedRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  flagPill: {
    backgroundColor: Colors.amberLight,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  flagPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.amber,
  },

  // Footer link
  footerLink: {
    marginTop: Spacing.sm,
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  footerLinkText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.sageSoft,
  },
});
