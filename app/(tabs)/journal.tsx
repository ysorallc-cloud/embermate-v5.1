// ============================================================================
// JOURNAL PAGE - Briefing-style layout with narrative summary + data rows
// Three zones: Today's Summary, Details, Tomorrow
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
  const { state: careTasksState } = useCareTasks(getTodayDateString());

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
            <ScreenHeader title="Journal" subtitle={`${dayName}, ${dateStr}`} />
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
  const medsDone = brief?.medications.filter(m => m.status === 'completed').length ?? 0;
  const medsTotal = brief?.medications.length ?? 0;
  const allMedsDone = medsDone === medsTotal && medsTotal > 0;
  const medsMissed = brief?.medications.filter(m => m.status === 'missed').length ?? 0;

  const mealsDone = brief?.meals.meals.filter(m => m.status === 'completed').length ?? 0;
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
    // Prefer handoffNarrative, fall back to statusNarrative, then build one
    if (brief.handoffNarrative && brief.handoffNarrative.trim().length > 0) {
      return brief.handoffNarrative;
    }
    if (brief.statusNarrative && brief.statusNarrative.trim().length > 0) {
      return brief.statusNarrative;
    }
    return buildHandoffSummary(brief, medsDone, medsTotal, allMedsDone, hasVitals);
  }

  // ============================================================================
  // DATA ROW HELPERS
  // ============================================================================
  type DotColor = 'green' | 'amber' | 'red';

  function getMedsDotColor(): DotColor {
    if (medsMissed > 0) return 'red';
    if (allMedsDone) return 'green';
    return 'amber';
  }

  function getMedsDetail(): string {
    if (!brief || medsTotal === 0) return 'No medications scheduled.';
    const taken = brief.medications.filter(m => m.status === 'completed');
    const names = taken.map(m => m.name).join(', ');
    if (allMedsDone) return `${names} \u2014 all taken on schedule`;
    const missed = brief.medications.filter(m => m.status === 'missed');
    if (missed.length > 0) return `${missed.map(m => m.name).join(', ')} missed`;
    const pending = brief.medications.filter(m => m.status !== 'completed' && m.status !== 'missed');
    return `${taken.length} taken, ${pending.length} pending`;
  }

  function getMedsValue(): string {
    return `${medsDone}/${medsTotal}`;
  }

  function getVitalsDotColor(): DotColor {
    if (!hasVitals) return 'amber';
    const r = brief?.vitals?.readings;
    if (r && ((r.systolic ?? 0) > 140 || (r.diastolic ?? 0) > 90 || ((r.oxygen ?? 100) < 92))) return 'red';
    return 'green';
  }

  function getVitalsDetail(): string {
    if (!hasVitals) return 'Not recorded yet';
    const r = brief?.vitals?.readings;
    if (!r) return 'Logged';
    const parts: string[] = [];
    if (r.systolic != null && r.diastolic != null) parts.push(`BP ${r.systolic}/${r.diastolic}`);
    if (r.heartRate != null) parts.push(`HR ${r.heartRate}`);
    if (r.glucose != null) parts.push(`Glucose ${r.glucose} mg/dL`);
    if (r.temperature != null) parts.push(`Temp ${r.temperature}\u00B0F`);
    if (r.oxygen != null) parts.push(`SpO\u2082 ${r.oxygen}%`);
    return parts.join(' \u00B7 ');
  }

  function getVitalsValue(): string {
    return hasVitals ? 'Logged' : 'Pending';
  }

  function getMealsDotColor(): DotColor {
    if (mealsDone >= mealsTotal && mealsTotal > 0) return 'green';
    if (mealsDone === 0 && mealsTotal > 0) return 'red';
    return 'amber';
  }

  function getMealsDetail(): string {
    if (!brief) return '';
    const completedMeals = brief.meals.meals.filter(m => m.status === 'completed');
    if (completedMeals.length > 0) {
      const mealNames = completedMeals.map(m => {
        const name = m.name || '';
        const time = m.scheduledTime ? formatTime(m.scheduledTime) : '';
        return time ? `${name} at ${time}` : name;
      }).join(', ');
      const notLogged = mealsTotal - mealsDone;
      return notLogged > 0
        ? `${mealNames}. ${notLogged} not logged.`
        : mealNames;
    }
    return mealsTotal > 0 ? 'No meals logged yet' : 'No meals scheduled';
  }

  function getHydrationDotColor(): DotColor {
    if (waterGlasses >= 8) return 'green';
    if (waterGlasses === 0) return 'red';
    return 'amber';
  }

  function getWellnessDotColor(): DotColor {
    if (hasMorning && hasEvening) return 'green';
    if (!hasMorning && !hasEvening) return 'amber';
    return 'amber';
  }

  function getWellnessDetail(): string {
    if (!brief) return '';
    const parts: string[] = [];
    if (hasMorning && brief.mood.morningWellness) {
      const mw = brief.mood.morningWellness;
      const labels: string[] = [];
      if (mw.mood) labels.push(mw.mood.toLowerCase());
      if (mw.orientation) labels.push(mw.orientation.toLowerCase());
      parts.push(`Morning check complete${labels.length > 0 ? ` \u2014 ${labels.join(', ')}` : ''}.`);
    }
    if (hasEvening && brief.mood.eveningWellness) {
      parts.push('Evening check complete.');
    } else if (!hasEvening) {
      parts.push('Evening check pending.');
    }
    if (!hasMorning && !hasEvening) {
      return 'No wellness checks completed yet';
    }
    return parts.join(' ');
  }

  function getWellnessValue(): string {
    const done = (hasMorning ? 1 : 0) + (hasEvening ? 1 : 0);
    return `${done}/2`;
  }

  function getSleepDotColor(): DotColor {
    if (!brief?.sleep.logged) return 'amber';
    return 'green';
  }

  function getSleepDetail(): string {
    if (!brief?.sleep.logged) return 'Not logged';
    const parts: string[] = [];
    if (brief.sleep.hours != null) parts.push(`${brief.sleep.hours} hours`);
    if (brief.sleep.quality != null) parts.push(`quality rated ${brief.sleep.quality}/5`);
    return parts.join(' \u2014 ');
  }

  function getSleepValue(): string {
    if (!brief?.sleep.logged) return 'Pending';
    if (brief.sleep.quality != null && brief.sleep.quality >= 4) return 'Good';
    if (brief.sleep.quality != null && brief.sleep.quality <= 2) return 'Poor';
    return 'Logged';
  }

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

          {/* ═══ ZONE 1: TODAY'S SUMMARY ═══ */}
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Today's Summary</Text>
          </View>

          <Text style={s.briefingText}>{getBriefingText()}</Text>

          <View style={s.zoneDivider} />

          {/* ═══ ZONE 2: DETAILS ═══ */}
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>{"Details"}</Text>
          </View>

          {/* Medications row */}
          {brief && medsTotal > 0 && (
            <View style={s.dataRow}>
              <View style={[s.dataRowDot, s[`dot${getMedsDotColor().charAt(0).toUpperCase() + getMedsDotColor().slice(1)}` as keyof ReturnType<typeof createStyles>] as any]} />
              <View style={s.dataRowInfo}>
                <Text style={s.dataRowLabel}>Medications</Text>
                <Text style={s.dataRowDetail}>{getMedsDetail()}</Text>
              </View>
              <Text style={s.dataRowValue}>{getMedsValue()}</Text>
            </View>
          )}

          {/* Vitals row */}
          {brief && brief.vitals.scheduled && (
            <View style={s.dataRow}>
              <View style={[s.dataRowDot, s[`dot${getVitalsDotColor().charAt(0).toUpperCase() + getVitalsDotColor().slice(1)}` as keyof ReturnType<typeof createStyles>] as any]} />
              <View style={s.dataRowInfo}>
                <Text style={s.dataRowLabel}>Vitals</Text>
                <Text style={s.dataRowDetail}>{getVitalsDetail()}</Text>
              </View>
              <Text style={s.dataRowValue}>{getVitalsValue()}</Text>
            </View>
          )}

          {/* Meals row */}
          {brief && mealsTotal > 0 && (
            <View style={s.dataRow}>
              <View style={[s.dataRowDot, s[`dot${getMealsDotColor().charAt(0).toUpperCase() + getMealsDotColor().slice(1)}` as keyof ReturnType<typeof createStyles>] as any]} />
              <View style={s.dataRowInfo}>
                <Text style={s.dataRowLabel}>Meals</Text>
                <Text style={s.dataRowDetail}>{getMealsDetail()}</Text>
              </View>
              <Text style={s.dataRowValue}>{`${mealsDone}/${mealsTotal}`}</Text>
            </View>
          )}

          {/* Hydration row */}
          {brief && (
            <View style={s.dataRow}>
              <View style={[s.dataRowDot, s[`dot${getHydrationDotColor().charAt(0).toUpperCase() + getHydrationDotColor().slice(1)}` as keyof ReturnType<typeof createStyles>] as any]} />
              <View style={s.dataRowInfo}>
                <Text style={s.dataRowLabel}>Hydration</Text>
                <Text style={s.dataRowDetail}>{waterGlasses > 0 ? `${waterGlasses} glasses logged` : 'No water intake logged today'}</Text>
              </View>
              <Text style={s.dataRowValue}>{`${waterGlasses}/8`}</Text>
            </View>
          )}

          {/* Wellness row */}
          {brief && (
            <View style={s.dataRow}>
              <View style={[s.dataRowDot, s[`dot${getWellnessDotColor().charAt(0).toUpperCase() + getWellnessDotColor().slice(1)}` as keyof ReturnType<typeof createStyles>] as any]} />
              <View style={s.dataRowInfo}>
                <Text style={s.dataRowLabel}>Wellness</Text>
                <Text style={s.dataRowDetail}>{getWellnessDetail()}</Text>
              </View>
              <Text style={s.dataRowValue}>{getWellnessValue()}</Text>
            </View>
          )}

          {/* Sleep row */}
          {brief && (
            <View style={[s.dataRow, s.dataRowLast]}>
              <View style={[s.dataRowDot, s[`dot${getSleepDotColor().charAt(0).toUpperCase() + getSleepDotColor().slice(1)}` as keyof ReturnType<typeof createStyles>] as any]} />
              <View style={s.dataRowInfo}>
                <Text style={s.dataRowLabel}>Sleep</Text>
                <Text style={s.dataRowDetail}>{getSleepDetail()}</Text>
              </View>
              <Text style={s.dataRowValue}>{getSleepValue()}</Text>
            </View>
          )}

          {/* ═══ INSIGHT CALLOUTS ═══ */}
          {brief?.interpretations?.medications && (
            <View style={s.insightCallout}>
              <Text style={s.insightLabel}>Suggestion</Text>
              <Text style={s.insightText}>{brief.interpretations.medications}</Text>
            </View>
          )}
          {brief?.interpretations?.vitals && (
            <View style={s.insightCallout}>
              <Text style={s.insightLabel}>Suggestion</Text>
              <Text style={s.insightText}>{brief.interpretations.vitals}</Text>
            </View>
          )}
          {brief?.interpretations?.nutrition && (
            <View style={s.insightCallout}>
              <Text style={s.insightLabel}>Suggestion</Text>
              <Text style={s.insightText}>{brief.interpretations.nutrition}</Text>
            </View>
          )}

          <View style={s.zoneDivider} />

          {/* ═══ ZONE 3: TOMORROW ═══ */}
          {showAppointment && brief?.nextAppointment && (
            <>
              <View style={s.sectionHeader}>
                <Text style={s.sectionTitle}>{"Tomorrow"}</Text>
              </View>

              <TouchableOpacity
                style={s.appointmentRow}
                onPress={() => navigate(`/provider-prep?appointmentId=next`)}
                activeOpacity={0.7}
                accessibilityLabel={`Prepare for ${brief.nextAppointment.provider} appointment`}
                accessibilityRole="button"
              >
                <Text style={s.appointmentIcon}>{'\uD83E\uDE7A'}</Text>
                <View style={s.appointmentInfo}>
                  <Text style={s.appointmentTitle}>{brief.nextAppointment.provider} {'\u2014'} {brief.nextAppointment.specialty}</Text>
                  <Text style={s.appointmentSub}>
                    {new Date(brief.nextAppointment.date).toLocaleDateString('en-US', {
                      weekday: 'short', month: 'short', day: 'numeric',
                    })}
                    {brief.nextAppointment.date && (() => {
                      const d = new Date(brief.nextAppointment!.date);
                      const h = d.getHours();
                      return h > 0 ? ` \u00B7 ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}` : '';
                    })()}
                  </Text>
                  <View style={s.prepBar}>
                    <View style={[s.prepDot, s.prepDotTodo]} />
                    <View style={[s.prepDot, s.prepDotTodo]} />
                    <View style={[s.prepDot, s.prepDotTodo]} />
                    <View style={[s.prepDot, s.prepDotTodo]} />
                  </View>
                </View>
                <Text style={s.appointmentArrow}>{'\u203A'}</Text>
              </TouchableOpacity>

              <View style={s.zoneDivider} />
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
    fontSize: 11,
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
  },

  // ─── BRIEFING ───
  briefingText: {
    fontSize: 13.5,
    color: c.textPrimary,
    lineHeight: 22,
    marginBottom: 20,
  },

  // ─── DATA ROWS ───
  dataRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.025)',
  },
  dataRowLast: {
    borderBottomWidth: 0,
  },
  dataRowDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 5,
  },
  dotGreen: {
    backgroundColor: c.green,
  },
  dotAmber: {
    backgroundColor: c.amberBright,
  },
  dotRed: {
    backgroundColor: c.redBright,
  },
  dataRowInfo: {
    flex: 1,
  },
  dataRowLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: c.textPrimary,
  },
  dataRowDetail: {
    fontSize: 11,
    color: c.textSecondary,
    marginTop: 1,
    lineHeight: 16,
  },
  dataRowValue: {
    fontSize: 11,
    color: c.textMuted,
  },

  // ─── INSIGHT CALLOUT ───
  insightCallout: {
    marginVertical: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderLeftWidth: 2,
    borderLeftColor: c.amberBright,
    backgroundColor: 'rgba(245,158,11,0.03)',
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  insightLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: c.amberBright,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  insightText: {
    fontSize: 11.5,
    color: c.textSecondary,
    lineHeight: 18,
  },

  // ─── APPOINTMENT / TOMORROW ───
  appointmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    marginTop: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(20,55,45,0.3)',
    borderWidth: 1,
    borderColor: 'rgba(40,80,65,0.3)',
  },
  appointmentIcon: {
    fontSize: 18,
  },
  appointmentInfo: {
    flex: 1,
  },
  appointmentTitle: {
    fontSize: 12.5,
    fontWeight: '600',
    color: c.textPrimary,
  },
  appointmentSub: {
    fontSize: 10,
    color: c.textMuted,
    marginTop: 2,
  },
  appointmentArrow: {
    fontSize: 14,
    color: c.textMuted,
  },
  prepBar: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 6,
  },
  prepDot: {
    width: 20,
    height: 3,
    borderRadius: 2,
  },
  prepDotDone: {
    backgroundColor: c.green,
  },
  prepDotTodo: {
    backgroundColor: 'rgba(255,255,255,0.06)',
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
