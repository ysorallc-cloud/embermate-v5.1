// ============================================================================
// NARRATIVE SNAPSHOT — Phase 5.12.c, extended in Phase 11.8.1.
//
// The page's heart. Sits below the Journal header, above the events
// timeline. Surfaces either the caregiver-authored handoff tone (verbatim,
// no auto-gen disclaimer) or the auto-recap (with disclaimer + Edit
// affordance).
//
// Phase 11.8.1 — when isToday is true and no caregiver tone exists,
// the auto-recap fallback uses buildTodayRecap (value-based:
// "BP 132/82 · HR 76", "Morning check — good mood") instead of
// buildDayNarrative's count-based output. Past-day rendering keeps
// the count-based path so existing narrative tests stay green.
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
import { buildTodayRecap, TodayRecap } from '../../utils/todayRecapBuilder';
import { logError } from '../../utils/devLog';

interface NarrativeSnapshotProps {
  dateKey: string; // YYYY-MM-DD
  onEditPress?: () => void;
  /** Phase 11.8.1 — when true, the auto-recap fallback uses
   *  buildTodayRecap (value-based) instead of buildDayNarrative
   *  (count-based). Caller passes true for today, false for past. */
  isToday?: boolean;
}

export function NarrativeSnapshot({
  dateKey,
  onEditPress,
  isToday = false,
}: NarrativeSnapshotProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [tone, setTone] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [recap, setRecap] = useState<TodayRecap | null>(null);
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
          setRecap(null);
        } else {
          setTone(null);
          if (isToday) {
            // Phase 11.8.1 — value-based recap on the Today path.
            const today = await buildTodayRecap(dateKey);
            if (cancelled) return;
            setRecap(today.hasData ? today : null);
            setSummary(null);
          } else {
            // Past days keep the count-based factual narrative.
            const narrative = await buildDayNarrative(dateKey, { factualOnly: true });
            if (cancelled) return;
            setSummary(narrative.hasData ? narrative.summary : null);
            setRecap(null);
          }
        }
      } catch (err) {
        logError('NarrativeSnapshot.load', err);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, [dateKey, isToday]);

  if (!loaded) return null;

  // Resolution: tone (verbatim) → today recap (value-based) → past
  // narrative summary → nothing.
  if (!tone && !recap && !summary) return null;

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
        {tone ? (
          <Text style={styles.snapshotText}>{tone}</Text>
        ) : recap ? (
          // Phase 11.8.1 — value-based recap rendered as one line per
          // section. testID enables the audit/integration tests at
          // Stage 11.8.5 to verify the per-itemType ordering.
          recap.sections.map((s) => (
            <Text
              key={s.itemType}
              style={styles.recapLine}
              testID={`today-recap-${s.itemType}`}
            >
              <Text style={styles.recapLabel}>{s.label}: </Text>
              {s.text}
            </Text>
          ))
        ) : (
          <Text style={styles.snapshotText}>{summary}</Text>
        )}

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
    // Phase 11.8.1 — value-based recap line. One per section,
    // stacked. Roman (not italic) so the values read as fact, not
    // narrative; the italic Georgia treatment stays for tone-only.
    recapLine: {
      fontFamily: 'Georgia',
      fontSize: 14,
      lineHeight: 22,
      color: c.textPrimary,
      marginBottom: 4,
    },
    recapLabel: {
      fontWeight: '600' as const,
      color: c.textSecondary,
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
