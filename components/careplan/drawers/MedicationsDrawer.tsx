// ============================================================================
// MEDICATIONS DRAWER — Phase 32A.1 F2
//
// Extracted from the F4 inline list (app/care-plan/index.tsx) into its
// own component, matching the 7-other-drawers pattern from Slice B of
// 32A. Like WellnessDrawer (which bridges to useWellnessSettings),
// MedicationsDrawer self-manages its data via useCarePlanConfig rather
// than receiving raw config + onUpdate props — the per-med data shape
// is richer than a single bucket config, and we want a single source
// of truth for the add/update/toggle/swipe flows.
//
// F2 scope:
//   - Per-med row with name + dosage + time + (optional) instructions.
//   - Per-row Switch (active toggle) — flips med.active without
//     destroying the record (Q-32A.1.5 lock; preserves history).
//   - Inactive meds STAY in the list with visual de-emphasis (pause is
//     visible, not vanished). The F4 active-only filter is dropped here
//     for that reason.
//   - Tap-to-edit routes to /medication-form?id=…&source=careplan.
//   - "+ Add medication" routes to /medication-form?source=careplan
//     (quick-add-behind-button comes in F4).
//   - Empty state copy from F4 preserved.
//
// F3 lands swipe-to-remove (port from subscreen — soft-delete via
// `updateMedication(id, { active: false })`, NOT hard-delete).
// F4 lands the quick-add-behind-button mini-form.
// ============================================================================

import React, { useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Switch,
  StyleSheet,
  Animated,
  PanResponder,
  Alert,
} from 'react-native';
import { navigate } from '../../../lib/navigate';
import { useTheme } from '../../../contexts/ThemeContext';
import { useCarePlanConfig } from '../../../hooks/useCarePlanConfig';
import type { TimeOfDay, MedicationPlanItem } from '../../../types/carePlanConfig';

// Phase 32A.1 F2 — TimeOfDay label map. Mirrors the F4 inline-list map
// (kept verbatim so the labels stay consistent with /medication-form
// and the meds subscreen the drawer replaces).
const MEDS_TIME_LABEL: Record<string, string> = {
  morning: 'Morning',
  midday: 'Midday',
  evening: 'Evening',
  night: 'Night',
  custom: 'Custom',
};

// Phase 32A.1 F3 — swipe-to-Remove gesture mechanics.
// Width of the Remove action behind the swipeable row. Matches the
// subscreen's REMOVE_ACTION_WIDTH (80pt — Apple HIG tap target).
const REMOVE_ACTION_WIDTH = 80; // allow: gesture reveal width (Apple HIG ≥44pt tap target)

// ============================================================================
// PER-ROW COMPONENT — owns its own PanResponder + animated translateX so
// each row's swipe state is isolated.
// ============================================================================

interface MedRowProps {
  med: MedicationPlanItem;
  onToggleActive: (medId: string, active: boolean) => void;
  onRemove: (med: MedicationPlanItem) => void;
}

