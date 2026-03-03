// ============================================================================
// JOURNAL PAGE - Narrative intelligence layer / shift-change briefing
// Six sections: Narrative, Handoff Notes, Patterns, Before Bed, Visit Prep,
//               Day at a Glance
// ============================================================================

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { navigate } from '../../lib/navigate';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Animated,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { AuroraBackground } from '../../components/aurora/AuroraBackground';
import { Colors, BorderRadius } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';
import {
  buildCareBrief,
  CareBrief,
  MedicationDetail,
} from '../../utils/careSummaryBuilder';
import { logError } from '../../utils/devLog';
import { useCareTasks } from '../../hooks/useCareTasks';
import { getTodayDateString } from '../../services/carePlanGenerator';
import { logAuditEvent, AuditEventType, AuditSeverity } from '../../utils/auditLog';
import { useDataListener } from '../../lib/events';
import { isBiometricEnabled, shouldLockSession, requireAuthentication, updateLastActivity, getAutoLockTimeout } from '../../utils/biometricAuth';
import { getNotesLogs, NotesLog } from '../../utils/centralStorage';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenHeader } from '../../components/ScreenHeader';
import { getAllInsights, InsightData, generateProviderQuestions, ProviderQuestion } from '../../utils/insightEngine';

// ============================================================================
// HELPERS
// ============================================================================

function formatTime(t: string): string {
  if (!t) return '';
  if (t.includes('T')) {
    const date = new Date(t);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }
  const parts = t.split(':');
  if (parts.length < 2) return t;
  const hr = parseInt(parts[0]);
  const min = parts[1];
  const period = hr >= 12 ? 'PM' : 'AM';
  return `${hr % 12 || 12}:${min} ${period}`;
}

