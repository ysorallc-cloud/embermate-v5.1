// ============================================================================
// JOURNAL PAGE - Flat Newspaper Layout (v5.4+ Design)
// 4 priority tiers: Needs Attention → Status Bar → The Record → Context
// No GlassCards. Colored top-border sections. Flat information hierarchy.
// ============================================================================

import React, { useState, useCallback, useEffect, useRef } from 'react';
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
// BADGE COMPONENT — status indicator on section headers
// ============================================================================

function Badge({ text, variant = 'done' }: { text: string; variant?: 'done' | 'pending' | 'missed' | 'info' }) {
  const badgeStyles: Record<string, { bg: string; border: string; color: string }> = {
    done: { bg: Colors.greenTint, border: Colors.greenBorder, color: Colors.green },
    pending: { bg: Colors.amberFaint, border: Colors.amberBorder, color: Colors.amberBright },
    missed: { bg: Colors.redFaint, border: Colors.redBorder, color: Colors.redBright },
    info: { bg: Colors.glass, border: Colors.border, color: Colors.textMuted },
  };
  const bs = badgeStyles[variant] || badgeStyles.info;
  return (
    <View style={[s.badge, { backgroundColor: bs.bg, borderColor: bs.border }]}>
      <Text style={[s.badgeText, { color: bs.color }]}>{text}</Text>
    </View>
  );
}

// ============================================================================
// JOURNAL SECTION COMPONENT — card with colored left border
// ============================================================================

interface JournalSectionProps {
  icon?: string;
  label: string;
  color: string;
  badge?: { text: string; variant: 'done' | 'pending' | 'missed' | 'info' };
  children: React.ReactNode;
}

