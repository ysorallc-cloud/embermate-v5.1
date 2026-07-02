// ============================================================================
// FLAT TIMELINE FEED — F7 C6c-A (2026-06-12).
//
// Replaces the period-grouped TimelineSection with a flat chronological
// feed sorted by scheduledTime asc. The pre-F7 surface stacked items
// inside Morning / Afternoon / Evening / Night collapsible windows; the
// F7 spec retires that grouping in favour of a single time-ordered list
// with quiet band rows marking period transitions.
//
// LAYOUT (Now rebuild — reconciled to embermate-now-full-approved)
//   • Left rail (30px) — time labels right-aligned, 9px textMuted.
//   • Spine — 1px vertical line at left:32px (c.hairlineInset).
//   • Rows sorted by scheduledTime asc.
//   • Period bands inline at the first item; band-dot color by period via
//     bandDotColor (morning=sage, evening=gold, else neutral).
//
// SPINE NODE (stamped — PART-B): the row status is computed ONCE
// (rowStatusOf → getCareItemStatus, stamped on FlatItem.status), mapped to a
// visual VM by stampNode (pure, via the F3 register map), and rendered by the
// presentational TimelineNode which receives only {shape,color,panelColor}.
//   Done     → sage FILL node   · opacity 0.28, NOT tappable.
//   Overdue  → coral RING node  · coral card + "OVERDUE · time" eyebrow, TAPPABLE.
//   Pending  → neutral RING node (hollow) · opacity 0.55, TAPPABLE.
//   (No gold node — gold lives on the evening band + schedule eyebrow only.)
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
import { getCareItemStatus } from '../../utils/careItemStatus';
import { getRegisterColor } from '../../theme/registerColors';
import { composeNowWhisper } from '../../utils/nowWhisper';
import { TypeScale } from '../../theme/spacing';

type RowStatus = 'done' | 'overdue' | 'pending';
type PeriodKey = 'morning' | 'afternoon' | 'evening' | 'night';

const PERIOD_META: Record<PeriodKey, { label: string; emoji: string; startHour: number; endHour: number }> = {
  morning:   { label: 'MORNING',   emoji: '☀',  startHour: 5,  endHour: 12 },
  afternoon: { label: 'AFTERNOON',  emoji: '⛅', startHour: 12, endHour: 17 },
  evening:   { label: 'EVENING',    emoji: '🌙', startHour: 17, endHour: 21 },
  night:     { label: 'NIGHT',      emoji: '🌑', startHour: 21, endHour: 5  },
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
  if (item.status === 'pending' && getCareItemStatus(item) === 'overdue') return 'overdue';
  return 'pending';
}

// ── Spine-node stamp (PART-B stamped-status) ─────────────────────────────
// The row status is computed ONCE from getCareItemStatus (via rowStatusOf,
// stamped onto FlatItem.status). stampNode maps that already-computed status
// to the node's visual VM — a pure lookup, NOT a second status derivation.
// Node colors route through the F3 register map so the spine shares the app's
// one semantic source: done→sage(fill), overdue→coral(ring), pending→
// neutral(hollow ring). No gold node (mockup: gold is band + eyebrow only).
export type NodeShape = 'fill' | 'ring';
export interface TimelineNodeVM { shape: NodeShape; color: string }

export function stampNode(status: RowStatus, c: typeof Colors): TimelineNodeVM {
  switch (status) {
    case 'done':    return { shape: 'fill', color: getRegisterColor(c, 'sage') };
    case 'overdue': return { shape: 'ring', color: getRegisterColor(c, 'coral') };
    case 'pending':
    default:        return { shape: 'ring', color: getRegisterColor(c, 'neutral') };
  }
}

// Band-dot color by period (mockup: morning=sage, evening=gold, else neutral).
function bandDotColor(period: PeriodKey, c: typeof Colors): string {
  if (period === 'morning') return getRegisterColor(c, 'sage');
  if (period === 'evening') return getRegisterColor(c, 'gold');
  return getRegisterColor(c, 'neutral');
}

// Presentational spine node — receives ONLY the stamped {shape,color} VM and
// the panel color it sits on (to "cut" the spine line). Never sees the
// instance or re-derives status. This is the PART-B contract at the leaf.
export function TimelineNode({ shape, color, panelColor }: TimelineNodeVM & { panelColor: string }) {
  return (
    <View
      pointerEvents="none"
      style={[
        NODE_BASE,
        shape === 'fill'
          ? { backgroundColor: color }
          : { borderWidth: 2, borderColor: color, backgroundColor: panelColor },
      ]}
    />
  );
}

