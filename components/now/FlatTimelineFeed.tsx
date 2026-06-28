// ============================================================================
// FLAT TIMELINE FEED — F7 C6c-A (2026-06-12).
//
// Replaces the period-grouped TimelineSection with a flat chronological
// feed sorted by scheduledTime asc. The pre-F7 surface stacked items
// inside Morning / Afternoon / Evening / Night collapsible windows; the
// F7 spec retires that grouping in favour of a single time-ordered list
// with quiet band rows marking period transitions.
//
// LAYOUT
//   • Left rail (30px) — time labels right-aligned, 9px textMuted.
//   • Spine — 1px vertical line at left:32px (rgba(244,221,184,0.07)).
//   • Rows sorted by scheduledTime asc.
//   • Period bands inline at the first item of each period (display
//     only — no expand/collapse, not interactive).
//
// THREE ROW STATES
//   Done     — opacity 0.28, cream text, sage fill circle, NOT tappable.
//   Overdue  — coral card (bg 0.08, border 0.20, radius 9), coral
//              "OVERDUE · time" eyebrow, 28px coral ring, TAPPABLE.
//   Pending  — opacity 0.55, muted text, 28px faint ring, TAPPABLE.
//
// WHISPER LINE above the feed (italic-serif, muted, data-driven) — copy
// lives in utils/nowWhisper (composeNowWhisper), unit-tested:
//   All done    → "All done today."
//   Some overdue → "N overdue, M still ahead." / "N overdue." (no false
//                  "done" lead, no "0 still ahead")
//   Some pending → "N things still ahead."
//
// COMING UP dashed divider lands before the first non-Done, non-Overdue
// item (i.e., the first "future pending" row).
//
// Tap behaviour preserved — circle tap fires onItemPress (the parent's
// handleTimelineItemPress); a missed med routes to the log surface via
// the same handler. Done rows are not tappable.
// ============================================================================

import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Colors, Fonts } from '../../theme/theme-tokens';
import { isOverdue } from '../../utils/nowHelpers';
import { composeNowWhisper } from '../../utils/nowWhisper';
import { TypeScale } from '../../theme/spacing';

type RowStatus = 'done' | 'overdue' | 'pending';
type PeriodKey = 'morning' | 'afternoon' | 'evening' | 'night';

const PERIOD_META: Record<PeriodKey, { label: string; dot: string; emoji: string; startHour: number; endHour: number }> = {
  morning:   { label: 'MORNING',   dot: 'rgba(127, 184, 138, 0.45)', emoji: '☀',  startHour: 5,  endHour: 12 },
  afternoon: { label: 'AFTERNOON', dot: 'rgba(122, 112, 96, 0.40)',  emoji: '⛅', startHour: 12, endHour: 17 },
  evening:   { label: 'EVENING',   dot: 'rgba(212, 152, 72, 0.60)',  emoji: '🌙', startHour: 17, endHour: 21 },
  night:     { label: 'NIGHT',     dot: 'rgba(122, 112, 96, 0.40)',  emoji: '🌑', startHour: 21, endHour: 5  },
};

const COMING_UP = 'COMING UP';

function getHour(scheduledTime: string): number {
  if (!scheduledTime) return -1;
  let d = new Date(scheduledTime);
  if (isNaN(d.getTime()) && /^\d{2}:\d{2}/.test(scheduledTime)) {
    const today = new Date().toISOString().slice(0, 10);
    d = new Date(`${today}T${scheduledTime}:00`);
  }
  return isNaN(d.getTime()) ? -1 : d.getHours();
}

function periodForHour(h: number): PeriodKey {
  if (h >= 5 && h < 12) return 'morning';
  if (h >= 12 && h < 17) return 'afternoon';
  if (h >= 17 && h < 21) return 'evening';
  return 'night';
}

function parseTimeShort(scheduledTime: string): string | null {
  if (!scheduledTime) return null;
  let d = new Date(scheduledTime);
  if (isNaN(d.getTime()) && /^\d{2}:\d{2}/.test(scheduledTime)) {
    const today = new Date().toISOString().slice(0, 10);
    d = new Date(`${today}T${scheduledTime}:00`);
  }
  if (isNaN(d.getTime())) return null;
  const h = d.getHours();
  const m = d.getMinutes();
  const period = h >= 12 ? 'p' : 'a';
  const hour12 = ((h + 11) % 12) + 1;
  return m === 0 ? `${hour12}${period}` : `${hour12}:${String(m).padStart(2, '0')}${period}`;
}

