// ============================================================================
// JOURNAL DISCLAIMER — Phase 5.12.i.
//
// Layer 1 legal hygiene: a persistent, never-dismissable line at the
// very bottom of the Journal page. Visible on every state — populated
// today, empty today, past day. Calm type, textTertiary, italic. Must
// not compete with the care narrative.
//
// Layer 2 (the auto-gen marker on NarrativeSnapshot when the snapshot
// is auto-generated) is implemented in 5.12.c — both layers coexist.
// ============================================================================

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

export function JournalDisclaimer() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View>
      <Text style={styles.text}>
        {'Journal is your record, generated from logs you’ve entered. Not a medical record. Cross-reference with your loved one’s medical history.'}
      </Text>
    </View>
  );
}

const createStyles = (c: any) =>
  StyleSheet.create({
    text: {
      fontSize: 9.5,
      color: c.textTertiary,
      fontStyle: 'italic' as const,
      textAlign: 'center' as const,
      lineHeight: 15,
      paddingVertical: 16, // allow: legal-footer breathing room
      paddingHorizontal: 14, // allow: page-rhythm horizontal inset
    },
  });

export default JournalDisclaimer;