function JournalSection({ icon, label, color, badge, children }: JournalSectionProps) {
  return (
    <View style={[s.journalSection, { borderLeftColor: color }]}>
      <View style={s.journalSectionHeader}>
        <View style={s.journalSectionHeaderLeft}>
          {icon && <Text style={s.journalSectionIcon}>{icon}</Text>}
          <Text style={s.journalSectionLabel}>{label}</Text>
        </View>
        {badge && <Badge text={badge.text} variant={badge.variant} />}
      </View>
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
  // Debounce event-driven reloads to prevent cascade storms
  const reloadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useDataListener(useCallback((category) => {
    // Only reload for relevant events
    if (!['dailyInstances', 'carePlanItems', 'logs'].includes(category)) return;
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

        {/* ─── PATIENT CARD ─── */}
        {brief?.patient.name ? (
          <View style={s.patientCard}>
            <Text style={s.patientName}>{brief.patient.name}</Text>
            {brief.patient.relationship ? (
              <Text style={s.patientRelation}>{brief.patient.relationship}</Text>
            ) : null}
            {brief.patient.conditions && brief.patient.conditions.length > 0 && (
              <View style={s.conditionRow}>
                {brief.patient.conditions.map((c, i) => (
                  <View key={i} style={s.conditionTag}>
                    <Text style={s.conditionText}>{c}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        ) : null}

        {/* ─── TIER 1: FLAGS ─── */}
        {showNeedsAttention && (
          <JournalSection
            icon={'\uD83D\uDEA9'}
            label="Flags"
            color={Colors.redBright}
            badge={{ text: `${(hasVitalsFlag ? 1 : 0) + (hasSideEffects ? 1 : 0) + (brief?.attentionItems.length ?? 0)} alert${((hasVitalsFlag ? 1 : 0) + (hasSideEffects ? 1 : 0) + (brief?.attentionItems.length ?? 0)) === 1 ? '' : 's'}`, variant: 'missed' }}
          >
            {hasVitalsFlag && brief?.vitals?.readings && (
              <View style={s.flagItem}>
                {brief.vitals.readings.systolic != null && brief.vitals.readings.diastolic != null && (
                  <>
                    <Text style={s.flagValue}>BP {brief.vitals.readings.systolic}/{brief.vitals.readings.diastolic}</Text>
                    <Text style={s.flagDot}>{'\u00B7'}</Text>
                    <Text style={s.flagThreshold}>Above threshold (140/90)</Text>
                  </>
                )}
                {brief.vitals.readings.oxygen != null && brief.vitals.readings.oxygen < 92 && (
                  <>
                    <Text style={s.flagValue}>SpO2 {brief.vitals.readings.oxygen}%</Text>
                    <Text style={s.flagDot}>{'\u00B7'}</Text>
                    <Text style={s.flagThreshold}>Below 92%</Text>
                  </>
                )}
              </View>
            )}
            {hasSideEffects && brief?.medications
              .filter(m => m.sideEffects && m.sideEffects.length > 0)
              .map((m, i) => (
                <View key={i} style={s.flagItem}>
                  <Text style={s.flagValue}>{m.name}</Text>
                  <Text style={s.flagDot}>{'\u00B7'}</Text>
                  <Text style={s.flagThreshold}>{m.sideEffects!.join(', ')}</Text>
                </View>
              ))
            }
            {hasAttentionItems && brief?.attentionItems.map((item, i) => (
              <View key={`attn-${i}`} style={s.flagItem}>
                <Text style={s.flagThreshold}>{item.text}</Text>
              </View>
            ))}
            {brief?.patient.allergies && brief.patient.allergies.length > 0 && (
              <View style={s.allergyRow}>
                <Text style={s.allergyLabel}>Allergies:</Text>
                <Text style={s.allergyList}>{brief.patient.allergies.join(', ')}</Text>
              </View>
            )}
          </JournalSection>
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

        {/* ─── TIER 2: TOP-LINE SUMMARY ─── */}
        {brief && (
          <View style={s.topLineSummary}>
            <Text style={s.topLineText}>
              {pct}% complete
              {(() => {
                const pendingCount = (medsTotal - medsDone) + (hasVitals ? 0 : 1) + (mealsTotal - mealsDone) + (hasMorning ? 0 : 1) + (hasEvening ? 0 : 1);
                return pendingCount > 0
                  ? <Text style={s.topLinePending}> {'\u00B7'} {pendingCount} pending</Text>
                  : null;
              })()}
            </Text>
          </View>
        )}

        {/* ─── TIER 3: THE RECORD ─── */}

        {/* MEDICATIONS */}
        {brief && medsTotal > 0 && (
          <JournalSection
            icon={'\uD83D\uDC8A'}
            label="Medications"
            color={allMedsDone ? Colors.green : Colors.amber}
            badge={{
              text: `${medsDone}/${medsTotal} taken`,
              variant: allMedsDone ? 'done' : medsDone > 0 ? 'pending' : 'missed',
            }}
          >
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
          <JournalSection
            icon={'\uD83E\uDE7A'}
            label="Vitals"
            color={hasVitals ? Colors.green : Colors.amber}
            badge={{
              text: hasVitals ? 'Recorded' : 'Not recorded',
              variant: hasVitals ? 'done' : 'pending',
            }}
          >
            {hasVitals && brief.vitals.readings ? (
              <View style={s.vitalChips}>
                {brief.vitals.readings.systolic != null && brief.vitals.readings.diastolic != null && (() => {
                  const flagged = brief.vitals.readings!.systolic! > 140 || brief.vitals.readings!.diastolic! > 90;
                  return (
                    <View style={[s.vitalChip, flagged && s.vitalChipFlag]}>
                      <Text style={s.vitalChipLabel}>BP </Text>
                      <Text style={[s.vitalChipValue, flagged && s.vitalChipValueFlag]}>
                        {brief.vitals.readings!.systolic}/{brief.vitals.readings!.diastolic}
                      </Text>
                      {flagged && <Text style={s.vitalChipArrow}> {'\u25B2'}</Text>}
                    </View>
                  );
                })()}
                {brief.vitals.readings.heartRate != null && (() => {
                  const flagged = brief.vitals.readings!.heartRate! > 100 || brief.vitals.readings!.heartRate! < 50;
                  return (
                    <View style={[s.vitalChip, flagged && s.vitalChipFlag]}>
                      <Text style={s.vitalChipLabel}>HR </Text>
                      <Text style={[s.vitalChipValue, flagged && s.vitalChipValueFlag]}>{brief.vitals.readings!.heartRate}</Text>
                      {flagged && <Text style={s.vitalChipArrow}> {'\u25B2'}</Text>}
                    </View>
                  );
                })()}
                {brief.vitals.readings.oxygen != null && (() => {
                  const flagged = brief.vitals.readings!.oxygen! < 92;
                  return (
                    <View style={[s.vitalChip, flagged && s.vitalChipFlag]}>
                      <Text style={s.vitalChipLabel}>SpO2 </Text>
                      <Text style={[s.vitalChipValue, flagged && s.vitalChipValueFlag]}>{brief.vitals.readings!.oxygen}%</Text>
                      {flagged && <Text style={s.vitalChipArrow}> {'\u25B2'}</Text>}
                    </View>
                  );
                })()}
                {brief.vitals.readings.temperature != null && (
                  <View style={s.vitalChip}>
                    <Text style={s.vitalChipLabel}>Temp </Text>
                    <Text style={s.vitalChipValue}>{brief.vitals.readings.temperature}{'\u00B0'}F</Text>
                  </View>
                )}
                {brief.vitals.readings.glucose != null && (
                  <View style={s.vitalChip}>
                    <Text style={s.vitalChipLabel}>Glucose </Text>
                    <Text style={s.vitalChipValue}>{brief.vitals.readings.glucose}</Text>
                  </View>
                )}
                {brief.vitals.readings.weight != null && (
                  <View style={s.vitalChip}>
                    <Text style={s.vitalChipLabel}>Weight </Text>
                    <Text style={s.vitalChipValue}>{brief.vitals.readings.weight} lbs</Text>
                  </View>
                )}
              </View>
            ) : (
              <Text style={s.notRecorded}>Not recorded</Text>
            )}
          </JournalSection>
        )}

        {/* INTAKE */}
        {brief && (mealsTotal > 0 || brief.hydration.logged) && (
          <JournalSection
            icon={'\uD83C\uDF7D\uFE0F'}
            label="Nutrition & Hydration"
            color={mealsDone >= mealsTotal && mealsTotal > 0 ? Colors.green : Colors.amber}
            badge={{
              text: mealsDone >= mealsTotal && mealsTotal > 0 ? 'On track' : `${mealsDone}/${mealsTotal} meals`,
              variant: mealsDone >= mealsTotal && mealsTotal > 0 ? 'done' : 'pending',
            }}
          >
            <View style={s.intakeColumns}>
              <View style={s.intakeCol}>
                <Text style={s.intakeColLabel}>Meals</Text>
                <Text style={s.intakeColValue}>{mealsDone} <Text style={s.intakeColSub}>of {mealsTotal}</Text></Text>
              </View>
              <View style={s.intakeDivider} />
              <View style={s.intakeCol}>
                <Text style={s.intakeColLabel}>Water</Text>
                <View style={s.waterRow}>
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
                  <Text style={[s.waterCount, { color: waterGlasses >= 8 ? Colors.green : Colors.textMuted }]}>{waterGlasses}/8</Text>
                </View>
              </View>
              <View style={s.intakeDivider} />
              <View style={s.intakeCol}>
                <Text style={s.intakeColLabel}>Appetite</Text>
                <Text style={s.intakeColValue}>Normal</Text>
              </View>
            </View>
          </JournalSection>
        )}

        {/* SLEEP & WELLNESS */}
        {brief && (
          <JournalSection
            icon={'\uD83D\uDE34'}
            label="Sleep & Wellness"
            color={hasMorning && hasEvening ? Colors.green : Colors.amber}
            badge={{
              text: hasMorning && hasEvening ? 'Complete' : (!hasMorning && !hasEvening ? '2 pending' : '1 pending'),
              variant: hasMorning && hasEvening ? 'done' : 'pending',
            }}
          >
            {/* Sleep + Wellness Checks in columns */}
            <View style={s.wellnessColumns}>
              {/* Sleep column */}
              {brief.sleep.logged && brief.sleep.hours != null ? (
                <View style={s.wellnessCol}>
                  <Text style={s.wellnessColLabel}>Sleep</Text>
                  <Text style={s.wellnessColValue}>{brief.sleep.hours}h</Text>
                  {brief.sleep.quality && <Text style={s.wellnessColSub}>{brief.sleep.quality}</Text>}
                </View>
              ) : (
                <View style={[s.wellnessCol, s.wellnessColPending]}>
                  <Text style={s.wellnessColLabel}>Sleep</Text>
                  <Text style={s.wellnessColDash}>{'\u2014'}</Text>
                </View>
              )}
              {/* Morning check */}
              {hasMorning ? (
                <View style={s.wellnessCol}>
                  <Text style={s.wellnessColLabel}>AM Check</Text>
                  {brief.mood.morningWellness?.mood && (
                    <Text style={s.wellnessColValue}>{brief.mood.morningWellness.mood}</Text>
                  )}
                  {brief.mood.morningWellness?.orientation && (
                    <Text style={s.wellnessColSub}>{brief.mood.morningWellness.orientation}</Text>
                  )}
                </View>
              ) : (
                <View style={[s.wellnessCol, s.wellnessColPending]}>
                  <Text style={s.wellnessColLabel}>AM Check</Text>
                  <Text style={s.wellnessColDash}>{'\u2014'}</Text>
                </View>
              )}
              {/* Evening check */}
              {hasEvening ? (
                <View style={s.wellnessCol}>
                  <Text style={s.wellnessColLabel}>PM Check</Text>
                  {brief.mood.eveningWellness?.painLevel && (
                    <Text style={s.wellnessColValue}>Pain: {brief.mood.eveningWellness.painLevel}</Text>
                  )}
                  {brief.mood.eveningWellness?.dayRating && (
                    <Text style={s.wellnessColSub}>Day: {brief.mood.eveningWellness.dayRating}</Text>
                  )}
                </View>
              ) : (
                <View style={[s.wellnessCol, s.wellnessColPending]}>
                  <Text style={s.wellnessColLabel}>PM Check</Text>
                  <Text style={s.wellnessColDash}>{'\u2014'}</Text>
                </View>
              )}
            </View>

            {/* Additional wellness details when available */}
            {(hasMorning || hasEvening) && (
              <View style={[s.statGrid, { marginTop: 10 }]}>
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
              </View>
            )}
          </JournalSection>
        )}

        {/* NOTES & SYMPTOMS */}
        {aggregatedNotes.length > 0 && (
          <JournalSection
            icon={'\uD83D\uDCDD'}
            label="Notes & Symptoms"
            color={Colors.amberBright}
          >
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
          <JournalSection
            icon={'\uD83D\uDCC5'}
            label={brief.nextAppointment.provider}
            color={Colors.sky}
            badge={{
              text: daysUntilAppt === 0 ? 'Today' : daysUntilAppt === 1 ? 'Tomorrow' : `${daysUntilAppt} days`,
              variant: 'info',
            }}
          >
            <Text style={s.appointmentDate}>
              {brief.nextAppointment.specialty} {'\u00B7'} {new Date(brief.nextAppointment.date).toLocaleDateString('en-US', {
                weekday: 'short', month: 'short', day: 'numeric',
              })}
            </Text>
          </JournalSection>
        )}

        {/* HANDOFF */}
        {brief && (
          <JournalSection
            icon={'\uD83E\uDD1D'}
            label="Handoff Notes"
            color={Colors.amberBright}
          >
            <Text style={s.handoffText}>
              {brief.handoffNarrative || buildHandoffSummary(brief, medsDone, medsTotal, allMedsDone, hasVitals)}
            </Text>
          </JournalSection>
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

  // ─── PATIENT CARD ───
  patientCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  patientName: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  patientRelation: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  conditionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 8,
  },
  conditionTag: {
    backgroundColor: 'rgba(94, 234, 212, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  conditionText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(94, 234, 212, 0.7)',
  },

  // ─── TIER 1: FLAGS ───
  flagItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: Colors.redFaint,
    marginBottom: 4,
  },
  flagValue: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.redBright,
  },
  flagDot: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  flagThreshold: {
    fontSize: 10,
    color: Colors.redBright,
    flex: 1,
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

  // ─── TOP-LINE SUMMARY ───
  topLineSummary: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 14,
    borderRadius: 10,
    backgroundColor: Colors.accentFaint,
    borderLeftWidth: 3,
    borderLeftColor: Colors.accent,
  },
  topLineText: {
    fontSize: 13,
    color: Colors.textBright,
  },
  topLinePending: {
    color: Colors.amberBright,
  },

  // ─── BADGE ───
  badge: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
  },

  // ─── JOURNAL SECTION (card with colored left border) ───
  journalSection: {
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: Colors.accent,
    backgroundColor: Colors.glassFaint,
    borderRadius: 14,
    padding: 14,
    paddingLeft: 16,
  },
  journalSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  journalSectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  journalSectionIcon: {
    fontSize: 14,
  },
  journalSectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
  },

  // Vital Chips
  vitalChips: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  vitalChip: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  vitalChipFlag: {
    backgroundColor: Colors.redFaint,
    borderWidth: 1,
    borderColor: Colors.redBorder,
  },
  vitalChipLabel: {
    fontSize: 9,
    color: Colors.textMuted,
  },
  vitalChipValue: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textBright,
  },
  vitalChipValueFlag: {
    color: Colors.redBright,
  },
  vitalChipArrow: {
    fontSize: 8,
    color: Colors.redBright,
  },

  // Stat Grid (wellness details)
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

  // Wellness columns
  wellnessColumns: {
    flexDirection: 'row',
    gap: 10,
  },
  wellnessCol: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  wellnessColPending: {
    borderWidth: 1,
    borderColor: Colors.amberBorder,
    opacity: 0.7,
  },
  wellnessColLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    marginBottom: 4,
  },
  wellnessColValue: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  wellnessColSub: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 2,
  },
  wellnessColDash: {
    fontSize: 13,
    color: Colors.amberBright,
    marginTop: 2,
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

  // Intake 3-column layout
  intakeColumns: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  intakeCol: {
    flex: 1,
    alignItems: 'center',
  },
  intakeColLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  intakeColValue: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  intakeColSub: {
    fontSize: 11,
    fontWeight: '400',
    color: Colors.textMuted,
  },
  intakeDivider: {
    height: 28,
    width: 1,
    backgroundColor: Colors.border,
  },
  waterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  waterDots: {
    flexDirection: 'row',
    gap: 2,
  },
  waterDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  waterCount: {
    fontSize: 12,
    fontWeight: '500',
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
  appointmentDate: {
    fontSize: 11,
    color: Colors.textMuted,
  },

  // Handoff
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