function MedRow({ med, onToggleActive, onRemove }: MedRowProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const tods = (med.timesOfDay ?? [])
    .map((t: TimeOfDay) => MEDS_TIME_LABEL[t] ?? t)
    .join(' · ');

  const translateX = useRef(new Animated.Value(0)).current;
  const isRevealed = useRef(false);

  const snapTo = useCallback(
    (x: number, revealed: boolean) => {
      isRevealed.current = revealed;
      Animated.spring(translateX, {
        toValue: x,
        useNativeDriver: true,
        bounciness: 4,
      }).start();
    },
    [translateX],
  );

  const close = useCallback(() => snapTo(0, false), [snapTo]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 8 && Math.abs(g.dy) < 10,
      onPanResponderMove: (_, g) => {
        const base = isRevealed.current ? -REMOVE_ACTION_WIDTH : 0;
        const next = Math.min(0, Math.max(-REMOVE_ACTION_WIDTH, base + g.dx));
        translateX.setValue(next);
      },
      onPanResponderRelease: (_, g) => {
        const base = isRevealed.current ? -REMOVE_ACTION_WIDTH : 0;
        const final = base + g.dx;
        if (final < -REMOVE_ACTION_WIDTH / 2) {
          snapTo(-REMOVE_ACTION_WIDTH, true);
        } else {
          snapTo(0, false);
        }
      },
      onPanResponderTerminate: () => snapTo(0, false),
    }),
  ).current;

  const handleRemovePress = useCallback(() => {
    // Phase 32A.1 F3 — confirmation dialog before the soft-delete
    // write. NOT swipe-to-instant-delete; the tap on the labeled
    // Remove button only opens the Alert, and the Alert's "Remove"
    // button is what fires updateMedication({ active: false }).
    // Q-32A.1 lock — preserve history (NO removeMedication call).
    Alert.alert(
      `Remove ${med.name}?`,
      "We'll mark this medication paused. Your history stays so past handoffs still show it.",
      [
        { text: 'Cancel', style: 'cancel', onPress: close },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            close();
            onRemove(med);
          },
        },
      ],
    );
  }, [med, close, onRemove]);

  return (
    <View style={[styles.rowOuter, !med.active && styles.rowInactive]}>
      {/* Remove action revealed behind the row when swiped left. */}
      <View style={styles.removeAction} pointerEvents="box-none">
        <TouchableOpacity
          style={styles.removeActionButton}
          onPress={handleRemovePress}
          accessibilityLabel={`Remove ${med.name}`}
          accessibilityRole="button"
        >
          <Text style={styles.removeActionLabel}>Remove</Text>
        </TouchableOpacity>
      </View>

      <Animated.View
        style={[styles.rowSwipeable, { transform: [{ translateX }] }]}
        {...panResponder.panHandlers}
      >
        <View style={styles.row}>
          <TouchableOpacity
            style={styles.rowMain}
            onPress={() => {
              if (isRevealed.current) {
                close();
              } else {
                navigate(`/medication-form?id=${med.id}&source=careplan`);
              }
            }}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`Edit ${med.name}, ${med.dosage}${tods ? `, ${tods}` : ''}`}
          >
            <View style={styles.rowInfo}>
              <Text style={[styles.rowName, !med.active && styles.rowNameInactive]}>
                {med.name}
              </Text>
              <Text style={styles.rowDetail}>
                {med.dosage}{tods ? ` · ${tods}` : ''}
              </Text>
              {med.instructions ? (
                <Text style={styles.rowInstructions} numberOfLines={1}>
                  {med.instructions}
                </Text>
              ) : null}
            </View>
          </TouchableOpacity>
          <Switch
            value={med.active}
            onValueChange={(v) => onToggleActive(med.id, v)}
            trackColor={{ false: colors.glassStrong, true: colors.accent }}
            thumbColor={med.active ? colors.textPrimary : colors.switchThumbOff}
            ios_backgroundColor={colors.glassStrong}
            accessibilityLabel={`${med.name} ${med.active ? 'active' : 'paused'}`}
            accessibilityRole="switch"
            accessibilityState={{ checked: med.active }}
          />
        </View>
      </Animated.View>
    </View>
  );
}

