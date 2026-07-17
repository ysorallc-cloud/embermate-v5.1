// ============================================================================
// VITAL TILES — Insights-tab vitals summary tiles (pure).
//
// Extracted from app/(tabs)/understand.tsx so the per-person tile logic can be
// unit-tested without mounting the screen (same pattern as computeDataGaps →
// utils/insightsDataGaps).
//
// STEP 1b — the "unusual" flags (amber tile color, the glucose "N above usual"
// label) compare a reading to THIS person's own baseline via the canonical
// observeVital(), never a fixed population cutoff. `baseline` is the window of
// readings OLDER than the displayed `readings`. When there's too little
// baseline, observeVital returns insufficient_history → the tile stays neutral
// (green), never falsely amber.
// ============================================================================

import { Colors } from '../theme/theme-tokens';
import { VitalReading } from './vitalsStorage';
import { observeVital } from './vitalsObservation';

export interface VitalTile {
  label: string;
  value: string;
  unit: string;
  trendVal: string;
  trendDir: 'up' | 'down' | 'stable';
  color: string;
  sparkPoints: string;
}

export function generateSparkPoints(values: number[], w = 50, h = 20): string {
  if (values.length === 0) return '';
  if (values.length === 1) return `${w / 2},${h / 2}`;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  return values.map((v, i) => {
    const x = 2 + (i / (values.length - 1)) * (w - 4);
    const y = (h - 3) - ((v - min) / range) * (h - 6);
    return `${x.toFixed(0)},${y.toFixed(0)}`;
  }).join(' ');
}

export function computeVitalTiles(
  readings: VitalReading[],
  baseline: VitalReading[] = [],
): VitalTile[] {
  const tiles: VitalTile[] = [];
  const byType: Record<string, VitalReading[]> = {};
  for (const r of readings) {
    if (!byType[r.type]) byType[r.type] = [];
    byType[r.type].push(r);
  }
  const baseByType: Record<string, number[]> = {};
  for (const r of baseline) {
    if (!baseByType[r.type]) baseByType[r.type] = [];
    baseByType[r.type].push(r.value);
  }
  const seriesBaseline = (type: string): number[] => baseByType[type] ?? [];
  for (const type of Object.keys(byType)) {
    byType[type].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  // Blood Pressure
  const systolic = byType['systolic'];
  const diastolic = byType['diastolic'];
  if (systolic && systolic.length >= 2) {
    const latestSys = systolic[systolic.length - 1].value;
    const latestDia = diastolic?.[diastolic.length - 1]?.value ?? 0;
    const mid = Math.floor(systolic.length / 2);
    const firstAvg = systolic.slice(0, Math.max(mid, 1)).reduce((s, r) => s + r.value, 0) / Math.max(mid, 1);
    const secondAvg = systolic.slice(mid).reduce((s, r) => s + r.value, 0) / Math.max(systolic.length - mid, 1);
    const changePct = Math.round(((secondAvg - firstAvg) / firstAvg) * 100);
    const trending = secondAvg > firstAvg ? 'up' : secondAvg < firstAvg ? 'down' : 'stable';
    // Amber when the latest reading is above THIS person's usual (per-person,
    // no fixed cutoff). Neutral green otherwise / when there's too little
    // baseline to compare.
    const sysAbove = observeVital(latestSys, seriesBaseline('systolic')).direction === 'above_usual';
    const diaAbove = latestDia ? observeVital(latestDia, seriesBaseline('diastolic')).direction === 'above_usual' : false;
    const isAboveUsual = sysAbove || diaAbove;

    tiles.push({
      label: 'Blood Pressure',
      value: `${Math.round(latestSys)}/${Math.round(latestDia)}`,
      unit: 'avg mmHg',
      trendVal: changePct !== 0 ? `${changePct > 0 ? '+' : ''}${changePct}%` : '→',
      trendDir: trending,
      color: isAboveUsual ? Colors.amberBright : Colors.green,
      sparkPoints: generateSparkPoints(systolic.map(r => r.value)),
    });
  }

  // Heart Rate
  const hr = byType['heartRate'];
  if (hr && hr.length >= 2) {
    const latest = hr[hr.length - 1].value;
    const mid = Math.floor(hr.length / 2);
    const firstAvg = hr.slice(0, Math.max(mid, 1)).reduce((s, r) => s + r.value, 0) / Math.max(mid, 1);
    const secondAvg = hr.slice(mid).reduce((s, r) => s + r.value, 0) / Math.max(hr.length - mid, 1);
    const isStable = Math.abs(secondAvg - firstAvg) < 5;

    tiles.push({
      label: 'Heart Rate',
      value: `${Math.round(latest)}`,
      unit: 'avg bpm',
      trendVal: isStable ? '→' : secondAvg > firstAvg ? '↑' : '↓',
      trendDir: isStable ? 'stable' : 'up',
      color: Colors.green,
      sparkPoints: generateSparkPoints(hr.map(r => r.value)),
    });
  }

  // Glucose
  const glucose = byType['glucose'];
  if (glucose && glucose.length >= 2) {
    const latest = glucose[glucose.length - 1].value;
    // How many of this window's readings sit above THIS person's own usual
    // (per-person, no fixed 180 cutoff). Zero when there's too little baseline.
    const gluBaseline = seriesBaseline('glucose');
    const aboveUsual = gluBaseline.length > 0
      ? glucose.filter(r => observeVital(r.value, gluBaseline).direction === 'above_usual').length
      : 0;

    tiles.push({
      label: 'Glucose',
      value: `${Math.round(latest)}`,
      unit: 'avg mg/dL',
      trendVal: aboveUsual > 0 ? `${aboveUsual} above usual` : '→',
      trendDir: aboveUsual > 0 ? 'up' : 'stable',
      color: aboveUsual > 0 ? Colors.amberBright : Colors.green,
      sparkPoints: generateSparkPoints(glucose.map(r => r.value)),
    });
  }

  // Weight — amber on a ≥3 lb change from their own first reading in the window
  // (a personal delta, not a population cutoff; unchanged by STEP 1b).
  const weight = byType['weight'];
  if (weight && weight.length >= 2) {
    const latest = weight[weight.length - 1].value;
    const first = weight[0].value;
    const change = latest - first;

    tiles.push({
      label: 'Weight',
      value: `${latest.toFixed(0)}`,
      unit: 'lbs',
      trendVal: Math.abs(change) < 1 ? '→' : `${change > 0 ? '+' : ''}${change.toFixed(1)}`,
      trendDir: Math.abs(change) < 1 ? 'stable' : change > 0 ? 'up' : 'down',
      color: Math.abs(change) >= 3 ? Colors.amberBright : Colors.green,
      sparkPoints: generateSparkPoints(weight.map(r => r.value)),
    });
  }

  return tiles;
}