const SLEEP_QUALITY_WORDS: Record<number, string> = {
  1: 'very poor',
  2: 'poor',
  3: 'fair',
  4: 'good',
  5: 'excellent',
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function JournalTab() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const s = useMemo(() => createStyles(colors), [colors]);
  const [brief, setBrief] = useState<CareBrief | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authRequired, setAuthRequired] = useState(false);
  const [todayNotes, setTodayNotes] = useState<NotesLog[]>([]);
  const [insights, setInsights] = useState<InsightData[]>([]);
  const [expandedPattern, setExpandedPattern] = useState<number | null>(null);
  const [providerQuestions, setProviderQuestions] = useState<ProviderQuestion[]>([]);
  const { state: careTasksState } = useCareTasks(getTodayDateString());

  // Animated values for chevron rotation on pattern cards
  const chevronAnims = useRef<Animated.Value[]>([]).current;

  const loadReport = useCallback(async () => {
    try {
      setError(null);
      const data = await buildCareBrief();
      setBrief(data);

      try {
        const allNotes = await getNotesLogs();
        const today = new Date().toDateString();
        const filtered = allNotes.filter(
          (n) => new Date(n.timestamp).toDateString() === today
        );
        setTodayNotes(filtered);
      } catch {
        setTodayNotes([]);
      }

      // Load insights
      try {
        const allInsights = await getAllInsights();
        setInsights(allInsights);
      } catch {
        setInsights([]);
      }

      // Load provider questions if appointment within 7 days
      if (data.nextAppointment) {
        const daysUntil = Math.max(0, Math.ceil(
          (new Date(data.nextAppointment.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        ));
        if (daysUntil <= 7) {
          try {
            const questions = await generateProviderQuestions('next', daysUntil);
            setProviderQuestions(questions);
          } catch {
            setProviderQuestions([]);
          }
        }
      }
    } catch (err) {
      logError('JournalTab.loadReport', err);
      setError('Unable to load today\u2019s care summary. Pull down to retry.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReport();
    logAuditEvent(AuditEventType.CARE_BRIEF_VIEWED, 'Care Brief viewed', AuditSeverity.INFO);
  }, [loadReport]);

  const reloadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useDataListener(useCallback((category) => {
    if (!['dailyInstances', 'carePlanItems', 'logs', 'vitals', 'water',
          'symptoms', 'mood', 'wellness', 'medication', 'notes',
          'carePlan', 'carePlanConfig', 'sampleDataCleared'].includes(category)) return;
    if (reloadTimerRef.current) clearTimeout(reloadTimerRef.current);
    reloadTimerRef.current = setTimeout(() => { loadReport(); }, 500);
  }, [loadReport]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadReport();
    setRefreshing(false);
  }, [loadReport]);

  // Auth gate
  useFocusEffect(
    useCallback(() => {
      const checkAuth = async () => {
        try {
          const enabled = await isBiometricEnabled();
          if (enabled) {
            const timeout = await getAutoLockTimeout();
            const stale = await shouldLockSession(timeout);
            setAuthRequired(stale);
          } else {
            setAuthRequired(false);
          }
        } catch (error) {
          logError('JournalTab.checkAuth', error);
          setAuthRequired(false);
        }
      };
      checkAuth();
    }, [])
  );

  const handleAuthenticate = async () => {
    const success = await requireAuthentication();
    if (success) {
      await updateLastActivity();
      setAuthRequired(false);
    }
  };

  // Ensure enough animated values for pattern cards
  while (chevronAnims.length < insights.length) {
    chevronAnims.push(new Animated.Value(0));
  }

  const togglePattern = (index: number) => {
    const isExpanding = expandedPattern !== index;
    // Collapse previous
    if (expandedPattern !== null && expandedPattern < chevronAnims.length) {
      Animated.timing(chevronAnims[expandedPattern], {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
    if (isExpanding && index < chevronAnims.length) {
      Animated.timing(chevronAnims[index], {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
    setExpandedPattern(isExpanding ? index : null);
  };

  // ============================================================================
  // RENDER — AUTH GATE
  // ============================================================================

  if (authRequired) {
    return (
      <View style={s.container}>
        <AuroraBackground variant="journal" />
        <View style={s.authGateContainer}>
          <Text style={s.authGateIcon}>{'\uD83D\uDD12'}</Text>
          <Text style={s.authGateTitle}>Care Brief Protected</Text>
          <Text style={s.authGateSubtitle}>
            Authenticate to view sensitive health information
          </Text>
          <TouchableOpacity
            style={s.authGateButton}
            onPress={handleAuthenticate}
            accessibilityLabel="Authenticate to view Care Brief"
            accessibilityRole="button"
          >
            <Text style={s.authGateButtonText}>Authenticate</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const dayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  if (loading && !brief) {
    return (
      <View style={s.container}>
        <AuroraBackground variant="journal" />
        <View style={s.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.accent} />
          <Text style={s.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  if (error && !brief) {
    return (
      <View style={s.container}>
        <AuroraBackground variant="journal" />
        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
          <ScrollView
            style={s.scrollView}
            contentContainerStyle={[s.scrollContent, { paddingBottom: insets.bottom + 70 }]}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />
            }
          >
            <ScreenHeader title="Journal" subtitle={`${dayName}, ${dateStr}`} purpose="Record thoughts and observations." />
            <View style={s.errorContainer}>
              <Text style={s.errorIcon}>{'\u26A0\uFE0F'}</Text>
              <Text style={s.errorText}>{error}</Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================
  const medsDone = brief?.medications.filter(m => m.status === 'completed' || m.status === 'skipped').length ?? 0;
  const medsTotal = brief?.medications.length ?? 0;
  const allMedsDone = medsDone === medsTotal && medsTotal > 0;
  const medsMissed = brief?.medications.filter(m => m.status === 'missed').length ?? 0;

  const mealsDone = brief?.meals.meals.filter(m => m.status === 'completed' || m.status === 'skipped').length ?? 0;
  const mealsTotal = brief?.meals.total ?? 0;

  const hasVitals = brief?.vitals.recorded ?? false;
  const hasMorning = brief?.mood.morningWellness != null;
  const hasEvening = brief?.mood.eveningWellness != null;

  const waterGlasses = brief?.hydration.glasses ?? 0;

  // Appointment
  const daysUntilAppt = brief?.nextAppointment
    ? Math.max(0, Math.ceil((new Date(brief.nextAppointment.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;
  const showAppointment = brief?.nextAppointment && daysUntilAppt != null && daysUntilAppt <= 7;

  // ============================================================================
  // BRIEFING NARRATIVE
  // ============================================================================
  function getBriefingText(): string {
    if (!brief) return '';
    if (brief.handoffNarrative && brief.handoffNarrative.trim().length > 0) {
      return brief.handoffNarrative;
    }
    if (brief.statusNarrative && brief.statusNarrative.trim().length > 0) {
      return brief.statusNarrative;
    }
    return buildHandoffSummary(brief, medsDone, medsTotal, allMedsDone, hasVitals);
  }

  // ============================================================================
  // DATA ROW HELPERS (reused by Day at a Glance)
  // ============================================================================
  type DotColor = 'green' | 'amber' | 'red';

  function getMedsDotColor(): DotColor {
    if (medsMissed > 0) return 'red';
    if (allMedsDone) return 'green';
    return 'amber';
  }

  function getMedsValue(): string {
    return `${medsDone}/${medsTotal}`;
  }

  function getMealsDotColor(): DotColor {
    const mealsMissed = brief?.meals.meals.filter(m => m.status === 'missed').length ?? 0;
    if (mealsMissed > 0) return 'red';
    if (mealsDone >= mealsTotal && mealsTotal > 0) return 'green';
    return 'amber';
  }

  function getHydrationDotColor(): DotColor {
    if (waterGlasses >= 8) return 'green';
    if (waterGlasses === 0) return 'red';
    return 'amber';
  }

  function getWellnessDotColor(): DotColor {
    if (hasMorning && hasEvening) return 'green';
    return 'amber';
  }

  function getWellnessValue(): string {
    const done = (hasMorning ? 1 : 0) + (hasEvening ? 1 : 0);
    return `${done}/2`;
  }

  function getSleepDotColor(): DotColor {
    if (!brief?.sleep.logged) return 'amber';
    return 'green';
  }

  function getSleepValue(): string {
    if (!brief?.sleep.logged) return '--';
    if (brief.sleep.quality != null && brief.sleep.quality >= 4) return 'Good';
    if (brief.sleep.quality != null && brief.sleep.quality <= 2) return 'Poor';
    return 'Logged';
  }

  function getVitalsDotColor(): DotColor {
    if (!hasVitals) return 'amber';
    const r = brief?.vitals?.readings;
    if (r && ((r.systolic ?? 0) > 140 || (r.diastolic ?? 0) > 90 || ((r.oxygen ?? 100) < 92))) return 'red';
    return 'green';
  }

  function getVitalsValue(): string {
    if (!hasVitals) return '--';
    const r = brief?.vitals?.readings;
    if (r && r.systolic != null && r.diastolic != null) return `${r.systolic}/${r.diastolic}`;
    return 'Logged';
  }

  function dotColorToStyle(dc: DotColor) {
    return dc === 'green' ? colors.green : dc === 'red' ? colors.redBright : colors.amberBright;
  }

  // ============================================================================
  // HANDOFF NOTES BUILDER
  // ============================================================================
  type HandoffType = 'flag' | 'watch' | 'done';
  interface HandoffItem {
    type: HandoffType;
    text: string;
  }

  function buildHandoffItems(): HandoffItem[] {
    if (!brief) return [];
    const items: HandoffItem[] = [];

    // Attention items
    for (const ai of brief.attentionItems) {
      const lower = ai.text.toLowerCase();
      let type: HandoffType = 'watch';
      if (lower.includes('missed') || lower.includes('not yet logged') || lower.includes('not completed') || lower.includes('severe') || lower.includes('risk')) {
        type = 'flag';
      }
      items.push({ type, text: ai.detail ? `${ai.text} \u2014 ${ai.detail}` : ai.text });
    }

    // Interpretations
    if (brief.interpretations?.medications) {
      items.push({ type: 'watch', text: brief.interpretations.medications });
    }
    if (brief.interpretations?.vitals) {
      items.push({ type: 'watch', text: brief.interpretations.vitals });
    }
    if (brief.interpretations?.nutrition) {
      items.push({ type: 'watch', text: brief.interpretations.nutrition });
    }

    // Completed meds with times
    const completedMeds = brief.medications.filter(m => m.status === 'completed');
    for (const med of completedMeds) {
      const time = med.takenAt ? formatTime(med.takenAt) : '';
      items.push({
        type: 'done',
        text: time ? `${med.name} taken at ${time}` : `${med.name} taken`,
      });
    }

    return items;
  }

  // ============================================================================
  // BEFORE BED ITEMS
  // ============================================================================
  interface BeforeBedItem {
    text: string;
    icon: string;
    route: string;
  }

  function getBeforeBedItems(): BeforeBedItem[] {
    const items: BeforeBedItem[] = [];

    // Pending evening/night tasks from care plan
    if (careTasksState) {
      const eveningTasks = careTasksState.byWindow['evening'] || [];
      const nightTasks = careTasksState.byWindow['night'] || [];
      const pendingTasks = [...eveningTasks, ...nightTasks].filter(t => t.status === 'pending');
      for (const task of pendingTasks) {
        items.push({
          text: task.title,
          icon: task.type === 'medication' ? '\uD83D\uDC8A' : '\u2705',
          route: task.primaryAction?.route || '/log-note',
        });
      }
    }

    // Unlogged sleep
    if (brief && !brief.sleep.logged) {
      items.push({
        text: 'Log last night\u2019s sleep',
        icon: '\uD83D\uDCA4',
        route: '/log-sleep',
      });
    }

    // Unlogged evening wellness
    if (!hasEvening && new Date().getHours() >= 17) {
      items.push({
        text: 'Complete evening wellness check',
        icon: '\uD83C\uDF19',
        route: '/log-evening-wellness',
      });
    }

    return items;
  }

  // ============================================================================
  // SEVERITY HELPERS
  // ============================================================================
  function severityColor(sev: 'info' | 'warning' | 'alert'): string {
    if (sev === 'alert') return colors.amberBright;
    if (sev === 'warning') return colors.amberBright;
    return colors.accent;
  }

  function handoffColor(type: HandoffType): string {
    if (type === 'flag') return colors.redBright;
    if (type === 'done') return colors.green;
    return colors.amberBright;
  }

  function handoffIcon(type: HandoffType): string {
    if (type === 'flag') return '\u26A0';
    if (type === 'done') return '\u2713';
    return '\u25CB';
  }

  // ============================================================================
  // RENDER — MAIN
  // ============================================================================

  const handoffItems = buildHandoffItems();
  const beforeBedItems = getBeforeBedItems();

  return (
    <View style={s.container}>
      <AuroraBackground variant="journal" />

      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView
          style={s.scrollView}
          contentContainerStyle={[s.scrollContent, { paddingBottom: insets.bottom + 70 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />
          }
        >
          {/* ─── HEADER ─── */}
          <ScreenHeader
            title="Journal"
            subtitle={`${dayName}, ${dateStr}`}
            purpose="Record thoughts and observations."
            style={s.journalHeader}
            rightAction={
              <TouchableOpacity
                style={s.headerHandoffBtn}
                onPress={() => navigate('/care-report?scope=today')}
                activeOpacity={0.7}
                accessibilityLabel="Share care report"
                accessibilityRole="button"
              >
                <Text style={s.headerHandoffBtnText}>{'\uD83D\uDCCB'} Share</Text>
              </TouchableOpacity>
            }
          />

          {/* ═══ SECTION 1: NARRATIVE ═══ */}
          <Text style={s.briefingText}>{getBriefingText()}</Text>

          <View style={s.zoneDivider} />

          {/* ═══ SECTION 2: HANDOFF NOTES ═══ */}
          {handoffItems.length > 0 && (
            <>
              <View style={s.sectionHeader}>
                <Text style={s.sectionTitle}>Handoff Notes</Text>
              </View>

              {handoffItems.map((item, i) => (
                <View
                  key={`handoff-${i}`}
                  style={[s.handoffItem, { borderLeftColor: handoffColor(item.type) }]}
                >
                  <Text style={[s.handoffIcon, { color: handoffColor(item.type) }]}>
                    {handoffIcon(item.type)}
                  </Text>
                  <Text style={s.handoffText}>{item.text}</Text>
                </View>
              ))}

              <View style={s.zoneDivider} />
            </>
          )}

          {/* ═══ SECTION 3: PATTERNS TO WATCH ═══ */}
          {insights.length > 0 && (
            <>
              <View style={s.sectionHeader}>
                <Text style={s.sectionTitle}>Patterns to Watch</Text>
              </View>

              {insights.map((insight, i) => {
                const isExpanded = expandedPattern === i;
                const rotate = i < chevronAnims.length
                  ? chevronAnims[i].interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '90deg'],
                    })
                  : '0deg';

                return (
                  <View key={insight.id}>
                    <TouchableOpacity
                      style={[s.patternCard, { borderLeftColor: severityColor(insight.severity) }]}
                      onPress={() => togglePattern(i)}
                      activeOpacity={0.7}
                      accessibilityLabel={`${insight.title}. ${isExpanded ? 'Collapse' : 'Expand'}`}
                      accessibilityRole="button"
                    >
                      <Text style={s.patternTitle}>{insight.title}</Text>
                      <Animated.Text
                        style={[s.patternChevron, { transform: [{ rotate }] }]}
                      >
                        {'\u203A'}
                      </Animated.Text>
                    </TouchableOpacity>

                    {isExpanded && (
                      <View style={[s.patternDetail, { borderLeftColor: severityColor(insight.severity) }]}>
                        <Text style={s.patternContext}>{insight.context}</Text>
                        {insight.actions.length > 0 && (
                          <TouchableOpacity
                            style={s.patternAction}
                            onPress={() => {
                              const action = insight.actions[0];
                              if (action.destination) navigate(action.destination);
                            }}
                            activeOpacity={0.7}
                          >
                            <Text style={s.patternActionText}>
                              {insight.actions[0].icon} {insight.actions[0].label}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                  </View>
                );
              })}

              <View style={s.zoneDivider} />
            </>
          )}

          {/* ═══ SECTION 4: BEFORE BED ═══ */}
          {beforeBedItems.length > 0 && (
            <>
              <View style={s.sectionHeader}>
                <Text style={s.sectionTitle}>Before Bed</Text>
              </View>

              {beforeBedItems.map((item, i) => (
                <TouchableOpacity
                  key={`bed-${i}`}
                  style={s.beforeBedItem}
                  onPress={() => navigate(item.route)}
                  activeOpacity={0.7}
                  accessibilityLabel={item.text}
                  accessibilityRole="button"
                >
                  <Text style={s.beforeBedIcon}>{item.icon}</Text>
                  <Text style={s.beforeBedText}>{item.text}</Text>
                  <Text style={s.beforeBedArrow}>{'\u2192'}</Text>
                </TouchableOpacity>
              ))}

              <View style={s.zoneDivider} />
            </>
          )}

          {/* ═══ SECTION 5: VISIT PREP ═══ */}
          {showAppointment && brief?.nextAppointment && (
            <>
              <View style={s.sectionHeader}>
                <Text style={s.sectionTitle}>
                  Visit Prep {'\u00B7'} {brief.nextAppointment.provider} in {daysUntilAppt} day{daysUntilAppt !== 1 ? 's' : ''}
                </Text>
              </View>

              {providerQuestions.length > 0 && (
                <View style={s.visitPrepQuestions}>
                  {providerQuestions.map((q, i) => (
                    <View key={q.id} style={s.visitPrepQuestion}>
                      <Text style={s.visitPrepNumber}>{i + 1}.</Text>
                      <Text style={s.visitPrepText}>{q.question}</Text>
                    </View>
                  ))}
                </View>
              )}

              <TouchableOpacity
                style={s.visitPrepLink}
                onPress={() => navigate('/provider-prep?appointmentId=next')}
                activeOpacity={0.7}
              >
                <Text style={s.visitPrepLinkText}>Full Visit Prep {'\u2192'}</Text>
              </TouchableOpacity>

              <View style={s.zoneDivider} />
            </>
          )}

          {/* ═══ SECTION 6: DAY AT A GLANCE ═══ */}
          {brief && (
            <>
              <View style={s.sectionHeader}>
                <Text style={s.sectionTitle}>Day at a Glance</Text>
              </View>

              <View style={s.glanceGrid}>
                {/* Meds */}
                {medsTotal > 0 && (
                  <View style={s.glanceTile}>
                    <Text style={[s.glanceValue, { color: dotColorToStyle(getMedsDotColor()) }]}>
                      {getMedsValue()}
                    </Text>
                    <Text style={s.glanceLabel}>Meds</Text>
                  </View>
                )}

                {/* Meals */}
                {mealsTotal > 0 && (
                  <View style={s.glanceTile}>
                    <Text style={[s.glanceValue, { color: dotColorToStyle(getMealsDotColor()) }]}>
                      {mealsDone}/{mealsTotal}
                    </Text>
                    <Text style={s.glanceLabel}>Meals</Text>
                  </View>
                )}

                {/* Water */}
                <View style={s.glanceTile}>
                  <Text style={[s.glanceValue, { color: dotColorToStyle(getHydrationDotColor()) }]}>
                    {waterGlasses}
                  </Text>
                  <Text style={s.glanceLabel}>Water</Text>
                </View>

                {/* Wellness */}
                <View style={s.glanceTile}>
                  <Text style={[s.glanceValue, { color: dotColorToStyle(getWellnessDotColor()) }]}>
                    {getWellnessValue()}
                  </Text>
                  <Text style={s.glanceLabel}>Wellness</Text>
                </View>

                {/* Sleep */}
                <View style={s.glanceTile}>
                  <Text style={[s.glanceValue, { color: dotColorToStyle(getSleepDotColor()) }]}>
                    {getSleepValue()}
                  </Text>
                  <Text style={s.glanceLabel}>Sleep</Text>
                </View>

                {/* BP (only if vitals logged) */}
                {hasVitals && (
                  <View style={s.glanceTile}>
                    <Text style={[s.glanceValue, { color: dotColorToStyle(getVitalsDotColor()) }]}>
                      {getVitalsValue()}
                    </Text>
                    <Text style={s.glanceLabel}>BP</Text>
                  </View>
                )}
              </View>
            </>
          )}

          {/* ─── TIMESTAMP ─── */}
          {brief && (
            <Text style={s.timestamp}>
              Updated {new Date(brief.generatedAt).toLocaleTimeString('en-US', {
                hour: 'numeric', minute: '2-digit',
              })} {'\u00B7'} Not a medical record
            </Text>
          )}

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ============================================================================
// HELPER
// ============================================================================

function buildHandoffSummary(
  brief: CareBrief,
  medsDone: number,
  medsTotal: number,
  allMedsDone: boolean,
  hasVitals: boolean,
): string {
  if (brief.handoffNarrative && brief.handoffNarrative.trim().length > 0) {
    return brief.handoffNarrative;
  }
  const parts: string[] = [];
  if (medsTotal > 0) {
    if (allMedsDone) {
      parts.push(`All ${medsTotal} medications taken.`);
    } else {
      const pending = medsTotal - medsDone;
      parts.push(`${pending} medication${pending === 1 ? '' : 's'} still pending.`);
    }
  }
  if (!hasVitals && brief.vitals.scheduled) {
    parts.push('Vitals not yet recorded.');
  }
  if (!brief.mood.morningWellness && !brief.mood.eveningWellness) {
    parts.push('Wellness check pending.');
  } else if (!brief.mood.eveningWellness) {
    parts.push('Evening wellness check pending.');
  }
  if (brief.nextAppointment) {
    const dateStr = new Date(brief.nextAppointment.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    parts.push(`Next: ${brief.nextAppointment.provider} on ${dateStr}.`);
  }
  return parts.join(' ') || 'No pending items.';
}

// ============================================================================
// STYLES
// ============================================================================

const createStyles = (c: typeof Colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: c.textSecondary,
    fontSize: 16,
    marginTop: 10,
  },
  errorContainer: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  errorIcon: {
    fontSize: 32,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 14,
    color: c.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Auth Gate
  authGateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  authGateIcon: { fontSize: 48, marginBottom: 16 },
  authGateTitle: { fontSize: 20, fontWeight: '600', color: c.textPrimary, marginBottom: 8 },
  authGateSubtitle: { fontSize: 14, color: c.textSecondary, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  authGateButton: { backgroundColor: c.accent, paddingHorizontal: 32, paddingVertical: 14, borderRadius: BorderRadius.lg },
  authGateButtonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },

  // ─── HEADER ───
  journalHeader: {
    borderBottomWidth: 1,
    borderBottomColor: c.glassBorder,
    marginBottom: 16,
  },
  headerHandoffBtn: {
    backgroundColor: c.accentDim,
    borderWidth: 1,
    borderColor: c.accentBorder,
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 9,
  },
  headerHandoffBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: c.accent,
  },

  // ─── SECTION HEADER ───
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 18,
    paddingBottom: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: c.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },

  // ─── ZONE DIVIDER ───
  zoneDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    marginHorizontal: -16,
    marginTop: 12,
  },

  // ─── BRIEFING ───
  briefingText: {
    fontSize: 16,
    color: c.textPrimary,
    lineHeight: 25,
    marginBottom: 8,
  },

  // ─── HANDOFF NOTES ───
  handoffItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderLeftWidth: 3,
    paddingLeft: 10,
    paddingVertical: 7,
    marginBottom: 6,
    gap: 8,
  },
  handoffIcon: {
    fontSize: 13,
    marginTop: 1,
    fontWeight: '700',
  },
  handoffText: {
    flex: 1,
    fontSize: 13,
    color: c.textSecondary,
    lineHeight: 19,
  },

  // ─── PATTERNS ───
  patternCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderLeftWidth: 3,
    paddingLeft: 10,
    paddingVertical: 12,
    marginBottom: 2,
  },
  patternTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: c.textPrimary,
  },
  patternChevron: {
    fontSize: 18,
    color: c.textMuted,
    marginLeft: 8,
  },
  patternDetail: {
    borderLeftWidth: 3,
    paddingLeft: 10,
    paddingBottom: 12,
    marginBottom: 8,
  },
  patternContext: {
    fontSize: 13,
    color: c.textSecondary,
    lineHeight: 19,
    marginBottom: 8,
  },
  patternAction: {
    backgroundColor: 'rgba(45,200,180,0.08)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  patternActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: c.accent,
  },

  // ─── BEFORE BED ───
  beforeBedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    marginBottom: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(45,200,180,0.12)',
    backgroundColor: 'rgba(45,200,180,0.03)',
    gap: 10,
  },
  beforeBedIcon: {
    fontSize: 16,
  },
  beforeBedText: {
    flex: 1,
    fontSize: 14,
    color: c.textPrimary,
  },
  beforeBedArrow: {
    fontSize: 14,
    color: c.accent,
    fontWeight: '600',
  },

  // ─── VISIT PREP ───
  visitPrepQuestions: {
    marginBottom: 8,
  },
  visitPrepQuestion: {
    flexDirection: 'row',
    paddingVertical: 6,
    gap: 8,
  },
  visitPrepNumber: {
    fontSize: 13,
    fontWeight: '600',
    color: c.textMuted,
    width: 20,
  },
  visitPrepText: {
    flex: 1,
    fontSize: 13,
    color: c.textSecondary,
    lineHeight: 19,
  },
  visitPrepLink: {
    paddingVertical: 6,
  },
  visitPrepLinkText: {
    fontSize: 13,
    fontWeight: '600',
    color: c.accent,
  },

  // ─── DAY AT A GLANCE ───
  glanceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  glanceTile: {
    width: '33.33%' as any,
    alignItems: 'center',
    paddingVertical: 12,
  },
  glanceValue: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 2,
  },
  glanceLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: c.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  // ─── TIMESTAMP ───
  timestamp: {
    fontSize: 10,
    color: c.textTertiary,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 16,
  },
});
