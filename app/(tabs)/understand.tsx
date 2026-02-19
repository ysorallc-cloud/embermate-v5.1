// ============================================================================
// UNDERSTAND PAGE - Interpretive Insight Layer
// Purpose: Explain what matters and why, not just show data
//
// Contains:
// - What Stands Out (top insights at a glance)
// - What's Going Well (positive observations)
// - Correlation Cards (with optional suggestions)
// - Find Patterns (deeper exploration tools)
//
// Explicit Non-Goals:
// - No medical advice
// - No duplication of Now, Record, or Care Plan content
// - No alerts, reminders, or tasks
// - No raw analytics without interpretation
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
import { Colors, Spacing, BorderRadius } from '../../theme/theme-tokens';
import { AuroraBackground } from '../../components/aurora/AuroraBackground';
import { GlassCard } from '../../components/aurora/GlassCard';
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
  ConfidenceLevel,
} from '../../utils/understandInsights';
import { logError } from '../../utils/devLog';
import { useDataListener } from '../../lib/events';
import { buildProviderPrep, ProviderPrepData } from '../../utils/providerPrepBuilder';
import { ProviderPrepCard } from '../../components/understand/ProviderPrepCard';
import { PatternsSheet } from '../../components/understand/PatternsSheet';
import { ScreenHeader } from '../../components/ScreenHeader';

// ============================================================================
// CONFIDENCE BADGE COMPONENT
// ============================================================================

interface ConfidenceBadgeProps {
  level: ConfidenceLevel;
}

function ConfidenceBadge({ level }: ConfidenceBadgeProps) {
  // Normalized pattern strength language: "Strong pattern" and "Emerging pattern"
  const config = {
    strong: { color: Colors.sageStrong, bg: Colors.sageBorder },
    emerging: { color: Colors.amberBrightStrong, bg: 'rgba(251, 191, 36, 0.15)' },
    early: { color: 'rgba(148, 163, 184, 0.8)', bg: 'rgba(148, 163, 184, 0.15)' },
  };

  // Normalize labels: both emerging and early show as "Emerging pattern"
  const labels = {
    strong: 'Strong pattern',
    emerging: 'Emerging pattern',
    early: 'Emerging pattern',  // Normalized from "Early signal"
  };

  const { color, bg } = config[level];

  return (
    <View style={[styles.confidenceBadge, { backgroundColor: bg }]}>
      <View style={[styles.confidenceDot, { backgroundColor: color }]} />
      <Text style={[styles.confidenceText, { color }]}>{labels[level]}</Text>
    </View>
  );
}

