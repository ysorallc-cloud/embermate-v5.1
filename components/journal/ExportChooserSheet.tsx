// ============================================================================
// EXPORT CHOOSER SHEET — Phase 5.7.b
//
// Bottom sheet that disambiguates the Journal "Share" pill into two
// destinations:
//   • Today's handoff — sage card, primary. Opens existing HandoffSheet
//     via the parent's onChooseHandoff callback.
//   • Visit prep      — lavender card. Routes to /visit-prep via the
//     parent's onChooseVisitPrep callback.
//
// Cancel/backdrop dismissal closes without firing either destination.
// ============================================================================

import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Spacing, Sizing } from '../../theme/theme-tokens';

export interface ExportChooserSheetProps {
  visible: boolean;
  onClose: () => void;
  onChooseHandoff: () => void;
  onChooseVisitPrep: () => void;
  /** Patient name interpolated into the Today's handoff audience subtitle.
   *  Phase 5.10.c — falls back to "your loved one" when missing/empty. */
  patientName?: string;
}

export function ExportChooserSheet({
  visible,
  onClose,
  onChooseHandoff,
  onChooseVisitPrep,
  patientName,
}: ExportChooserSheetProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const trimmedName = (patientName ?? '').trim();
  const audienceName = trimmedName.length > 0 ? trimmedName : 'your loved one';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close share chooser"
      >
        <TouchableOpacity
          activeOpacity={1}
          style={styles.sheet}
          accessibilityRole="none"
          accessibilityLabel="Share chooser sheet"
        >
          <View style={styles.handle} />
          <Text style={styles.title}>{'Share what?'}</Text>
          <Text style={styles.subtitle}>
            {'Pick what kind of summary you need.'}
          </Text>

          <TouchableOpacity
            style={styles.handoffCard}
            onPress={onChooseHandoff}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Today's handoff"
            accessibilityHint={`For someone who knows ${audienceName}`}
          >
            <Text style={styles.handoffGlyph}>{'✨'}</Text>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>{"Today's handoff"}</Text>
              {/* Phase 5.10.c — audience-explicit subtitle. */}
              <Text style={styles.handoffAudience}>
                {`For someone who knows ${audienceName}.`}
              </Text>
              <Text style={styles.cardDesc}>
                {`What state ${audienceName} is in right now. What's done, what's pending, what to watch.`}
              </Text>
              <Text style={styles.handoffMeta}>{'~5-second read · plain text'}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.visitPrepCard}
            onPress={onChooseVisitPrep}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Visit prep"
            accessibilityHint="For the doctor's office"
          >
            <Text style={styles.visitPrepGlyph}>{'📋'}</Text>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>{'Visit prep'}</Text>
              {/* Phase 5.10.c — audience-explicit subtitle. */}
              <Text style={styles.visitPrepAudience}>
                {"For the doctor's office."}
              </Text>
              <Text style={styles.cardDesc}>
                {'Trends over a window you choose. Adherence, vitals, patterns, red flags.'}
              </Text>
              <Text style={styles.visitPrepMeta}>{'PDF · 1-2 pages'}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelLink}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Cancel"
          >
            <Text style={styles.cancelText}>{'Cancel'}</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const createStyles = (c: any) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: c.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: c.menuSurface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: c.glassBorder,
    alignSelf: 'center',
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: c.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: c.textSecondary,
    marginBottom: Spacing.md,
  },
  // Sage primary card — Today's handoff. Border weight 0.6 (slightly
  // heavier than secondary visitPrepCard's 0.5) marks it as primary
  // without escalating to a fill.
  handoffCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: c.accentFaint,
    borderWidth: 0.6,
    borderColor: c.accentBorder,
    borderRadius: Sizing.cardRadius,
    padding: Sizing.cardInternalPadding,
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  // Lavender secondary card — Visit prep. caregiverAccent* family,
  // matching JournalPatternLink and EndOfShiftCard.
  visitPrepCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: c.caregiverAccentBg,
    borderWidth: 0.5,
    borderColor: c.caregiverAccentBorder,
    borderRadius: Sizing.cardRadius,
    padding: Sizing.cardInternalPadding,
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  handoffGlyph: {
    fontSize: 16,
    color: c.accent,
  },
  visitPrepGlyph: {
    fontSize: 16,
  },
  cardBody: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: c.textPrimary,
    marginBottom: 2,
  },
  // Phase 5.10.c — audience-explicit subtitle, slightly muted, family
  // color (sage / lavender) for at-a-glance audience differentiation.
  handoffAudience: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: c.accent,
    opacity: 0.75,
    marginBottom: 4,
  },
  visitPrepAudience: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: c.caregiverAccent,
    opacity: 0.75,
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 12,
    color: c.textSecondary,
    lineHeight: 17,
    marginBottom: 4,
  },
  handoffMeta: {
    fontSize: 11,
    color: c.accent,
    fontWeight: '500' as const,
  },
  visitPrepMeta: {
    fontSize: 11,
    color: c.caregiverAccent,
    fontWeight: '500' as const,
  },
  cancelLink: {
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 13,
    color: c.textTertiary,
  },
});

export default ExportChooserSheet;
