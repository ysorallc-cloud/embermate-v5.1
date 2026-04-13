// ============================================================================
// JOURNAL PAGE - Narrative intelligence layer (shift-change briefing)
// Sections: Status dot, Stats strip, Timeline, Heads up, Patterns, Reflection
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
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { AuroraBackground } from '../../components/aurora/AuroraBackground';
import { Colors, BorderRadius } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';
import {
  buildCareBrief,
  CareBrief,
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
import { getMedicalInfo, MedicalInfo } from '../../utils/medicalInfo';
import { safeGetItem } from '../../utils/safeStorage';
import { usePatient } from '../../contexts/PatientContext';
import { StorageKeys } from '../../utils/storageKeys';
import { getMedications } from '../../utils/medicationStorage';
import { hasSampleData } from '../../utils/sampleDataManager';
import { ReportPreviewModal } from '../../components/shared/ReportPreviewModal';
import { buildDailySummaryReport, buildClinicalReportData } from '../../utils/reportBuilders';
import { generateAndSharePDF, ReportData } from '../../utils/pdfExport';
import { DateTabStrip } from '../../components/journal/DateTabStrip';
import { MonthCalendar } from '../../components/journal/MonthCalendar';
// DetailedEventLog removed — Now tab timeline serves this purpose
import { ReflectionPrompt } from '../../components/journal/ReflectionPrompt';
import { JournalSummary } from '../../components/journal/JournalSummary';
import { JournalFlagged, buildHandoffNotes } from '../../components/journal/JournalFlagged';
import { JournalPatterns } from '../../components/journal/JournalPatterns';
// useJournalEvents removed — DetailedEventLog no longer rendered
import { useCalendarStatuses } from '../../hooks/useCalendarStatuses';
import { getDailyPrompt } from '../../utils/reflectionPrompts';
import { getReflection, saveReflection, StoredReflection } from '../../storage/reflectionStorage';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function JournalTab() {
  const { colors } = useTheme();
  const { activePatient } = usePatient();
  const insets = useSafeAreaInsets();
  const s = useMemo(() => createStyles(colors), [colors]);
  const [brief, setBrief] = useState<CareBrief | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authRequired, setAuthRequired] = useState(false);
  const [todayNotes, setTodayNotes] = useState<NotesLog[]>([]);
  const [insights, setInsights] = useState<InsightData[]>([]);
  const { state: careTasksState } = useCareTasks(getTodayDateString());
  const { enabledBuckets } = useEnabledBuckets();
  const [medicalInfo, setMedicalInfo] = useState<MedicalInfo | null>(null);
  const [patientName, setPatientName] = useState('');
  const [patientGender, setPatientGender] = useState<string | null>(null);
  const [patientAge, setPatientAge] = useState<string | null>(null);
  const [activeMedCount, setActiveMedCount] = useState(0);
  const [isSampleMode, setIsSampleMode] = useState(false);
  const [showDailyPreview, setShowDailyPreview] = useState(false);
  const [showClinicalPreview, setShowClinicalPreview] = useState(false);
  const [dailyReport, setDailyReport] = useState<{ reportData: ReportData; previewLines: string[] } | null>(null);
  const [clinicalReport, setClinicalReport] = useState<{ reportData: ReportData; previewLines: string[] } | null>(null);
  const [exporting, setExporting] = useState(false);

  // ── Phase 7 state ──
  const [selectedDate, setSelectedDate] = useState(getTodayDateString());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const now = new Date();
  const [calendarMonth, setCalendarMonth] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const { statuses: calendarStatuses } = useCalendarStatuses(calendarMonth.year, calendarMonth.month);
  // journalEvents removed — DetailedEventLog no longer rendered
  const [reflection, setReflection] = useState<StoredReflection | null>(null);
  const [reflectionDirty, setReflectionDirty] = useState(false);

  // Load reflection when date changes
  useEffect(() => {
    getReflection(selectedDate).then(setReflection);
  }, [selectedDate]);

  const handleDateSelect = useCallback((date: string) => {
    if (reflectionDirty) {
      Alert.alert(
        'Unsaved reflection',
        'You have an unsaved reflection. Save it before switching days?',
        [
          { text: 'Discard', style: 'destructive', onPress: () => { setReflectionDirty(false); setSelectedDate(date); setCalendarOpen(false); } },
          { text: 'Go back', style: 'cancel' },
        ]
      );
      return;
    }
    setSelectedDate(date);
    setCalendarOpen(false);
  }, [reflectionDirty]);

  const handleCalendarDateSelect = useCallback((date: string) => {
    if (reflectionDirty) {
      Alert.alert(
        'Unsaved reflection',
        'You have an unsaved reflection. Save it before switching days?',
        [
          { text: 'Discard', style: 'destructive', onPress: () => { setReflectionDirty(false); setSelectedDate(date); } },
          { text: 'Go back', style: 'cancel' },
        ]
      );
      return;
    }
    setSelectedDate(date);
  }, [reflectionDirty]);

  const handleSaveReflection = useCallback(async (text: string) => {
    const prompt = getDailyPrompt(selectedDate);
    const saved = await saveReflection(selectedDate, text, prompt);
    setReflection(saved);
  }, [selectedDate]);

  // Format subtitle date
  const subtitleDate = useMemo(() => {
    const d = new Date(selectedDate + 'T12:00:00');
    return selectedDate === getTodayDateString()
      ? 'Today'
      : d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  }, [selectedDate]);

  const loadReport = useCallback(async () => {
    try {
      setError(null);
      // Phase 7: pass the journal's selected date so navigating to past
      // dates loads that day's brief instead of always re-loading today.
      const data = await buildCareBrief(selectedDate);
      setBrief(data);

      try {
        const allNotes = await getNotesLogs();
        // Anchor the selected date at noon to dodge DST edges so the
        // toDateString() filter matches the calendar day the user picked.
        const targetKey = new Date(`${selectedDate}T12:00:00`).toDateString();
        const filtered = allNotes.filter(
          (n) => new Date(n.timestamp).toDateString() === targetKey
        );
        setTodayNotes(filtered);
      } catch (err) {
        logError('JournalTab.loadNotes', err);
        setTodayNotes([]);
      }

      // Load insights
      try {
        const allInsights = await getAllInsights();
        setInsights(allInsights);
      } catch (err) {
        logError('JournalTab.loadInsights', err);
        setInsights([]);
      }

      // Load patient context for patient card + share
      try {
        const [mi, name, ageVal, genderVal, meds] = await Promise.all([
          getMedicalInfo(),
          safeGetItem<string>(StorageKeys.PATIENT_NAME, ''),
          safeGetItem<string | null>(StorageKeys.PATIENT_AGE ?? '@embermate_patient_age', null),
          safeGetItem<string | null>(StorageKeys.PATIENT_GENDER, null),
          getMedications(),
        ]);
        setMedicalInfo(mi);
        // Resolve patient name with priority: PatientContext → safeStorage.
        // Filter out the legacy 'Patient' default and the friendly skip
        // placeholder 'your loved one' so the patient card and possessive
        // header copy ("Mom's care story") only show when a *real* name
        // has been entered. journal.tsx uses an empty string as the
        // not-set sentinel that drives `showPatientCard` + the
        // "Today's care story" fallback header.
        const PLACEHOLDERS = new Set(['', 'Patient', 'your loved one']);
        const fromContext =
          activePatient?.name && !PLACEHOLDERS.has(activePatient.name)
            ? activePatient.name
            : null;
        const fromStorage = name && !PLACEHOLDERS.has(name) ? name : null;
        setPatientName(fromContext || fromStorage || '');
        setPatientAge(ageVal);
        setPatientGender(genderVal);
        setActiveMedCount(meds?.length ?? 0);
      } catch (err) {
        logError('JournalTab.loadPatientContext', err);
        // Non-critical — patient card just won't show
      }

    } catch (err) {
      logError('JournalTab.loadReport', err);
      setError('Unable to load today\u2019s care summary. Pull down to retry.');
    } finally {
      setLoading(false);
    }
  }, [selectedDate, activePatient]);

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

  // Phase 1A — day status (first read on the Journal page).
  // MUST live above the loading/error early returns so the hook order
  // stays stable across renders. Inlines its counter logic for the same
  // reason: the medsDone/etc consts below this point are computed AFTER
  // the early returns and can't be referenced here.
  const dayStatus = useMemo(() => {
    if (!brief) {
      return { color: colors.textWarmMuted, label: 'No data yet', detail: 'Start logging on the Now tab' };
    }
    const md = brief.medications.filter(m => m.status === 'completed' || m.status === 'skipped').length;
    const mt = brief.medications.length;
    const mm = brief.medications.filter(m => m.status === 'missed').length;
    const eaD = brief.meals.meals.filter(m => m.status === 'completed' || m.status === 'skipped').length;
    const eaT = brief.meals.total;
    const wD = brief.wellnessChecks.done;
    const wT = brief.wellnessChecks.total;

    const totalItems = mt + eaT + wT;
    const doneItems = md + eaD + wD;

    if (totalItems === 0) {
      return { color: colors.textWarmMuted, label: 'No data yet', detail: 'Start logging on the Now tab' };
    }
    if (doneItems === totalItems) {
      return { color: colors.accent, label: 'Good day', detail: 'All items completed' };
    }
    if (mm > 0) {
      return { color: colors.amberBright, label: 'Needs attention', detail: `${mm} med${mm > 1 ? 's' : ''} missed` };
    }
    if (doneItems > 0) {
      return { color: colors.amberBright, label: 'Incomplete day', detail: `${doneItems} of ${totalItems} items done` };
    }
    return { color: colors.textWarmMuted, label: 'Day starting', detail: `${totalItems} items scheduled` };
  }, [brief, colors]);

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
  // SHARE / REPORT HANDLERS
  // ============================================================================
  function handleShareDaily() {
    if (loading) {
      Alert.alert('Loading', 'Please wait while the journal loads.');
      return;
    }
    if (!brief) {
      Alert.alert(
        'No Data',
        'Nothing has been logged today. Start tracking on the Now tab.',
      );
      return;
    }
    const result = buildDailySummaryReport(
      brief,
      dateStr,
      dayName,
      glanceStats,
      buildHandoffNotes(brief),
      reflection?.text,
    );
    setDailyReport(result);
    setShowDailyPreview(true);
  }

  function handleShareClinical() {
    if (loading) {
      Alert.alert('Loading', 'Please wait while the journal loads.');
      return;
    }
    if (!brief) {
      Alert.alert(
        'No Data',
        'Nothing has been logged today. Start tracking on the Now tab.',
      );
      return;
    }
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
            } catch (err: any) {
              if (err?.message !== 'User cancelled') {
                logError('JournalTab.handleDailyExport', err);
              }
            }
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
            } catch (err: any) {
              if (err?.message !== 'User cancelled') {
                logError('JournalTab.handleClinicalExport', err);
              }
            }
            setExporting(false);
          },
        },
      ],
    );
  }


  // ============================================================================
  // BUILD DATA
  // ============================================================================
  const handoffNotes = buildHandoffNotes(brief);

  // Glance stats for the share/report flow — no longer rendered on screen
  // (the flat stats strip replaced the visual tiles) but still needed by
  // buildDailySummaryReport. Inline derivation replaces the deleted helper
  // functions.
  const glanceStats = (() => {
    const sem = (cond: boolean, total: number, missed: number) =>
      total === 0 ? colors.textTertiary : missed > 0 ? colors.redBright : cond ? colors.green : colors.amberBright;
    const bpVal = hasVitals
      ? (brief?.vitals?.readings?.systolic != null && brief?.vitals?.readings?.diastolic != null
          ? `${brief.vitals.readings.systolic}/${brief.vitals.readings.diastolic}` : 'Logged')
      : '\u2014';
    const sleepVal = !brief?.sleep.logged ? '\u2014' : (brief.sleep.hours != null ? `${brief.sleep.hours}h` : 'Logged');
    const all = [
      { bucket: 'meds',     label: 'Meds',     value: `${medsDone}/${medsTotal}`,    color: sem(allMedsDone, medsTotal, medsMissed) },
      { bucket: 'meals',    label: 'Meals',     value: `${mealsDone}/${mealsTotal}`,  color: sem(mealsDone >= mealsTotal && mealsTotal > 0, mealsTotal, mealsMissed) },
      { bucket: 'water',    label: 'Water',     value: `${waterGlasses}/8`,           color: waterGlasses >= 8 ? colors.green : waterGlasses === 0 ? colors.textTertiary : colors.amberBright },
      { bucket: 'wellness', label: 'Wellness',  value: `${wellnessDone}/${wellnessTotal}`, color: sem(wellnessDone >= wellnessTotal, wellnessTotal, 0) },
      { bucket: 'sleep',    label: 'Sleep',     value: sleepVal,                      color: brief?.sleep.logged ? colors.green : colors.textTertiary },
      { bucket: 'vitals',   label: 'BP',        value: bpVal,                         color: hasVitals ? colors.green : colors.textTertiary },
    ];
    return enabledBuckets.length > 0
      ? all.filter(t => enabledBuckets.includes(t.bucket as any))
      : all;
  })();

  // ============================================================================
  // PATIENT CONTEXT
  // ============================================================================
  const activeDiagnoses = (medicalInfo?.diagnoses ?? []).filter(d => d.status === 'active');
  const allergies = medicalInfo?.allergies ?? [];
  // Patient name is used in the header purpose line ("Mom's care story for
  // today") — no standalone patient card is rendered.

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
          <View style={s.headerRow}>
            <View>
              <Text style={s.headerTitle}>Journal</Text>
              <Text style={s.headerDate}>{dayName}, {dateStr}</Text>
              <Text style={s.headerPurpose}>{patientName ? `${patientName}'s care story for today` : "Today's care story"}. Share with the next caregiver or bring to a visit.</Text>
            </View>
            <View style={s.headerActions}>
              <TouchableOpacity
                style={[s.headerPill, loading && { opacity: 0.4 }]}
                onPress={handleShareDaily}
                activeOpacity={0.7}
                accessibilityLabel={loading ? 'Share daily summary, loading' : 'Share daily summary'}
                accessibilityRole="button"
                accessibilityState={{ busy: loading }}
              >
                <Text style={s.headerPillText}>Share</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.headerPillReport, loading && { opacity: 0.4 }]}
                onPress={handleShareClinical}
                activeOpacity={0.7}
                accessibilityLabel={loading ? 'Clinical report, loading' : 'Clinical report'}
                accessibilityRole="button"
                accessibilityState={{ busy: loading }}
              >
                <Text style={s.headerPillReportText}>Report</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ─── SAMPLE DATA INDICATOR ─── */}
          {isSampleMode && (
            <View style={s.sampleIndicator}>
              <Text style={s.sampleIndicatorText}>{'\u{1F4CA}'} Sample data — not real patient information</Text>
            </View>
          )}

          {/* Patient name shown inline in header: "Mom's care story for today" */}

          {/* ═══ DATE TAB STRIP ═══ */}
          <DateTabStrip
            selectedDate={selectedDate}
            onDateSelect={handleDateSelect}
            onCalendarToggle={() => setCalendarOpen(prev => !prev)}
            calendarOpen={calendarOpen}
          />

          {/* ═══ MONTH CALENDAR ═══ */}
          <MonthCalendar
            visible={calendarOpen}
            selectedDate={selectedDate}
            onDateSelect={handleCalendarDateSelect}
            dayStatuses={calendarStatuses}
          />

          {/* ═══ DAY STATUS (Phase 1B) ═══ */}
          <View style={s.statusBlock}>
            <View style={[s.statusDot, { backgroundColor: dayStatus.color }]} />
            <View>
              <Text style={s.statusLabel}>{dayStatus.label}</Text>
              <Text style={s.statusDetail}>{dayStatus.detail}</Text>
            </View>
          </View>

          {/* ═══ TODAY'S RECORD ═══ */}
          <JournalSummary
            brief={brief}
            selectedDate={selectedDate}
            enabledBuckets={enabledBuckets}
          />

          {/* ═══ HEADS UP — Phase 4 ═══ */}
          <JournalFlagged items={handoffNotes} />

          {/* ═══ PATTERNS — Phase 5 ═══ */}
          <JournalPatterns insights={insights} />

          {/* ═══ REFLECTION — Phase 6 (compact) ═══ */}
          <ReflectionPrompt
            date={selectedDate}
            prompt={getDailyPrompt(selectedDate)}
            savedText={reflection?.text}
            savedAt={reflection?.savedAt}
            onSave={handleSaveReflection}
            onDirtyChange={setReflectionDirty}
          />

          {/* ─── FOOTER ─── */}
          <Text style={s.timestamp}>Not a medical record</Text>

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
    backgroundColor: c.accentLight,
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
  headerRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const,
    paddingBottom: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: c.glassHover,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '300' as const,
    color: c.textPrimary,
    letterSpacing: -0.5,
  },
  headerDate: {
    fontSize: 13,
    color: c.textMuted,
    marginTop: 4,
  },
  headerPurpose: {
    fontSize: 13,
    color: '#4a5a6a',
    marginTop: 4,
    lineHeight: 18,
  },
  headerActions: {
    flexDirection: 'row' as const,
    gap: 8,
    marginTop: 6,
  },
  headerPill: {
    backgroundColor: c.accentFaint,
    borderWidth: 1,
    borderColor: c.accentBorder,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  headerPillText: {
    fontSize: 12,
    color: c.accent,
    fontWeight: '500' as const,
  },
  headerPillReport: {
    backgroundColor: c.purpleFaint,
    borderWidth: 1,
    borderColor: c.purpleBorder,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  headerPillReportText: {
    fontSize: 12,
    color: c.purple,
    fontWeight: '500' as const,
  },
  // ─── Day status block (Phase 1B) ───
  statusBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: c.textWarmPrimary,
  },
  statusDetail: {
    fontSize: 12,
    color: c.textWarmMuted,
    marginTop: 2,
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
