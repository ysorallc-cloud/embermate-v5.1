// ============================================================================
// SHARE SHEET — Phase 15.11 (label fix in 15.11.1)
//
// Single action sheet that exposes the three Insights share
// destinations (Visit prep summary / Care report / Medication
// report). Replaces the three stacked reportCards on Insights
// with a single Share CTA + this sheet.
//
// Phase 15.11.1 — dropped "(PDF)" from the Care report label.
// Share.share only sends plain text; the parenthetical promised
// something the implementation does not deliver. Real PDF
// generation is filed for Phase 21 alongside the BP averaging
// fix — truth-in-labeling matters. When the PDF actually ships,
// the label can return.
//
// Pre-15.11 each option lived in its own reportCard with its own
// "Share" button. The triple-stack read like a checklist; only
// one of the three is ever picked per surface visit. 15.11
// collapses the surface to one CTA + this sheet.
//
// Modal pattern mirrors SkipReasonSheet.tsx (the established
// Charcoal Ink bottom-sheet primitive): Modal animationType=slide
// + transparent overlay TouchableOpacity wrapping a sheet
// container with a handle bar.
//
// onSelect is invoked with the chosen ShareOption before onClose,
// so the parent's routing handler runs against a still-mounted
// sheet (less likely to race against subsequent state updates).
// Tapping the overlay calls onClose without onSelect — the escape
// hatch.
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

export type ShareOption = 'visit-prep' | 'care-report' | 'medication-report';

interface ShareOptionConfig {
  key: ShareOption;
  testID: string;
  label: string;
  helper: string;
  icon: string;
}

const OPTIONS: ShareOptionConfig[] = [
  {
    key: 'visit-prep',
    testID: 'share-option-visit-prep',
    label: 'Visit prep summary',
    helper: 'Bring this to the next appointment.',
    icon: '🩺',
  },
  {
    key: 'care-report',
    testID: 'share-option-care-report',
    label: 'Care report',
    helper: 'Full PDF with trends and patterns.',
    icon: '📋',
  },
  {
    key: 'medication-report',
    testID: 'share-option-medication-report',
    label: 'Medication report',
    helper: 'Adherence history and side effects.',
    icon: '💊',
  },
];

export interface ShareSheetProps {
  visible: boolean;
  onSelect: (option: ShareOption) => void;
  onClose: () => void;
}

export function ShareSheet({ visible, onSelect, onClose }: ShareSheetProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const handlePick = (opt: ShareOption) => {
    onSelect(opt);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <TouchableOpacity
        testID="share-sheet-overlay"
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close share menu"
      >
        <TouchableOpacity
          style={styles.sheet}
          activeOpacity={1}
          accessibilityRole="none"
          accessibilityLabel="Share options"
        >
          <View style={styles.handle} />
          <Text style={styles.title}>{'Share'}</Text>
          <Text style={styles.subtitle}>{'Pick what to send.'}</Text>

          {OPTIONS.map((opt, i) => {
            const isLast = i === OPTIONS.length - 1;
            return (
              <TouchableOpacity
                key={opt.key}
                testID={opt.testID}
                style={[styles.optionRow, !isLast && styles.optionDivider]}
                onPress={() => handlePick(opt.key)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`${opt.label}: ${opt.helper}`}
              >
                <Text style={styles.optionIcon}>{opt.icon}</Text>
                <View style={styles.optionTextBlock}>
                  <Text style={styles.optionLabel}>{opt.label}</Text>
                  <Text style={styles.optionHelper}>{opt.helper}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
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
    paddingBottom: 40, // allow: bottom inset for safe-area on devices without home indicator
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: c.glassBorder,
    alignSelf: 'center',
    marginBottom: 14, // allow: off-scale gap (intentional)
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
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14, // allow: tap-target padding (Apple HIG ≥44pt)
    paddingHorizontal: 4,
  },
  optionDivider: {
    borderBottomWidth: 0.5,
    borderBottomColor: c.glassBorder,
  },
  optionIcon: {
    fontSize: 22,
  },
  optionTextBlock: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: c.textPrimary,
  },
  optionHelper: {
    fontSize: 12,
    color: c.textSecondary,
    marginTop: 2,
  },
});

export default ShareSheet;
