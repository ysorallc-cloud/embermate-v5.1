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

import React, { useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, Switch, StyleSheet } from 'react-native';
import { navigate } from '../../../lib/navigate';
import { useTheme } from '../../../contexts/ThemeContext';
import { useCarePlanConfig } from '../../../hooks/useCarePlanConfig';
import type { TimeOfDay } from '../../../types/carePlanConfig';

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
          {medications.map((med) => {
            const tods = (med.timesOfDay ?? [])
              .map((t: TimeOfDay) => MEDS_TIME_LABEL[t] ?? t)
              .join(' · ');
            return (
              <View
                key={med.id}
                style={[styles.row, !med.active && styles.rowInactive]}
              >
                <TouchableOpacity
                  style={styles.rowMain}
                  onPress={() => navigate(`/medication-form?id=${med.id}&source=careplan`)}
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
                  onValueChange={(v) => handleToggleActive(med.id, v)}
                  trackColor={{ false: colors.glassStrong, true: colors.accent }}
                  thumbColor={med.active ? colors.textPrimary : colors.switchThumbOff}
                  ios_backgroundColor={colors.glassStrong}
                  accessibilityLabel={`${med.name} ${med.active ? 'active' : 'paused'}`}
                  accessibilityRole="switch"
                  accessibilityState={{ checked: med.active }}
                />
              </View>
            );
          })}
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
  row: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: c.glassFaint,
    borderRadius: 8,
    marginBottom: 4,
    gap: 12,
  },
  rowInactive: {
    opacity: 0.5,
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
