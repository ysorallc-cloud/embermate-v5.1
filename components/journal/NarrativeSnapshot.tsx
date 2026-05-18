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
import { SectionEyebrow } from '../SectionEyebrow';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Spacing, Fonts } from '../../theme/theme-tokens';
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
      {/* Phase 22.2 — uniform SectionEyebrow + section-color encoding.
          Sage tint (accent) signals "settled, factual baseline" per
          the section-color encoding for this content type. The
          hairline divider above auto-gates with the null-return path
          (no tone/recap/summary → no eyebrow + no divider). */}
      <View style={styles.sectionDivider} />
      <SectionEyebrow text="What happened" tint="accent" />
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
          // Phase 22.3 — value-based recap rendered as a labeled
          // two-column grid (was prose-with-inline-bold pre-22.3).
          // Each section becomes a row with a fixed-width label
          // column and a flex-1 value column that wraps to a second
          // line aligned to the value column start. No trailing
          // colon on the label (was prose punctuation); the column
          // layout makes the relationship visual. Display-layer
          // change only — todayRecapBuilder still emits the same
          // { label, text, itemType } shape.
          recap.sections.map((s) => (
            <View
              key={s.itemType}
              style={styles.recapRow}
              testID={`today-recap-${s.itemType}`}
            >
              <Text
                style={styles.recapLabel}
                testID={`today-recap-label-${s.itemType}`}
              >
                {s.label}
              </Text>
              <Text
                style={styles.recapValue}
                testID={`today-recap-value-${s.itemType}`}
              >
                {s.text}
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.snapshotText}>{summary}</Text>
        )}

        {/* Phase 22.1 — inline auto-gen footnote + inline edit-link
            affordance retired. The Journal page reads as a handoff
            document; tone editing lives on the canonical HandoffSheet
            surface, still reachable via the sticky share-handoff
            button at the bottom of the page. The TouchableOpacity
            wrapper stays so the onEditPress contract works for callers
            that still invoke HandoffSheet from the snapshot tap. */}
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
    // Phase 22.2 — hairline divider above the section, matches the
    // 15.12 Insights pattern.
    sectionDivider: {
      height: 1,
      backgroundColor: 'rgba(255,255,255,0.04)',
      marginVertical: Spacing.md,
      marginHorizontal: -16,
    },
    snapshotText: {
      fontFamily: Fonts.serifItalic,
      fontStyle: 'italic' as const,
      fontSize: 14,
      lineHeight: 22,
      color: c.textPrimary,
    },
    // Phase 22.3 — labeled two-column grid for the recap. Row =
    // flexDirection: row + alignItems: flex-start (so the value's
    // second wrapped line aligns with its first line, not the
    // label). Label has a fixed width sized to fit "Vitals 1:40p"
    // on iPhone SE (smallest target width). Value flex-1 so RN
    // line-wraps inside the value column rather than back to the
    // row start. Roman (not italic) on values — facts, not
    // narrative; italic Georgia stays on the tone-only path.
    recapRow: {
      flexDirection: 'row' as const,
      alignItems: 'flex-start' as const,
      marginBottom: 10, // allow: gridded row rhythm (22.3 layout target ~10-12pt)
      gap: 10, // allow: column gutter between label and value
    },
    recapLabel: {
      width: 96, // allow: fixed label-column width (22.3 layout)
      // Phase 33 F7 (Lock B) — Source Serif 4 SemiBold preserves the
      // pre-Phase-33 Georgia + fontWeight 600 visual register. RN does
      // not auto-select weights among loaded font faces; the 600 weight
      // is carried by the font-face name itself (SourceSerif4_600SemiBold
      // via Fonts.serifSemiBold). The prior fontWeight: '600' declaration
      // becomes dead code and is removed.
      fontFamily: Fonts.serifSemiBold,
      fontSize: 14,
      lineHeight: 22,
      color: c.textSecondary,
    },
    recapValue: {
      flex: 1,
      fontFamily: Fonts.serif,
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
