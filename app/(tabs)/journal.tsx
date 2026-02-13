// ============================================================================
// JOURNAL PAGE - Shift Handoff Report
// Shows today's care summary as a narrative shift report.
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
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { AuroraBackground } from '../../components/aurora/AuroraBackground';
import { ScreenHeader } from '../../components/ScreenHeader';
import { HandoffCard } from '../../components/journal/HandoffCard';
import { ShiftSection } from '../../components/journal/ShiftSection';
import { MedicationsNarrative } from '../../components/journal/MedicationsNarrative';
import { VitalsNarrative } from '../../components/journal/VitalsNarrative';
import { MoodWellnessNarrative } from '../../components/journal/MoodWellnessNarrative';
import { MealsNarrative } from '../../components/journal/MealsNarrative';
import { AttentionSection } from '../../components/journal/AttentionSection';
import { ShareActions } from '../../components/journal/ShareActions';
import { Colors, Spacing, BorderRadius } from '../../theme/theme-tokens';
import { buildShiftReport, ShiftReport } from '../../utils/careSummaryBuilder';
import { logError } from '../../utils/devLog';
import { logAuditEvent, AuditEventType, AuditSeverity } from '../../utils/auditLog';
import { useDataListener } from '../../lib/events';
import { isBiometricEnabled, shouldLockSession, requireAuthentication, updateLastActivity, getAutoLockTimeout } from '../../utils/biometricAuth';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function JournalTab() {
  const router = useRouter();
  const [report, setReport] = useState<ShiftReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [authRequired, setAuthRequired] = useState(false);

  const loadReport = useCallback(async () => {
    try {
      const data = await buildShiftReport();
      setReport(data);
    } catch (error) {
      logError('JournalTab.loadReport', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReport();
    logAuditEvent(AuditEventType.CARE_BRIEF_VIEWED, 'Care Brief viewed', AuditSeverity.INFO);
  }, [loadReport]);
  useDataListener(useCallback(() => { loadReport(); }, [loadReport]));

  // Auth gate: require re-authentication if biometric/PIN is enabled and session is stale
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
  // RENDER
  // ============================================================================

  if (authRequired) {
    return (
      <View style={styles.container}>
        <AuroraBackground variant="log" />
        <View style={styles.authGateContainer}>
          <Text style={styles.authGateIcon}>{'\uD83D\uDD12'}</Text>
          <Text style={styles.authGateTitle}>Care Brief Protected</Text>
          <Text style={styles.authGateSubtitle}>
            Authenticate to view sensitive health information
          </Text>
          <TouchableOpacity
            style={styles.authGateButton}
            onPress={handleAuthenticate}
            accessibilityLabel="Authenticate to view Care Brief"
            accessibilityRole="button"
          >
            <Text style={styles.authGateButtonText}>Authenticate</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (loading && !report) {
    return (
      <View style={styles.container}>
        <AuroraBackground variant="log" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.accent} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  const hasNarrativeContent = report && (
    report.medications.length > 0 ||
    report.vitals.scheduled || report.vitals.recorded ||
    report.mood.entries.length > 0 || report.mood.morningWellness || report.mood.eveningWellness ||
    report.meals.total > 0
  );

  return (
    <View style={styles.container}>
      <AuroraBackground variant="log" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadReport} tintColor={Colors.accent} />
        }
      >
        <ScreenHeader
          title="Journal"
          subtitle="Today's care summary"
          rightAction={
            <TouchableOpacity
              onPress={() => navigate('/care-plan')}
              style={styles.headerGear}
              accessibilityLabel="Manage Care Plan"
              accessibilityRole="button"
            >
              <Text style={styles.headerGearIcon}>{'\u2699\uFE0F'}</Text>
            </TouchableOpacity>
          }
        />

        {/* STATUS AT A GLANCE */}
        <HandoffCard />

        {/* DISCLAIMER */}
        <Text style={styles.disclaimer}>
          This Care Brief is generated from personal tracking data and is not a medical record. Always verify information with healthcare providers.
        </Text>

        {/* WHAT HAPPENED TODAY */}
        {hasNarrativeContent && report && (
          <ShiftSection title="WHAT HAPPENED TODAY">
            <MedicationsNarrative medications={report.medications} />
            <VitalsNarrative vitals={report.vitals} />
            <MoodWellnessNarrative mood={report.mood} />
            <MealsNarrative meals={report.meals} />
          </ShiftSection>
        )}

        {/* NEEDS ATTENTION */}
        {report && (
          <ShiftSection title="NEEDS ATTENTION">
            <AttentionSection items={report.attentionItems} />
          </ShiftSection>
        )}

        {/* UPCOMING APPOINTMENT */}
        {report?.nextAppointment && (
          <ShiftSection title="UPCOMING">
            <View style={styles.appointmentCard}>
              <Text style={styles.appointmentText}>
                {'\uD83D\uDCC5'} {report.nextAppointment.provider} ({report.nextAppointment.specialty}) — {
                  new Date(report.nextAppointment.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                }
              </Text>
            </View>
          </ShiftSection>
        )}

        {/* SHARE / EXPORT */}
        <ShareActions
          onShare={() => navigate('/care-summary-export')}
          onExport={() => navigate('/care-brief')}
        />

        <View style={{ height: 100 }} />
      </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 80,
  },
  headerGear: {
    padding: 8,
    marginRight: -8,
  },
  headerGearIcon: {
    fontSize: 20,
    opacity: 0.7,
  },
  appointmentCard: {
    backgroundColor: Colors.glassHover,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  appointmentText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  disclaimer: {
    fontSize: 11,
    color: Colors.textTertiary,
    textAlign: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
    lineHeight: 16,
    paddingHorizontal: Spacing.md,
  },
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
});
