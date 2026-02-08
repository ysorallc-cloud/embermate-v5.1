// ============================================================================
// HandoffCard — Today's Summary snapshot for the Journal tab
// ============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Spacing, BorderRadius } from '../../theme/theme-tokens';
import { buildTodaySummary, TodaySummary } from '../../utils/careSummaryBuilder';
import { useDataListener } from '../../lib/events';

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
      console.error('Error loading care summary:', error);
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

  const { medsAdherence, orientation, painLevel, appetite, alertness, flaggedItems, nextAppointment } =
    summary;

  const hasMedFlag = medsAdherence.taken < medsAdherence.total;
  const hasPainFlag = painLevel === 'Severe';
  const hasAppetiteFlag = appetite === 'Poor' || appetite === 'Refused';

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
          onPress={() => router.push('/care-summary-export' as any)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Share care summary"
          accessibilityRole="button"
        >
          <Text style={styles.shareIcon}>{'\u{1F4E4}'}</Text>
        </TouchableOpacity>
      </View>

      {/* 2x2 Metrics Grid */}
      <View style={styles.grid}>
        <View style={styles.cell}>
          <Text style={styles.cellLabel}>MEDS</Text>
          <Text style={[styles.cellValue, hasMedFlag && styles.cellValueFlagged]}>
            {medsAdherence.taken}/{medsAdherence.total}
          </Text>
        </View>
        <View style={styles.cell}>
          <Text style={styles.cellLabel}>ORIENTATION</Text>
          <Text style={styles.cellValue}>{orientation ?? '\u2014'}</Text>
        </View>
        <View style={styles.cell}>
          <Text style={styles.cellLabel}>PAIN</Text>
          <Text style={[styles.cellValue, hasPainFlag && styles.cellValueFlagged]}>
            {painLevel ?? '\u2014'}
          </Text>
        </View>
        <View style={styles.cell}>
          <Text style={styles.cellLabel}>APPETITE</Text>
          <Text style={[styles.cellValue, hasAppetiteFlag && styles.cellValueFlagged]}>
            {appetite ?? '\u2014'}
          </Text>
        </View>
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

      {/* Flagged Items */}
      {flaggedItems.length > 0 && (
        <View style={styles.flaggedRow}>
          {flaggedItems.map((item, i) => (
            <View key={i} style={styles.flagPill}>
              <Text style={styles.flagPillText}>{item}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Footer Link */}
      <TouchableOpacity
        style={styles.footerLink}
        onPress={() => router.push('/care-brief' as any)}
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
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
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
  shareIcon: {
    fontSize: 18,
    opacity: 0.6,
  },

  // 2x2 Grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: Spacing.md,
  },
  cell: {
    width: '50%',
    paddingVertical: Spacing.sm,
    paddingRight: Spacing.sm,
  },
  cellLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: Colors.textMuted,
    marginBottom: 2,
  },
  cellValue: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  cellValueFlagged: {
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
    color: 'rgba(94, 234, 212, 0.7)',
  },
});
