// ============================================================================
// JOURNAL LOGGED ROWS — the middle "WHAT WAS LOGGED" list (journal-aligned).
//
// Renders the chronological log rows built + stamped by
// utils/journalLoggedRows (buildJournalLoggedRows). Each row's status is
// already stamped (from getCareItemStatus, once); this component only MAPS the
// stamped status → color via the F3 register map — it never re-derives status
// or touches instance data. PART-B stamped-status contract at the leaf, same
// as Now's TimelineNode.
//
//   done / skipped → neutral time     · pending → neutral (dimmed row)
//   due            → GOLD time ("Due 5p")
//   missed         → CORAL time ("Missed")   ← the trust-floor surfacing
// ============================================================================

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';
import { getRegisterColor } from '../../theme/registerColors';
import type { JournalLogRow, LogRowStatus } from '../../utils/journalLoggedRows';

/** Map the ALREADY-stamped row status to its time color (register map). */
export function rowTimeColor(status: LogRowStatus, c: typeof Colors): string {
  if (status === 'missed') return getRegisterColor(c, 'coral');
  if (status === 'due') return getRegisterColor(c, 'gold');
  return getRegisterColor(c, 'neutral'); // done / skipped / pending
}

export interface JournalLoggedRowsProps {
  rows: JournalLogRow[];
}

export function JournalLoggedRows({ rows }: JournalLoggedRowsProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (rows.length === 0) return null;

  return (
    <View testID="journal-logged-rows">
      {rows.map((r) => {
        const dimmed = r.status === 'pending' || r.status === 'due';
        return (
          <View
            key={r.id}
            style={[styles.row, dimmed && styles.rowDim]}
            testID={`journal-log-row-${r.id}`}
          >
            <View style={styles.left}>
              <Text style={styles.type}>{r.type}</Text>
              {/* Med name keeps a clean single line (long bare names still clip
                  at 1 — correct for names). The appended detail (e.g. med
                  side-effects "· Nausea, Tired") moved to its OWN dimmer line so
                  it wraps instead of being swallowed by the name's 1-line clip.
                  The builder still produces the "· "-prefixed detail; strip the
                  glyph for the standalone line. */}
              <Text style={styles.name} numberOfLines={1}>
                {r.name}
              </Text>
              {r.detail ? (
                <Text
                  style={styles.detail}
                  numberOfLines={2}
                  testID={`journal-log-detail-${r.id}`}
                >
                  {r.detail.replace(/^·\s*/, '')}
                </Text>
              ) : null}
            </View>
            <Text
              style={[styles.time, { color: rowTimeColor(r.status, colors) }]}
              testID={`journal-log-time-${r.id}`}
            >
              {r.time}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const createStyles = (c: typeof Colors) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 11,
      borderBottomWidth: 1,
      borderBottomColor: c.hairlineInset,
    },
    rowDim: {
      opacity: 0.55,
    },
    left: {
      flex: 1,
      marginRight: 10,
    },
    type: {
      fontSize: 9,
      fontWeight: '700',
      letterSpacing: 1.5,
      color: c.textTertiary,
      marginBottom: 3,
    },
    name: {
      fontSize: 15,
      color: c.textPrimary,
    },
    // Secondary line for the appended detail (med side-effects). Dimmer than
    // the name, above the TYPE eyebrow in emphasis — readable clinical context,
    // not a faint hint.
    detail: {
      fontSize: 13,
      color: c.textSecondary,
      marginTop: 2,
    },
    time: {
      fontSize: 13,
    },
  });

export default JournalLoggedRows;
