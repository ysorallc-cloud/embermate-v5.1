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

import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Switch,
  StyleSheet,
  Animated,
  PanResponder,
  Alert,
  ScrollView,
} from 'react-native';
import { navigate } from '../../../lib/navigate';
import { useTheme } from '../../../contexts/ThemeContext';
import { useCarePlanConfig } from '../../../hooks/useCarePlanConfig';
import type { TimeOfDay, MedicationPlanItem } from '../../../types/carePlanConfig';
import { COMMON_MEDICATIONS } from '../../medication/medicationFormHelpers';
import { emitDataUpdate } from '../../../lib/events';
import { EVENT } from '../../../lib/eventNames';

// Phase 32A.1 F4 — quick-add time slot options. Maps to TimeOfDay
// canonical values + a default HH:mm time for each slot. Same shape
// the subscreen's QuickAddPanel used; preserves the "common-med
// inline add without /medication-form roundtrip" UX.
const QUICK_ADD_TIME_SLOTS: { value: TimeOfDay; label: string; time: string }[] = [
  { value: 'morning', label: 'Morning', time: '08:00' },
  { value: 'midday',  label: 'Midday',  time: '13:00' },
  { value: 'evening', label: 'Evening', time: '18:00' },
  { value: 'night',   label: 'Night',   time: '22:00' },
];

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
  // Phase 32A.1 F6 — when editMode is true, the row renders a
  // leading remove-control (iOS-style minus circle). Tapping it
  // fires the SAME Alert + soft-delete flow the swipe-revealed
  // Remove button uses. Edit mode is the discoverable entry point;
  // swipe is the power-user shortcut underneath.
  editMode: boolean;
}

