// ============================================================================
// JOURNAL PAGE - Flat Newspaper Layout (v5.4+ Design)
// 4 priority tiers: Needs Attention → Status Bar → The Record → Context
// No GlassCards. Colored top-border sections. Flat information hierarchy.
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
// JOURNAL SECTION COMPONENT — flat with colored top bar
// ============================================================================

interface JournalSectionProps {
  label: string;
  color: string;
  children: React.ReactNode;
}

function JournalSection({ label, color, children }: JournalSectionProps) {
  return (
    <View style={s.journalSection}>
      <View style={[s.journalSectionBar, { backgroundColor: color }]} />
      <Text style={[s.journalSectionLabel, { color }]}>{label}</Text>
      {children}
    </View>
  );
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

  const dayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const journalSubtitle = `Care Brief \u00B7 ${dayName}, ${dateStr}`;

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

  const pct = careTasksState?.completionRate ?? 0;

  // Flags for Tier 1
  const hasVitalsFlag = brief?.vitals?.readings &&
    ((brief.vitals.readings.systolic ?? 0) > 140 ||
     (brief.vitals.readings.diastolic ?? 0) > 90 ||
     ((brief.vitals.readings.oxygen ?? 100) < 92));
  const hasSideEffects = brief?.medications.some(m => m.sideEffects && m.sideEffects.length > 0);
  const hasAttentionItems = brief && brief.attentionItems.length > 0;
  const showNeedsAttention = hasVitalsFlag || hasSideEffects || hasAttentionItems;

  // Water
  const waterGlasses = brief?.hydration.glasses ?? 0;

  // Wellness checks
  const hasMorning = brief?.mood.morningWellness != null;
  const hasEvening = brief?.mood.eveningWellness != null;

  // Notes aggregation
  interface AggregatedNote {
    time: string;
    text: string;
    timestamp: number;
  }
  const aggregatedNotes: AggregatedNote[] = [];
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
  todayNotes.forEach(note => {
    aggregatedNotes.push({
      time: formatTime(note.timestamp),
      text: note.content,
      timestamp: new Date(note.timestamp).getTime(),
    });
  });
  aggregatedNotes.sort((a, b) => b.timestamp - a.timestamp);

  // Days until next appointment
  const daysUntilAppt = brief?.nextAppointment
    ? Math.max(0, Math.ceil((new Date(brief.nextAppointment.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;
  const showAppointment = brief?.nextAppointment && daysUntilAppt != null && daysUntilAppt <= 7;

  // ============================================================================
  // RENDER — MAIN (Newspaper Layout)
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

        {/* ─── TIER 1: NEEDS ATTENTION ─── */}
        {showNeedsAttention && (
          <View style={s.needsAttentionBanner}>
            <View style={s.needsAttentionBar} />
            <Text style={s.needsAttentionTitle}>NEEDS ATTENTION</Text>
            {hasVitalsFlag && brief?.vitals?.readings && (
              <Text style={s.needsAttentionItem}>
                {'\u2022'} Vitals outside normal range
                {brief.vitals.readings.systolic != null && brief.vitals.readings.diastolic != null
                  ? ` (BP ${brief.vitals.readings.systolic}/${brief.vitals.readings.diastolic})`
                  : ''}
                {brief.vitals.readings.oxygen != null && brief.vitals.readings.oxygen < 92
                  ? ` (SpO2 ${brief.vitals.readings.oxygen}%)`
                  : ''}
              </Text>
            )}
            {hasSideEffects && brief?.medications
              .filter(m => m.sideEffects && m.sideEffects.length > 0)
              .map((m, i) => (
                <Text key={i} style={s.needsAttentionItem}>
                  {'\u2022'} {m.name}: {m.sideEffects!.join(', ')}
                </Text>
              ))
            }
            {hasAttentionItems && brief?.attentionItems.map((item, i) => (
              <Text key={`attn-${i}`} style={s.needsAttentionItem}>
                {'\u2022'} {item.text}
              </Text>
            ))}
            {/* Allergies in attention area */}
            {brief?.patient.allergies && brief.patient.allergies.length > 0 && (
              <View style={s.allergyRow}>
                <Text style={s.allergyLabel}>Allergies:</Text>
                <Text style={s.allergyList}>{brief.patient.allergies.join(', ')}</Text>
              </View>
            )}
          </View>
        )}

        {/* Allergies when no attention banner */}
        {!showNeedsAttention && brief?.patient.allergies && brief.patient.allergies.length > 0 && (
          <View style={s.allergyStandalone}>
            <Text style={s.allergyLabel}>Allergies:</Text>
            <Text style={s.allergyList}>{brief.patient.allergies.join(', ')}</Text>
          </View>
        )}

        {/* ─── DISCLAIMER ─── */}
        <Text style={s.disclaimer}>
          Personal tracking summary — not a medical record.
        </Text>

        {/* ─── TIER 2: STATUS BAR ─── */}
        {brief && (
          <View style={s.statusBar}>
            <View style={s.statusItems}>
              <Text style={s.statusItem}>
                {'\uD83D\uDC8A'} {medsDone}/{medsTotal}
              </Text>
              <Text style={s.statusDot}>{'\u00B7'}</Text>
              <Text style={s.statusItem}>
                {'\uD83E\uDE7A'} {hasVitals ? '\u2713' : '\u2014'}
              </Text>
              <Text style={s.statusDot}>{'\u00B7'}</Text>
              <Text style={s.statusItem}>
                {'\uD83C\uDF7D\uFE0F'} {mealsDone}/{mealsTotal}
              </Text>
              <Text style={s.statusDot}>{'\u00B7'}</Text>
              <Text style={s.statusItem}>
                {'\uD83D\uDCA7'} {waterGlasses}/8
              </Text>
              <Text style={s.statusDot}>{'\u00B7'}</Text>
              <Text style={s.statusItem}>
                {'\u2600\uFE0F'} {hasMorning ? '\u2713' : '\u2014'}
              </Text>
              <Text style={s.statusDot}>{'\u00B7'}</Text>
              <Text style={s.statusItem}>
                {'\uD83C\uDF19'} {hasEvening ? '\u2713' : '\u2014'}
              </Text>
            </View>
            {pct > 0 && (
              <Text style={s.statusPct}>{pct}%</Text>
            )}
          </View>
        )}

        {/* ─── TIER 3: THE RECORD ─── */}

        {/* MEDICATIONS */}
        {brief && medsTotal > 0 && (
          <JournalSection label="MEDICATIONS" color={Colors.green}>
            {brief.medications.map((med, i) => {
              const done = med.status === 'completed';
              const missed = med.status === 'missed';
              const timeStr = done
                ? (med.takenAt ? formatTime(med.takenAt) : 'Taken')
                : missed ? 'Missed'
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

        {/* VITALS */}
        {brief && brief.vitals.scheduled && (
          <JournalSection label="VITALS" color={Colors.accent}>
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
                    </Text>
                  </View>
                )}
                {brief.vitals.readings.glucose != null && (
                  <View style={s.statItem}>
                    <Text style={s.statLabel}>Glucose</Text>
                    <Text style={s.statValue}>{brief.vitals.readings.glucose}</Text>
                  </View>
                )}
                {brief.vitals.readings.temperature != null && (
                  <View style={s.statItem}>
                    <Text style={s.statLabel}>Temp</Text>
                    <Text style={s.statValue}>{brief.vitals.readings.temperature}{'\u00B0'}F</Text>
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
              <Text style={s.notRecorded}>Not recorded yet</Text>
            )}
          </JournalSection>
        )}

        {/* INTAKE */}
        {brief && (
          <JournalSection label="INTAKE" color={Colors.accent}>
            <View style={s.intakeRow}>
              <View style={s.intakeMeals}>
                {brief.meals.meals.map((meal, i) => {
                  const done = meal.status === 'completed';
                  return (
                    <Text key={i} style={s.mealText}>
                      {meal.name}{' '}
                      <Text style={{ color: done ? Colors.green : Colors.textMuted }}>
                        {done ? '\u2713' : '\u2014'}
                      </Text>
                    </Text>
                  );
                })}
              </View>
              <View style={s.waterRow}>
                <Text style={s.waterEmoji}>{'\uD83D\uDCA7'}</Text>
                <View style={s.waterDots}>
                  {Array.from({ length: 8 }).map((_, i) => (
                    <View
                      key={i}
                      style={[
                        s.waterDot,
                        { backgroundColor: i < waterGlasses ? Colors.accent : Colors.border },
                      ]}
                    />
                  ))}
                </View>
                <Text style={s.waterCount}>{waterGlasses}/8</Text>
              </View>
            </View>
          </JournalSection>
        )}

        {/* BODY & MIND */}
        {brief && (
          <JournalSection label="BODY & MIND" color={Colors.accent}>
            <View style={s.statGrid}>
              {brief.sleep.logged && brief.sleep.hours != null && (
                <View style={s.statItem}>
                  <Text style={s.statLabel}>Sleep</Text>
                  <Text style={s.statValue}>{brief.sleep.hours}h</Text>
                  {brief.sleep.quality ? <Text style={s.statSub}>{brief.sleep.quality}</Text> : null}
                </View>
              )}
              {brief.mood.morningWellness?.mood && (
                <View style={s.statItem}>
                  <Text style={s.statLabel}>Mood</Text>
                  <Text style={s.statValue}>{brief.mood.morningWellness.mood}</Text>
                </View>
              )}
              {brief.mood.morningWellness?.orientation && (
                <View style={s.statItem}>
                  <Text style={s.statLabel}>Orientation</Text>
                  <Text style={s.statValue}>{brief.mood.morningWellness.orientation}</Text>
                </View>
              )}
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
              {brief.mood.eveningWellness?.dayRating && (
                <View style={s.statItem}>
                  <Text style={s.statLabel}>Day Rating</Text>
                  <Text style={s.statValue}>{brief.mood.eveningWellness.dayRating}</Text>
                </View>
              )}
            </View>
            {!hasMorning && !hasEvening && (
              <Text style={s.pendingNote}>Wellness checks pending</Text>
            )}
          </JournalSection>
        )}

        {/* NOTES */}
        {aggregatedNotes.length > 0 && (
          <JournalSection label="NOTES" color={Colors.amberBright}>
            {aggregatedNotes.map((note, i) => (
              <View key={i} style={[s.noteRow, i < aggregatedNotes.length - 1 && s.noteRowBorder]}>
                {note.time ? <Text style={s.noteTime}>{note.time}</Text> : null}
                <Text style={s.noteText}>{note.text}</Text>
              </View>
            ))}
          </JournalSection>
        )}

        {/* ─── TIER 4: CONTEXT ─── */}

        {/* NEXT APPOINTMENT */}
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

        {/* HANDOFF */}
        {brief && (
          <View style={s.handoffCard}>
            <Text style={s.handoffHeader}>IF SOMEONE ELSE IS TAKING OVER</Text>
            <Text style={s.handoffText}>
              {brief.handoffNarrative || buildHandoffSummary(brief, medsDone, medsTotal, allMedsDone, hasVitals)}
            </Text>
          </View>
        )}

        {/* SHARE / EXPORT */}
        <ShareActions
          onShare={() => navigate('/care-summary-export')}
          onExport={brief?.sections.showExportPdf ? () => navigate('/care-summary-export') : undefined}
        />

        {/* TIMESTAMP */}
        {brief && (
          <Text style={s.timestamp}>
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
  const pending: string[] = [];
  if (medsTotal > 0 && !allMedsDone) {
    const remaining = medsTotal - medsDone;
    pending.push(`${remaining} medication${remaining === 1 ? '' : 's'} still pending`);
  }
  if (!hasVitals && brief.vitals.scheduled) {
    pending.push('vitals not yet recorded');
  }
  if (!brief.mood.morningWellness) {
    pending.push('morning wellness check pending');
  }
  if (!brief.mood.eveningWellness) {
    pending.push('evening wellness check pending');
  }
  const glasses = brief.hydration.glasses ?? 0;
  if (glasses < 4) {
    pending.push(`only ${glasses} of 8 glasses of water logged`);
  }
  if (brief.nextAppointment) {
    const dateStr = new Date(brief.nextAppointment.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    pending.push(`next appointment: ${brief.nextAppointment.provider} on ${dateStr}`);
  }
  if (pending.length === 0) {
    return 'All tasks completed for today. No pending items.';
  }
  const first = pending[0].charAt(0).toUpperCase() + pending[0].slice(1);
  if (pending.length === 1) return first + '.';
  return first + ', ' + pending.slice(1).join(', ') + '.';
}

// ============================================================================
// STYLES
// ============================================================================

const s = StyleSheet.create({
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

  // Auth Gate
  authGateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  authGateIcon: { fontSize: 48, marginBottom: 16 },
  authGateTitle: { fontSize: 20, fontWeight: '600', color: Colors.textPrimary, marginBottom: 8 },
  authGateSubtitle: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  authGateButton: { backgroundColor: Colors.accent, paddingHorizontal: 32, paddingVertical: 14, borderRadius: BorderRadius.lg },
  authGateButtonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },

  // ─── TIER 1: NEEDS ATTENTION ───
  needsAttentionBanner: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.redBright,
    backgroundColor: Colors.redFaint,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    position: 'relative',
  },
  needsAttentionBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: Colors.redBright,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  needsAttentionTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.redBright,
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  needsAttentionItem: {
    fontSize: 13,
    color: Colors.textBright,
    lineHeight: 20,
  },

  // Allergy row (in attention or standalone)
  allergyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    backgroundColor: 'rgba(248, 113, 113, 0.1)',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  allergyStandalone: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.redFaint,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 12,
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

  // Disclaimer
  disclaimer: {
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: 12,
    fontStyle: 'italic',
  },

  // ─── TIER 2: STATUS BAR ───
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 4,
    marginBottom: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.border,
  },
  statusItems: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    flex: 1,
    gap: 2,
  },
  statusItem: {
    fontSize: 13,
    color: Colors.textPrimary,
  },
  statusDot: {
    fontSize: 13,
    color: Colors.textMuted,
    marginHorizontal: 2,
  },
  statusPct: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.accent,
    marginLeft: 8,
  },

  // ─── JOURNAL SECTION (flat, colored top bar) ───
  journalSection: {
    marginBottom: 16,
    paddingTop: 2,
  },
  journalSectionBar: {
    height: 3,
    borderRadius: 2,
    marginBottom: 8,
  },
  journalSectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },

  // Stat Grid
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
  notRecorded: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  pendingNote: {
    fontSize: 12,
    color: Colors.textMuted,
    fontStyle: 'italic',
    marginTop: 6,
  },

  // Med Rows
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

  // Intake
  intakeRow: {
    gap: 12,
  },
  intakeMeals: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
  },
  mealText: {
    fontSize: 12,
    color: Colors.textPrimary,
  },
  waterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  waterEmoji: {
    fontSize: 12,
  },
  waterDots: {
    flexDirection: 'row',
    gap: 3,
  },
  waterDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  waterCount: {
    fontSize: 11,
    color: Colors.textMuted,
  },

  // Notes
  noteRow: {
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  noteRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
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
    flex: 1,
  },

  // ─── TIER 4: CONTEXT ───

  // Appointment
  appointmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: Colors.glass,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
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

  // Handoff
  handoffCard: {
    backgroundColor: Colors.purpleFaint,
    borderLeftWidth: 3,
    borderLeftColor: Colors.purple,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  handoffHeader: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.purple,
    letterSpacing: 1,
    marginBottom: 6,
  },
  handoffText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
  },

  // Timestamp
  timestamp: {
    fontSize: 10,
    color: Colors.textTertiary,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 16,
  },
});
