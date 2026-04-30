// ============================================================================
// SKIP REASON SHEET
//
// Long-press menu for the InlineCheckbox. Surfaces three reasons (refused,
// too soon, other) and an "Add details instead" tertiary that pivots the
// caregiver into the full detail-entry sheet without committing a skip.
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
import type { SkipReason } from '../../types/carePlan';

export interface SkipReasonSheetProps {
  visible: boolean;
  itemName: string;
  onSelectReason: (reason: SkipReason) => void;
  onAddDetails: () => void;
  onClose: () => void;
}

const REASONS: Array<{
  reason: SkipReason;
  label: string;
  helper: string;
  testID: string;
}> = [
  {
    reason: 'refused',
    label: 'Refused',
    helper: 'They didn’t want to take it.',
    testID: 'skip-reason-refused',
  },
  {
    reason: 'too-soon',
    label: 'Too soon',
    helper: 'Already taken or scheduled too close together.',
    testID: 'skip-reason-too-soon',
  },
  {
    reason: 'other',
    label: 'Other',
    helper: 'Skipped for another reason.',
    testID: 'skip-reason-other',
  },
];

export function SkipReasonSheet({
  visible,
  itemName,
  onSelectReason,
  onAddDetails,
  onClose,
}: SkipReasonSheetProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

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
        accessibilityLabel="Close skip menu"
      >
        <TouchableOpacity
          style={styles.sheet}
          activeOpacity={1}
          accessibilityRole="none"
          accessibilityLabel={`Skip options for ${itemName}`}
        >
          <View style={styles.handle} />
          <Text style={styles.title}>{itemName}</Text>
          <Text style={styles.subtitle}>{'Why are you skipping this?'}</Text>

          {REASONS.map((opt, i) => {
            const isLast = i === REASONS.length - 1;
            return (
              <TouchableOpacity
                key={opt.reason}
                testID={opt.testID}
                style={[styles.reasonRow, !isLast && styles.reasonDivider]}
                onPress={() => onSelectReason(opt.reason)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`${opt.label}: ${opt.helper}`}
              >
                <Text style={styles.reasonLabel}>{opt.label}</Text>
                <Text style={styles.reasonHelper}>{opt.helper}</Text>
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity
            testID="skip-add-details"
            style={styles.tertiary}
            onPress={onAddDetails}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Add details instead of skipping"
          >
            <Text style={styles.tertiaryText}>{'+ Add details instead'}</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const createStyles = (c: any) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: c.overlay || 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: (c as any).menuSurface || c.glass,
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
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: c.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: c.textSecondary,
    marginBottom: 12,
  },
  reasonRow: {
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  reasonDivider: {
    borderBottomWidth: 0.5,
    borderBottomColor: c.glassBorder,
  },
  reasonLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: c.textPrimary,
  },
  reasonHelper: {
    fontSize: 12,
    color: c.textSecondary,
    marginTop: 2,
  },
  tertiary: {
    marginTop: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tertiaryText: {
    fontSize: 14,
    color: c.accent,
    fontWeight: '500',
  },
});

export default SkipReasonSheet;