function MedRow({ med, onToggleActive, onRemove, editMode }: MedRowProps) {
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
          {/* Phase 32A.1 F6 — discoverable Edit-mode minus-circle.
              Renders ONLY when editMode is true. Tap fires the same
              handleRemovePress that the swipe-revealed Remove button
              uses — single soft-delete path, no duplicated write.
              iOS-style minus circle on the leading edge per the
              user-locked "iOS list pattern" rationale (audience
              skews older / less app-fluent; hidden gestures fail). */}
          {editMode && (
            <TouchableOpacity
              style={styles.editMinus}
              onPress={handleRemovePress}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${med.name}`}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.editMinusGlyph}>−</Text>
            </TouchableOpacity>
          )}
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

// ============================================================================
// QUICK-ADD INLINE — Phase 32A.1 F4
// Reveal-on-tap mini-form behind the "+ Add medication" button. Keeps
// the drawer compact in the dominant case (reading meds, not adding)
// while preserving the "common-med inline add without /medication-form
// roundtrip" UX from the retired subscreen's QuickAddPanel.
// ============================================================================

interface QuickAddInlineProps {
  onSubmit: (med: { name: string; dosage: string; timeSlot: TimeOfDay; time: string }) => Promise<void> | void;
  onClose: () => void;
}

function QuickAddInline({ onSubmit, onClose }: QuickAddInlineProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [selectedMed, setSelectedMed] = useState<typeof COMMON_MEDICATIONS[0] | null>(null);
  const [selectedDosage, setSelectedDosage] = useState<string>('');
  const [selectedSlot, setSelectedSlot] = useState<TimeOfDay>('morning');
  const [showMedDropdown, setShowMedDropdown] = useState(false);
  const [showDosageDropdown, setShowDosageDropdown] = useState(false);

  const slotMeta = QUICK_ADD_TIME_SLOTS.find((s) => s.value === selectedSlot)!;
  const canSubmit = !!selectedMed && selectedDosage.trim().length > 0;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || !selectedMed) return;
    await onSubmit({
      name: selectedMed.name,
      dosage: selectedDosage,
      timeSlot: selectedSlot,
      time: slotMeta.time,
    });
    setSelectedMed(null);
    setSelectedDosage('');
    setSelectedSlot('morning');
  }, [canSubmit, selectedMed, selectedDosage, selectedSlot, slotMeta.time, onSubmit]);

  return (
    <View style={styles.quickAdd}>
      <View style={styles.quickAddHeader}>
        <Text style={styles.quickAddTitle}>Quick add</Text>
        <TouchableOpacity
          onPress={() => navigate('/medication-form?source=careplan')}
          accessibilityRole="button"
          accessibilityLabel="Open full medication form"
        >
          <Text style={styles.quickAddFullFormLink}>Full form {'→'}</Text>
        </TouchableOpacity>
      </View>

      {/* Medication picker */}
      <View style={{ zIndex: 30, marginBottom: 8 }}>
        <TouchableOpacity
          style={[styles.quickAddDropdown, showMedDropdown && styles.quickAddDropdownOpen]}
          onPress={() => {
            setShowMedDropdown((v) => !v);
            setShowDosageDropdown(false);
          }}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={selectedMed ? `Selected: ${selectedMed.name}. Tap to change.` : 'Select medication'}
        >
          <Text
            style={[
              styles.quickAddDropdownText,
              !selectedMed && styles.quickAddDropdownPlaceholder,
            ]}
            numberOfLines={1}
          >
            {selectedMed?.name ?? 'Select medication...'}
          </Text>
          <Text style={styles.quickAddDropdownArrow}>{showMedDropdown ? '▲' : '▼'}</Text>
        </TouchableOpacity>
        {showMedDropdown && (
          <ScrollView style={styles.quickAddDropdownList} nestedScrollEnabled>
            {COMMON_MEDICATIONS.map((med) => (
              <TouchableOpacity
                key={med.name}
                style={styles.quickAddDropdownItem}
                onPress={() => {
                  setSelectedMed(med);
                  setSelectedDosage(med.commonDosages[0] ?? '');
                  setShowMedDropdown(false);
                }}
                accessibilityRole="button"
                accessibilityLabel={`Select ${med.name}`}
              >
                <Text style={styles.quickAddDropdownItemText}>{med.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Dosage picker — only when a med is selected */}
      {selectedMed && (
        <View style={{ zIndex: 20, marginBottom: 8 }}>
          <TouchableOpacity
            style={[styles.quickAddDropdown, showDosageDropdown && styles.quickAddDropdownOpen]}
            onPress={() => setShowDosageDropdown((v) => !v)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={selectedDosage ? `Dosage ${selectedDosage}. Tap to change.` : 'Select dosage'}
          >
            <Text
              style={[
                styles.quickAddDropdownText,
                !selectedDosage && styles.quickAddDropdownPlaceholder,
              ]}
              numberOfLines={1}
            >
              {selectedDosage || 'Select dosage...'}
            </Text>
            <Text style={styles.quickAddDropdownArrow}>{showDosageDropdown ? '▲' : '▼'}</Text>
          </TouchableOpacity>
          {showDosageDropdown && (
            <View style={styles.quickAddDropdownList}>
              {selectedMed.commonDosages.map((dose) => (
                <TouchableOpacity
                  key={dose}
                  style={styles.quickAddDropdownItem}
                  onPress={() => {
                    setSelectedDosage(dose);
                    setShowDosageDropdown(false);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Select dosage ${dose}`}
                >
                  <Text style={styles.quickAddDropdownItemText}>{dose}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Time slot chips */}
      <View style={styles.quickAddSlotRow}>
        {QUICK_ADD_TIME_SLOTS.map((slot) => {
          const isSelected = selectedSlot === slot.value;
          return (
            <TouchableOpacity
              key={slot.value}
              style={[styles.quickAddSlot, isSelected && styles.quickAddSlotSelected]}
              onPress={() => setSelectedSlot(slot.value)}
              activeOpacity={0.7}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={slot.label}
            >
              <Text
                style={[
                  styles.quickAddSlotLabel,
                  isSelected && styles.quickAddSlotLabelSelected,
                ]}
              >
                {slot.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Submit + Cancel */}
      <View style={styles.quickAddButtonRow}>
        <TouchableOpacity
          style={styles.quickAddCancel}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Cancel quick add"
        >
          <Text style={styles.quickAddCancelLabel}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.quickAddSubmit, !canSubmit && styles.quickAddSubmitDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit}
          accessibilityRole="button"
          accessibilityLabel="Add medication"
          accessibilityState={{ disabled: !canSubmit }}
        >
          <Text
            style={[
              styles.quickAddSubmitLabel,
              !canSubmit && styles.quickAddSubmitLabelDisabled,
            ]}
          >
            Add
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

interface MedicationsDrawerProps {
  // Phase 32A.1 F8 — editMode LIFTED from drawer-local state up to
  // app/care-plan/index.tsx (the meds header row owns the Edit toggle
  // now). Drawer just reads the prop and threads it to MedRow so each
  // row's leading minus-circle stays in sync with the header toggle.
  editMode: boolean;
}

export function MedicationsDrawer({ editMode }: MedicationsDrawerProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { config, updateMedication, addMedication } = useCarePlanConfig();
  const medications = config?.meds?.medications ?? [];
  const [quickAddOpen, setQuickAddOpen] = useState<boolean>(false);
  const [toastVisible, setToastVisible] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>('');

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

  const handleQuickAdd = useCallback(
    async (entry: { name: string; dosage: string; timeSlot: TimeOfDay; time: string }) => {
      try {
        if (addMedication) {
          await addMedication({
            name: entry.name,
            dosage: entry.dosage,
            timesOfDay: [entry.timeSlot],
            customTimes: [entry.time],
            scheduledTimeHHmm: entry.time,
            active: true,
            notificationsEnabled: true,
          } as Partial<MedicationPlanItem>);
        }
        emitDataUpdate(EVENT.MEDICATION);
        emitDataUpdate(EVENT.CARE_PLAN_ITEMS);
        emitDataUpdate(EVENT.DAILY_INSTANCES);
        setToastMessage(`${entry.name} ${entry.dosage} added!`);
        setToastVisible(true);
        setTimeout(() => setToastVisible(false), 2500);
        setQuickAddOpen(false);
      } catch (err) {
        Alert.alert('Could not add medication', 'Please try again.');
      }
    },
    [addMedication],
  );

  return (
    <View testID="meds-inline-list" style={styles.list}>
      {/* Phase 32A.1 F8 — Edit / Done toggle moved to the meds header
          row in app/care-plan/index.tsx (right-aligned, same line as
          the caret). The drawer reads editMode from props and threads
          it to each MedRow for the leading minus-circle. Visual fix:
          the in-drawer Edit row created a gap between header and list
          that read as two zones; the new placement keeps meds tucked
          directly under the header as one contained unit. */}
      {medications.length === 0 && !quickAddOpen ? (
        <TouchableOpacity
          style={styles.addRow}
          onPress={() => setQuickAddOpen(true)}
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
              editMode={editMode}
            />
          ))}
          {quickAddOpen ? (
            <QuickAddInline
              onSubmit={handleQuickAdd}
              onClose={() => setQuickAddOpen(false)}
            />
          ) : (
            <TouchableOpacity
              style={styles.addRow}
              onPress={() => setQuickAddOpen(true)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Add medication"
            >
              <Text style={styles.addCta}>{'+ Add medication'}</Text>
            </TouchableOpacity>
          )}
        </>
      )}

      {/* Confirmation toast (post-quick-add) */}
      {toastVisible && (
        <View style={styles.toast} accessibilityLiveRegion="polite">
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
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

  // Phase 32A.1 F8 — Edit / Done toggle styles retired from the
  // drawer (moved to app/care-plan/index.tsx where the header row
  // owns the toggle now). The minus-circle styles below stay — each
  // row still renders the leading remove control when editMode prop
  // is true; only the Edit toggle moved.
  // Phase 32A.1 F6 — leading minus-circle revealed on each row when
  // editMode is true. iOS-style coral circle with a minus glyph.
  // Sized for the ≥44pt tap target via hitSlop on the TouchableOpacity.
  editMinus: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: c.criticalAlert ?? c.error ?? '#e6776e',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginRight: 4,
  },
  editMinusGlyph: {
    fontSize: 18,
    fontWeight: '700' as const,
    // Phase 26 F4 precedent — near-black text on coral fill avoids
    // the noHardcodedWhiteText33 audit (same rule as the swipe-
    // revealed Remove label).
    color: '#0a0c0a',
    lineHeight: 20,
  },

  // Phase 32A.1 F4 — quick-add inline panel revealed when the user
  // taps "+ Add medication". Mini-form: med picker + dosage picker
  // + time-slot chips + submit + cancel + "Full form →" escape.
  // Reveal-on-tap keeps the drawer compact in the dominant (reading)
  // case.
  quickAdd: {
    marginTop: 4,
    padding: 12, // allow: tap-target padding (Apple HIG ≥44pt)
    backgroundColor: c.glassFaint,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: c.glassBorder,
  },
  quickAddHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 8,
  },
  quickAddTitle: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: c.textTertiary,
    letterSpacing: 1.5,
    textTransform: 'uppercase' as const,
  },
  quickAddFullFormLink: {
    fontSize: 12,
    color: c.accent,
    fontWeight: '500' as const,
  },
  quickAddDropdown: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingVertical: 8,
    paddingHorizontal: 10, // allow: tap-target padding (Apple HIG ≥44pt)
    borderRadius: 6,
    borderWidth: 1,
    borderColor: c.glassBorder,
    backgroundColor: c.glass,
  },
  quickAddDropdownOpen: {
    borderColor: c.accent,
  },
  quickAddDropdownText: {
    fontSize: 13,
    color: c.textPrimary,
    flex: 1,
  },
  quickAddDropdownPlaceholder: {
    color: c.textTertiary,
  },
  quickAddDropdownArrow: {
    fontSize: 10,
    color: c.textSecondary,
    marginLeft: 8,
  },
  quickAddDropdownList: {
    maxHeight: 180,
    marginTop: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: c.glassBorder,
    backgroundColor: c.glass,
  },
  quickAddDropdownItem: {
    paddingVertical: 8,
    paddingHorizontal: 10, // allow: tap-target padding (Apple HIG ≥44pt)
  },
  quickAddDropdownItemText: {
    fontSize: 13,
    color: c.textPrimary,
  },
  quickAddSlotRow: {
    flexDirection: 'row' as const,
    gap: 6,
    marginBottom: 10,
  },
  quickAddSlot: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center' as const,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: c.glassBorder,
    backgroundColor: c.glass,
  },
  quickAddSlotSelected: {
    borderColor: c.accent,
    backgroundColor: c.accentDim,
  },
  quickAddSlotLabel: {
    fontSize: 11,
    color: c.textSecondary,
  },
  quickAddSlotLabelSelected: {
    color: c.accent,
    fontWeight: '500' as const,
  },
  quickAddButtonRow: {
    flexDirection: 'row' as const,
    justifyContent: 'flex-end' as const,
    gap: 8,
  },
  quickAddCancel: {
    paddingVertical: 8,
    paddingHorizontal: 14, // allow: tap-target padding (Apple HIG ≥44pt)
    borderRadius: 6,
  },
  quickAddCancelLabel: {
    fontSize: 13,
    color: c.textSecondary,
  },
  quickAddSubmit: {
    paddingVertical: 8,
    paddingHorizontal: 14, // allow: tap-target padding (Apple HIG ≥44pt)
    borderRadius: 6,
    backgroundColor: c.accent,
  },
  quickAddSubmitDisabled: {
    backgroundColor: c.glassStrong,
    opacity: 0.6,
  },
  quickAddSubmitLabel: {
    // Phase 26 F4 precedent: near-black for text on sage colored-fill
    // surface (button accent is sage). Avoids the
    // noHardcodedWhiteText33 audit and reads cleanly.
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#0a0c0a',
  },
  quickAddSubmitLabelDisabled: {
    color: c.textTertiary,
  },

  // Confirmation toast — surfaces after a quick-add succeeds. Fades
  // automatically after 2.5s via setTimeout in the parent.
  toast: {
    position: 'absolute' as const,
    bottom: 16,
    left: 16,
    right: 16,
    paddingVertical: 10,
    paddingHorizontal: 14, // allow: tap-target padding (Apple HIG ≥44pt)
    backgroundColor: c.accent,
    borderRadius: 8,
    alignItems: 'center' as const,
  },
  toastText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: '#0a0c0a',
  },
});

export default MedicationsDrawer;
