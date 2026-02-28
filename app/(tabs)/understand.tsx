// ============================================================================
// UNDERSTAND PAGE - "Give Me the Headline"
//
// Layout (per mockup):
// 1. Stat Spotlight — 3 headline numbers above the fold
// 2. Positive Banner — "Going well" as flat green strip
// 3. Patterns Detected — left-border accent cards
// 4. Vitals at a Glance — compact rows with sparklines
// 5. More — menu list
// ============================================================================

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { navigate } from '../../lib/navigate';
import { useFocusEffect } from '@react-navigation/native';
import Svg, { Polyline, Circle as SvgCircle } from 'react-native-svg';
import { Colors, Spacing } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';
import { AuroraBackground } from '../../components/aurora/AuroraBackground';
import { ScreenHeader } from '../../components/ScreenHeader';
import {
  loadUnderstandPageData,
  dismissSuggestion,
  dismissSampleData,
  markConfidenceExplained,
  getRouteOrFallback,
  TimeRange,
  UnderstandPageData,
  StandOutInsight,
  PositiveObservation,
  CorrelationCard,
} from '../../utils/understandInsights';
import { logError } from '../../utils/devLog';
import { useDataListener } from '../../lib/events';
import { buildProviderPrep, ProviderPrepData } from '../../utils/providerPrepBuilder';
import { PatternsSheet } from '../../components/understand/PatternsSheet';
import { getVitalsInRange, VitalReading } from '../../utils/vitalsStorage';

// ============================================================================
// TYPES
// ============================================================================

interface VitalSummary {
  icon: string;
  name: string;
  description: string;
  descriptionTone: 'normal' | 'warn' | 'alert';
  value: string;
  valueTone: 'normal' | 'warn' | 'alert';
  trend: string;
  trendTone: 'stable' | 'up' | 'flagged';
  sparkPoints: string;
  sparkColor: string;
  alertDots?: { cx: number; cy: number }[];
}

interface MenuItem {
  id: string;
  icon: string;
  iconBg: string;
  title: string;
  subtitle: string;
  badge?: string;
  badgeStyle?: 'good' | 'warn' | 'alert' | 'info' | 'soon';
  elevated?: boolean;
  onPress: () => void;
}

// ============================================================================
// TIME RANGE TOGGLE
// ============================================================================

interface TimeRangeToggleProps {
  value: TimeRange;
  onChange: (range: TimeRange) => void;
}