// Node geometry — absolute on the spine (left:32), 12px so its center sits on
// the line. Shared by all three states; only fill-vs-ring + color vary.
const NODE_BASE = {
  position: 'absolute' as const,
  left: 26,
  width: 12,
  height: 12,
  borderRadius: 6,
};

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
            // Shelf treatment (2026-07-02) — the band label is isolated as a
            // "shelf" header: dot stays on the spine, the label + first-time
            // sit alone, and a 1px hairline rule runs from the end of the
            // label to the right edge (or to the status text). idx > 0 adds
            // the 32px between-band break; the first band (idx 0) hugs the
            // whisper line above. Child item rows indent a full step under
            // this shelf via itemBody (see marginLeft below). Typography on
            // bandLabel is intentionally UNCHANGED (TypeScale.micro).
            return (
              <View key={`band-${row.period}-${idx}`} style={[styles.bandRow, idx > 0 && styles.bandGap]} testID={`band-${row.period}`}>
                <View style={styles.bandLeftRail} />
                <View style={[styles.bandDot, { backgroundColor: bandDotColor(row.period, colors) }]} />
                <Text style={styles.bandLabel}>{meta.label}</Text>
                {row.firstTime ? <Text style={styles.bandMeta}>{` · ${row.firstTime}`}</Text> : null}
                <View style={styles.bandRule} testID={`band-rule-${row.period}`} />
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
                <TimelineNode {...stampNode(flat.status, colors)} panelColor={colors.zonePanel} />
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
                <TimelineNode {...stampNode(flat.status, colors)} panelColor={colors.zonePanel} />
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
              <TimelineNode {...stampNode(flat.status, colors)} panelColor={colors.zonePanel} />
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
      backgroundColor: c.hairlineInset,
    },

    // ── Band row (shelf) ────────────────────────────────────────
    // The band label is a "shelf" header — isolated from its child rows
    // by the trailing hairline rule (bandRule) and, between bands, the
    // 32px break (bandGap, applied only when idx > 0 so the first band
    // hugs the whisper line above). paddingVertical is the shelf's own
    // height; the inter-band 32 and intra-band 8 are the §8 tokens.
    bandRow: {
      flexDirection: 'row' as const,
      alignItems: 'center',
      paddingVertical: 8,
    },
    bandGap: {
      marginTop: 32, // §8 — between the last row of one band and the next shelf
    },
    // Hairline rule running from the end of the band label/time to the
    // right edge of the shelf (or to the status text when present). This
    // is the primary visual isolator that makes the label read as a
    // header rather than sharing weight with the rows below it.
    bandRule: {
      flex: 1,
      height: 1,
      backgroundColor: c.hairlineInset,
      marginLeft: 10,
      marginRight: 10,
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
      color: c.gold, // ember review tone
      fontWeight: '600',
    },

    // ── Item row (common) ───────────────────────────────────────
    // marginTop: 8 is the §8 intra-band gap between successive rows
    // (shelf→first item and item→item). The between-band 32 lives on the
    // band shelf (bandGap), so items never carry it. paddingVertical is
    // unchanged — tap targets on the touchable pending/overdue rows are
    // preserved exactly.
    itemRow: {
      flexDirection: 'row' as const,
      alignItems: 'center',
      paddingVertical: 8,
      marginTop: 8,
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
    // Full-step indent under the shelf (2026-07-02). Item text starts at
    // rail(30) + 60 = 90px; the band label sits at ~46px, so children are
    // indented a full ~44px step (one icon-width + gap) beneath their
    // shelf. The spine node stays absolute on the spine (left:26/center 32)
    // and does NOT move — only this text column indents.
    itemBody: {
      flex: 1,
      marginLeft: 60,
    },

    // ── Done row ─────────────────────────────────────────────────
    itemRowDone: {
      opacity: 0.28,
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
      backgroundColor: c.coralFaint,
      borderWidth: 1,
      borderColor: c.coralBorder,
      borderRadius: 9,
      paddingVertical: 9,
      paddingHorizontal: 11, // allow: overdue card horizontal pad per F7 spec
      marginTop: 8, // §8 intra-band gap (replaces the prior ad-hoc marginVertical: 4)
    },
    overdueEyebrow: {
      ...TypeScale.micro,
      color: c.coral,
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
      borderColor: c.coral,
      backgroundColor: 'transparent',
    },

    // ── Pending row ──────────────────────────────────────────────
    itemRowPending: {
      flexDirection: 'row' as const,
      alignItems: 'center',
      paddingVertical: 8,
      marginTop: 8,
      opacity: 0.55,
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
      borderColor: c.textTertiary,
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
      borderColor: c.hairlineInset,
    },
    comingUpLabel: {
      ...TypeScale.micro,
      color: c.textMuted,
    },
  });

export default FlatTimelineFeed;
