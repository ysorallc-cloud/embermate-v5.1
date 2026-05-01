// ============================================================================
// WATCH FOR CARD
//
// One condition's worth of "things to watch for" in card form. Used by the
// onboarding WatchForScreen and the Settings → What to watch for entry; the
// same component renders both surfaces so the framing stays consistent.
//
// Severity tags are colour-mapped to the Sage warm-dark palette:
//   urgent     → criticalAlert (sage-warm red)
//   concerning → warning       (amber)
//   watch      → accent        (sage)
//
// Per Phase 1 (no clinical review yet), the library currently ships every
// item as 'watch' — only the sage-accent tag will appear. The other paths
// stay live so a future review can lift items without code changes.
// ============================================================================

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import type {
  ConditionWatchlist,
  WatchSeverity,
} from '../../data/conditionWatchlists';

export interface WatchForCardProps {
  /** Display name shown in the card title. Pass the user's typed name when
      the lookup didn't match the library so they see their own term. */
  displayName: string;
  /** Library entry — when null, the card surfaces the custom-condition fallback. */
  watchlist: ConditionWatchlist | null;
  /** Custom-condition fallback copy. */
  fallback?: string;
  /** Test id for the card root node — also used to scope per-condition selectors. */
  testID?: string;
}

const SEV_LABEL: Record<WatchSeverity, string> = {
  urgent: 'URGENT',
  concerning: 'CONCERNING',
  watch: 'WATCH',
};

export function WatchForCard({
  displayName,
  watchlist,
  fallback,
  testID,
}: WatchForCardProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const sevColor = (s: WatchSeverity) => {
    if (s === 'urgent') return (colors as any).criticalAlert || '#e6776e';
    if (s === 'concerning') return (colors as any).warning || '#e5b04a';
    return colors.accent;
  };

  return (
    <View testID={testID} style={styles.card} accessibilityLabel={`Watch list for ${displayName}`}>
      <Text style={styles.title}>{displayName}</Text>

      {watchlist ? (
        watchlist.watchFor.map((item, i) => {
          const isLast = i === watchlist.watchFor.length - 1;
          return (
            <View
              key={`${item.symptom}-${i}`}
              style={[styles.item, !isLast && styles.itemBorder]}
            >
              <View style={styles.itemHeader}>
                <Text style={styles.symptom}>{item.symptom}</Text>
                <View style={[styles.tag, { borderColor: sevColor(item.severity) }]}>
                  <Text style={[styles.tagText, { color: sevColor(item.severity) }]}>
                    {SEV_LABEL[item.severity]}
                  </Text>
                </View>
              </View>
              <Text style={styles.why}>{item.whyItMatters}</Text>
            </View>
          );
        })
      ) : (
        <Text style={styles.fallback}>{fallback}</Text>
      )}
    </View>
  );
}

const createStyles = (c: any) => StyleSheet.create({
  card: {
    backgroundColor: c.glass,
    borderWidth: 0.5,
    borderColor: c.glassBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
    color: c.textPrimary,
    marginBottom: 8,
  },
  item: {
    paddingVertical: 10,
  },
  itemBorder: {
    borderBottomWidth: 0.5,
    borderBottomColor: c.glassHover,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },
  symptom: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
    color: c.textPrimary,
  },
  tag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 0.5,
  },
  tagText: {
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  why: {
    fontSize: 10.5,
    lineHeight: 15.75,
    color: c.textSecondary,
  },
  fallback: {
    fontSize: 11,
    lineHeight: 17,
    color: c.textSecondary,
    fontStyle: 'italic',
    paddingVertical: 8,
  },
});

export default WatchForCard;