function rowStatusOf(item: any): RowStatus {
  if (item.status === 'completed' || item.status === 'skipped') return 'done';
  if (item.status === 'missed') return 'overdue';
  if (item.status === 'pending' && isOverdue(item.scheduledTime)) return 'overdue';
  return 'pending';
}

// F7 fix (2026-06-13) — wellness rows display per-window names per the
// C6c-A rename. The underlying CarePlanItem.name is the generic
// 'Wellness check'; the per-instance display name is derived at render
// time from windowLabel so the timeline reads as
// "Morning Wellness Check-in" / "Evening Wellness Check-in" without
// requiring a storage migration. Other itemTypes fall through to the
// existing instance.itemName.
function displayNameFor(item: any): string {
  if (item.itemType === 'wellness') {
    const window = String(item.windowLabel ?? '').toLowerCase();
    if (window === 'morning') return 'Morning Wellness Check-in';
    if (window === 'evening') return 'Evening Wellness Check-in';
    if (window === 'afternoon') return 'Afternoon Wellness Check-in';
    if (window === 'night') return 'Night Wellness Check-in';
  }
  return item.itemName ?? '';
}

interface FlatItem {
  item: any;
  status: RowStatus;
  period: PeriodKey;
  hour: number;
  timeShort: string;
}

interface BandRow { kind: 'band'; period: PeriodKey; allDone: boolean; remaining: number; firstTime: string }
interface ComingUpRow { kind: 'coming-up' }
interface ItemRow { kind: 'item'; flat: FlatItem }
type Row = BandRow | ComingUpRow | ItemRow;

// whisper copy extracted to utils/nowWhisper (composeNowWhisper) — unit-tested.

export interface FlatTimelineFeedProps {
  allPending: any[];
  completed: any[];
  onItemPress: (item: any) => void;
}