export function MedicationsDrawer() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { config, updateMedication } = useCarePlanConfig();
  const medications = config?.meds?.medications ?? [];

  const handleToggleActive = useCallback(
    async (medId: string, active: boolean) => {
      if (updateMedication) {
        await updateMedication(medId, { active });
      }
    },
    [updateMedication],
  );

  // Phase 32A.1 F3 — soft-delete via the swipe-to-Remove path. NOT a
  // removeMedication call; preserves the med record in storage so
  // past handoffs and visit-prep history keep it. Functionally
  // identical to flipping the Switch off, but reached via the
  // deliberate swipe + confirmation gesture path.
  const handleRemove = useCallback(
    async (med: MedicationPlanItem) => {
      if (updateMedication) {
        await updateMedication(med.id, { active: false });
      }
    },
    [updateMedication],
  );

  return (
    <View testID="meds-inline-list" style={styles.list}>
      {medications.length === 0 ? (
        <TouchableOpacity
          style={styles.addRow}
          onPress={() => navigate('/medication-form?source=careplan')}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="No meds added yet. Add medication."
        >
          <Text style={styles.emptyText}>No meds added yet</Text>
          <Text style={styles.addCta}>{'+ Add medication'}</Text>
        </TouchableOpacity>
      ) : (
        <>
          {medications.map((med) => (
            <MedRow
              key={med.id}
              med={med}
              onToggleActive={handleToggleActive}
              onRemove={handleRemove}
            />
          ))}
          <TouchableOpacity
            style={styles.addRow}
            onPress={() => navigate('/medication-form?source=careplan')}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Add medication"
          >
            <Text style={styles.addCta}>{'+ Add medication'}</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const createStyles = (c: any) => StyleSheet.create({
  list: {
    marginTop: -2,
    marginBottom: 8,
    marginHorizontal: 4,
    paddingHorizontal: 14, // allow: drawer body padding (Apple HIG ≥44pt tap target)
  },
  // Phase 32A.1 F3 — outer container per row. Holds the swipeable
  // foreground + the Remove action revealed behind it. Marked
  // inactive at the outer level so the de-emphasis applies to the
  // whole row (including the Remove zone if it gets revealed for a
  // paused med — rare but possible).
  rowOuter: {
    position: 'relative' as const,
    marginBottom: 4,
    borderRadius: 8,
    overflow: 'hidden' as const,
  },
  rowInactive: {
    opacity: 0.5,
  },
  // Remove action revealed behind the foreground when swiped left.
  // Absolute positioned at the right; the foreground translates left
  // to expose it.
  removeAction: {
    position: 'absolute' as const,
    top: 0,
    right: 0,
    bottom: 0,
    width: 80, // allow: gesture reveal width — matches REMOVE_ACTION_WIDTH constant
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    backgroundColor: c.criticalAlert ?? c.error ?? '#e6776e',
  },
  removeActionButton: {
    width: '100%' as const,
    height: '100%' as const,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  removeActionLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    // Phase 26 F4 precedent: near-black for text on sage/lavender/
    // coral colored-fill surfaces. Coral Remove background +
    // near-black label reads cleanly without violating the Phase 33
    // hardcoded-white-text contract (noHardcodedWhiteText33).
    color: '#0a0c0a',
  },
  // Foreground row — swipeable; PanResponder translateX moves this.
  // Opaque background so the Remove action stays hidden until swipe.
  rowSwipeable: {
    backgroundColor: c.glass,
    borderRadius: 8,
  },
  row: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: c.glassFaint,
    borderRadius: 8,
    gap: 12,
  },
  rowMain: {
    flex: 1,
  },
  rowInfo: {
    flex: 1,
  },
  rowName: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: c.textPrimary,
  },
  rowNameInactive: {
    color: c.textSecondary,
  },
  rowDetail: {
    marginTop: 2,
    fontSize: 12,
    color: c.textSecondary,
  },
  rowInstructions: {
    marginTop: 2,
    fontSize: 11,
    color: c.textTertiary,
    fontStyle: 'italic' as const,
  },
  addRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingVertical: 10,
    paddingHorizontal: 12, // allow: tap-target padding (Apple HIG ≥44pt)
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderStyle: 'dashed' as const,
    borderColor: c.glassBorder,
    borderRadius: 8,
    marginTop: 2,
    gap: 12,
  },
  addCta: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: c.accent,
  },
  emptyText: {
    fontSize: 13,
    color: c.textSecondary,
    flex: 1,
  },
});

export default MedicationsDrawer;
