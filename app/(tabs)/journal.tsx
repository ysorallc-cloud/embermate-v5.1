// ============================================================================
// JOURNAL PAGE - Flat Newspaper-Style Care Summary
// 4 priority tiers: Needs Attention, Status Bar, The Record, Context
// Top-border demarcation between sections. No card wrappers.
// ============================================================================

import React, { useState, useCallback, useEffect } from 'react';
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
import { ScreenHeader } from '../../components/ScreenHeader';
import { ShareActions } from '../../components/journal/ShareActions';
import { Colors, BorderRadius } from '../../theme/theme-tokens';
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

// ============================================================================
// REUSABLE SECTION COMPONENT
// ============================================================================

interface JournalSectionProps {
  label: string;
  accentColor: string;
  children: React.ReactNode;
}

function JournalSection({ label, accentColor, children }: JournalSectionProps) {
  return (
    <View style={s.journalSection}>
      <View style={[s.journalSectionBar, { backgroundColor: accentColor }]} />
      <Text style={[s.journalSectionLabel, { color: accentColor }]}>
        {label}
      </Text>
      {children}
    </View>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

function formatTime(t: string): string {
  if (!t) return '';
  // Handle ISO date strings
  if (t.includes('T')) {
    const date = new Date(t);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }
  // Handle HH:MM format
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

      // Load today's freeform notes
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
  useDataListener(useCallback(() => { loadReport(); }, [loadReport]));

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

  const journalSubtitle = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

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
        <ScrollView
          style={s.scrollView}
          contentContainerStyle={s.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />
          }
        >
          <ScreenHeader title="Journal" subtitle={journalSubtitle} />
          <View style={s.errorContainer}>
            <Text style={s.errorIcon}>{'\u26A0\uFE0F'}</Text>
            <Text style={s.errorText}>{error}</Text>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================
  const medsDone = brief?.medications.filter(m => m.status === 'completed').length ?? 0;
  const medsTotal = brief?.medications.length ?? 0;
  const allMedsDone = medsDone === medsTotal && medsTotal > 0;

  const mealsDone = brief?.meals.meals.filter(m => m.status === 'completed').length ?? 0;
  const mealsTotal = brief?.meals.total ?? 0;

  const hasVitals = brief?.vitals.recorded ?? false;
  const hasWellness = brief?.mood.morningWellness != null;

  // Progress calculation — uses same source of truth as Now tab
  const pct = careTasksState?.completionRate ?? 0;

  // Attention warnings (existing)
  const attentionWarnings = brief?.attentionItems.filter(
    i => i.text.toLowerCase().includes('missed')
      || i.text.toLowerCase().includes('overdue')
      || i.text.toLowerCase().includes('elevated')
      || i.text.toLowerCase().includes('due ')
  ) ?? [];

  // ─── TIER 1: FLAG DETECTION ───
  const flags: string[] = [];

  if (brief?.vitals?.readings) {
    const r = brief.vitals.readings;
    if (r.systolic != null && r.diastolic != null) {
      if (r.systolic > 140 || r.diastolic > 90) {
        flags.push(`BP reading ${r.systolic}/${r.diastolic} \u2014 above 140/90 threshold`);
      }
    }
    if (r.oxygen != null && r.oxygen < 92) {
      flags.push(`SpO2 at ${r.oxygen}% \u2014 below 92% threshold`);
    }
    if (r.heartRate != null && (r.heartRate > 100 || r.heartRate < 50)) {
      flags.push(`Heart rate ${r.heartRate} bpm \u2014 outside normal range`);
    }
  }

  brief?.medications?.forEach(med => {
    if (med.sideEffects && med.sideEffects.length > 0) {
      flags.push(`${med.sideEffects.join(', ')} (${med.name})`);
    }
  });

  attentionWarnings?.forEach(w => {
    flags.push(w.text);
  });

  // ─── TIER 2: STATUS BAR ITEMS ───
  const statusItems = [
    { emoji: '\uD83D\uDC8A', value: medsTotal > 0 ? `${medsDone}/${medsTotal}` : null, done: allMedsDone },
    { emoji: '\uD83E\uDE7A', value: brief?.vitals?.scheduled ? (hasVitals ? '\u2713' : '\u2014') : null, done: hasVitals },
    { emoji: '\uD83C\uDF7D\uFE0F', value: mealsTotal > 0 ? `${mealsDone}/${mealsTotal}` : null, done: mealsDone === mealsTotal && mealsTotal > 0 },
    { emoji: '\uD83D\uDCA7', value: `${brief?.hydration?.glasses ?? 0}/8`, done: (brief?.hydration?.glasses ?? 0) >= 8 },
    { emoji: '\u2600\uFE0F', value: hasWellness ? '\u2713' : '\u2014', done: hasWellness },
    { emoji: '\uD83C\uDF19', value: brief?.mood?.eveningWellness ? '\u2713' : '\u2014', done: !!brief?.mood?.eveningWellness },
  ].filter(item => item.value !== null);

  // Days until next appointment
  const daysUntilAppt = brief?.nextAppointment
    ? Math.max(0, Math.ceil((new Date(brief.nextAppointment.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;
  const showAppointment = brief?.nextAppointment && daysUntilAppt != null && daysUntilAppt <= 7;

  // ─── NOTES AGGREGATION ───
  interface AggregatedNote {
    time: string;
    text: string;
    timestamp: number;
  }

  const aggregatedNotes: AggregatedNote[] = [];

  // Medication side-effect notes
  brief?.medications?.forEach(med => {
    if (med.sideEffects && med.sideEffects.length > 0) {
      const ts = med.takenAt || med.scheduledTime;
      aggregatedNotes.push({
        time: ts ? formatTime(ts) : '',
        text: `${med.name}: ${med.sideEffects.join(', ')}`,
        timestamp: ts ? new Date(ts).getTime() : 0,
      });
    }
  });

  // Freeform notes from centralStorage
  todayNotes.forEach(note => {
    aggregatedNotes.push({
      time: formatTime(note.timestamp),
      text: note.content,
      timestamp: new Date(note.timestamp).getTime(),
    });
  });

  // Sort reverse chronological
  aggregatedNotes.sort((a, b) => b.timestamp - a.timestamp);

  // ============================================================================
  // RENDER — MAIN
  // ============================================================================
  return (
    <View style={s.container}>
      <AuroraBackground variant="journal" />

      <ScrollView
        style={s.scrollView}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />
        }
      >
        <ScreenHeader
          title="Journal"
          subtitle={journalSubtitle}
          rightAction={
            <TouchableOpacity
              onPress={() => navigate('/calendar')}
              style={s.headerGear}
              accessibilityLabel="View calendar"
              accessibilityRole="button"
            >
              <Text style={s.headerGearIcon}>{'\uD83D\uDCC5'}</Text>
            </TouchableOpacity>
          }
        />

        {/* ═══════════════════════════════════════════════════════════════════
            TIER 1: NEEDS ATTENTION (conditional)
            ═══════════════════════════════════════════════════════════════════ */}
        {flags.length > 0 && (
          <View style={s.flagBanner}>
            <Text style={s.flagLabel}>NEEDS ATTENTION</Text>
            {flags.map((flag, i) => (
              <Text key={i} style={s.flagText}>{flag}</Text>
            ))}
          </View>
        )}

        {/* Allergy banner — persistent subtle banner */}
        {brief?.patient.allergies && brief.patient.allergies.length > 0 && (
          <View style={s.allergyBanner}>
            <Text style={s.allergyLabel}>Allergies:</Text>
            <Text style={s.allergyList}>{brief.patient.allergies.join(', ')}</Text>
          </View>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            TIER 2: STATUS BAR
            ═══════════════════════════════════════════════════════════════════ */}
        {brief && (
          <View style={s.statusBar}>
            <View style={s.statusBarItems}>
              {statusItems.map((item, i) => (
                <View key={i} style={s.statusBarItem}>
                  <Text style={s.statusBarEmoji}>{item.emoji}</Text>
                  <Text style={[
                    s.statusBarValue,
                    { color: item.done ? Colors.green : Colors.textMuted },
                  ]}>
                    {item.value}
                  </Text>
                </View>
              ))}
            </View>
            <Text style={s.statusBarPercent}>{pct}%</Text>
          </View>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            TIER 3: THE RECORD
            ═══════════════════════════════════════════════════════════════════ */}

        {/* ─── Section 1: MEDICATIONS ─── */}
        {brief && medsTotal > 0 && (
          <JournalSection label="MEDICATIONS" accentColor={Colors.green}>
            {brief.medications.map((med, i) => {
              const done = med.status === 'completed';
              const missed = med.status === 'missed';
              const timeStr = done
                ? (med.takenAt ? formatTime(med.takenAt) : 'Taken')
                : missed
                  ? 'Missed'
                  : (med.scheduledTime ? formatTime(med.scheduledTime) : '');
              const checkColor = done ? Colors.green : missed ? Colors.redBright : Colors.textMuted;
              const checkChar = done ? '\u2713' : missed ? '\u2717' : '\u00B7';

              return (
                <View key={i} style={s.medRow}>
                  <Text style={[s.medCheck, { color: checkColor }]}>{checkChar}</Text>
                  <View style={s.medInfo}>
                    <Text style={s.medName}>{med.name}</Text>
                    {med.sideEffects && med.sideEffects.length > 0 && (
                      <Text style={s.medNote}>
                        {'\u26A0'} {med.sideEffects.join(', ')}
                      </Text>
                    )}
                  </View>
                  <Text style={s.medTime}>{timeStr}</Text>
                </View>
              );
            })}
          </JournalSection>
        )}

        {/* ─── Section 2: VITALS ─── */}
        {brief && brief.vitals.scheduled && (
          <JournalSection label="VITALS" accentColor={Colors.accent}>
            {hasVitals && brief.vitals.readings ? (
              <View style={s.statGrid}>
                {brief.vitals.readings.systolic != null && brief.vitals.readings.diastolic != null && (
                  <View style={s.statItem}>
                    <Text style={s.statLabel}>BP</Text>
                    <Text style={[
                      s.statValue,
                      (brief.vitals.readings.systolic > 140 || brief.vitals.readings.diastolic > 90) && s.statValueFlag,
                    ]}>
                      {brief.vitals.readings.systolic}/{brief.vitals.readings.diastolic}
                      {(brief.vitals.readings.systolic > 140 || brief.vitals.readings.diastolic > 90) ? ' \u25B2' : ''}
                    </Text>
                  </View>
                )}
                {brief.vitals.readings.heartRate != null && (
                  <View style={s.statItem}>
                    <Text style={s.statLabel}>HR</Text>
                    <Text style={[
                      s.statValue,
                      (brief.vitals.readings.heartRate > 100 || brief.vitals.readings.heartRate < 50) && s.statValueFlag,
                    ]}>
                      {brief.vitals.readings.heartRate}
                      {(brief.vitals.readings.heartRate > 100 || brief.vitals.readings.heartRate < 50) ? ' \u25B2' : ''}
                    </Text>
                    <Text style={s.statSub}>bpm</Text>
                  </View>
                )}
                {brief.vitals.readings.oxygen != null && (
                  <View style={s.statItem}>
                    <Text style={s.statLabel}>SpO2</Text>
                    <Text style={[
                      s.statValue,
                      brief.vitals.readings.oxygen < 92 && s.statValueFlag,
                    ]}>
                      {brief.vitals.readings.oxygen}%
                      {brief.vitals.readings.oxygen < 92 ? ' \u25B2' : ''}
                    </Text>
                  </View>
                )}
                {brief.vitals.readings.glucose != null && (
                  <View style={s.statItem}>
                    <Text style={s.statLabel}>Glucose</Text>
                    <Text style={[
                      s.statValue,
                      brief.vitals.readings.glucose > 140 && s.statValueFlag,
                    ]}>
                      {brief.vitals.readings.glucose}
                      {brief.vitals.readings.glucose > 140 ? ' \u25B2' : ''}
                    </Text>
                  </View>
                )}
                {brief.vitals.readings.temperature != null && (
                  <View style={s.statItem}>
                    <Text style={s.statLabel}>Temp</Text>
                    <Text style={s.statValue}>
                      {brief.vitals.readings.temperature}{'\u00B0'}F
                    </Text>
                  </View>
                )}
                {brief.vitals.readings.weight != null && (
                  <View style={s.statItem}>
                    <Text style={s.statLabel}>Weight</Text>
                    <Text style={s.statValue}>{brief.vitals.readings.weight}</Text>
                    <Text style={s.statSub}>lbs</Text>
                  </View>
                )}
              </View>
            ) : (
              <Text style={{ fontSize: 13, color: Colors.textMuted }}>Not recorded</Text>
            )}
          </JournalSection>
        )}

        {/* ─── Section 3: INTAKE ─── */}
        {brief && (
          <JournalSection label="INTAKE" accentColor={Colors.accent}>
            <View style={s.intakeRow}>
              {/* Meals on left */}
              <View style={s.intakeMeals}>
                {brief.meals.meals.map((meal, i) => {
                  const done = meal.status === 'completed';
                  return (
                    <Text key={i} style={{ fontSize: 12, color: Colors.textPrimary }}>
                      {meal.name}{' '}
                      <Text style={{ color: done ? Colors.green : Colors.textMuted }}>
                        {done ? '\u2713' : '\u2014'}
                      </Text>
                    </Text>
                  );
                })}
              </View>

              {/* Water on right */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 12 }}>{'\uD83D\uDCA7'}</Text>
                <View style={{ flexDirection: 'row', gap: 3 }}>
                  {Array.from({ length: 8 }).map((_, i) => (
                    <View
                      key={i}
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: i < (brief.hydration.glasses ?? 0) ? Colors.accent : Colors.border,
                      }}
                    />
                  ))}
                </View>
                <Text style={{ fontSize: 11, color: Colors.textMuted }}>
                  {brief.hydration.glasses ?? 0}/8
                </Text>
              </View>
            </View>
          </JournalSection>
        )}

        {/* ─── Section 4: BODY & MIND ─── */}
        {brief && (
          <JournalSection label="BODY & MIND" accentColor={Colors.accent}>
            <View style={s.statGrid}>
              {/* Sleep */}
              {brief.sleep.logged && brief.sleep.hours != null && (
                <View style={s.statItem}>
                  <Text style={s.statLabel}>Sleep</Text>
                  <Text style={s.statValue}>{brief.sleep.hours}h</Text>
                  {brief.sleep.quality ? <Text style={s.statSub}>{brief.sleep.quality}</Text> : null}
                </View>
              )}

              {/* Mood */}
              {brief.mood.morningWellness?.mood && (
                <View style={s.statItem}>
                  <Text style={s.statLabel}>Mood</Text>
                  <Text style={s.statValue}>{brief.mood.morningWellness.mood}</Text>
                </View>
              )}

              {/* Orientation */}
              {brief.mood.morningWellness?.orientation && (
                <View style={s.statItem}>
                  <Text style={s.statLabel}>Orientation</Text>
                  <Text style={s.statValue}>{brief.mood.morningWellness.orientation}</Text>
                </View>
              )}

              {/* Pain from evening wellness */}
              {brief.mood.eveningWellness?.painLevel && (
                <View style={s.statItem}>
                  <Text style={s.statLabel}>Pain</Text>
                  <Text style={s.statValue}>{brief.mood.eveningWellness.painLevel}</Text>
                </View>
              )}

              {brief.mood.eveningWellness?.alertness && (
                <View style={s.statItem}>
                  <Text style={s.statLabel}>Alertness</Text>
                  <Text style={s.statValue}>{brief.mood.eveningWellness.alertness}</Text>
                </View>
              )}

              {brief.mood.eveningWellness?.bowelMovement && (
                <View style={s.statItem}>
                  <Text style={s.statLabel}>Bowel</Text>
                  <Text style={s.statValue}>{brief.mood.eveningWellness.bowelMovement}</Text>
                </View>
              )}

              {brief.mood.eveningWellness?.bathingStatus && (
                <View style={s.statItem}>
                  <Text style={s.statLabel}>Bathing</Text>
                  <Text style={s.statValue}>{brief.mood.eveningWellness.bathingStatus}</Text>
                </View>
              )}

              {brief.mood.eveningWellness?.mobilityStatus && (
                <View style={s.statItem}>
                  <Text style={s.statLabel}>Mobility</Text>
                  <Text style={s.statValue}>{brief.mood.eveningWellness.mobilityStatus}</Text>
                </View>
              )}

              {/* Day rating from evening wellness */}
              {brief.mood.eveningWellness?.dayRating && (
                <View style={s.statItem}>
                  <Text style={s.statLabel}>Day Rating</Text>
                  <Text style={s.statValue}>{brief.mood.eveningWellness.dayRating}</Text>
                </View>
              )}
            </View>

            {/* Pending footnote */}
            {(!hasWellness || !brief.mood.eveningWellness) && (
              <View style={s.pendingFootnote}>
                <Text style={s.pendingLabel}>Pending:</Text>
                {!hasWellness && (
                  <Text style={s.pendingItem}>AM wellness</Text>
                )}
                {!hasWellness && !brief.mood.eveningWellness && (
                  <Text style={s.pendingDot}>{'\u00B7'}</Text>
                )}
                {!brief.mood.eveningWellness && (
                  <Text style={s.pendingItem}>PM wellness</Text>
                )}
              </View>
            )}
          </JournalSection>
        )}

        {/* ─── Section 5: NOTES (conditional) ─── */}
        {aggregatedNotes.length > 0 && (
          <JournalSection label="NOTES" accentColor={Colors.amberBright}>
            {aggregatedNotes.map((note, i) => (
              <View
                key={i}
                style={[
                  s.noteRow,
                  i < aggregatedNotes.length - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor: Colors.border,
                  },
                ]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                  {note.time ? <Text style={s.noteTime}>{note.time}</Text> : null}
                  <Text style={[s.noteText, { flex: 1 }]}>{note.text}</Text>
                </View>
              </View>
            ))}
          </JournalSection>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            TIER 4: CONTEXT
            ═══════════════════════════════════════════════════════════════════ */}

        {/* ─── NEXT APPOINTMENT (within 7 days) ─── */}
        {showAppointment && brief?.nextAppointment && (
          <View style={s.appointmentCard}>
            <Text style={s.appointmentIcon}>{'\uD83D\uDCC5'}</Text>
            <View style={s.appointmentInfo}>
              <Text style={s.appointmentProvider}>
                {brief.nextAppointment.provider} ({brief.nextAppointment.specialty})
              </Text>
              <Text style={s.appointmentDate}>
                {new Date(brief.nextAppointment.date).toLocaleDateString('en-US', {
                  weekday: 'short', month: 'short', day: 'numeric',
                })}
              </Text>
            </View>
            {daysUntilAppt != null && (
              <Text style={s.appointmentDays}>
                {daysUntilAppt === 0 ? 'Today' : daysUntilAppt === 1 ? 'Tomorrow' : `${daysUntilAppt} days`}
              </Text>
            )}
          </View>
        )}

        {/* ─── HANDOFF NOTES (the one card-like element) ─── */}
        {brief && (
          <View style={s.handoffBlock}>
            <Text style={s.handoffLabel}>HANDOFF NOTES</Text>
            <Text style={s.handoffText}>
              {buildHandoffSummary(brief, medsDone, medsTotal, allMedsDone, hasVitals)}
            </Text>
          </View>
        )}

        {/* ─── SHARE / EXPORT ─── */}
        <ShareActions
          onShare={() => navigate('/care-summary-export')}
          onExport={brief?.sections.showExportPdf ? () => navigate('/care-summary-export') : undefined}
        />

        {/* ─── DISCLAIMER + TIMESTAMP ─── */}
        {brief && (
          <Text style={s.disclaimer}>
            Updated {new Date(brief.generatedAt).toLocaleTimeString('en-US', {
              hour: 'numeric', minute: '2-digit',
            })} {'\u00B7'} Not a medical record
          </Text>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
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
  const pending: string[] = [];

  // Only mention medications if some are NOT done
  if (medsTotal > 0 && !allMedsDone) {
    const remaining = medsTotal - medsDone;
    pending.push(`${remaining} medication${remaining === 1 ? '' : 's'} still pending`);
  }

  // Vitals
  if (!hasVitals && brief.vitals.scheduled) {
    pending.push('vitals not yet recorded');
  }

  // Wellness
  if (!brief.mood.morningWellness) {
    pending.push('morning wellness check pending');
  }
  if (!brief.mood.eveningWellness) {
    pending.push('evening wellness check pending');
  }

  // Water
  const glasses = brief.hydration.glasses ?? 0;
  if (glasses < 4) {
    pending.push(`only ${glasses} of 8 glasses of water logged`);
  }

  // Next appointment
  if (brief.nextAppointment) {
    const dateStr = new Date(brief.nextAppointment.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    pending.push(`next appointment: ${brief.nextAppointment.provider} on ${dateStr}`);
  }

  if (pending.length === 0) {
    return 'All tasks completed for today. No pending items.';
  }

  // Capitalize first item and join with commas
  const first = pending[0].charAt(0).toUpperCase() + pending[0].slice(1);
  if (pending.length === 1) return first + '.';
  return first + ', ' + pending.slice(1).join(', ') + '.';
}

// ============================================================================
// STYLES
// ============================================================================

const s = StyleSheet.create({
  // ─── LAYOUT ───
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 80,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: Colors.textSecondary,
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
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  headerGear: {
    padding: 8,
    marginRight: -8,
  },
  headerGearIcon: {
    fontSize: 20,
    opacity: 0.7,
  },

  // ─── AUTH GATE ───
  authGateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  authGateIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  authGateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  authGateSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  authGateButton: {
    backgroundColor: Colors.accent,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: BorderRadius.lg,
  },
  authGateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // ─── NEEDS ATTENTION (TIER 1) ───
  flagBanner: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: Colors.redFaint,
    borderLeftWidth: 3,
    borderLeftColor: Colors.red,
    marginBottom: 16,
  },
  flagLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.red,
    letterSpacing: 1,
    marginBottom: 5,
  },
  flagText: {
    fontSize: 13,
    color: Colors.textBright,
    lineHeight: 20,
  },

  // ─── ALLERGY BANNER ───
  allergyBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  allergyLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.redBright,
  },
  allergyList: {
    fontSize: 11,
    color: 'rgba(248, 113, 113, 0.9)',
    flex: 1,
  },

  // ─── STATUS BAR (TIER 2) ───
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.border,
    marginBottom: 20,
  },
  statusBarItems: {
    flexDirection: 'row',
    gap: 14,
  },
  statusBarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  statusBarEmoji: {
    fontSize: 12,
  },
  statusBarValue: {
    fontSize: 11,
    fontWeight: '500',
  },
  statusBarPercent: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.accent,
  },

  // ─── JOURNAL SECTION ───
  journalSection: {
    marginBottom: 20,
  },
  journalSectionBar: {
    height: 2,
    borderRadius: 1,
    opacity: 0.5,
    marginBottom: 10,
  },
  journalSectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },

  // ─── INLINE STAT GRID (shared by Vitals + Body & Mind) ───
  statGrid: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
  },
  statItem: {
    minWidth: 56,
  },
  statLabel: {
    fontSize: 9,
    color: Colors.textMuted,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  statValueFlag: {
    color: Colors.red,
  },
  statSub: {
    fontSize: 9,
    color: Colors.textMuted,
    marginTop: 1,
  },

  // ─── MED ROW ───
  medRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 6,
  },
  medCheck: {
    fontSize: 11,
    width: 18,
  },
  medInfo: {
    flex: 1,
  },
  medName: {
    fontSize: 13,
    color: Colors.textPrimary,
  },
  medNote: {
    fontSize: 11,
    color: Colors.amberBright,
    marginTop: 2,
    fontStyle: 'italic',
  },
  medTime: {
    fontSize: 11,
    color: Colors.textMuted,
  },

  // ─── INTAKE ROW ───
  intakeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  intakeMeals: {
    flexDirection: 'row',
    gap: 16,
  },

  // ─── NOTE ROW ───
  noteRow: {
    paddingVertical: 6,
  },
  noteTime: {
    fontSize: 10,
    color: Colors.textMuted,
    marginRight: 8,
  },
  noteText: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
  },

  // ─── PENDING FOOTNOTE ───
  pendingFootnote: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 8,
  },
  pendingLabel: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  pendingItem: {
    fontSize: 10,
    color: Colors.amberBright,
  },
  pendingDot: {
    fontSize: 10,
    color: Colors.textMuted,
  },

  // ─── APPOINTMENT ───
  appointmentCard: {
    backgroundColor: Colors.sageBorder,
    borderWidth: 1,
    borderColor: Colors.accentBorder,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  appointmentIcon: {
    fontSize: 16,
  },
  appointmentInfo: {
    flex: 1,
  },
  appointmentProvider: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  appointmentDate: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 1,
  },
  appointmentDays: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.accent,
  },

  // ─── HANDOFF (the one card-like element) ───
  handoffBlock: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: Colors.amberFaint,
    borderLeftWidth: 3,
    borderLeftColor: Colors.amberBright,
    marginBottom: 16,
  },
  handoffLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.amberBright,
    letterSpacing: 1,
    marginBottom: 5,
  },
  handoffText: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 19,
  },

  // ─── DISCLAIMER ───
  disclaimer: {
    fontSize: 10,
    color: Colors.textTertiary,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 16,
  },
});