function TimeRangeToggle({ value, onChange }: TimeRangeToggleProps) {
  const options: { range: TimeRange; label: string }[] = [
    { range: 7, label: '7d' },
    { range: 14, label: '14d' },
    { range: 30, label: '30d' },
  ];

  return (
    <View style={_styles.timeRangeContainer}>
      {options.map(({ range, label }) => (
        <TouchableOpacity
          key={range}
          style={[
            _styles.timeRangePill,
            value === range && _styles.timeRangePillActive,
          ]}
          onPress={() => onChange(range)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`${label} range`}
          accessibilityState={{ selected: value === range }}
        >
          <Text style={[
            _styles.timeRangeText,
            value === range && _styles.timeRangeTextActive,
          ]}>
            {label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ============================================================================
// STAT SPOTLIGHT — hero card + secondary chip row
// ============================================================================

interface StatSpotlightProps {
  adherencePct: number;
  dosesLogged: number;
  dosesScheduled: number;
  daysTracked: number;
  patternsFound: number;
}

function StatSpotlight({ adherencePct, dosesLogged, dosesScheduled, daysTracked, patternsFound }: StatSpotlightProps) {
  return (
    <>
      {/* Hero card — adherence */}
      <View style={_styles.heroCard}>
        <View style={_styles.heroTopBar} />
        <Text style={_styles.heroLabel}>MED ADHERENCE</Text>
        <View style={_styles.heroNumRow}>
          <Text style={_styles.heroNum}>{adherencePct}</Text>
          <Text style={_styles.heroUnit}>%</Text>
        </View>
        <Text style={_styles.heroContext}>
          {dosesLogged} of {dosesScheduled} doses logged
        </Text>
      </View>

      {/* Secondary chips */}
      <View style={_styles.chipRow}>
        <View style={_styles.chip}>
          <Text style={_styles.chipVal}>{daysTracked}</Text>
          <Text style={_styles.chipLabel}>Days tracked</Text>
        </View>
        <View style={_styles.chip}>
          <Text style={_styles.chipVal}>
            {patternsFound}<Text style={_styles.chipValDim}> found</Text>
          </Text>
          <Text style={_styles.chipLabel}>Patterns</Text>
        </View>
      </View>
    </>
  );
}

// ============================================================================
// INSIGHT CALLOUT — left-bordered green callout
// ============================================================================

interface InsightCalloutProps {
  observations: PositiveObservation[];
}

function InsightCallout({ observations }: InsightCalloutProps) {
  if (observations.length === 0) return null;

  return (
    <View style={_styles.insightCallout}>
      {observations.map((obs) => (
        <View key={obs.id} style={_styles.insightCalloutRow}>
          <Text style={_styles.insightCalloutCheck}>{'\u2713'}</Text>
          <Text style={_styles.insightCalloutText}>{obs.text}</Text>
        </View>
      ))}
    </View>
  );
}

// ============================================================================
// PATTERN CARD - left-border accent
// ============================================================================

interface PatternCardProps {
  card: CorrelationCard;
  onPress?: () => void;
}

function PatternCard({ card, onPress }: PatternCardProps) {
  const borderColor = card.confidence === 'strong' ? Colors.accent : Colors.amber;
  const confLabel = card.confidence === 'strong' ? 'Strong' : 'Emerging';
  const confStyle = card.confidence === 'strong' ? _styles.confStrong : _styles.confEmerging;

  return (
    <TouchableOpacity
      style={[_styles.patternCard, { borderLeftColor: borderColor }]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${card.title}, ${confLabel} pattern`}
    >
      <View style={_styles.patternTop}>
        <Text style={_styles.patternTitle}>{card.title}</Text>
        <View style={confStyle}>
          <Text style={[_styles.confText, card.confidence === 'strong' ? _styles.confTextStrong : _styles.confTextEmerging]}>
            {confLabel}
          </Text>
        </View>
      </View>
      <Text style={_styles.patternText}>{card.insight}</Text>
      <Text style={_styles.patternFooter}>
        Based on {card.dataPoints} days {card.confidence === 'strong' ? '\u00B7 Tap to track \u2192' : '\u00B7 More data needed'}
      </Text>
    </TouchableOpacity>
  );
}

// ============================================================================
// SPARKLINE COMPONENT
// ============================================================================

interface SparklineProps {
  points: string;
  color: string;
  alertDots?: { cx: number; cy: number }[];
}

function Sparkline({ points, color, alertDots }: SparklineProps) {
  return (
    <Svg width={50} height={22} viewBox="0 0 50 22">
      <Polyline
        points={points}
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {alertDots?.map((dot, i) => (
        <SvgCircle
          key={i}
          cx={dot.cx}
          cy={dot.cy}
          r={2.2}
          fill={`${Colors.red}80`}
        />
      ))}
    </Svg>
  );
}

// ============================================================================
// VITAL ROW COMPONENT
// ============================================================================

interface VitalRowProps {
  vital: VitalSummary;
  onPress?: () => void;
}

function VitalRow({ vital, onPress }: VitalRowProps) {
  const descColor = vital.descriptionTone === 'alert' ? '#FCA5A5'
    : vital.descriptionTone === 'warn' ? Colors.amber
    : Colors.textMuted;

  const valColor = vital.valueTone === 'alert' ? '#FCA5A5'
    : vital.valueTone === 'warn' ? Colors.amber
    : Colors.textPrimary;

  const trendColor = vital.trendTone === 'flagged' ? '#FCA5A5'
    : vital.trendTone === 'up' ? Colors.amber
    : Colors.green;

  return (
    <TouchableOpacity
      style={_styles.vitalRow}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${vital.name}, ${vital.value}, ${vital.trend}`}
    >
      <Text style={_styles.vitalIcon}>{vital.icon}</Text>
      <View style={_styles.vitalInfo}>
        <Text style={_styles.vitalName}>{vital.name}</Text>
        <Text style={[_styles.vitalDesc, { color: descColor }]}>{vital.description}</Text>
      </View>
      <View style={_styles.sparkContainer}>
        <Sparkline points={vital.sparkPoints} color={vital.sparkColor} alertDots={vital.alertDots} />
      </View>
      <View style={_styles.vitalRight}>
        <Text style={[_styles.vitalValue, { color: valColor }]}>{vital.value}</Text>
        <Text style={[_styles.vitalTrend, { color: trendColor }]}>{vital.trend}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ============================================================================
// MENU ITEM COMPONENT
// ============================================================================

interface MenuItemProps {
  item: MenuItem;
}

const ICON_BG_COLORS: Record<string, string> = {
  green: Colors.greenLight,
  amber: Colors.amberLight,
  teal: Colors.accentLight,
  sage: 'rgba(110, 231, 183, 0.10)',
  blue: Colors.blueLight,
  purple: Colors.purpleLight,
};

const BADGE_COLORS: Record<string, { bg: string; color: string }> = {
  good:  { bg: 'rgba(16, 185, 129, 0.14)', color: Colors.green },
  warn:  { bg: 'rgba(245, 158, 11, 0.14)', color: Colors.amber },
  alert: { bg: 'rgba(239, 68, 68, 0.14)', color: '#FCA5A5' },
  info:  { bg: Colors.accentLight, color: Colors.accent },
  soon:  { bg: 'rgba(110, 231, 183, 0.12)', color: '#6EE7B7' },
};

function MenuItemRow({ item }: MenuItemProps) {
  const badgeStyle = item.badgeStyle ? BADGE_COLORS[item.badgeStyle] : null;

  return (
    <TouchableOpacity
      style={[_styles.menuItem, item.elevated && _styles.menuItemElevated]}
      onPress={item.onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${item.title}, ${item.subtitle}`}
    >
      <View style={[_styles.menuIconWrap, { backgroundColor: ICON_BG_COLORS[item.iconBg] || Colors.accentLight }]}>
        <Text style={_styles.menuIconText}>{item.icon}</Text>
      </View>
      <View style={_styles.menuBody}>
        <Text style={_styles.menuTitle}>{item.title}</Text>
        <Text style={_styles.menuSub}>{item.subtitle}</Text>
      </View>
      <View style={_styles.menuRight}>
        {item.badge && badgeStyle && (
          <View style={[_styles.menuBadge, { backgroundColor: badgeStyle.bg }]}>
            <Text style={[_styles.menuBadgeText, { color: badgeStyle.color }]}>{item.badge}</Text>
          </View>
        )}
        <Text style={_styles.menuChevron}>{'\u203A'}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ============================================================================
// SAMPLE DATA BANNER
// ============================================================================

interface SampleDataBannerProps {
  onDismiss: () => void;
  previouslySeen?: boolean;
}

function SampleDataBanner({ onDismiss, previouslySeen }: SampleDataBannerProps) {
  if (previouslySeen) {
    return (
      <TouchableOpacity
        style={_styles.sampleBannerCompact}
        onPress={onDismiss}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Dismiss preview mode banner"
      >
        <Text style={_styles.sampleBannerCompactText}>
          Preview mode — <Text style={_styles.sampleBannerCompactLink}>start tracking for real patterns</Text>
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={_styles.sampleBanner}>
      <View style={_styles.sampleBannerContent}>
        <Text style={_styles.sampleBannerIcon}>{'\u2728'}</Text>
        <View style={_styles.sampleBannerText}>
          <Text style={_styles.sampleBannerTitle}>Preview Mode</Text>
          <Text style={_styles.sampleBannerSubtitle}>
            This is sample data showing what insights will look like. Start tracking to see your real patterns.
          </Text>
        </View>
      </View>
      <TouchableOpacity
        style={_styles.sampleBannerDismiss}
        onPress={onDismiss}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilityRole="button"
        accessibilityLabel="Got it, dismiss preview mode"
      >
        <Text style={_styles.sampleBannerDismissText}>Got it</Text>
      </TouchableOpacity>
    </View>
  );
}

// ============================================================================
// VITALS COMPUTATION HELPERS
// ============================================================================

function computeVitalSummaries(readings: VitalReading[], timeRange: TimeRange): VitalSummary[] {
  const summaries: VitalSummary[] = [];

  const byType: Record<string, VitalReading[]> = {};
  for (const r of readings) {
    if (!byType[r.type]) byType[r.type] = [];
    byType[r.type].push(r);
  }

  for (const type of Object.keys(byType)) {
    byType[type].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  // Blood Pressure
  const systolic = byType['systolic'];
  const diastolic = byType['diastolic'];
  if (systolic && systolic.length > 0) {
    const latestSys = systolic[systolic.length - 1].value;
    const latestDia = diastolic?.[diastolic.length - 1]?.value ?? 0;
    const midpoint = Math.floor(systolic.length / 2);
    const firstHalfAvg = systolic.slice(0, Math.max(midpoint, 1)).reduce((s, r) => s + r.value, 0) / Math.max(midpoint, 1);
    const secondHalfAvg = systolic.slice(midpoint).reduce((s, r) => s + r.value, 0) / Math.max(systolic.length - midpoint, 1);
    const trending = secondHalfAvg - firstHalfAvg;
    const isHigh = latestSys >= 130 || latestDia >= 85;
    const isRising = trending > 3;

    summaries.push({
      icon: '\uD83E\uDEC0',
      name: 'Blood Pressure',
      description: isRising ? 'Trending up slightly' : isHigh ? 'Above target range' : 'Stable',
      descriptionTone: isHigh ? 'alert' : isRising ? 'warn' : 'normal',
      value: `${Math.round(latestSys)}/${Math.round(latestDia)}`,
      valueTone: isHigh ? 'alert' : isRising ? 'warn' : 'normal',
      trend: isRising ? '\u2191 avg mmHg' : '\u2192 stable',
      trendTone: isRising ? 'up' : 'stable',
      sparkPoints: generateSparkPoints(systolic.map(r => r.value)),
      sparkColor: isHigh ? Colors.red : isRising ? Colors.amber : 'rgba(20, 184, 166, 0.65)',
    });
  }

  // Heart Rate
  const hr = byType['heartRate'];
  if (hr && hr.length > 0) {
    const latest = hr[hr.length - 1].value;
    const midpoint = Math.floor(hr.length / 2);
    const firstAvg = hr.slice(0, Math.max(midpoint, 1)).reduce((s, r) => s + r.value, 0) / Math.max(midpoint, 1);
    const secondAvg = hr.slice(midpoint).reduce((s, r) => s + r.value, 0) / Math.max(hr.length - midpoint, 1);
    const trending = secondAvg - firstAvg;
    const isStable = Math.abs(trending) < 5;

    summaries.push({
      icon: '\uD83D\uDC93',
      name: 'Heart Rate',
      description: isStable ? 'Stable' : trending > 0 ? 'Slightly elevated' : 'Lower than usual',
      descriptionTone: isStable ? 'normal' : 'warn',
      value: `${Math.round(latest)} bpm`,
      valueTone: 'normal',
      trend: isStable ? '\u2192 stable' : trending > 0 ? '\u2191 slight' : '\u2193 slight',
      trendTone: isStable ? 'stable' : 'up',
      sparkPoints: generateSparkPoints(hr.map(r => r.value)),
      sparkColor: 'rgba(20, 184, 166, 0.65)',
    });
  }

  // Glucose
  const glucose = byType['glucose'];
  if (glucose && glucose.length > 0) {
    const aboveRange = glucose.filter(r => r.value > 180).length;
    const latest = glucose[glucose.length - 1].value;
    const hasAlerts = aboveRange > 0;
    const alertDots = hasAlerts
      ? glucose.map((r, i) => r.value > 180
          ? { cx: sparkX(i, glucose.length), cy: sparkY(r.value, glucose.map(v => v.value)) }
          : null
        ).filter(Boolean) as { cx: number; cy: number }[]
      : undefined;

    summaries.push({
      icon: '\uD83E\uDE78',
      name: 'Glucose',
      description: hasAlerts ? `${aboveRange} reading${aboveRange !== 1 ? 's' : ''} above range` : 'Within range',
      descriptionTone: hasAlerts ? 'alert' : 'normal',
      value: hasAlerts ? '\u26A0 review' : `${Math.round(latest)} mg/dL`,
      valueTone: hasAlerts ? 'alert' : 'normal',
      trend: hasAlerts ? 'tap to see' : '\u2192 stable',
      trendTone: hasAlerts ? 'flagged' : 'stable',
      sparkPoints: generateSparkPoints(glucose.map(r => r.value)),
      sparkColor: hasAlerts ? Colors.red : 'rgba(20, 184, 166, 0.65)',
      alertDots,
    });
  }

  // Weight
  const weight = byType['weight'];
  if (weight && weight.length >= 2) {
    const latest = weight[weight.length - 1].value;
    const first = weight[0].value;
    const change = latest - first;
    const isStable = Math.abs(change) < 2;

    summaries.push({
      icon: '\u2696\uFE0F',
      name: 'Weight',
      description: isStable ? 'Stable' : change > 0 ? 'Slight increase' : 'Slight decrease',
      descriptionTone: 'normal',
      value: `${latest.toFixed(1)} lbs`,
      valueTone: 'normal',
      trend: isStable ? '\u2192 stable' : change > 0 ? `\u2191 ${Math.abs(change).toFixed(1)}` : `\u2193 ${Math.abs(change).toFixed(1)}`,
      trendTone: isStable ? 'stable' : 'up',
      sparkPoints: generateSparkPoints(weight.map(r => r.value)),
      sparkColor: 'rgba(20, 184, 166, 0.65)',
    });
  }

  return summaries;
}

function generateSparkPoints(values: number[]): string {
  if (values.length === 0) return '';
  if (values.length === 1) return '25,11';
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  return values.map((v, i) => {
    const x = 2 + (i / (values.length - 1)) * 46;
    const y = 19 - ((v - min) / range) * 16;
    return `${x.toFixed(0)},${y.toFixed(0)}`;
  }).join(' ');
}

function sparkX(index: number, total: number): number {
  return 2 + (index / Math.max(total - 1, 1)) * 46;
}

function sparkY(value: number, allValues: number[]): number {
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const range = max - min || 1;
  return 19 - ((value - min) / range) * 16;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function UnderstandScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>(14);
  const [pageData, setPageData] = useState<UnderstandPageData | null>(null);
  const [providerPrep, setProviderPrep] = useState<ProviderPrepData | null>(null);
  const [vitalSummaries, setVitalSummaries] = useState<VitalSummary[]>([]);
  const [showPatternsSheet, setShowPatternsSheet] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [timeRange])
  );

  useDataListener(useCallback((cat: string) => {
    if (['carePlan', 'vitals', 'mood', 'journal', 'medication'].includes(cat)) {
      loadData();
    }
  }, [timeRange]));

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await loadUnderstandPageData(timeRange);
      setPageData(data);

      try {
        const now = new Date();
        const start = new Date(now);
        start.setDate(start.getDate() - timeRange);
        const readings = await getVitalsInRange(start.toISOString(), now.toISOString());
        setVitalSummaries(computeVitalSummaries(readings, timeRange));
      } catch {
        setVitalSummaries([]);
      }

      try {
        const prep = await buildProviderPrep(
          data.standOutInsights.map(i => ({
            category: i.relatedTo || 'general',
            summary: i.text,
          }))
        );
        setProviderPrep(prep);
      } catch {
        setProviderPrep(null);
      }
    } catch (error) {
      logError('UnderstandScreen.loadData', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [timeRange]);

  const handleDismissSampleData = async () => {
    await dismissSampleData();
    await loadData();
  };

  const navigateToRoute = (route: string | undefined) => {
    if (!route) return;
    const validRoute = getRouteOrFallback(route);
    if (validRoute) navigate(validRoute);
  };

  // Build menu items
  const menuItems: MenuItem[] = useMemo(() => {
    const items: MenuItem[] = [];

    if (providerPrep) {
      items.push({
        id: 'visit-prep',
        icon: '\uD83D\uDCCB',
        iconBg: 'sage',
        title: 'Visit Prep',
        subtitle: providerPrep.appointment
          ? `${providerPrep.appointment.provider} \u00B7 ${providerPrep.appointment.specialty} \u00B7 in ${providerPrep.appointment.daysUntil} day${providerPrep.appointment.daysUntil !== 1 ? 's' : ''}`
          : 'Prepare for your next visit',
        badge: providerPrep.questions?.length
          ? `${providerPrep.questions.length} question${providerPrep.questions.length !== 1 ? 's' : ''} ready`
          : undefined,
        badgeStyle: 'soon',
        elevated: true,
        onPress: () => navigate('/care-brief'),
      });
    }

    items.push({
      id: 'med-adherence',
      icon: '\uD83D\uDC8A',
      iconBg: 'amber',
      title: 'Medication Adherence',
      subtitle: `By time of day \u00B7 ${timeRange} days`,
      onPress: () => navigate('/medication-report'),
    });

    const patternCount = pageData?.correlationCards.length ?? 0;
    items.push({
      id: 'patterns',
      icon: '\uD83D\uDD17',
      iconBg: 'teal',
      title: 'Patterns Detected',
      subtitle: 'Sleep & mood \u00B7 Hydration & energy',
      badge: patternCount > 0 ? `${patternCount} pattern${patternCount !== 1 ? 's' : ''}` : undefined,
      badgeStyle: 'info',
      onPress: () => {
        if (patternCount > 0) {
          setShowPatternsSheet(true);
        } else {
          navigate('/trends');
        }
      },
    });

    items.push({
      id: 'vitals-trends',
      icon: '\uD83D\uDCC8',
      iconBg: 'blue',
      title: 'Vital Signs Trends',
      subtitle: 'BP, glucose, heart rate over time',
      onPress: () => navigate('/trends'),
    });

    items.push({
      id: 'med-report',
      icon: '\uD83D\uDCCA',
      iconBg: 'amber',
      title: 'Medication Report',
      subtitle: 'Full adherence history by med',
      onPress: () => navigate('/care-summary-export'),
    });

    items.push({
      id: 'care-report',
      icon: '\uD83D\uDCCB',
      iconBg: 'purple',
      title: 'Daily Care Report',
      subtitle: 'Complete summary \u00B7 export ready',
      onPress: () => navigate('/daily-care-report'),
    });

    return items;
  }, [providerPrep, timeRange, pageData?.correlationCards]);

  // Loading state
  if (loading && !pageData) {
    return (
      <View style={styles.container}>
        <AuroraBackground variant="hub" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Analyzing patterns...</Text>
        </View>
      </View>
    );
  }

  const adherencePct = Math.round(pageData?.adherenceRate ?? 0);
  const dosesLogged = pageData?.dosesLogged ?? 0;
  const dosesScheduled = pageData?.dosesScheduled ?? 0;
  const daysTracked = pageData?.daysOfData ?? 0;
  const patternsFound = pageData?.correlationCards.length ?? 0;

  return (
    <View style={styles.container}>
      <AuroraBackground variant="hub" />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
          }
        >
          {/* Header */}
          <ScreenHeader
            title="Understand"
            subtitle={`Last ${timeRange} days`}
            rightAction={
              pageData && !pageData.isSampleData && pageData.daysOfData >= 7
                ? <TimeRangeToggle value={timeRange} onChange={setTimeRange} />
                : undefined
            }
          />

          {/* Sample Data Banner */}
          {pageData?.isSampleData && (
            <SampleDataBanner
              onDismiss={handleDismissSampleData}
              previouslySeen={pageData.sampleDataPreviouslySeen}
            />
          )}

          {/* Data Building Banner */}
          {pageData && !pageData.isSampleData && pageData.daysOfData < 7 && (
            <View style={styles.dataBuildingBanner}>
              <Text style={styles.dataBuildingEmoji}>{'\uD83D\uDCCA'}</Text>
              <Text style={styles.dataBuildingTitle}>Building your picture</Text>
              <Text style={styles.dataBuildingSubtitle}>
                Keep tracking — patterns emerge after a few days.{'\n'}
                You've logged <Text style={{ color: colors.accent, fontWeight: '600' }}>{pageData.daysOfData} day{pageData.daysOfData !== 1 ? 's' : ''}</Text> so far.
              </Text>
            </View>
          )}

          {/* 1. STAT SPOTLIGHT */}
          <StatSpotlight
            adherencePct={adherencePct}
            dosesLogged={dosesLogged}
            dosesScheduled={dosesScheduled}
            daysTracked={daysTracked}
            patternsFound={patternsFound}
          />

          {/* 2. INSIGHT CALLOUT */}
          {pageData && pageData.positiveObservations.length > 0 && (
            <InsightCallout observations={pageData.positiveObservations} />
          )}

          {/* 3. PATTERNS DETECTED */}
          {pageData && pageData.correlationCards.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>PATTERNS DETECTED</Text>
              {pageData.correlationCards.map(card => (
                <PatternCard
                  key={card.id}
                  card={card}
                  onPress={() => setShowPatternsSheet(true)}
                />
              ))}
            </View>
          )}

          {/* 4. VITALS AT A GLANCE */}
          {vitalSummaries.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>VITALS AT A GLANCE {'\u00B7'} LAST {timeRange} DAYS</Text>
              <View style={styles.vitalsCard}>
                {vitalSummaries.map((vital) => (
                  <VitalRow
                    key={vital.name}
                    vital={vital}
                    onPress={() => navigate('/trends')}
                  />
                ))}
              </View>
            </View>
          )}

          {/* 5. MORE MENU */}
          <Text style={styles.menuLabel}>MORE</Text>
          <View style={styles.menuList}>
            {menuItems.map(item => (
              <MenuItemRow key={item.id} item={item} />
            ))}
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>

      {/* Patterns Sheet */}
      {pageData && (
        <PatternsSheet
          visible={showPatternsSheet}
          onClose={() => setShowPatternsSheet(false)}
          correlationCards={pageData.correlationCards}
          timeRange={timeRange}
        />
      )}
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const createStyles = (c: typeof Colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.xl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: 14,
    color: c.textSecondary,
  },

  // Time Range
  timeRangeContainer: {
    flexDirection: 'row',
    backgroundColor: c.glassHover,
    borderWidth: 1,
    borderColor: c.glassBorder,
    borderRadius: 8,
    overflow: 'hidden',
  },
  timeRangePill: {
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  timeRangePillActive: {
    backgroundColor: c.accentLight,
  },
  timeRangeText: {
    fontSize: 11,
    fontWeight: '600',
    color: c.textMuted,
  },
  timeRangeTextActive: {
    color: c.accent,
  },

  // Hero Card — adherence
  heroCard: {
    backgroundColor: c.accentLight,
    borderWidth: 1,
    borderColor: c.accentBorder,
    borderRadius: 18,
    padding: 18,
    paddingTop: 0,
    marginBottom: 10,
    overflow: 'hidden',
  },
  heroTopBar: {
    height: 3,
    backgroundColor: c.accent,
    marginHorizontal: -18,
    marginBottom: 14,
  },
  heroLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.4,
    color: c.textMuted,
    marginBottom: 2,
  },
  heroNumRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  heroNum: {
    fontSize: 40,
    fontWeight: '200',
    color: c.accent,
    lineHeight: 46,
  },
  heroUnit: {
    fontSize: 18,
    fontWeight: '400',
    color: c.textMuted,
    marginLeft: 2,
  },
  heroContext: {
    fontSize: 12,
    color: c.textTertiary,
    marginTop: 2,
  },

  // Chip Row — secondary stats
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  chip: {
    flex: 1,
    backgroundColor: c.glassDim,
    borderWidth: 1,
    borderColor: c.glassBorder,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  chipVal: {
    fontSize: 16,
    fontWeight: '500',
    color: c.textPrimary,
  },
  chipValDim: {
    fontSize: 13,
    fontWeight: '400',
    color: c.textMuted,
  },
  chipLabel: {
    fontSize: 11,
    color: c.textMuted,
    marginTop: 1,
  },

  // Insight Callout — left-bordered green
  insightCallout: {
    borderLeftWidth: 3,
    borderLeftColor: c.green,
    backgroundColor: c.greenTint,
    borderRadius: 12,
    padding: 12,
    paddingLeft: 14,
    marginBottom: 14,
  },
  insightCalloutRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  insightCalloutCheck: {
    color: c.green,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 1,
  },
  insightCalloutText: {
    fontSize: 13,
    color: c.textSecondary,
    lineHeight: 19,
    flex: 1,
  },

  // Pattern Card
  patternCard: {
    borderLeftWidth: 3,
    borderLeftColor: c.accent,
    backgroundColor: c.glassDim,
    borderRadius: 14,
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderTopColor: c.glassBorder,
    borderRightColor: c.glassBorder,
    borderBottomColor: c.glassBorder,
    padding: 14,
    paddingLeft: 16,
    marginBottom: 10,
  },
  patternTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  patternTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: c.textPrimary,
    flex: 1,
  },
  confStrong: {
    backgroundColor: c.accentLight,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  confEmerging: {
    backgroundColor: c.amberFaint,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  confText: {
    fontSize: 10,
    fontWeight: '600',
  },
  confTextStrong: {
    color: c.accent,
  },
  confTextEmerging: {
    color: '#FBBF24',
  },
  patternText: {
    fontSize: 12,
    color: c.textSecondary,
    lineHeight: 18,
    marginBottom: 10,
  },
  patternFooter: {
    fontSize: 10,
    color: c.textMuted,
    letterSpacing: 0.3,
  },

  // Section
  section: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.4,
    color: c.textMuted,
    textTransform: 'uppercase',
    marginBottom: 10,
    paddingHorizontal: 2,
  },

  // Vitals at a Glance
  vitalsCard: {
    backgroundColor: c.glassDim,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 16,
    overflow: 'hidden',
  },
  vitalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingVertical: 11,
    paddingHorizontal: 13,
    borderBottomWidth: 1,
    borderBottomColor: c.borderLight,
  },
  vitalIcon: {
    fontSize: 18,
    width: 26,
    textAlign: 'center',
  },
  vitalInfo: {
    flex: 1,
  },
  vitalName: {
    fontSize: 12,
    fontWeight: '600',
    color: c.textPrimary,
  },
  vitalDesc: {
    fontSize: 10,
    color: c.textMuted,
    marginTop: 1,
  },
  sparkContainer: {
    width: 50,
    height: 22,
  },
  vitalRight: {
    alignItems: 'flex-end',
  },
  vitalValue: {
    fontSize: 13,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  vitalTrend: {
    fontSize: 10,
    color: c.textMuted,
    marginTop: 1,
  },

  // More Menu
  menuLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.4,
    color: c.textMuted,
    textTransform: 'uppercase',
    paddingHorizontal: 2,
    marginBottom: 8,
    marginTop: 4,
  },
  menuList: {
    backgroundColor: c.glassDim,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 16,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: c.borderLight,
  },
  menuItemElevated: {
    backgroundColor: c.sageHint,
    borderBottomColor: c.sageLight,
  },
  menuIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIconText: {
    fontSize: 17,
  },
  menuBody: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: c.textPrimary,
  },
  menuSub: {
    fontSize: 11,
    color: c.textMuted,
    marginTop: 2,
  },
  menuRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  menuBadge: {
    paddingVertical: 2,
    paddingHorizontal: 7,
    borderRadius: 8,
  },
  menuBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  menuChevron: {
    fontSize: 16,
    color: c.glassStrong,
  },

  // Sample Data Banner
  sampleBanner: {
    backgroundColor: c.purpleLight,
    borderWidth: 1,
    borderColor: c.purpleStrong,
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
  },
  sampleBannerContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  sampleBannerIcon: {
    fontSize: 18,
    marginTop: 2,
  },
  sampleBannerText: {
    flex: 1,
  },
  sampleBannerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: c.purpleBright,
    marginBottom: 4,
  },
  sampleBannerSubtitle: {
    fontSize: 13,
    color: c.textSecondary,
    lineHeight: 18,
  },
  sampleBannerDismiss: {
    alignSelf: 'flex-end',
    backgroundColor: c.purpleWash,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  sampleBannerDismissText: {
    fontSize: 13,
    fontWeight: '600',
    color: c.purpleBright,
  },
  sampleBannerCompact: {
    backgroundColor: c.purpleFaint,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  sampleBannerCompactText: {
    fontSize: 12,
    color: 'rgba(167, 139, 250, 0.7)',
    textAlign: 'center',
  },
  sampleBannerCompactLink: {
    color: c.purpleBright,
    fontWeight: '500',
  },

  // Data Building Banner
  dataBuildingBanner: {
    backgroundColor: c.accentLight,
    borderWidth: 1,
    borderColor: c.accentBorder,
    borderRadius: 14,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  dataBuildingEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  dataBuildingTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: c.textBright,
    marginBottom: 6,
  },
  dataBuildingSubtitle: {
    fontSize: 12,
    color: c.textMuted,
    lineHeight: 18,
    textAlign: 'center',
  },
});

// Static styles for module-scope sub-components (benefit from _syncColors)
const _styles = createStyles(Colors);
