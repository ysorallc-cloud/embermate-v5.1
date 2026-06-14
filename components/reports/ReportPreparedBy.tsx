// ============================================================================
// ReportPreparedBy — "Prepared by {caregiverName}" line for the care report.
//
// now-rebuild report-completeness card: the report loaded the caregiver
// name but never displayed it, so a shared report read as anonymous. This
// small presentational line surfaces who prepared it. Rendered once in the
// report header area so it applies to every scope (Today / Handoff /
// VisitPrep / Full). Hidden when no name is set (clean fallback — never a
// blank or "Prepared by undefined").
// ============================================================================

import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

export interface ReportPreparedByProps {
  caregiverName?: string | null;
}

export function ReportPreparedBy({ caregiverName }: ReportPreparedByProps) {
  const { colors } = useTheme();
  const name = (caregiverName ?? '').trim();
  if (name.length === 0) return null;
  return (
    <Text style={[styles.line, { color: colors.textSecondary }]} accessibilityRole="text">
      {`Prepared by ${name}`}
    </Text>
  );
}

const styles = StyleSheet.create({
  line: {
    fontSize: 12,
    marginBottom: 8,
  },
});

export default ReportPreparedBy;
