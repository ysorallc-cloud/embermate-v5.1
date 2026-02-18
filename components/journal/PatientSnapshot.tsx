// ============================================================================
// PATIENT SNAPSHOT
// Compact patient info card at the top of the Care Brief
// ============================================================================

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, BorderRadius } from '../../theme/theme-tokens';

interface PatientSnapshotProps {
  name: string;
  relationship?: string;
  dateOfBirth?: string;
  gender?: string;
  bloodType?: string;
  conditions?: string[];
  allergies?: string[];
  mobilityStatus?: string;
  cognitiveBaseline?: string;
}

function computeAge(dob: string): string | null {
  try {
    const birth = new Date(dob);
    if (isNaN(birth.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return `${age}y`;
  } catch {
    return null;
  }
}

export function PatientSnapshot({
  name,
  relationship,
  dateOfBirth,
  gender,
  bloodType,
  conditions,
  allergies,
  mobilityStatus,
  cognitiveBaseline,
}: PatientSnapshotProps) {
  const age = dateOfBirth ? computeAge(dateOfBirth) : null;
  const infoParts: string[] = [];
  if (age) infoParts.push(age);
  if (gender) infoParts.push(gender);
  if (bloodType) infoParts.push(bloodType);

  return (
    <View style={styles.container} accessibilityLabel={`Patient: ${name}`}>
      <View style={styles.nameRow}>
        <Text style={styles.name}>{name}</Text>
        {relationship && <Text style={styles.relationship}>{relationship}</Text>}
      </View>

      {infoParts.length > 0 && (
        <Text style={styles.infoLine}>{infoParts.join(' \u00B7 ')}</Text>
      )}

      {conditions && conditions.length > 0 && (
        <View style={styles.tagsRow}>
          {conditions.map((c, i) => (
            <View key={i} style={styles.conditionTag}>
              <Text style={styles.conditionText}>{c}</Text>
            </View>
          ))}
        </View>
      )}

      {allergies && allergies.length > 0 && (
        <View style={styles.allergyRow}>
          <Text style={styles.allergyLabel}>Allergies:</Text>
          <Text style={styles.allergyText}>{allergies.join(', ')}</Text>
        </View>
      )}

      {(mobilityStatus || cognitiveBaseline) && (
        <View style={styles.clinicalRow}>
          {mobilityStatus && (
            <Text style={styles.clinicalText}>Mobility: {mobilityStatus}</Text>
          )}
          {cognitiveBaseline && (
            <Text style={styles.clinicalText}>Cognitive: {cognitiveBaseline}</Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.glassHover,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.sm,
    marginBottom: 4,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  relationship: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  infoLine: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: Spacing.sm,
  },
  conditionTag: {
    backgroundColor: Colors.accentLight,
    borderWidth: 1,
    borderColor: Colors.accentBorder,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  conditionText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.accent,
  },
  allergyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(248, 113, 113, 0.08)',
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  allergyLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.redBright,
  },
  allergyText: {
    fontSize: 12,
    color: Colors.redBright,
    flex: 1,
  },
  clinicalRow: {
    gap: 4,
  },
  clinicalText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
});
