// ============================================================================
// CAREGIVER NOTES BLOCK — Phase 16.2
//
// Four-section input block on the Visit Prep flow, surfaced ONLY when
// an appointmentId is in scope. Each saved value persists per
// appointment via visitPrepCaregiverNotesRepo (safeStorage-routed,
// auto-encrypted for the health-sensitive key prefix).
//
// Caregiver-driven only:
//   • No imports from log aggregators, insight engines, symptom-change
//     detectors, functional-issue extractors, or reflection storage.
//     The block reads/writes only its own repo.
//   • No suggested values, no placeholder hints that look like
//     pre-filled content.
//   • All 10 fields optional. Empty fields persist as empty (the
//     caregiver may save partial state at any time).
//
// Witness voice on labels — observational, never interpretive. Plain
// English on the daily-activities prompt: no clinical terminology of
// any kind. The block test enforces this with a source-level audit
// against a list of clinical acronyms and phrases the spec rules
// out; this comment intentionally avoids reproducing those tokens.
//
// Read-only after the visit date passes — fields render as
// editable={false} once `appt.date` is in the past, freezing the
// block as a historical record of what the caregiver brought.
// ============================================================================

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { getAppointment } from '../../utils/appointmentStorage';
import {
  EMPTY_CAREGIVER_NOTES,
  getCaregiverNotes,
  saveCaregiverNotes,
  type VisitPrepCaregiverNotes,
} from '../../storage/visitPrepCaregiverNotesRepo';

export interface CaregiverNotesBlockProps {
  appointmentId: string;
}

type Triple = readonly [string, string, string];

function setTripleAt(t: Triple, i: 0 | 1 | 2, value: string): [string, string, string] {
  return [
    i === 0 ? value : t[0],
    i === 1 ? value : t[1],
    i === 2 ? value : t[2],
  ];
}

export function CaregiverNotesBlock({ appointmentId }: CaregiverNotesBlockProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [notes, setNotes] = useState<VisitPrepCaregiverNotes>(EMPTY_CAREGIVER_NOTES);
  const [isPastVisit, setIsPastVisit] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const loaded = await getCaregiverNotes(appointmentId);
      if (!cancelled) setNotes(loaded);
      try {
        const appt = await getAppointment(appointmentId);
        if (cancelled) return;
        if (appt?.date) {
          // "Visit date passes" means strictly before today by
          // calendar date. Same-day stays editable so a caregiver
          // mid-appointment can keep editing. We compare YYYY-MM-DD
          // strings rather than timestamps to avoid timezone /
          // grace-window edge cases.
          const apptDay = new Date(appt.date).toISOString().slice(0, 10);
          const todayDay = new Date().toISOString().slice(0, 10);
          setIsPastVisit(apptDay < todayDay);
        }
      } catch {
        // Treat lookup failure as "not past" — keep editable rather
        // than locking the block by default.
      }
    })();
    return () => { cancelled = true; };
  }, [appointmentId]);

  const persist = useCallback((next: VisitPrepCaregiverNotes) => {
    setNotes(next);
    saveCaregiverNotes(appointmentId, next);
  }, [appointmentId]);

  const editable = !isPastVisit;

  const renderTripleSection = (
    sectionTitle: string,
    category: 'symptoms' | 'functional' | 'questions',
    values: Triple,
    onChange: (i: 0 | 1 | 2, value: string) => void,
  ) => (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{sectionTitle}</Text>
      {[0, 1, 2].map((i) => (
        <TextInput
          key={i}
          testID={`caregiver-notes-${category}-${i}`}
          style={[styles.input, !editable && styles.inputReadOnly]}
          value={values[i as 0 | 1 | 2]}
          onChangeText={(t) => onChange(i as 0 | 1 | 2, t)}
          editable={editable}
          maxLength={200}
          placeholderTextColor={colors.textTertiary}
          accessibilityLabel={`${sectionTitle}, entry ${i + 1}`}
        />
      ))}
    </View>
  );

  return (
    <View style={styles.block}>
      {renderTripleSection(
        '3 symptoms that changed since last visit',
        'symptoms',
        notes.symptomsChanged,
        (i, t) => persist({ ...notes, symptomsChanged: setTripleAt(notes.symptomsChanged, i, t) }),
      )}

      {renderTripleSection(
        '3 functional issues to mention (mobility, appetite, mood)',
        'functional',
        notes.functionalChanges,
        (i, t) => persist({ ...notes, functionalChanges: setTripleAt(notes.functionalChanges, i, t) }),
      )}

      {renderTripleSection(
        '3 questions or concerns for the provider',
        'questions',
        notes.questionsForProvider,
        (i, t) => persist({ ...notes, questionsForProvider: setTripleAt(notes.questionsForProvider, i, t) }),
      )}

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>
          {'What kinds of help did you provide this week?'}
        </Text>
        <TextInput
          testID="caregiver-notes-help-provided"
          style={[styles.input, styles.inputMultiline, !editable && styles.inputReadOnly]}
          value={notes.helpProvidedThisWeek}
          onChangeText={(t) => persist({ ...notes, helpProvidedThisWeek: t })}
          editable={editable}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          maxLength={1000}
          placeholderTextColor={colors.textTertiary}
          accessibilityLabel="What kinds of help did you provide this week?"
        />
        <Text style={styles.helperText}>
          {'For example: shopping, rides, meals, bills, bathing, dressing, coordinating with others. In your own words.'}
        </Text>
      </View>
    </View>
  );
}

const createStyles = (c: any) => StyleSheet.create({
  block: {
    marginTop: 16, // allow: off-scale gap (intentional)
    marginBottom: 8,
  },
  section: {
    marginBottom: 14, // allow: off-scale gap (intentional)
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: c.textWarmMuted || c.textSecondary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: c.warmSurface || c.glass,
    borderWidth: 1,
    borderColor: c.warmSurfaceBorder || c.glassBorder,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: c.textWarmPrimary || c.textPrimary,
    marginBottom: 6,
  },
  inputMultiline: {
    minHeight: 88,
  },
  inputReadOnly: {
    opacity: 0.7,
  },
  helperText: {
    fontSize: 11,
    color: c.textTertiary,
    fontStyle: 'italic',
    marginTop: 4,
    lineHeight: 16,
  },
});

export default CaregiverNotesBlock;
