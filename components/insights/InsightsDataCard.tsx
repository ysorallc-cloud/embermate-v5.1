// ============================================================================
// INSIGHTS DATA CARD — Phase 28 Section 2 (THE DATA).
//
// Neutral-encoded section card consolidating the pre-28 Vitals Dashboard
// + Medication Adherence sections and demoting the Missing Data section
// to a single footer line at the bottom.
//
// Layout:
//   • Eyebrow "THE DATA · LAST {N} DAYS" (inside JournalSection chrome)
//   • Sub-eyebrow "VITALS" + 2-col vital tile grid (when vitalTiles
//     non-empty)
//   • Sub-eyebrow "MEDICATION ADHERENCE" + rate / dose grid / missed
//     dates (when adherence.total > 0)
//   • Footer line summarizing data gaps in a top-bordered region
//     (when dataGaps non-empty)
//
// Tiles relocated from understand.tsx with chrome compressed — the
// parent JournalSection provides the outer card boundary, so inner
// tiles drop the heavier "card-on-card" surface treatment and lean on
// rgba(0,0,0,0.18) inset blocks similar to InsightsReadCard's metric
// tiles. Same content (label, trend, value, sparkline / dose grid /
// rate); same threshold coloring.
//
// Returns null when there's nothing to surface (no vitals, no adherence,
// no gaps). Parent does not gate.
// ============================================================================

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { JournalSection } from '../journal/JournalSection';
import { Sparkline } from './Sparkline';
import type { TimeRange } from '../../utils/understandInsights';
import type { DataGap } from '../../utils/insightsDataGaps';

export interface VitalTile {
  label: string;
  value: string;
  unit: string;
  trendVal: string;
  trendDir: 'up' | 'down' | 'stable';
  color: string;
  sparkPoints: string;
}

export interface AdherenceSummary {
  rate: number;
  taken: number;
  total: number;
  doseStatuses: Array<'taken' | 'missed' | string>;
  missedDates: string[];
}

export interface InsightsDataCardProps {
  timeRange: TimeRange;
  vitalTiles: VitalTile[];
  adherence: AdherenceSummary | null;
  dataGaps: DataGap[];
}

function gapFooterCopy(gaps: DataGap[]): string | null {
  if (gaps.length === 0) return null;
  if (gaps.length === 1) {
    const g = gaps[0];
    return `${g.daysMissing} days of ${g.metric.toLowerCase()} missing this period →`;
  }
  return `${gaps.length} metrics with gaps this period →`;
}

function adherenceColor(rate: number, c: any): string {
  if (rate >= 90) return c.green;
  if (rate >= 70) return c.amberBright;
  return c.coralBright;
}