export function FlatTimelineFeed({ allPending, completed, onItemPress }: FlatTimelineFeedProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const flats: FlatItem[] = useMemo(() => {
    const all = [...allPending, ...completed];
    return all
      .map((item) => {
        const hour = getHour(item.scheduledTime);
        return {
          item,
          status: rowStatusOf(item),
          period: periodForHour(hour),
          hour,
          timeShort: parseTimeShort(item.scheduledTime) ?? '',
        };
      })
      .sort((a, b) => a.hour - b.hour);
  }, [allPending, completed]);

  const whisper = useMemo(() => composeNowWhisper(flats), [flats]);

  const rows: Row[] = useMemo(() => {
    const out: Row[] = [];
    if (flats.length === 0) return out;

    // Per-period summary computed once for the band row.
    const periodSummary: Record<PeriodKey, { items: FlatItem[]; remaining: number; allDone: boolean; firstTime: string }> = {
      morning:   { items: [], remaining: 0, allDone: false, firstTime: '' },
      afternoon: { items: [], remaining: 0, allDone: false, firstTime: '' },
      evening:   { items: [], remaining: 0, allDone: false, firstTime: '' },
      night:     { items: [], remaining: 0, allDone: false, firstTime: '' },
    };
    for (const f of flats) {
      periodSummary[f.period].items.push(f);
    }
    for (const k of Object.keys(periodSummary) as PeriodKey[]) {
      const s = periodSummary[k];
      s.remaining = s.items.filter((f) => f.status !== 'done').length;
      s.allDone = s.items.length > 0 && s.remaining === 0;
      s.firstTime = s.items[0]?.timeShort ?? '';
    }

    // Walk sorted items, inject band at each period transition + a
    // single COMING UP divider before the first non-done/non-overdue
    // row.
    let currentPeriod: PeriodKey | null = null;
    let comingUpInserted = false;
    for (const f of flats) {
      if (f.period !== currentPeriod) {
        out.push({
          kind: 'band',
          period: f.period,
          allDone: periodSummary[f.period].allDone,
          remaining: periodSummary[f.period].remaining,
          firstTime: periodSummary[f.period].firstTime,
        });
        currentPeriod = f.period;
      }
      if (!comingUpInserted && f.status === 'pending') {
        // Only insert COMING UP if there's at least one Done/Overdue
        // ahead of this row in the rendered output (the divider sits
        // BETWEEN past and future).
        const hasPast = out.some((r) => r.kind === 'item' && (r.flat.status === 'done' || r.flat.status === 'overdue'));
        if (hasPast) {
          out.push({ kind: 'coming-up' });
        }
        comingUpInserted = true;
      }
      out.push({ kind: 'item', flat: f });
    }
    return out;
  }, [flats]);

  return (
    <View style={styles.zone} testID="flat-timeline-feed">
      {whisper && (
        <Text style={styles.whisper} testID="flat-timeline-whisper">
          {whisper}
        </Text>
      )}

      <View style={styles.body}>
        {/* Spine — single absolutely-positioned 1px line. */}
        {flats.length > 0 && <View pointerEvents="none" style={styles.spine} />}

        {rows.map((row, idx) => {
          if (row.kind === 'band') {
            const meta = PERIOD_META[row.period];
            return (
              <View key={`band-${row.period}-${idx}`} style={styles.bandRow} testID={`band-${row.period}`}>
                <View style={styles.bandLeftRail} />
                <View style={[styles.bandDot, { backgroundColor: meta.dot }]} />
                <Text style={styles.bandLabel}>{meta.label}</Text>
                {row.firstTime ? <Text style={styles.bandMeta}>{` · ${row.firstTime}`}</Text> : null}
                <View style={{ flex: 1 }} />
                {row.allDone ? (
                  <Text style={styles.bandStatusDone}>Done ✓</Text>
                ) : row.remaining > 0 ? (
                  <Text style={styles.bandStatusRemaining}>{`${row.remaining} remaining`}</Text>
                ) : null}
              </View>
            );
          }

          if (row.kind === 'coming-up') {
            return (
              <View key={`coming-up-${idx}`} style={styles.comingUpRow} testID="flat-timeline-coming-up">
                <View style={styles.comingUpDashed} />
                <Text style={styles.comingUpLabel}>{COMING_UP}</Text>
                <View style={styles.comingUpDashed} />
              </View>
            );
          }

          const flat = row.flat;
          if (flat.status === 'done') {
            return (
              <View key={flat.item.id} style={[styles.itemRow, styles.itemRowDone]} testID={`flat-row-${flat.item.id}`}>
                <View style={styles.leftRail}>
                  <Text style={styles.timeLabel}>{flat.timeShort}</Text>
                </View>
                <View style={styles.spineMarkerDone}>
                  <Text style={styles.spineMarkerCheck}>{'✓'}</Text>
                </View>
                <View style={styles.itemBody}>
                  <Text style={styles.itemTitle} numberOfLines={1}>{displayNameFor(flat.item)}</Text>
                </View>
                <View style={styles.checkboxDone}>
                  <Text style={styles.checkboxDoneCheck}>{'✓'}</Text>
                </View>
              </View>
            );
          }

          if (flat.status === 'overdue') {
            return (
              <TouchableOpacity
                key={flat.item.id}
                style={styles.itemRowOverdue}
                onPress={() => onItemPress(flat.item)}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel={`${displayNameFor(flat.item)}, overdue at ${flat.timeShort}. Tap to log.`}
                testID={`flat-row-${flat.item.id}`}
              >
                <View style={styles.leftRail}>
                  <Text style={styles.timeLabel}>{flat.timeShort}</Text>
                </View>
                <View style={styles.spineMarkerOverdue} />
                <View style={styles.itemBody}>
                  <Text style={styles.overdueEyebrow}>{`OVERDUE · ${flat.timeShort}`}</Text>
                  <Text style={styles.itemTitleOverdue} numberOfLines={1}>{displayNameFor(flat.item)}</Text>
                </View>
                <View style={styles.checkboxOverdue} />
              </TouchableOpacity>
            );
          }

          // Pending
          return (
            <TouchableOpacity
              key={flat.item.id}
              style={styles.itemRowPending}
              onPress={() => onItemPress(flat.item)}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel={`${displayNameFor(flat.item)}, scheduled ${flat.timeShort}. Tap to log.`}
              testID={`flat-row-${flat.item.id}`}
            >
              <View style={styles.leftRail}>
                <Text style={styles.timeLabel}>{flat.timeShort}</Text>
              </View>
              <View style={styles.spineMarkerPending} />
              <View style={styles.itemBody}>
                <Text style={styles.itemTitlePending} numberOfLines={1}>{displayNameFor(flat.item)}</Text>
              </View>
              <View style={styles.checkboxPending} />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const createStyles = (c: typeof Colors) =>
  StyleSheet.create({
    zone: {
      // Outer wrapper for the whisper line + body.
    },
    whisper: {
      fontFamily: Fonts.serifItalic,
      fontStyle: 'italic' as const,
      fontSize: 14,
      lineHeight: 20,
      color: c.textMuted,
      marginBottom: 14, // allow: whisper-to-feed rhythm
    },
    body: {
      position: 'relative',
    },
    spine: {
      position: 'absolute',
      left: 32,
      top: 4,
      bottom: 4,
      width: 1,
      backgroundColor: 'rgba(244, 221, 184, 0.07)',
    },

    // ── Band row ────────────────────────────────────────────────
    bandRow: {
      flexDirection: 'row' as const,
      alignItems: 'center',
      paddingVertical: 8,
    },
    bandLeftRail: {
      width: 30,
    },
    bandDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginLeft: -2, // align with spine center (left:32 -> dot left at ~30)
      marginRight: 10,
    },
    bandLabel: {
      ...TypeScale.micro,
      color: c.textPrimary,
    },
    bandMeta: {
      ...TypeScale.micro,
      color: c.textMuted,
      fontWeight: '500',
      letterSpacing: 0.4,
    },
    bandStatusDone: {
      ...TypeScale.secondary,
      color: c.accent,
      fontWeight: '600',
    },
    bandStatusRemaining: {
      ...TypeScale.secondary,
      color: '#d49848', // ember review tone
      fontWeight: '600',
    },

    // ── Item row (common) ───────────────────────────────────────
    itemRow: {
      flexDirection: 'row' as const,
      alignItems: 'center',
      paddingVertical: 8,
    },
    leftRail: {
      width: 30,
      alignItems: 'flex-end' as const,
      paddingRight: 6,
    },
    timeLabel: {
      fontSize: 9,
      color: c.textMuted,
      letterSpacing: 0.2,
    },
    itemBody: {
      flex: 1,
      marginLeft: 14, // allow: rail (30) + spine offset (2) + breathing room — F7 C6c-A flat-feed spec
    },

    // ── Done row ─────────────────────────────────────────────────
    itemRowDone: {
      opacity: 0.28,
    },
    spineMarkerDone: {
      position: 'absolute',
      left: 26,
      width: 14,
      height: 14,
      borderRadius: 7,
      backgroundColor: c.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    spineMarkerCheck: {
      color: c.textPrimary,
      fontSize: 9,
      fontWeight: '700',
    },
    itemTitle: {
      fontSize: 13,
      color: c.textPrimary,
      fontWeight: '400',
    },
    checkboxDone: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: c.accent,
      borderWidth: 1.5,
      borderColor: c.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxDoneCheck: {
      color: c.textPrimary,
      fontSize: 14,
      fontWeight: '700',
    },

    // ── Overdue row ──────────────────────────────────────────────
    itemRowOverdue: {
      flexDirection: 'row' as const,
      alignItems: 'center',
      backgroundColor: 'rgba(192, 107, 90, 0.08)',
      borderWidth: 1,
      borderColor: 'rgba(192, 107, 90, 0.20)',
      borderRadius: 9,
      paddingVertical: 9,
      paddingHorizontal: 11, // allow: overdue card horizontal pad per F7 spec
      marginVertical: 4,
    },
    spineMarkerOverdue: {
      position: 'absolute',
      left: 26,
      width: 12,
      height: 12,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: 'rgba(192, 107, 90, 0.70)',
      backgroundColor: 'rgba(192, 107, 90, 0.10)',
    },
    overdueEyebrow: {
      ...TypeScale.micro,
      color: '#c06b5a',
      marginBottom: 2,
    },
    itemTitleOverdue: {
      fontSize: 13,
      color: c.textPrimary,
      fontWeight: '500',
    },
    checkboxOverdue: {
      width: 28,
      height: 28,
      borderRadius: 14,
      borderWidth: 2,
      borderColor: 'rgba(192, 107, 90, 0.60)',
      backgroundColor: 'transparent',
    },

    // ── Pending row ──────────────────────────────────────────────
    itemRowPending: {
      flexDirection: 'row' as const,
      alignItems: 'center',
      paddingVertical: 8,
      opacity: 0.55,
    },
    spineMarkerPending: {
      position: 'absolute',
      left: 27,
      width: 10,
      height: 10,
      borderRadius: 5,
      borderWidth: 1.5,
      borderColor: 'rgba(244, 221, 184, 0.15)',
      backgroundColor: c.background,
    },
    itemTitlePending: {
      fontSize: 12,
      color: c.textMuted,
      fontWeight: '400',
    },
    checkboxPending: {
      width: 28,
      height: 28,
      borderRadius: 14,
      borderWidth: 2,
      borderColor: 'rgba(244, 221, 184, 0.15)',
      backgroundColor: 'transparent',
    },

    // ── COMING UP divider ────────────────────────────────────────
    comingUpRow: {
      flexDirection: 'row' as const,
      alignItems: 'center',
      marginVertical: 8,
      gap: 8,
    },
    comingUpDashed: {
      flex: 1,
      height: 1,
      borderTopWidth: 1,
      borderStyle: 'dashed' as const,
      borderColor: 'rgba(244, 221, 184, 0.10)',
    },
    comingUpLabel: {
      ...TypeScale.micro,
      color: c.textMuted,
    },
  });

export default FlatTimelineFeed;
