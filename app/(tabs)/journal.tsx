// ============================================================================
// JOURNAL PAGE - Narrative intelligence layer (shift-change briefing)
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
  Alert,
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
import { getAllInsights, InsightData } from '../../utils/insightEngine';
import { logError } from '../../utils/devLog';
import { useCareTasks } from '../../hooks/useCareTasks';
import { useEnabledBuckets } from '../../hooks/useCarePlanConfig';
import { getTodayDateString } from '../../services/carePlanGenerator';
import { logAuditEvent, AuditEventType, AuditSeverity } from '../../utils/auditLog';
import { useDataListener } from '../../lib/events';
import { EVENT } from '../../lib/eventNames';
import { isBiometricEnabled, shouldLockSession, requireAuthentication, updateLastActivity, getAutoLockTimeout } from '../../utils/biometricAuth';
import { getNotesLogs, NotesLog } from '../../utils/centralStorage';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenHeader } from '../../components/ScreenHeader';
import { CarePlanTask } from '../../types/carePlanTask';
import { getMedicalInfo, MedicalInfo } from '../../utils/medicalInfo';
import { safeGetItem } from '../../utils/safeStorage';
import { StorageKeys } from '../../utils/storageKeys';
import { getMedications } from '../../utils/medicationStorage';
import { hasSampleData } from '../../utils/sampleDataManager';
import { ReportPreviewModal } from '../../components/shared/ReportPreviewModal';
import { buildDailySummaryReport, buildClinicalReportData } from '../../utils/reportBuilders';
import { generateAndSharePDF, ReportData } from '../../utils/pdfExport';

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
  const chevronAnims = useRef<Animated.Value[]>([]).current;
  const { state: careTasksState } = useCareTasks(getTodayDateString());
  const { enabledBuckets } = useEnabledBuckets();
  const [medicalInfo, setMedicalInfo] = useState<MedicalInfo | null>(null);
  const [patientName, setPatientName] = useState('');
  const [patientAge, setPatientAge] = useState<string | null>(null);
  const [activeMedCount, setActiveMedCount] = useState(0);
  const [isSampleMode, setIsSampleMode] = useState(false);
  const [showDailyPreview, setShowDailyPreview] = useState(false);
  const [showClinicalPreview, setShowClinicalPreview] = useState(false);
  const [dailyReport, setDailyReport] = useState<{ reportData: ReportData; previewLines: string[] } | null>(null);
  const [clinicalReport, setClinicalReport] = useState<{ reportData: ReportData; previewLines: string[] } | null>(null);
  const [exporting, setExporting] = useState(false);

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

      // Load patient context for patient card + share
      try {
        const [mi, name, ageVal, meds] = await Promise.all([
          getMedicalInfo(),
          safeGetItem<string>(StorageKeys.PATIENT_NAME, ''),
          safeGetItem<string | null>(StorageKeys.PATIENT_AGE ?? '@embermate_patient_age', null),
          getMedications(),
        ]);
        setMedicalInfo(mi);
        setPatientName(name || '');
        setPatientAge(ageVal);
        setActiveMedCount(meds?.length ?? 0);
      } catch {
        // Non-critical — patient card just won't show
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
  const lastLoadDoneRef = useRef(0);
  useDataListener(useCallback((category) => {
    if (![
      EVENT.DAILY_INSTANCES, EVENT.CARE_PLAN_ITEMS, EVENT.LOGS, EVENT.VITALS,
      EVENT.WATER, EVENT.SYMPTOMS, EVENT.MOOD, EVENT.WELLNESS, EVENT.MEDICATION,
      EVENT.NOTES, EVENT.CARE_PLAN, EVENT.CARE_PLAN_CONFIG, EVENT.SAMPLE_DATA_CLEARED,
      EVENT.APPOINTMENTS,
    ].includes(category as any)) return;
    // Suppress config events that are self-generated by ensureDailyInstances sync
    if (['carePlanItems', 'carePlanConfig'].includes(category) && Date.now() - lastLoadDoneRef.current < 2000) return;
    if (reloadTimerRef.current) clearTimeout(reloadTimerRef.current);
    reloadTimerRef.current = setTimeout(() => { loadReport().finally(() => { lastLoadDoneRef.current = Date.now(); }); }, 500);
    if (category === EVENT.SAMPLE_DATA_CLEARED) {
      setIsSampleMode(false);
    }
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
      hasSampleData().then(setIsSampleMode);
    }, [])
  );

  const handleAuthenticate = async () => {
    const success = await requireAuthentication();
    if (success) {
      await updateLastActivity();
      setAuthRequired(false);
    }
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
  const mealsMissed = brief?.meals.meals.filter(m => m.status === 'missed').length ?? 0;

  const hasVitals = brief?.vitals.recorded ?? false;
  const wellnessDone = brief?.wellnessChecks.done ?? 0;
  const wellnessTotal = brief?.wellnessChecks.total ?? 0;
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
  // HELPERS FOR DAY AT A GLANCE
  // ============================================================================
  type DotColor = 'green' | 'amber' | 'red' | 'muted';

  function getMedsDotColor(): DotColor {
    if (medsTotal === 0) return 'muted';
    if (medsMissed > 0) return 'red';
    if (allMedsDone) return 'green';
    return 'amber';
  }

  function getMedsValue(): string {
    return `${medsDone}/${medsTotal}`;
  }

  function getMealsDotColor(): DotColor {
    if (mealsTotal === 0) return 'muted';
    if (mealsMissed > 0) return 'red';
    if (mealsDone >= mealsTotal && mealsTotal > 0) return 'green';
    return 'amber';
  }

  function getHydrationDotColor(): DotColor {
    if (waterGlasses >= 8) return 'green';
    if (waterGlasses === 0) return 'muted';
    return 'amber';
  }

  function getWellnessDotColor(): DotColor {
    if (wellnessTotal === 0) return 'muted';
    if (wellnessDone >= wellnessTotal) return 'green';
    if (wellnessDone > 0) return 'amber';
    return 'muted';
  }

  function getWellnessValue(): string {
    return `${wellnessDone}/${wellnessTotal}`;
  }

  function getSleepDotColor(): DotColor {
    if (!brief?.sleep.logged) return 'muted';
    return 'green';
  }

  function getSleepValue(): string {
    if (!brief?.sleep.logged) return '\u2014';
    if (brief.sleep.hours != null) return `${brief.sleep.hours}h`;
    return 'Logged';
  }

  function getVitalsDotColor(): DotColor {
    if (!hasVitals) return 'muted';
    const r = brief?.vitals?.readings;
    if (r && ((r.systolic ?? 0) > 140 || (r.diastolic ?? 0) > 90 || ((r.oxygen ?? 100) < 92))) return 'red';
    return 'green';
  }

  function getVitalsValue(): string {
    if (!hasVitals) return '\u2014';
    const r = brief?.vitals?.readings;
    if (r?.systolic != null && r?.diastolic != null) return `${r.systolic}/${r.diastolic}`;
    return 'Logged';
  }

  function dotColorToStyle(dc: DotColor) {
    switch (dc) {
      case 'green': return colors.green;
      case 'amber': return colors.amberBright;
      case 'red': return colors.redBright;
      default: return colors.textTertiary;
    }
  }

  // ============================================================================
  // HANDOFF NOTES
  // ============================================================================
  type HandoffType = 'done' | 'watch' | 'flag';
  interface HandoffItem { icon: string; text: string; type: HandoffType; }

  function buildHandoffNotes(): HandoffItem[] {
    if (!brief) return [];
    const items: HandoffItem[] = [];

    // Completed meds with times
    for (const med of brief.medications) {
      if ((med.status === 'completed' || med.status === 'skipped') && med.takenAt) {
        items.push({
          icon: '\uD83D\uDC8A',
          text: `${med.name} taken at ${formatTime(med.takenAt)}`,
          type: 'done',
        });
      }
    }

    // Attention items
    if (brief.attentionItems) {
      for (const ai of brief.attentionItems) {
        const text = ai.text || '';
        let type: HandoffType = 'watch';
        if (/miss|skip|overdue/i.test(text)) type = 'flag';
        const icon = type === 'flag' ? '\uD83D\uDED1' : '\uD83D\uDC41\uFE0F';
        items.push({ icon, text, type });
      }
    }

    // Interpretations
    if (brief.interpretations?.medications) {
      items.push({ icon: '\uD83D\uDC8A', text: brief.interpretations.medications, type: 'watch' });
    }
    if (brief.interpretations?.vitals) {
      items.push({ icon: '\uD83C\uDF21\uFE0F', text: brief.interpretations.vitals, type: 'watch' });
    }
    if (brief.interpretations?.nutrition) {
      items.push({ icon: '\uD83C\uDF5E', text: brief.interpretations.nutrition, type: 'watch' });
    }

    return items;
  }

  // ============================================================================
  // BEFORE BED
  // ============================================================================
  interface BeforeBedItem { icon: string; text: string; route: string; }

  function buildBeforeBedItems(): BeforeBedItem[] {
    const items: BeforeBedItem[] = [];

    // Pending evening/night tasks
    if (careTasksState) {
      const eveningTasks = careTasksState.byWindow['evening'] || [];
      const nightTasks = careTasksState.byWindow['night'] || [];
      for (const task of [...eveningTasks, ...nightTasks]) {
        if (task.status === 'pending') {
          items.push({
            icon: task.emoji || '\u2705',
            text: task.title,
            route: task.primaryAction?.route || '',
          });
        }
      }
    }

    // Unlogged sleep
    if (brief && !brief.sleep.logged) {
      items.push({ icon: '\uD83D\uDE34', text: 'Log sleep when she goes to bed', route: '/log-sleep' });
    }

    // Unlogged evening wellness
    if (brief && !hasEvening && new Date().getHours() >= 17) {
      items.push({ icon: '\uD83D\uDCCB', text: 'Evening wellness check', route: '/log-evening-wellness' });
    }

    return items;
  }

  // ============================================================================
  // SHARE / REPORT HANDLERS
  // ============================================================================
  function handleShareDaily() {
    if (!brief) return;
    const result = buildDailySummaryReport(
      brief,
      dateStr,
      dayName,
      glanceStats,
      buildHandoffNotes(),
    );
    setDailyReport(result);
    setShowDailyPreview(true);
  }

  function handleShareClinical() {
    if (!brief) return;
    const result = buildClinicalReportData(brief);
    setClinicalReport(result);
    setShowClinicalPreview(true);
  }

  function handleDailyExport() {
    if (!dailyReport) return;
    Alert.alert(
      'Share Daily Summary',
      'This PDF contains health information. Only share with trusted caregivers or healthcare providers.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Share PDF',
          onPress: async () => {
            setExporting(true);
            try {
              await generateAndSharePDF(dailyReport.reportData, {
                name: patientName || undefined,
                age: patientAge || undefined,
              });
              setShowDailyPreview(false);
            } catch { /* user cancelled or error handled in util */ }
            setExporting(false);
          },
        },
      ],
    );
  }

  function handleClinicalExport() {
    if (!clinicalReport) return;
    Alert.alert(
      'Share Clinical Report',
      'This PDF contains full medical history, medications, and vitals. Only share with healthcare providers.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Share PDF',
          style: 'destructive',
          onPress: async () => {
            setExporting(true);
            try {
              await generateAndSharePDF(clinicalReport.reportData, {
                name: patientName || undefined,
                age: patientAge || undefined,
              });
              setShowClinicalPreview(false);
            } catch { /* user cancelled or error handled in util */ }
            setExporting(false);
          },
        },
      ],
    );
  }

  // ============================================================================
  // PATTERN EXPAND/COLLAPSE
  // ============================================================================
  // Ensure we have enough animated values
  while (chevronAnims.length < insights.length) {
    chevronAnims.push(new Animated.Value(0));
  }

  const togglePattern = (index: number) => {
    const expanding = expandedPattern !== index;
    // Collapse previous
    if (expandedPattern != null && expandedPattern < chevronAnims.length) {
      Animated.timing(chevronAnims[expandedPattern], {
        toValue: 0, duration: 200, useNativeDriver: true,
      }).start();
    }
    if (expanding) {
      Animated.timing(chevronAnims[index], {
        toValue: 1, duration: 200, useNativeDriver: true,
      }).start();
      setExpandedPattern(index);
    } else {
      setExpandedPattern(null);
    }
  };

  // ============================================================================
  // SEVERITY HELPERS
  // ============================================================================
  function handoffBorderColor(type: HandoffType): string {
    switch (type) {
      case 'flag': return colors.redBright;
      case 'watch': return colors.amberBright;
      case 'done': return colors.green;
    }
  }

  function handoffBgColor(type: HandoffType): string {
    switch (type) {
      case 'flag': return 'rgba(239,68,68,0.06)';
      case 'watch': return 'rgba(245,158,11,0.05)';
      case 'done': return 'rgba(74,222,128,0.05)';
    }
  }

  function patternBorderColor(severity: string): string {
    if (severity === 'alert') return colors.redBright;
    if (severity === 'warning') return colors.amberBright;
    return 'rgba(96,165,250,0.3)';
  }

  // ============================================================================
  // BUILD DATA
  // ============================================================================
  const handoffNotes = buildHandoffNotes();
  const beforeBedItems = buildBeforeBedItems();

  // All possible glance tiles, keyed by their Care Plan bucket type
  const allGlanceTiles: { bucket: string; label: string; value: string; color: string }[] = [
    { bucket: 'meds',     label: 'Meds',     value: getMedsValue(),                color: dotColorToStyle(getMedsDotColor()) },
    { bucket: 'meals',    label: 'Meals',     value: `${mealsDone}/${mealsTotal}`,  color: dotColorToStyle(getMealsDotColor()) },
    { bucket: 'water',    label: 'Water',     value: `${waterGlasses}/8`,           color: dotColorToStyle(getHydrationDotColor()) },
    { bucket: 'wellness', label: 'Wellness',  value: getWellnessValue(),            color: dotColorToStyle(getWellnessDotColor()) },
    { bucket: 'sleep',    label: 'Sleep',     value: getSleepValue(),               color: dotColorToStyle(getSleepDotColor()) },
    { bucket: 'vitals',   label: 'BP',        value: getVitalsValue(),              color: dotColorToStyle(getVitalsDotColor()) },
  ];

  // Filter to only buckets the user has enabled in Care Plan
  // If no buckets configured yet, fall back to showing all (first-run experience)
  const glanceStats = enabledBuckets.length > 0
    ? allGlanceTiles.filter(t => enabledBuckets.includes(t.bucket as any))
    : allGlanceTiles;

  // ============================================================================
  // PATIENT CONTEXT
  // ============================================================================
  const activeDiagnoses = (medicalInfo?.diagnoses ?? []).filter(d => d.status === 'active');
  const allergies = medicalInfo?.allergies ?? [];
  const showPatientCard = patientName.length > 0;

  // ============================================================================
  // RENDER — MAIN
  // ============================================================================
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
              <View style={s.headerButtons}>
                <TouchableOpacity
                  style={s.headerShareBtn}
                  onPress={handleShareDaily}
                  activeOpacity={0.7}
                  accessibilityLabel="Share daily summary"
                  accessibilityRole="button"
                >
                  <Text style={s.headerShareBtnText}>{'\uD83D\uDCCB'} Share</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={s.headerReportBtn}
                  onPress={handleShareClinical}
                  activeOpacity={0.7}
                  accessibilityLabel="Clinical report"
                  accessibilityRole="button"
                >
                  <Text style={s.headerReportBtnText}>{'\uD83E\uDE7A'} Report</Text>
                </TouchableOpacity>
              </View>
            }
          />

          {/* ─── SAMPLE DATA INDICATOR ─── */}
          {isSampleMode && (
            <View style={s.sampleIndicator}>
              <Text style={s.sampleIndicatorText}>{'\u{1F4CA}'} Sample data — not real patient information</Text>
            </View>
          )}

          {/* ─── PATIENT CONTEXT CARD ─── */}
          {showPatientCard && (
            <TouchableOpacity
              style={s.patientCard}
              onPress={() => navigate('/patient')}
              activeOpacity={0.7}
              accessibilityLabel={`Patient: ${patientName}. Tap to view profile.`}
              accessibilityRole="button"
            >
              <View style={s.patientCardAvatar}>
                <Text style={s.patientCardAvatarText}>{patientName.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={s.patientCardInfo}>
                <View style={s.patientCardNameRow}>
                  <Text style={s.patientCardName}>{patientName}</Text>
                  {patientAge != null && (
                    <Text style={s.patientCardAge}>{patientAge} y/o</Text>
                  )}
                  {allergies.length > 0 && (
                    <View style={s.allergyBadge}>
                      <Text style={s.allergyBadgeText}>{'\u26A0'} {allergies[0]}</Text>
                    </View>
                  )}
                </View>
                {activeDiagnoses.length > 0 && (
                  <Text style={s.patientCardConditions} numberOfLines={1}>
                    {activeDiagnoses.map(d => d.condition).join(' \u00B7 ')}
                  </Text>
                )}
              </View>
              <Text style={s.patientCardChevron}>{'\u203A'}</Text>
            </TouchableOpacity>
          )}

          {/* ═══════════════════════════════════════════════════════
              SECTION 1: THE NARRATIVE
              ═══════════════════════════════════════════════════════ */}
          <Text style={s.narrativeText}>{getBriefingText()}</Text>

          {/* First-use guidance when nothing logged today */}
          {medsTotal === 0 && mealsTotal === 0 && waterGlasses === 0 && !hasMorning && !hasEvening && !hasVitals && (
            <View style={s.firstUseCard}>
              <Text style={s.firstUseTitle}>Your journal builds as you log</Text>
              <Text style={s.firstUseText}>
                Track medications, meals, vitals, or mood from the Now tab and your daily summary will appear here.
              </Text>
            </View>
          )}

          <View style={s.divider} />

          {/* ═══════════════════════════════════════════════════════
              SECTION 2: HANDOFF NOTES
              ═══════════════════════════════════════════════════════ */}
          {handoffNotes.length > 0 && (
            <>
              <View style={s.sectionHeader}>
                <Text style={s.sectionTitle}>Handoff Notes</Text>
              </View>
              {handoffNotes.map((item, i) => (
                <View
                  key={`handoff-${i}`}
                  style={[
                    s.handoffItem,
                    {
                      borderLeftColor: handoffBorderColor(item.type),
                      backgroundColor: handoffBgColor(item.type),
                    },
                  ]}
                >
                  <Text style={s.handoffIcon}>{item.icon}</Text>
                  <Text style={s.handoffText}>{item.text}</Text>
                </View>
              ))}
              <View style={s.divider} />
            </>
          )}

          {/* ═══════════════════════════════════════════════════════
              SECTION 3: PATTERNS TO WATCH
              ═══════════════════════════════════════════════════════ */}
          {insights.length > 0 && (
            <>
              <View style={s.sectionHeader}>
                <Text style={s.sectionTitle}>Patterns to Watch</Text>
              </View>
              {insights.map((insight, i) => {
                const isExpanded = expandedPattern === i;
                const rotation = chevronAnims[i]
                  ? chevronAnims[i].interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '180deg'],
                    })
                  : '0deg';

                return (
                  <TouchableOpacity
                    key={insight.id}
                    style={[
                      s.patternCard,
                      { borderColor: patternBorderColor(insight.severity) + '30' },
                    ]}
                    onPress={() => togglePattern(i)}
                    activeOpacity={0.8}
                    accessibilityLabel={`Pattern: ${insight.title}. ${isExpanded ? 'Collapse' : 'Expand'}`}
                    accessibilityRole="button"
                  >
                    <View style={s.patternHeader}>
                      <Text style={s.patternTitle}>{insight.title}</Text>
                      <Animated.Text
                        style={[s.patternChevron, { transform: [{ rotate: rotation }] }]}
                      >
                        {'\u25BC'}
                      </Animated.Text>
                    </View>
                    {isExpanded && (
                      <View style={s.patternDetail}>
                        <Text style={s.patternContext}>{insight.context}</Text>
                        {insight.actions.length > 0 && (
                          <View style={s.patternAction}>
                            <Text style={s.patternActionArrow}>{'\u2192'}</Text>
                            <Text style={s.patternActionText}>{insight.actions[0].label}</Text>
                          </View>
                        )}
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
              <View style={s.divider} />
            </>
          )}

          {/* ═══════════════════════════════════════════════════════
              SECTION 4: BEFORE BED
              ═══════════════════════════════════════════════════════ */}
          {beforeBedItems.length > 0 && (
            <>
              <View style={s.sectionHeader}>
                <Text style={s.sectionTitle}>Before Bed</Text>
              </View>
              {beforeBedItems.map((item, i) => (
                <TouchableOpacity
                  key={`bed-${i}`}
                  style={s.beforeBedItem}
                  onPress={() => item.route && navigate(item.route)}
                  activeOpacity={0.7}
                  accessibilityLabel={item.text}
                  accessibilityRole="button"
                >
                  <View style={s.beforeBedLeft}>
                    <Text style={s.beforeBedIcon}>{item.icon}</Text>
                    <Text style={s.beforeBedText}>{item.text}</Text>
                  </View>
                  <Text style={s.beforeBedArrow}>{'\u2192'}</Text>
                </TouchableOpacity>
              ))}
              <View style={s.divider} />
            </>
          )}

          {/* ═══════════════════════════════════════════════════════
              SECTION 6: DAY AT A GLANCE
              ═══════════════════════════════════════════════════════ */}
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Day at a Glance</Text>
          </View>
          <View style={s.glanceGrid}>
            {glanceStats.map((stat, i) => (
              <View key={i} style={s.glanceTile}>
                <Text style={[s.glanceValue, { color: stat.color }]}>{stat.value}</Text>
                <Text style={s.glanceLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>

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

      <ReportPreviewModal
        visible={showDailyPreview}
        title="Daily Summary"
        infoText="Preview of your daily journal. Tap 'Share PDF' to export."
        previewLines={dailyReport?.previewLines ?? []}
        onExport={handleDailyExport}
        onClose={() => setShowDailyPreview(false)}
        exporting={exporting}
      />
      <ReportPreviewModal
        visible={showClinicalPreview}
        title="Clinical Report"
        infoText="30-day clinical summary for healthcare providers."
        previewLines={clinicalReport?.previewLines ?? []}
        onExport={handleClinicalExport}
        onClose={() => setShowClinicalPreview(false)}
        exporting={exporting}
      />
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
  if (brief.wellnessChecks.total > 0 && brief.wellnessChecks.done === 0) {
    parts.push('Wellness check pending.');
  } else if (brief.wellnessChecks.total > 0 && brief.wellnessChecks.done < brief.wellnessChecks.total) {
    const remaining = brief.wellnessChecks.total - brief.wellnessChecks.done;
    parts.push(`${remaining} wellness check${remaining > 1 ? 's' : ''} still pending.`);
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

  // ─── SAMPLE DATA INDICATOR ───
  sampleIndicator: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  sampleIndicatorText: {
    fontSize: 12,
    fontWeight: '500',
    color: c.purpleBright,
  },

  // ─── HEADER ───
  journalHeader: {
    borderBottomWidth: 1,
    borderBottomColor: c.glassBorder,
    marginBottom: 8,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  headerShareBtn: {
    backgroundColor: c.accentDim,
    borderWidth: 1,
    borderColor: c.accentBorder,
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 9,
  },
  headerShareBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: c.accent,
  },
  headerReportBtn: {
    backgroundColor: c.purpleFaint,
    borderWidth: 1,
    borderColor: c.purpleBorder,
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 9,
  },
  headerReportBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: c.purpleBright,
  },

  // ─── PATIENT CONTEXT CARD ───
  patientCard: {
    backgroundColor: c.glass,
    borderWidth: 1,
    borderColor: c.glassBorder,
    borderRadius: 10,
    padding: 10,
    paddingHorizontal: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  patientCardAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: c.accentDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  patientCardAvatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: c.accent,
  },
  patientCardInfo: {
    flex: 1,
    minWidth: 0,
  },
  patientCardNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  patientCardName: {
    fontSize: 13,
    fontWeight: '600',
    color: c.textPrimary,
  },
  patientCardAge: {
    fontSize: 10,
    color: c.textSecondary,
  },
  allergyBadge: {
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.25)',
    borderRadius: 3,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  allergyBadgeText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#EF4444',
  },
  patientCardConditions: {
    fontSize: 11,
    color: c.textSecondary,
  },
  patientCardChevron: {
    fontSize: 14,
    color: c.textSecondary,
  },

  // ─── SECTION HEADER ───
  sectionHeader: {
    paddingTop: 18,
    paddingBottom: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: c.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },

  // ─── DIVIDER ───
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    marginHorizontal: -16,
  },

  // ─── SECTION 1: NARRATIVE ───
  narrativeText: {
    fontSize: 16.5,
    color: c.textPrimary,
    lineHeight: 27,
    marginBottom: 20,
    marginTop: 8,
  },

  // ─── FIRST-USE GUIDANCE ───
  firstUseCard: {
    backgroundColor: 'rgba(255, 140, 148, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 140, 148, 0.2)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  firstUseTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: c.accent,
    marginBottom: 4,
  },
  firstUseText: {
    fontSize: 13,
    color: c.textSecondary,
    lineHeight: 19,
  },

  // ─── SECTION 2: HANDOFF NOTES ───
  handoffItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderLeftWidth: 2,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    marginBottom: 8,
  },
  handoffIcon: {
    fontSize: 16,
    marginTop: 1,
  },
  handoffText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
    color: c.textPrimary,
  },

  // ─── SECTION 3: PATTERNS ───
  patternCard: {
    backgroundColor: 'rgba(20,50,40,0.4)',
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
  },
  patternHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  patternTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: c.textPrimary,
    flex: 1,
  },
  patternChevron: {
    fontSize: 11,
    color: c.textSecondary,
  },
  patternDetail: {
    marginTop: 10,
  },
  patternContext: {
    fontSize: 13,
    lineHeight: 20,
    color: c.textSecondary,
    marginBottom: 10,
  },
  patternAction: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: 'rgba(45,200,170,0.08)',
    borderRadius: 6,
    padding: 10,
  },
  patternActionArrow: {
    fontSize: 12,
    color: c.accent,
    marginTop: 1,
  },
  patternActionText: {
    fontSize: 13,
    fontWeight: '500',
    color: c.accent,
    flex: 1,
  },

  // ─── SECTION 4: BEFORE BED ───
  beforeBedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(45,200,170,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(45,200,170,0.12)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  beforeBedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  beforeBedIcon: {
    fontSize: 18,
  },
  beforeBedText: {
    fontSize: 14,
    fontWeight: '500',
    color: c.textPrimary,
    flex: 1,
  },
  beforeBedArrow: {
    fontSize: 14,
    fontWeight: '600',
    color: c.accent,
  },

  // ─── SECTION 5: DAY AT A GLANCE ───
  glanceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  glanceTile: {
    width: '31%' as any,
    backgroundColor: 'rgba(20,50,40,0.3)',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  glanceValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  glanceLabel: {
    fontSize: 10,
    color: c.textSecondary,
    marginTop: 3,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // ─── TIMESTAMP ───
  timestamp: {
    fontSize: 10,
    color: c.textTertiary,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 16,
    fontStyle: 'italic',
  },
});
