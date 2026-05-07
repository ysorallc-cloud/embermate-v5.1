// ============================================================================
// NARRATIVE SNAPSHOT — Phase 5.12.c.
//
// The page's heart. Sits below the Journal header, above the events
// timeline. Surfaces either the caregiver-authored handoff tone (verbatim,
// no auto-gen disclaimer) or the factual auto-recap from the narrative
// builder (with disclaimer + Edit affordance).
//
// Renders nothing when neither source has content. The empty-day
// composition (Phase 5.12.h) handles that case.
// ============================================================================

import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Spacing } from '../../theme/theme-tokens';
import { getHandoffTone } from '../../storage/handoffToneRepo';
import { buildDayNarrative } from '../../utils/narrativeSummaryBuilder';
import { logError } from '../../utils/devLog';

interface NarrativeSnapshotProps {
  dateKey: string; // YYYY-MM-DD
  onEditPress?: () => void;
}

export function NarrativeSnapshot({
  dateKey,
  onEditPress,
}: NarrativeSnapshotProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [tone, setTone] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const t = await getHandoffTone(dateKey);
        if (cancelled) return;
        const trimmed = t?.trim() ?? '';
        if (trimmed.length > 0) {
          setTone(trimmed);
          setSummary(null);
        } else {
          setTone(null);
          // Fall back to the factual auto-recap. factualOnly: true keeps
          // the prose interpretive-language-free per the 5.12 contract.
          const narrative = await buildDayNarrative(dateKey, { factualOnly: true });
          if (cancelled) return;
          setSummary(narrative.hasData ? narrative.summary : null);
        }
      } catch (err) {
        logError('NarrativeSnapshot.load', err);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, [dateKey]);

  if (!loaded) return null;
  const text = tone ?? summary;
  if (!text) return null;

  const isAutoGen = tone === null;

  return (
    <View style={styles.section}>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onEditPress}
        accessibilityRole="button"
        accessibilityLabel={
          isAutoGen
            ? 'Auto-generated narrative — tap to edit and add your tone'
            : 'Tap to edit the day’s tone'
        }
      >
        <Text style={styles.snapshotText}>{text}</Text>

        {isAutoGen && (
          <Text style={styles.autoGenMarker}>
            {'Auto-generated from your logs · Tap Edit to refine.'}
          </Text>
        )}

        <View style={styles.editRow}>
          <Text style={styles.editLink}>{'Edit →'}</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (c: any) =>
  StyleSheet.create({
    section: {
      marginVertical: Spacing.sm,
      paddingHorizontal: 2,
    },
    snapshotText: {
      fontFamily: 'Georgia',
      fontStyle: 'italic' as const,
      fontSize: 14,
      lineHeight: 22,
      color: c.textPrimary,
    },
    autoGenMarker: {
      fontSize: 9.5,
      color: c.textTertiary,
      fontStyle: 'italic' as const,
      paddingTop: 8,
      lineHeight: 13,
    },
    editRow: {
      alignItems: 'flex-end' as const,
      paddingTop: 6,
    },
    editLink: {
      fontSize: 10.5,
      color: c.caregiverAccent,
      fontWeight: '500' as const,
    },
  });

export default NarrativeSnapshot;
