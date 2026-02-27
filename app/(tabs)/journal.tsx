// ============================================================================
// JOURNAL PAGE - "Nurse Handoff at a Glance"
// Clinical handoff document metaphor with narrative prose sections.
// Color-coded left borders, export surfaced at top, vitals as horizontal strip.
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
import { SafeAreaView } from 'react-native-safe-area-context';
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
// BADGE COMPONENT
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
// JOURNAL SECTION — card with colored left border
// ============================================================================

interface JournalSectionProps {
  icon?: string;
  label: string;
  color: string;
  labelColor?: string;
  badge?: { text: string; variant: 'done' | 'pending' | 'missed' | 'info' };
  children: React.ReactNode;
}

function JournalSection({ icon, label, color, labelColor, badge, children }: JournalSectionProps) {
  return (
    <View style={[s.journalSection, { borderLeftColor: color }]}>
      <View style={s.journalSectionHeader}>
        <View style={s.journalSectionHeaderLeft}>
          {icon && <Text style={s.journalSectionIcon}>{icon}</Text>}
          <Text style={[s.journalSectionLabel, labelColor ? { color: labelColor } : null]}>{label}</Text>
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

  const reloadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useDataListener(useCallback((category) => {
    if (!['dailyInstances', 'carePlanItems', 'logs', 'vitals', 'water',
          'symptoms', 'mood', 'wellness', 'medication', 'notes',
          'mealsLog', 'dailyTracking', 'sampleDataCleared'].includes(category)) return;
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
            contentContainerStyle={s.scrollContent}
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
  const hasWellness = brief?.mood.morningWellness != null;
  const hasMorning = brief?.mood.morningWellness != null;
  const hasEvening = brief?.mood.eveningWellness != null;

  const waterGlasses = brief?.hydration.glasses ?? 0;

  // Flags
  const hasVitalsFlag = brief?.vitals?.readings &&
    ((brief.vitals.readings.systolic ?? 0) > 140 ||
     (brief.vitals.readings.diastolic ?? 0) > 90 ||
     ((brief.vitals.readings.oxygen ?? 100) < 92));
  const hasSideEffects = brief?.medications.some(m => m.sideEffects && m.sideEffects.length > 0);
  const hasAttentionItems = brief && brief.attentionItems.length > 0;
  const showNeedsAttention = hasVitalsFlag || hasSideEffects || hasAttentionItems;

  // Notes
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

  // Appointment
  const daysUntilAppt = brief?.nextAppointment
    ? Math.max(0, Math.ceil((new Date(brief.nextAppointment.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;
  const showAppointment = brief?.nextAppointment && daysUntilAppt != null && daysUntilAppt <= 7;

  // ============================================================================
  // NARRATIVE BUILDERS
  // ============================================================================

  function buildMedNarrative(): string[] {
    if (!brief || brief.medications.length === 0) return [];
    const lines: string[] = [];

    // Group by status
    const taken = brief.medications.filter(m => m.status === 'completed');
    const missed = brief.medications.filter(m => m.status === 'missed');
    const pending = brief.medications.filter(m => m.status !== 'completed' && m.status !== 'missed');

    for (const med of taken) {
      const timeStr = med.takenAt ? formatTime(med.takenAt) : '';
      lines.push(`${med.name} taken${timeStr ? ` at ${timeStr}` : ' on schedule'}.`);
    }
    for (const med of missed) {
      const scheduledStr = med.scheduledTime ? ` (scheduled ${formatTime(med.scheduledTime)})` : '';
      lines.push(`${med.name} missed${scheduledStr}.`);
    }
    for (const med of pending) {
      const scheduledStr = med.scheduledTime ? ` at ${formatTime(med.scheduledTime)}` : '';
      lines.push(`${med.name} pending${scheduledStr}.`);
    }
    return lines;
  }

  function buildMealsNarrative(): string {
    if (!brief) return '';
    const parts: string[] = [];

    const completedMeals = brief.meals.meals.filter(m => m.status === 'completed');
    if (completedMeals.length > 0) {
      const mealTimes = completedMeals
        .map(m => {
          const name = m.name || '';
          const time = m.scheduledTime ? formatTime(m.scheduledTime) : '';
          return time ? `${name.toLowerCase()} at ${time}` : name.toLowerCase();
        })
        .filter(Boolean);
      if (mealTimes.length > 0) {
        const capitalized = mealTimes[0].charAt(0).toUpperCase() + mealTimes[0].slice(1);
        parts.push(mealTimes.length === 1 ? `${capitalized}.` : `${capitalized}, ${mealTimes.slice(1).join(', ')}.`);
      }
    } else if (mealsTotal > 0) {
      parts.push('No meals logged yet.');
    }

    const waterGoal = 8;
    parts.push(`Hydration: ${waterGlasses} of ${waterGoal} glasses${waterGlasses >= waterGoal ? ' \u2014 goal met.' : waterGlasses > 0 ? ' \u2014 slightly under goal.' : '.'}`);

    return parts.join(' ');
  }

  function buildWellnessNarrative(): string[] {
    if (!brief) return [];
    const lines: string[] = [];

    if (hasMorning && brief.mood.morningWellness) {
      const mw = brief.mood.morningWellness;
      const morningParts: string[] = [];
      if (mw.mood) morningParts.push(`mood ${mw.mood.toLowerCase()}`);
      if (mw.orientation) morningParts.push(`orientation ${mw.orientation.toLowerCase()}`);
      if (morningParts.length > 0) {
        lines.push(`Morning wellness: ${morningParts.join(', ')}.`);
      }
    }

    if (brief.sleep.logged && brief.sleep.hours != null) {
      lines.push(`Sleep logged ${brief.sleep.hours} hrs${brief.sleep.quality ? ` (${String(brief.sleep.quality).toLowerCase()})` : ''}.`);
    }

    if (hasEvening && brief.mood.eveningWellness) {
      const ew = brief.mood.eveningWellness;
      const eveningParts: string[] = [];
      if (ew.painLevel) eveningParts.push(`pain level ${ew.painLevel}`);
      if (ew.dayRating) eveningParts.push(`day rated ${String(ew.dayRating).toLowerCase()}`);
      if (ew.alertness) eveningParts.push(`alertness ${String(ew.alertness).toLowerCase()}`);
      if (eveningParts.length > 0) {
        lines.push(`Evening check: ${eveningParts.join(', ')}.`);
      }
    }

    if (!hasMorning && !hasEvening && !brief.sleep.logged) {
      lines.push('No wellness checks completed yet.');
    }

    return lines;
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
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />
          }
        >
          {/* ─── HEADER ─── */}
          <ScreenHeader
            title="Journal"
            subtitle={`${dayName}, ${dateStr}${brief?.patient.name ? ` \u00B7 ${brief.patient.name}` : ''}`}
            style={s.journalHeader}
            rightAction={
              <TouchableOpacity
                style={s.shareChip}
                onPress={() => navigate('/care-summary-export')}
                activeOpacity={0.7}
                accessibilityLabel="Share care brief"
                accessibilityRole="button"
              >
                <Text style={s.shareChipText}>{'\uD83D\uDCE4'} Share</Text>
              </TouchableOpacity>
            }
          />

          {/* Share row */}
          <View style={s.shareRow}>
              <TouchableOpacity
                style={s.shareBtn}
                onPress={() => navigate('/daily-care-report')}
                activeOpacity={0.7}
                accessibilityLabel="View care report"
                accessibilityRole="button"
              >
                <Text style={s.shareBtnText}>{'\uD83D\uDCCB'} Care Report</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.shareBtn, s.shareBtnPrimary]}
                onPress={() => navigate('/care-summary-export')}
                activeOpacity={0.7}
                accessibilityLabel="Generate nurse handoff"
                accessibilityRole="button"
              >
                <Text style={[s.shareBtnText, s.shareBtnPrimaryText]}>{'\uD83D\uDC69\u200D\u2695\uFE0F'} Nurse Handoff</Text>
              </TouchableOpacity>
            </View>

          {/* ─── FLAGS ─── */}
          {showNeedsAttention && (
            <JournalSection
              icon={'\uD83D\uDEA9'}
              label="Flags"
              color={Colors.redBright}
              labelColor={Colors.redBright}
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
            </JournalSection>
          )}

          {/* ─── MEDICATIONS — narrative prose ─── */}
          {brief && medsTotal > 0 && (
            <JournalSection
              icon={'\uD83D\uDC8A'}
              label="Medications"
              color='#F59E0B'
              labelColor='#FBBF24'
              badge={{
                text: medsMissed > 0 ? `${medsMissed} missed` : `${medsDone}/${medsTotal} taken`,
                variant: medsMissed > 0 ? 'missed' : allMedsDone ? 'done' : 'pending',
              }}
            >
              {buildMedNarrative().map((line, i) => (
                <Text key={i} style={s.narrativeLine}>{line}</Text>
              ))}
            </JournalSection>
          )}

          {/* ─── VITALS — horizontal inline strip ─── */}
          {brief && brief.vitals.scheduled && (
            <JournalSection
              icon={'\uD83D\uDCCA'}
              label="Vitals"
              color='#3B82F6'
              labelColor='#60A5FA'
              badge={{
                text: hasVitals ? 'Logged' : 'Not recorded',
                variant: hasVitals ? 'done' : 'pending',
              }}
            >
              {hasVitals && brief.vitals.readings ? (
                <>
                  <View style={s.vitalsRow}>
                    {brief.vitals.readings.systolic != null && brief.vitals.readings.diastolic != null && (
                      <View style={s.vitalItem}>
                        <Text style={s.vitalLabel}>BP</Text>
                        <Text style={s.vitalValue}>
                          {brief.vitals.readings.systolic}
                          <Text style={s.vitalUnit}>/{brief.vitals.readings.diastolic}</Text>
                        </Text>
                      </View>
                    )}
                    {brief.vitals.readings.heartRate != null && (
                      <View style={s.vitalItem}>
                        <Text style={s.vitalLabel}>Heart Rate</Text>
                        <Text style={s.vitalValue}>
                          {brief.vitals.readings.heartRate}
                          <Text style={s.vitalUnit}> bpm</Text>
                        </Text>
                      </View>
                    )}
                    {brief.vitals.readings.temperature != null && (
                      <View style={s.vitalItem}>
                        <Text style={s.vitalLabel}>Temp</Text>
                        <Text style={s.vitalValue}>
                          {brief.vitals.readings.temperature}
                          <Text style={s.vitalUnit}>{'\u00B0'}F</Text>
                        </Text>
                      </View>
                    )}
                    {brief.vitals.readings.oxygen != null && (
                      <View style={s.vitalItem}>
                        <Text style={s.vitalLabel}>SpO{'\u2082'}</Text>
                        <Text style={s.vitalValue}>
                          {brief.vitals.readings.oxygen}
                          <Text style={s.vitalUnit}>%</Text>
                        </Text>
                      </View>
                    )}
                    {brief.vitals.readings.glucose != null && (
                      <View style={s.vitalItem}>
                        <Text style={s.vitalLabel}>Glucose</Text>
                        <Text style={s.vitalValue}>
                          {brief.vitals.readings.glucose}
                          <Text style={s.vitalUnit}> mg/dL</Text>
                        </Text>
                      </View>
                    )}
                  </View>
                  {!hasVitalsFlag && (
                    <Text style={[s.narrativeLine, { marginTop: 10 }]}>
                      All readings within normal range. No flagged values.
                    </Text>
                  )}
                </>
              ) : (
                <Text style={s.narrativeLine}>Not recorded yet.</Text>
              )}
            </JournalSection>
          )}

          {/* ─── MEALS & HYDRATION — narrative prose ─── */}
          {brief && (mealsTotal > 0 || brief.hydration.logged) && (
            <JournalSection
              icon={'\uD83C\uDF7D\uFE0F'}
              label="Meals & Hydration"
              color='#10B981'
              labelColor='#34D399'
              badge={{
                text: mealsDone >= mealsTotal && mealsTotal > 0 ? `${mealsTotal} meals` : `${mealsDone}/${mealsTotal} meals`,
                variant: mealsDone >= mealsTotal && mealsTotal > 0 ? 'done' : 'pending',
              }}
            >
              <Text style={s.narrativeLine}>{buildMealsNarrative()}</Text>
            </JournalSection>
          )}

          {/* ─── WELLNESS — narrative prose ─── */}
          {brief && (
            <JournalSection
              icon={'\uD83C\uDF05'}
              label="Wellness"
              color='#8B5CF6'
              labelColor='#A78BFA'
              badge={
                brief.mood.morningWellness
                  ? { text: `Mood: ${brief.mood.morningWellness.mood || 'Logged'}`, variant: 'info' as const }
                  : { text: 'Pending', variant: 'pending' as const }
              }
            >
              {buildWellnessNarrative().map((line, i) => (
                <Text key={i} style={s.narrativeLine}>{line}</Text>
              ))}
            </JournalSection>
          )}

          {/* ─── NOTES & SYMPTOMS ─── */}
          {aggregatedNotes.length > 0 && (
            <JournalSection
              icon={'\uD83D\uDCDD'}
              label="Notes & Symptoms"
              color={Colors.amberBright}
              labelColor='#FBBF24'
            >
              {aggregatedNotes.map((note, i) => (
                <Text key={i} style={s.narrativeLine}>
                  {note.time ? `${note.time} \u2014 ` : ''}{note.text}
                </Text>
              ))}
            </JournalSection>
          )}

          {/* ─── NEXT APPOINTMENT ─── */}
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
              <Text style={s.narrativeLine}>
                {brief.nextAppointment.specialty} {'\u00B7'} {new Date(brief.nextAppointment.date).toLocaleDateString('en-US', {
                  weekday: 'short', month: 'short', day: 'numeric',
                })}
              </Text>
            </JournalSection>
          )}

          {/* ─── TIMESTAMP ─── */}
          {brief && (
            <Text style={s.timestamp}>
              Updated {new Date(brief.generatedAt).toLocaleTimeString('en-US', {
                hour: 'numeric', minute: '2-digit',
              })} {'\u00B7'} Not a medical record
            </Text>
          )}

          <View style={{ height: 100 }} />
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

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
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

  // ─── NARRATIVE HEADER ───
  journalHeader: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 16,
  },
  shareChip: {
    backgroundColor: 'rgba(20, 184, 166, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.3)',
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  shareChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.accent,
  },
  shareRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  shareBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
  },
  shareBtnPrimary: {
    backgroundColor: 'rgba(20, 184, 166, 0.15)',
    borderColor: 'rgba(20, 184, 166, 0.3)',
  },
  shareBtnText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  shareBtnPrimaryText: {
    color: Colors.accent,
  },

  // ─── FLAGS ───
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

  // ─── JOURNAL SECTION ───
  journalSection: {
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: Colors.accent,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
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
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: Colors.textPrimary,
  },

  // ─── NARRATIVE PROSE ───
  narrativeLine: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 6,
  },

  // ─── VITALS HORIZONTAL STRIP ───
  vitalsRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  vitalItem: {
    flex: 1,
    minWidth: 60,
  },
  vitalLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    marginBottom: 2,
    letterSpacing: 0.3,
  },
  vitalValue: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  vitalUnit: {
    fontSize: 10,
    color: Colors.textMuted,
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