export function InsightsDataCard({
  timeRange,
  vitalTiles,
  adherence,
  dataGaps,
}: InsightsDataCardProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const hasVitals = vitalTiles.length > 0;
  const hasAdherence = adherence !== null && adherence.total > 0;
  const footerCopy = gapFooterCopy(dataGaps);

  if (!hasVitals && !hasAdherence && !footerCopy) return null;

  const eyebrow = `THE DATA · LAST ${timeRange} DAYS`;

  return (
    <JournalSection eyebrow={eyebrow} tint="neutral">
      {hasVitals && (
        <View style={styles.subSection}>
          <Text style={styles.subEyebrow}>{'VITALS'}</Text>
          <View style={styles.vitalsGrid}>
            {vitalTiles.map((v, i) => (
              <View key={i} testID={`data-vital-tile-${i}`} style={styles.vitalTile}>
                <View style={styles.vitalTileHeader}>
                  <Text style={styles.vitalTileLabel}>{v.label}</Text>
                  <Text
                    style={[
                      styles.vitalTileTrend,
                      { color: v.trendDir === 'stable' ? colors.green : colors.amberBright },
                    ]}
                  >
                    {v.trendVal}
                  </Text>
                </View>
                <View style={styles.vitalTileBottom}>
                  <View>
                    <Text style={[styles.vitalTileValue, { color: v.color }]}>
                      {v.value}
                    </Text>
                    <Text style={styles.vitalTileUnit}>{v.unit}</Text>
                  </View>
                  <Sparkline points={v.sparkPoints} color={v.color} />
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {hasAdherence && adherence && (
        <View style={[styles.subSection, hasVitals && styles.subSectionGap]}>
          <Text style={styles.subEyebrow}>{'MEDICATION ADHERENCE'}</Text>
          <View style={styles.adherenceRow}>
            <Text style={[styles.adherenceRate, { color: adherenceColor(adherence.rate, colors) }]}>
              {`${adherence.rate}%`}
            </Text>
            <Text style={styles.adherenceDoses}>
              {`${adherence.taken}/${adherence.total} doses`}
            </Text>
          </View>
          <View style={styles.doseGrid}>
            {adherence.doseStatuses.map((status, i) => {
              const isMissed = status === 'missed';
              return (
                <View
                  key={i}
                  style={[
                    styles.doseDot,
                    {
                      backgroundColor: isMissed ? 'rgba(239,68,68,0.3)' : 'rgba(74,222,128,0.2)',
                      borderColor: isMissed ? `${colors.coralBright}40` : `${colors.green}40`,
                    },
                  ]}
                >
                  {isMissed && <Text style={styles.doseDotX}>{'✕'}</Text>}
                </View>
              );
            })}
          </View>
          {adherence.missedDates.length > 0 && (
            <Text style={styles.adherenceMissed}>
              {`Missed: ${adherence.missedDates.join(', ')}`}
            </Text>
          )}
        </View>
      )}

      {footerCopy && (
        <View testID="data-card-gap-footer" style={styles.gapFooter}>
          <Text style={styles.gapFooterText}>{footerCopy}</Text>
        </View>
      )}
    </JournalSection>
  );
}

const createStyles = (c: any) =>
  StyleSheet.create({
    subSection: {
      marginTop: 0,
    },
    subSectionGap: {
      marginTop: 12,
    },
    subEyebrow: {
      fontSize: 8,
      letterSpacing: 0.4,
      fontWeight: '500' as const,
      color: c.textTertiary,
      opacity: 0.6,
      textTransform: 'uppercase' as const,
      marginBottom: 6,
    },
    vitalsGrid: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      gap: 6,
    },
    vitalTile: {
      width: '48.5%' as const,
      backgroundColor: 'rgba(0,0,0,0.18)',
      borderRadius: 5,
      paddingVertical: 7,
      paddingHorizontal: 8,
    },
    vitalTileHeader: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'flex-start' as const,
      marginBottom: 5,
    },
    vitalTileLabel: {
      fontSize: 10,
      color: c.textTertiary,
      fontWeight: '500' as const,
    },
    vitalTileTrend: {
      fontSize: 9,
      fontWeight: '600' as const,
    },
    vitalTileBottom: {
      flexDirection: 'row' as const,
      alignItems: 'flex-end' as const,
      justifyContent: 'space-between' as const,
    },
    vitalTileValue: {
      fontSize: 15,
      fontWeight: '600' as const,
    },
    vitalTileUnit: {
      fontSize: 9,
      color: c.textTertiary,
      marginTop: 1,
    },
    adherenceRow: {
      flexDirection: 'row' as const,
      alignItems: 'baseline' as const,
      gap: 8,
      marginBottom: 8,
    },
    adherenceRate: {
      fontSize: 24,
      fontWeight: '300' as const,
    },
    adherenceDoses: {
      fontSize: 11,
      color: c.textTertiary,
    },
    doseGrid: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      gap: 3,
      marginBottom: 6,
    },
    doseDot: {
      width: 12,
      height: 12,
      borderRadius: 3,
      borderWidth: 1,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    doseDotX: {
      fontSize: 7,
      color: c.coralBright,
    },
    adherenceMissed: {
      fontSize: 10.5,
      color: c.textTertiary,
    },
    gapFooter: {
      marginTop: 12,
      paddingTop: 8,
      borderTopWidth: 0.5,
      borderTopColor: 'rgba(255,255,255,0.10)',
    },
    gapFooterText: {
      fontSize: 11,
      color: c.textTertiary,
    },
  });

export default InsightsDataCard;
