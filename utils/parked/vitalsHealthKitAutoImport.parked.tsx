// ============================================================================
// PARKED — Vitals HealthKit Auto-Import (extracted from app/care-plan/vitals.tsx
// during Phase 32A F13 subscreen retirement). NOT CURRENTLY MOUNTED ANYWHERE.
//
// TS-CHECK: this file is in tsconfig's `exclude` (utils/parked/**) so its
// references to retired modules (e.g. ../../services/healthDataProvider,
// removed at F13) don't pollute the production tsc gate. The whole
// `utils/parked/` directory carries the same policy. When this code is
// re-attached for v1.1 (HealthKit Auto-Import re-introduction), pull it
// out of utils/parked/, restore the missing imports, and let tsc
// re-include it from its new home.
//
// Per the P3 lock (Phase 32A audit): the vitals subscreen retired in F13
// to be replaced by the inline VitalsDrawer (chips + frequency +
// reminders). The drawer scope does NOT include HealthKit Auto-Import.
// The HealthKit code path here is preserved so v1.1 can re-attach
// without re-deriving the detection + UI block from git history.
//
// Original location: app/care-plan/vitals.tsx (file deleted in F13).
// Original behavior:
//   • const [healthKitAvailable, setHealthKitAvailable] = useState(false);
//   • useEffect(() => {
//       getHealthDataProvider().isAvailable().then(setHealthKitAvailable);
//     }, []);
//   • Render block (when healthKitAvailable && enabled):
//       <View style={styles.sectionHeader}>
//         <Text style={styles.sectionLabel}>Auto-Import</Text>
//       </View>
//       <View style={styles.autoImportCard}>
//         <Text style={styles.autoImportDesc}>
//           Import vitals automatically from Apple Health. Data stays on
//           your device.
//         </Text>
//         {VITAL_TYPE_OPTIONS.filter(v => vitalTypes.includes(v.value)).map(v => (
//           <View key={v.value} style={styles.autoImportRow}>
//             <Text style={styles.autoImportLabel}>{v.emoji} {v.label}</Text>
//             <Text style={styles.autoImportStatus}>Manual only</Text>
//           </View>
//         ))}
//       </View>
//
// V1.1 RE-ATTACH NOTES:
//   • Mount inside VitalsDrawer (components/careplan/drawers/VitalsDrawer.tsx)
//     after the HOW OFTEN segmented control, gated on healthKitAvailable
//     && config.enabled (config.enabled is already true if the drawer is
//     mounted, so the gate collapses to just healthKitAvailable).
//   • The styles (sectionHeader/sectionLabel/autoImportCard/autoImportRow/
//     autoImportLabel/autoImportStatus) need to be re-derived from
//     VitalsDrawer's createStyles — the originals are gone with the
//     subscreen.
//   • All current rows show "Manual only" — there's no actual import
//     wiring yet. v1.1 should either wire the import (call into
//     getHealthDataProvider().query()) or update the copy.
// ============================================================================

import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { VITAL_TYPE_OPTIONS, type VitalType } from '../../types/carePlanConfig';
import { getHealthDataProvider } from '../../services/healthDataProvider';

export interface ParkedVitalsHealthKitAutoImportProps {
  vitalTypes: VitalType[];
}

/**
 * PARKED component. Not currently mounted. See file header for the v1.1
 * re-attach path. Kept here so the HealthKit detection + UI block stays
 * in source rather than relying on git archaeology.
 */
export function ParkedVitalsHealthKitAutoImport({ vitalTypes }: ParkedVitalsHealthKitAutoImportProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [healthKitAvailable, setHealthKitAvailable] = useState(false);

  useEffect(() => {
    getHealthDataProvider().isAvailable().then(setHealthKitAvailable);
  }, []);

  if (!healthKitAvailable) return null;

  return (
    <>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionLabel}>Auto-Import</Text>
      </View>
      <View style={styles.autoImportCard}>
        <Text style={styles.autoImportDesc}>
          Import vitals automatically from Apple Health. Data stays on your device.
        </Text>
        {VITAL_TYPE_OPTIONS.filter((v) => vitalTypes.includes(v.value)).map((vital) => (
          <View key={vital.value} style={styles.autoImportRow}>
            <Text style={styles.autoImportLabel}>{vital.emoji} {vital.label}</Text>
            <Text style={styles.autoImportStatus}>Manual only</Text>
          </View>
        ))}
      </View>
    </>
  );
}

const createStyles = (c: any) => StyleSheet.create({
  sectionHeader: {
    marginTop: 12,
    marginBottom: 6,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: c.textTertiary,
    letterSpacing: 1.5,
    textTransform: 'uppercase' as const,
  },
  autoImportCard: {
    backgroundColor: c.glassFaint,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  autoImportDesc: {
    fontSize: 12,
    color: c.textSecondary,
    marginBottom: 8,
  },
  autoImportRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingVertical: 4,
  },
  autoImportLabel: {
    fontSize: 12,
    color: c.textPrimary,
  },
  autoImportStatus: {
    fontSize: 11,
    color: c.textTertiary,
    fontStyle: 'italic' as const,
  },
});

export default ParkedVitalsHealthKitAutoImport;
