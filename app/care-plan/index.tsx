// ============================================================================
// CARE PLAN HOME — Three-zone layout: Tracking, Daily Schedule, Available
// ============================================================================

import React, { useState, useCallback, useMemo, useRef } from 'react';
import { navigate } from '../../lib/navigate';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, BorderRadius } from '../../theme/theme-tokens';
import { useCarePlanConfig } from '../../hooks/useCarePlanConfig';
import {
  BucketType,
  BucketConfig,
  BUCKET_META,
  BUCKET_TYPES,
  PRIMARY_BUCKETS,
  SECONDARY_BUCKETS,
  OPTIONAL_BUCKETS,
  TIME_OF_DAY_DEFAULTS,
  MealsBucketConfig,
} from '../../types/carePlanConfig';
import { InfoModal, InfoIconButton } from '../../components/common/InfoModal';
import { CARE_PLAN_TEMPLATES, CarePlanTemplate, TemplateMedSuggestion } from '../../constants/carePlanTemplates';
import { TemplateMedSeedingModal } from '../../components/careplan/TemplateMedSeedingModal';
import { AddItemSheet } from '../../components/careplan/AddItemSheet';

// ============================================================================
// HELPERS
// ============================================================================

function formatTimeLabel(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${period}`;
}

// ============================================================================
// SECTION HEADER ROW
// ============================================================================

function SectionHeaderRow({ title, action, onAction }: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.sectionHeaderRow}>
      <Text style={styles.sectionHeaderTitle}>{title}</Text>
      {action && onAction && (
        <TouchableOpacity onPress={onAction} activeOpacity={0.7}>
          <Text style={styles.sectionHeaderAction}>{action} {'\u2192'}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ============================================================================
// CATEGORY ROW — replaces BucketCard
// ============================================================================

interface CategoryRowProps {
  bucket: BucketType;
  emoji: string;
  name: string;
  detail: string | null;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  onPress: () => void;
}

function CategoryRow({ bucket, emoji, name, detail, enabled, onToggle, onPress }: CategoryRowProps) {
  return (
    <TouchableOpacity
      style={styles.categoryRow}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityLabel={`${name}, ${enabled ? 'enabled' : 'disabled'}. Tap to configure.`}
      accessibilityRole="button"
    >
      <Text style={styles.categoryEmoji}>{emoji}</Text>
      <View style={styles.categoryInfo}>
        <Text style={styles.categoryName}>{name}</Text>
        {detail && <Text style={styles.categoryDetail}>{detail}</Text>}
      </View>
      <Switch
        value={enabled}
        onValueChange={onToggle}
        trackColor={{ false: Colors.glassStrong, true: Colors.accent }}
        thumbColor={enabled ? Colors.textPrimary : Colors.switchThumbOff}
        ios_backgroundColor={Colors.glassStrong}
      />
      <Text style={styles.categoryChevron}>{'\u203A'}</Text>
    </TouchableOpacity>
  );
}

// ============================================================================
// AI INSIGHT CARD
// ============================================================================

interface AIInsightCardProps {
  icon: string;
  title: string;
  message: string;
  onDismiss?: () => void;
}

function AIInsightCard({ icon, title, message, onDismiss }: AIInsightCardProps) {
  return (
    <View style={styles.aiInsightCard}>
      <View style={styles.aiInsightHeader}>
        <Text style={styles.aiInsightIcon}>{icon}</Text>
        <Text style={styles.aiInsightTitle}>{title}</Text>
        {onDismiss && (
          <TouchableOpacity onPress={onDismiss} style={styles.aiInsightDismiss} accessibilityLabel={`Dismiss ${title} insight`} accessibilityRole="button">
            <Text style={styles.aiInsightDismissText}>{'\u00D7'}</Text>
          </TouchableOpacity>
        )}
      </View>
      <Text style={styles.aiInsightMessage}>{message}</Text>
    </View>
  );
}

// ============================================================================
// TEMPLATE CARD
// ============================================================================

interface TemplateCardProps {
  template: CarePlanTemplate;
  onApply: () => void;
}

function TemplateCard({ template, onApply }: TemplateCardProps) {
  const bucketNames = template.enabledBuckets
    .map(b => BUCKET_META[b].name)
    .join(', ');

  return (
    <TouchableOpacity
      style={styles.templateCard}
      onPress={onApply}
      activeOpacity={0.7}
      accessibilityLabel={`Apply ${template.name} template`}
      accessibilityRole="button"
    >
      <View style={styles.templateHeader}>
        <Text style={styles.templateEmoji}>{template.emoji}</Text>
        <Text style={styles.templateName}>{template.name}</Text>
      </View>
      <Text style={styles.templateDescription}>{template.description}</Text>
      <Text style={styles.templateBuckets}>Enables: {bucketNames}</Text>
    </TouchableOpacity>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function CarePlanHomeScreen() {
  const router = useRouter();
  const {
    config,
    loading,
    hasCarePlan,
    enabledBuckets,
    toggleBucket,
    updateBucket,
    getBucketStatus,
    initializeConfig,
  } = useCarePlanConfig();

  const [dismissedInsights, setDismissedInsights] = useState<string[]>([]);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [addItemWindow, setAddItemWindow] = useState<string | null>(null);
  const [medSeedingTemplate, setMedSeedingTemplate] = useState<{ name: string; suggestions: TemplateMedSuggestion[] } | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const availableSectionY = useRef<number>(0);

  // Split buckets into enabled and disabled
  const allBuckets: BucketType[] = [...PRIMARY_BUCKETS, ...SECONDARY_BUCKETS, ...OPTIONAL_BUCKETS];
  const enabledBucketSet = new Set(enabledBuckets);
  const disabledBuckets = allBuckets.filter(b => !enabledBucketSet.has(b));

  // Ensure config exists on first load
  React.useEffect(() => {
    if (!loading && !config) {
      initializeConfig();
    }
  }, [loading, config, initializeConfig]);

  const handleToggleBucket = useCallback(async (bucket: BucketType, enabled: boolean) => {
    await toggleBucket(bucket, enabled);
  }, [toggleBucket]);

  const handleConfigureBucket = useCallback((bucket: BucketType) => {
    switch (bucket) {
      case 'meds': navigate('/care-plan/meds'); break;
      case 'vitals': navigate('/care-plan/vitals'); break;
      case 'meals': navigate('/care-plan/meals'); break;
      case 'water': navigate('/care-plan/water'); break;
      case 'sleep': navigate('/care-plan/sleep'); break;
      case 'activity': navigate('/care-plan/activity'); break;
      case 'appointments': navigate('/appointments'); break;
      default: break;
    }
  }, []);

  const dismissInsight = useCallback((id: string) => {
    setDismissedInsights(prev => [...prev, id]);
  }, []);

  const applyTemplate = useCallback(async (template: CarePlanTemplate) => {
    let currentConfig = config;
    if (!currentConfig) {
      currentConfig = await initializeConfig();
    }

    const enabledSet = new Set(template.enabledBuckets);

    for (const bucket of BUCKET_TYPES) {
      if (!enabledSet.has(bucket)) {
        await updateBucket(bucket, { enabled: false });
      }
    }

    for (const bucket of template.enabledBuckets) {
      const suggestion = template.suggestedSettings[bucket];
      const updates: Partial<BucketConfig> = { enabled: true };

      if (suggestion) {
        if (suggestion.priority) updates.priority = suggestion.priority;
        if (suggestion.timesOfDay) updates.timesOfDay = suggestion.timesOfDay;
      }

      await updateBucket(bucket, updates);

      if (suggestion) {
        const bucketSpecific: Record<string, any> = {};
        if (suggestion.vitalTypes) bucketSpecific.vitalTypes = suggestion.vitalTypes;
        if (suggestion.frequency) bucketSpecific.frequency = suggestion.frequency;
        if (suggestion.trackingStyle) bucketSpecific.trackingStyle = suggestion.trackingStyle;
        if (suggestion.dailyGoalGlasses) bucketSpecific.dailyGoalGlasses = suggestion.dailyGoalGlasses;

        if (Object.keys(bucketSpecific).length > 0) {
          await updateBucket(bucket, bucketSpecific);
        }
      }
    }

    if (template.suggestedMedications && template.suggestedMedications.length > 0) {
      setMedSeedingTemplate({
        name: template.name,
        suggestions: template.suggestedMedications,
      });
    }
  }, [config, initializeConfig, updateBucket]);

  // ============================================================================
  // DAILY SCHEDULE — build chronological schedule from config
  // ============================================================================

  const scheduleItems = useMemo(() => {
    if (!config) return [];
    const items: { time: string; label: string }[] = [];

    // Wellness — morning, afternoon, evening when enabled
    if (config.wellness?.enabled) {
      items.push(
        { time: '07:00', label: 'Morning wellness' },
        { time: '13:00', label: 'Afternoon wellness' },
        { time: '20:00', label: 'Evening wellness' },
      );
    }

    // Meals — use timesOfDay from config
    if (config.meals?.enabled) {
      const mealsConfig = config.meals as MealsBucketConfig;
      const times = mealsConfig.timesOfDay || ['morning', 'midday', 'evening'];
      const mealNames: Record<string, string> = {
        morning: 'Breakfast', midday: 'Lunch', evening: 'Dinner',
      };
      times.forEach(tod => {
        items.push({
          time: TIME_OF_DAY_DEFAULTS[tod] || '08:00',
          label: mealNames[tod] || 'Meal',
        });
      });
    }

    // Vitals
    if (config.vitals?.enabled) {
      const times = config.vitals.timesOfDay || ['morning'];
      times.forEach(tod => {
        items.push({
          time: TIME_OF_DAY_DEFAULTS[tod] || '08:00',
          label: 'Vitals check',
        });
      });
    }

    // Water
    if (config.water?.enabled) {
      items.push({ time: '08:00', label: 'Water tracking' });
    }

    // Sleep
    if (config.sleep?.enabled) {
      items.push({ time: '22:00', label: 'Sleep log' });
    }

    // Activity
    if (config.activity?.enabled) {
      const times = config.activity.timesOfDay || ['morning'];
      times.forEach(tod => {
        items.push({
          time: TIME_OF_DAY_DEFAULTS[tod] || '09:00',
          label: 'Activity',
        });
      });
    }

    // Medications — from meds config
    if (config.meds?.enabled) {
      const medsConfig = config.meds;
      const medications = medsConfig.medications || [];
      medications.filter(m => m.active).forEach(med => {
        const time = med.scheduledTimeHHmm || TIME_OF_DAY_DEFAULTS[med.timesOfDay?.[0]] || '08:00';
        items.push({ time, label: med.name });
      });
    }

    // Sort chronologically
    items.sort((a, b) => a.time.localeCompare(b.time));

    // Group by time
    const grouped = new Map<string, string[]>();
    items.forEach(({ time, label }) => {
      if (!grouped.has(time)) grouped.set(time, []);
      grouped.get(time)!.push(label);
    });

    return Array.from(grouped.entries()).map(([time, labels]) => ({ time, labels }));
  }, [config]);

  // ============================================================================
  // CONTEXTUAL INSIGHT
  // ============================================================================

  const getContextualInsight = useCallback(() => {
    if (!config) return null;

    if (!hasCarePlan && !dismissedInsights.includes('start-simple')) {
      return {
        id: 'start-simple',
        icon: '\uD83D\uDCA1',
        title: 'Start simple',
        message: 'Try enabling Medications and Mood first. You can add more categories anytime.',
      };
    }

    if (config.meds.enabled) {
      const medsConfig = config.meds;
      if (!medsConfig.medications?.length && !dismissedInsights.includes('add-meds')) {
        return {
          id: 'add-meds',
          icon: '\uD83D\uDC8A',
          title: 'Add medications',
          message: 'Tap Configure on Medications to add your first medication and set up reminders.',
        };
      }

      const medsWithSupply = (medsConfig.medications || []).filter(m => m.supplyEnabled && m.active);
      const medsNeedingRefill = medsWithSupply.filter(m =>
        m.daysSupply !== undefined && m.refillThresholdDays !== undefined &&
        m.daysSupply <= m.refillThresholdDays
      );
      if (medsNeedingRefill.length > 0 && !dismissedInsights.includes('refill-reminder')) {
        return {
          id: 'refill-reminder',
          icon: '\uD83D\uDD14',
          title: 'Refill reminder',
          message: `${medsNeedingRefill[0].name} supply is running low. Consider ordering a refill soon.`,
        };
      }
    }

    const enabledCount = enabledBuckets.length;
    if (enabledCount >= 6 && !dismissedInsights.includes('focus-suggestion')) {
      return {
        id: 'focus-suggestion',
        icon: '\uD83C\uDFAF',
        title: 'Focus for better habits',
        message: "You've enabled many categories. Consider starting with 2-3 that matter most, then add more once those feel natural.",
      };
    }

    if (config.vitals.enabled) {
      const vitalsConfig = config.vitals;
      if ((!vitalsConfig.vitalTypes || vitalsConfig.vitalTypes.length === 0) && !dismissedInsights.includes('select-vitals')) {
        return {
          id: 'select-vitals',
          icon: '\uD83D\uDCCA',
          title: 'Choose vitals to track',
          message: 'Tap Configure on Vitals to select which measurements to track.',
        };
      }
    }

    if (hasCarePlan && config) {
      const anyNotificationsEnabled = enabledBuckets.some((bucket: BucketType) => config[bucket]?.notificationsEnabled);
      if (!anyNotificationsEnabled && !dismissedInsights.includes('enable-notifications')) {
        return {
          id: 'enable-notifications',
          icon: '\uD83D\uDD14',
          title: 'Stay on track',
          message: 'Enable reminders on any category to get gentle notifications when things are due.',
        };
      }
    }

    return null;
  }, [config, hasCarePlan, enabledBuckets, dismissedInsights]);

  const contextualInsight = getContextualInsight();

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[Colors.backgroundGradientStart, Colors.backgroundGradientEnd]}
          style={styles.gradient}
        >
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.accent} />
          </View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={[Colors.backgroundGradientStart, Colors.backgroundGradientEnd]}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()} accessibilityLabel="Go back" accessibilityRole="button">
            <Text style={styles.backIcon}>{'\u2190'}</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerLabel}>CARE PLAN</Text>
          </View>
          <InfoIconButton onPress={() => setShowInfoModal(true)} />
        </View>

        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Info Modal */}
          <InfoModal
            visible={showInfoModal}
            onClose={() => setShowInfoModal(false)}
            title="About Your Care Plan"
            content="Your Care Plan sets the routine for typical days. Changes here update future schedules permanently."
            hint="Use 'Adjust Today' from the Now screen for one-day changes that reset tomorrow."
          />

          {/* Quick Start Templates — only when no care plan exists */}
          {!hasCarePlan && (
            <>
              <Text style={styles.templateIntroLabel}>QUICK START</Text>
              <Text style={styles.templateIntro}>
                Choose a template to get started, then customize as needed.
              </Text>
              {CARE_PLAN_TEMPLATES.map(template => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onApply={() => applyTemplate(template)}
                />
              ))}
            </>
          )}

          {/* Contextual AI Insight */}
          {contextualInsight && (
            <AIInsightCard
              icon={contextualInsight.icon}
              title={contextualInsight.title}
              message={contextualInsight.message}
              onDismiss={() => dismissInsight(contextualInsight.id)}
            />
          )}

          {/* ═══ ZONE 1: TRACKING ═══ */}
          <SectionHeaderRow title={"Tracking"} />

          {enabledBuckets.map(bucket => (
            <CategoryRow
              key={bucket}
              bucket={bucket}
              emoji={BUCKET_META[bucket].emoji}
              name={BUCKET_META[bucket].name}
              detail={getBucketStatus(bucket)}
              enabled={true}
              onToggle={(val) => handleToggleBucket(bucket, val)}
              onPress={() => handleConfigureBucket(bucket)}
            />
          ))}

          {enabledBuckets.length === 0 && hasCarePlan && (
            <Text style={styles.emptyText}>No categories enabled. Enable one below to start tracking.</Text>
          )}

          {disabledBuckets.length > 0 && (
            <TouchableOpacity
              style={styles.addCategoryLink}
              onPress={() => {
                scrollViewRef.current?.scrollTo({ y: availableSectionY.current, animated: true });
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.addCategoryText}>+ Add category</Text>
            </TouchableOpacity>
          )}

          {/* ═══ ZONE 2: DAILY SCHEDULE ═══ */}
          {scheduleItems.length > 0 && (
            <>
              <SectionHeaderRow
                title={"Daily Schedule"}
                action="Edit Times"
                onAction={() => {
                  if (enabledBuckets.length > 0) {
                    handleConfigureBucket(enabledBuckets[0]);
                  }
                }}
              />

              {scheduleItems.map(({ time, labels }) => (
                <View key={time} style={styles.schedRow}>
                  <Text style={styles.schedTime}>{formatTimeLabel(time)}</Text>
                  <View style={styles.schedChips}>
                    {labels.map(label => (
                      <Text key={label} style={styles.schedChip}>{label}</Text>
                    ))}
                  </View>
                </View>
              ))}
            </>
          )}

          {/* ═══ ZONE 3: AVAILABLE ═══ */}
          {disabledBuckets.length > 0 && (
            <>
              <View onLayout={(e) => { availableSectionY.current = e.nativeEvent.layout.y; }}>
                <SectionHeaderRow title={"Available"} />
              </View>
              {disabledBuckets.map(bucket => (
                <View key={bucket} style={styles.availRow}>
                  <Text style={styles.availEmoji}>{BUCKET_META[bucket].emoji}</Text>
                  <View style={styles.availInfo}>
                    <Text style={styles.availName}>{BUCKET_META[bucket].name}</Text>
                    <Text style={styles.availDesc} numberOfLines={2}>{BUCKET_META[bucket].aiInsight}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.enableBtn}
                    onPress={() => handleToggleBucket(bucket, true)}
                    activeOpacity={0.7}
                    accessibilityLabel={`Enable ${BUCKET_META[bucket].name}`}
                    accessibilityRole="button"
                  >
                    <Text style={styles.enableBtnText}>Enable</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </>
          )}

          {/* Bottom spacing */}
          <View style={{ height: 40 }} />
        </ScrollView>
      </LinearGradient>

      {/* Add Item Sheet */}
      <AddItemSheet
        visible={!!addItemWindow}
        windowLabel={addItemWindow ?? undefined}
        onClose={() => setAddItemWindow(null)}
      />

      {/* Med Seeding Modal */}
      {medSeedingTemplate && (
        <TemplateMedSeedingModal
          visible={!!medSeedingTemplate}
          templateName={medSeedingTemplate.name}
          suggestions={medSeedingTemplate.suggestions}
          onClose={() => setMedSeedingTemplate(null)}
        />
      )}
    </SafeAreaView>
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
  gradient: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingTop: Platform.OS === 'android' ? 20 : 0,
    paddingBottom: Spacing.md,
  },
  backButton: {
    width: 44,
    height: 44,
    backgroundColor: Colors.backgroundElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 24,
    color: Colors.textPrimary,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    letterSpacing: 1,
    fontWeight: '600',
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: 40,
  },

  // Section Header Row
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 20,
    paddingBottom: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.04)',
    marginTop: 8,
  },
  sectionHeaderTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  sectionHeaderAction: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.accent,
  },

  // Category Row (Zone 1: Tracking)
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.025)',
    gap: 10,
  },
  categoryEmoji: {
    fontSize: 20,
    width: 32,
    textAlign: 'center',
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  categoryDetail: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  categoryChevron: {
    fontSize: 18,
    color: Colors.textMuted,
    marginLeft: 4,
  },

  // Add category link
  addCategoryLink: {
    paddingVertical: 10,
  },
  addCategoryText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.accent,
  },
  emptyText: {
    fontSize: 13,
    color: Colors.textMuted,
    paddingVertical: 12,
  },

  // Schedule Row (Zone 2: Daily Schedule)
  schedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    gap: 8,
  },
  schedTime: {
    fontSize: 11,
    color: Colors.textMuted,
    width: 56,
    textAlign: 'right',
  },
  schedChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    flex: 1,
  },
  schedChip: {
    fontSize: 10,
    color: Colors.textSecondary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    backgroundColor: 'rgba(255,255,255,0.02)',
    overflow: 'hidden',
  },

  // Available Row (Zone 3: Available)
  availRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.025)',
    gap: 10,
  },
  availEmoji: {
    fontSize: 20,
    width: 32,
    textAlign: 'center',
    opacity: 0.5,
  },
  availInfo: {
    flex: 1,
  },
  availName: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textMuted,
  },
  availDesc: {
    fontSize: 11,
    color: Colors.textTertiary,
    marginTop: 2,
    lineHeight: 15,
  },
  enableBtn: {
    backgroundColor: 'rgba(20, 184, 166, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.15)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  enableBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.accent,
  },

  // AI Insight Card
  aiInsightCard: {
    backgroundColor: Colors.purpleMuted,
    borderWidth: 1,
    borderColor: Colors.purpleStrong,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  aiInsightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  aiInsightIcon: {
    fontSize: 20,
  },
  aiInsightTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: Colors.purpleBright,
  },
  aiInsightDismiss: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiInsightDismissText: {
    fontSize: 20,
    color: Colors.textHalf,
  },
  aiInsightMessage: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },

  // Templates
  templateIntroLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textHalf,
    letterSpacing: 1,
    marginBottom: Spacing.md,
    marginTop: Spacing.xl,
  },
  templateIntro: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  templateCard: {
    backgroundColor: Colors.glassFaint,
    borderWidth: 1,
    borderColor: Colors.glassActive,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  templateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  templateEmoji: {
    fontSize: 22,
  },
  templateName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  templateDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: Spacing.sm,
  },
  templateBuckets: {
    fontSize: 12,
    color: Colors.accent,
    fontWeight: '500',
  },
});