// ============================================================================
// TIME RANGE TOGGLE COMPONENT
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
    <View style={styles.timeRangeContainer}>
      {options.map(({ range, label }) => (
        <TouchableOpacity
          key={range}
          style={[
            styles.timeRangeOption,
            value === range && styles.timeRangeOptionSelected,
          ]}
          onPress={() => onChange(range)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`${label} range`}
          accessibilityState={{ selected: value === range }}
        >
          <Text style={[
            styles.timeRangeText,
            value === range && styles.timeRangeTextSelected,
          ]}>
            {label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ============================================================================
// STAND OUT INSIGHT ROW COMPONENT
// ============================================================================

interface StandOutRowProps {
  insight: StandOutInsight;
  onLinkPress?: () => void;
}

function getInsightBulletColor(insight: StandOutInsight): string {
  if (insight.confidence === 'emerging' || insight.confidence === 'early') return '#F59E0B';
  if (insight.relatedTo === 'record') return '#3B82F6';
  return Colors.accent;
}

function StandOutRow({ insight, onLinkPress }: StandOutRowProps) {
  return (
    <View style={styles.standOutRow}>
      <View style={[styles.standOutBullet, { backgroundColor: getInsightBulletColor(insight) }]} />
      <View style={styles.standOutContent}>
        <Text style={styles.standOutText}>{insight.text}</Text>
        {insight.linkRoute && insight.linkLabel && (
          <TouchableOpacity
            onPress={onLinkPress}
            activeOpacity={0.7}
            accessibilityRole="link"
            accessibilityLabel={insight.linkLabel}
          >
            <Text style={styles.standOutLink}>{insight.linkLabel} →</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ============================================================================
// POSITIVE OBSERVATION ROW COMPONENT
// ============================================================================

interface PositiveRowProps {
  observation: PositiveObservation;
}

function PositiveRow({ observation }: PositiveRowProps) {
  return (
    <View style={styles.positiveRow}>
      <Text style={styles.positiveIcon}>✓</Text>
      <Text style={styles.positiveText}>{observation.text}</Text>
    </View>
  );
}

// ============================================================================
// CORRELATION CARD COMPONENT
// ============================================================================

interface CorrelationCardComponentProps {
  card: CorrelationCard;
  onDismissSuggestion: (cardId: string) => void;
  onTrackThis?: (cardId: string, title: string) => void;
}

function CorrelationCardComponent({ card, onDismissSuggestion, onTrackThis }: CorrelationCardComponentProps) {
  const [suggestionHidden, setSuggestionHidden] = useState(card.suggestionDismissed);

  const handleDismiss = () => {
    setSuggestionHidden(true);
    onDismissSuggestion(card.id);
  };

  const handleTrackThis = () => {
    onTrackThis?.(card.id, card.title);
  };

  return (
    <GlassCard style={styles.correlationCard}>
      <View style={styles.correlationHeader}>
        <Text style={styles.correlationTitle}>{card.title}</Text>
        <ConfidenceBadge level={card.confidence} />
      </View>

      <Text style={styles.correlationInsight}>{card.insight}</Text>

      <Text style={styles.correlationDataPoints}>
        Based on {card.dataPoints} days of data
      </Text>

      {/* You Could Try Section - Enhanced with Track This CTA */}
      {card.suggestion && !suggestionHidden && (
        <View style={styles.suggestionContainer}>
          <View style={styles.suggestionHeader}>
            <Text style={styles.suggestionLabel}>You could try</Text>
            <TouchableOpacity
              onPress={handleDismiss}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel={`Dismiss suggestion for ${card.title}`}
            >
              <Text style={styles.suggestionDismiss}>×</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.suggestionText}>{card.suggestion}</Text>

          {/* Track This CTA - Allows follow-through */}
          <TouchableOpacity
            style={styles.trackThisButton}
            onPress={handleTrackThis}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`Track ${card.title}`}
          >
            <Text style={styles.trackThisText}>📝 Track this</Text>
          </TouchableOpacity>
        </View>
      )}
    </GlassCard>
  );
}

// ============================================================================
// PATTERN TOOL COMPONENT
// ============================================================================

interface PatternToolProps {
  icon: string;
  title: string;
  subtitle: string;
  onPress: () => void;
}

function PatternTool({ icon, title, subtitle, onPress }: PatternToolProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${subtitle}`}
    >
      <GlassCard style={styles.toolCard}>
        <View style={styles.toolContent}>
          <View style={styles.toolIcon}>
            <Text style={styles.toolIconText}>{icon}</Text>
          </View>
          <View style={styles.toolText}>
            <Text style={styles.toolTitle}>{title}</Text>
            <Text style={styles.toolSubtitle}>{subtitle}</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </View>
      </GlassCard>
    </TouchableOpacity>
  );
}

// ============================================================================
// SAMPLE DATA BANNER COMPONENT
// Shows smaller/demoted version after first dismissal
// ============================================================================

interface SampleDataBannerProps {
  onDismiss: () => void;
  previouslySeen?: boolean;
}

function SampleDataBanner({ onDismiss, previouslySeen }: SampleDataBannerProps) {
  // Demoted/smaller version after first viewing
  if (previouslySeen) {
    return (
      <TouchableOpacity
        style={styles.sampleBannerCompact}
        onPress={onDismiss}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Dismiss preview mode banner"
      >
        <Text style={styles.sampleBannerCompactText}>
          ✨ Preview mode — <Text style={styles.sampleBannerCompactLink}>start tracking for real patterns</Text>
        </Text>
      </TouchableOpacity>
    );
  }

  // Full version for first-time viewers
  return (
    <View style={styles.sampleBanner}>
      <View style={styles.sampleBannerContent}>
        <Text style={styles.sampleBannerIcon}>✨</Text>
        <View style={styles.sampleBannerText}>
          <Text style={styles.sampleBannerTitle}>Preview Mode</Text>
          <Text style={styles.sampleBannerSubtitle}>
            This is sample data showing what insights will look like. Start tracking to see your real patterns.
          </Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.sampleBannerDismiss}
        onPress={onDismiss}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilityRole="button"
        accessibilityLabel="Got it, dismiss preview mode"
      >
        <Text style={styles.sampleBannerDismissText}>Got it</Text>
      </TouchableOpacity>
    </View>
  );
}

// ============================================================================
// CONFIDENCE EXPLANATION COMPONENT
// One-time global explanation for pattern confidence
// ============================================================================

interface ConfidenceExplanationProps {
  onDismiss: () => void;
}

function ConfidenceExplanation({ onDismiss }: ConfidenceExplanationProps) {
  return (
    <View style={styles.confidenceExplanation}>
      <View style={styles.confidenceExplanationHeader}>
        <Text style={styles.confidenceExplanationTitle}>How patterns are detected</Text>
        <TouchableOpacity
          onPress={onDismiss}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Dismiss pattern explanation"
        >
          <Text style={styles.confidenceExplanationDismiss}>×</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.confidenceExplanationText}>
        We look for connections in your tracking data. <Text style={styles.confidenceExplanationBold}>Strong patterns</Text> appear
        consistently over 20+ days. <Text style={styles.confidenceExplanationBold}>Emerging patterns</Text> are
        forming but need more data to confirm.
      </Text>
      <Text style={styles.confidenceExplanationNote}>
        Patterns suggest connections, not causes. Discuss with your care team before making changes.
      </Text>
    </View>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function UnderstandScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>(14);
  const [pageData, setPageData] = useState<UnderstandPageData | null>(null);
  const [providerPrep, setProviderPrep] = useState<ProviderPrepData | null>(null);
  const [showPatternsSheet, setShowPatternsSheet] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [timeRange])
  );

  useDataListener(useCallback(() => { loadData(); }, [timeRange]));

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await loadUnderstandPageData(timeRange);
      setPageData(data);
      // Build provider prep questions from insights when appointment is near
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

  const handleTimeRangeChange = (range: TimeRange) => {
    setTimeRange(range);
  };

  const handleDismissSuggestion = async (cardId: string) => {
    await dismissSuggestion(`suggestion-${cardId}`);
  };

  const handleDismissSampleData = async () => {
    await dismissSampleData();
    await loadData();
  };

  const [confidenceExplanationDismissed, setConfidenceExplanationDismissed] = useState(false);

  const handleDismissConfidenceExplanation = async () => {
    setConfidenceExplanationDismissed(true);
    await markConfidenceExplained();
  };

  const handleTrackThis = (cardId: string, title: string) => {
    // Navigate to log-note with the pattern as context for tracking
    router.push({
      pathname: '/log-note',
      params: {
        prefillTitle: `Tracking: ${title}`,
        prefillContext: 'experiment',
      },
    } as any);
  };

  const navigateToRoute = (route: string | undefined) => {
    if (!route) return;
    const validRoute = getRouteOrFallback(route);
    if (validRoute) {
      navigate(validRoute);
    }
  };

  // Single deeper patterns tool
  const DEEPER_PATTERNS_TOOL = {
    icon: '🔍',
    title: 'Deeper Patterns',
    subtitle: 'Explore all correlations',
    route: '/trends',
  };

  if (loading && !pageData) {
    return (
      <View style={styles.container}>
        <AuroraBackground variant="hub" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.accent} />
          <Text style={styles.loadingText}>Analyzing patterns...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AuroraBackground variant="hub" />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.accent}
            />
          }
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <View style={styles.headerText}>
                <Text style={styles.headerTitle}>Understand</Text>
                <Text style={styles.headerSubtitle}>
                  {pageData && !pageData.isSampleData && pageData.daysOfData >= 7
                    ? "What's stabilizing"
                    : 'Patterns emerge with time'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.settingsButton}
                onPress={() => navigate('/settings')}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Settings"
              >
                <Text style={styles.settingsIcon}>⚙️</Text>
              </TouchableOpacity>
            </View>

            {/* Time Range Toggle — only show with enough data */}
            {pageData && !pageData.isSampleData && pageData.daysOfData >= 7 && (
              <TimeRangeToggle value={timeRange} onChange={handleTimeRangeChange} />
            )}
          </View>

          {/* Sample Data Banner - shows smaller version after first dismissal */}
          {pageData?.isSampleData && (
            <SampleDataBanner
              onDismiss={handleDismissSampleData}
              previouslySeen={pageData.sampleDataPreviouslySeen}
            />
          )}

          {/* Data Building — centered prominent card */}
          {pageData && !pageData.isSampleData && pageData.daysOfData < 7 && (
            <View style={styles.dataBuildingBanner}>
              <Text style={styles.dataBuildingEmoji}>📊</Text>
              <Text style={styles.dataBuildingTitle}>Building your picture</Text>
              <Text style={styles.dataBuildingSubtitle}>
                Keep tracking — patterns emerge after a few days.{'\n'}
                You've logged <Text style={{ color: Colors.accent, fontWeight: '600' }}>{pageData.daysOfData} day{pageData.daysOfData !== 1 ? 's' : ''}</Text> so far.
              </Text>
            </View>
          )}

          {/* One-time confidence explanation */}
          {pageData?.showConfidenceExplanation && !confidenceExplanationDismissed && (
            <ConfidenceExplanation onDismiss={handleDismissConfidenceExplanation} />
          )}

          {/* What Stands Out / What We Know So Far */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>
              {pageData && !pageData.isSampleData && pageData.daysOfData < 7
                ? 'WHAT WE KNOW SO FAR'
                : 'WHAT STANDS OUT'}
            </Text>
            <View style={styles.standOutCard}>
              {pageData?.standOutInsights.map((insight) => (
                <StandOutRow
                  key={insight.id}
                  insight={insight}
                  onLinkPress={() => navigateToRoute(insight.linkRoute)}
                />
              ))}

              {/* Data context badge */}
              {pageData && pageData.daysOfData > 0 && (
                <View style={styles.dataContextBadge}>
                  <Text style={styles.dataContextText}>
                    Based on {pageData.daysOfData} days of tracking
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* What's Going Well Section */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>WHAT'S GOING WELL</Text>
            <View style={styles.positiveCard}>
              {pageData?.positiveObservations.map((observation) => (
                <PositiveRow key={observation.id} observation={observation} />
              ))}
            </View>
          </View>

          {/* Correlation Cards */}
          {pageData && pageData.correlationCards.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionHeader}>PATTERNS DETECTED</Text>
              <View style={styles.correlationsContainer}>
                {pageData.correlationCards.slice(0, 3).map((card) => (
                  <CorrelationCardComponent
                    key={card.id}
                    card={card}
                    onDismissSuggestion={handleDismissSuggestion}
                    onTrackThis={handleTrackThis}
                  />
                ))}
              </View>
              {pageData.correlationCards.length > 3 && (
                <TouchableOpacity
                  style={styles.viewAllLink}
                  onPress={() => setShowPatternsSheet(true)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={`View all ${pageData.correlationCards.length} patterns`}
                >
                  <Text style={styles.viewAllText}>
                    View all {pageData.correlationCards.length} patterns →
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Provider Prep (when appointment within 5 days) */}
          {providerPrep && (
            <View style={styles.section}>
              <Text style={styles.sectionHeader}>VISIT PREP</Text>
              <ProviderPrepCard data={providerPrep} />
            </View>
          )}

          {/* Deeper Patterns */}
          <PatternTool
            icon={DEEPER_PATTERNS_TOOL.icon}
            title={DEEPER_PATTERNS_TOOL.title}
            subtitle={DEEPER_PATTERNS_TOOL.subtitle}
            onPress={() => navigateToRoute(DEEPER_PATTERNS_TOOL.route)}
          />

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
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
    color: Colors.textSecondary,
  },

  // Header
  header: {
    paddingTop: 60,
    paddingBottom: 12,
    marginBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '200',
    color: Colors.textPrimary,
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  settingsButton: {
    width: 30,
    height: 30,
    backgroundColor: Colors.glassActive,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  settingsIcon: {
    fontSize: 12,
    opacity: 0.5,
  },

  // Time Range Toggle (segmented pill buttons)
  timeRangeContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.glassActive,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  timeRangeOption: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
  },
  timeRangeOptionSelected: {
    backgroundColor: 'rgba(20,184,166,0.12)',
  },
  timeRangeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  timeRangeTextSelected: {
    color: Colors.accent,
  },

  // Sections
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textHalf,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 12,
    paddingHorizontal: 4,
  },

  // What Stands Out Card
  standOutCard: {
    backgroundColor: Colors.sageTint,
    borderWidth: 1,
    borderColor: Colors.sageBorder,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  standOutRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  standOutBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.accent,
    marginTop: 7,
  },
  standOutContent: {
    flex: 1,
  },
  standOutText: {
    fontSize: 15,
    color: Colors.textPrimary,
    lineHeight: 22,
  },
  standOutLink: {
    fontSize: 13,
    color: Colors.accent,
    marginTop: 4,
  },
  dataContextBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.border,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    marginTop: 4,
  },
  dataContextText: {
    fontSize: 11,
    color: Colors.textHalf,
  },

  // What's Going Well Card
  positiveCard: {
    backgroundColor: 'rgba(34, 197, 94, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.15)',
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  positiveRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  positiveIcon: {
    fontSize: 14,
    color: 'rgba(34, 197, 94, 0.8)',
    marginTop: 2,
  },
  positiveText: {
    flex: 1,
    fontSize: 14,
    color: Colors.textBright,
    lineHeight: 20,
  },

  // Correlation Cards
  correlationsContainer: {
    gap: 12,
  },
  correlationCard: {
    padding: 16,
    backgroundColor: Colors.glassFaint,
    borderColor: Colors.glassActive,
    borderWidth: 1,
  },
  correlationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  correlationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  correlationInsight: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.75)',
    lineHeight: 21,
    marginBottom: 8,
  },
  correlationDataPoints: {
    fontSize: 11,
    color: Colors.textMuted,
  },

  // View All Link
  viewAllLink: {
    marginTop: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.accent,
  },

  // Confidence Badge
  confidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 5,
  },
  confidenceDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  confidenceText: {
    fontSize: 10,
    fontWeight: '600',
  },

  // Suggestion Section
  suggestionContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  suggestionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  suggestionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.amberBrightStrong,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  suggestionDismiss: {
    fontSize: 18,
    color: Colors.textPlaceholder,
    fontWeight: '300',
  },
  suggestionText: {
    fontSize: 13,
    color: Colors.textTertiary,
    lineHeight: 19,
    fontStyle: 'italic',
  },

  // Pattern Tools
  toolCard: {
    padding: 14,
    backgroundColor: Colors.glassFaint,
    borderColor: Colors.glassActive,
    borderWidth: 1,
  },
  toolContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  toolIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.sageSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolIconText: {
    fontSize: 20,
    textAlign: 'center',
  },
  toolText: {
    flex: 1,
    justifyContent: 'center',
  },
  toolTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    letterSpacing: 0.2,
  },
  toolSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.55)',
    marginTop: 2,
  },
  chevron: {
    fontSize: 18,
    color: Colors.accentMuted,
    fontWeight: '600',
  },

  // Sample Data Banner
  sampleBanner: {
    backgroundColor: Colors.purpleLight,
    borderWidth: 1,
    borderColor: Colors.purpleStrong,
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
    color: Colors.purpleBright,
    marginBottom: 4,
  },
  sampleBannerSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  sampleBannerDismiss: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.purpleWash,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  sampleBannerDismissText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.purpleBright,
  },

  // Sample Data Banner - Compact version (after first dismissal)
  sampleBannerCompact: {
    backgroundColor: Colors.purpleFaint,
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
    color: Colors.purpleBright,
    fontWeight: '500',
  },

  // Confidence Explanation (one-time)
  confidenceExplanation: {
    backgroundColor: Colors.sageFaint,
    borderWidth: 1,
    borderColor: Colors.sageWash,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
  },
  confidenceExplanationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  confidenceExplanationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.sageBright,
  },
  confidenceExplanationDismiss: {
    fontSize: 18,
    color: Colors.textMuted,
    fontWeight: '300',
  },
  confidenceExplanationText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.75)',
    lineHeight: 19,
    marginBottom: 8,
  },
  confidenceExplanationBold: {
    fontWeight: '600',
    color: Colors.textAlmostFull,
  },
  confidenceExplanationNote: {
    fontSize: 11,
    color: Colors.textHalf,
    fontStyle: 'italic',
  },

  // Track This Button
  trackThisButton: {
    backgroundColor: Colors.sageBorder,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginTop: 12,
    alignItems: 'center',
  },
  trackThisText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.sageBright,
  },

  // Data Building Banner (centered)
  dataBuildingBanner: {
    backgroundColor: 'rgba(20,184,166,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(20,184,166,0.25)',
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
    color: Colors.textBright,
    marginBottom: 6,
  },
  dataBuildingSubtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 18,
    textAlign: 'center',
  },
});
