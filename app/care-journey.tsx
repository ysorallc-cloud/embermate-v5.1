// ============================================================================
// CARE JOURNEY SCREEN
// Opt-in, condition-aware educational timeline
// Content is bundled static JSON (no network, no PHI transmission)
// ============================================================================

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// expo-router used by SubScreenHeader internally
import { useFocusEffect } from '@react-navigation/native';

import { Colors, Spacing, BorderRadius } from '../theme/theme-tokens';
import { AuroraBackground } from '../components/aurora/AuroraBackground';
import { GlassCard } from '../components/aurora/GlassCard';
import { SubScreenHeader } from '../components/SubScreenHeader';
import { navigate } from '../lib/navigate';

import {
  getActiveJourney,
  setActiveJourney,
  computeCurrentMilestone,
  markMilestoneViewed,
  getViewedMilestones,
  type ActiveJourney,
} from '../utils/careJourneyStorage';
import { getUpcomingAppointments } from '../utils/appointmentStorage';
import { logError } from '../utils/devLog';

// Bundled templates
import hypertensionTemplate from '../data/careJourneyTemplates/hypertension.json';

interface MilestoneData {
  weekRange: [number, number];
  title: string;
  items: string[];
  nudgeCondition?: string;
  nudgeText?: string;
}

interface JourneyTemplate {
  id: string;
  name: string;
  description: string;
  disclaimer: string;
  milestones: MilestoneData[];
}

const TEMPLATES: Record<string, JourneyTemplate> = {
  hypertension: hypertensionTemplate as JourneyTemplate,
};

export default function CareJourneyScreen() {
  const [journey, setJourney] = useState<ActiveJourney | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedMilestones, setExpandedMilestones] = useState<Set<number>>(new Set());
  const [viewedMilestones, setViewedMilestoneState] = useState<number[]>([]);
  const [hasUpcomingAppointment, setHasUpcomingAppointment] = useState(false);

  const template = journey ? TEMPLATES[journey.conditionId] : null;

  const currentMilestoneIndex = useMemo(() => {
    if (!journey || !template) return 0;
    return computeCurrentMilestone(journey.startDate, template.milestones);
  }, [journey, template]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      setLoading(true);
      const [activeJourney, appointments, viewed] = await Promise.all([
        getActiveJourney(),
        getUpcomingAppointments(),
        getViewedMilestones(),
      ]);

      setJourney(activeJourney);
      setHasUpcomingAppointment(appointments.length > 0);
      setViewedMilestoneState(viewed);

      // Auto-expand current milestone
      if (activeJourney) {
        const idx = computeCurrentMilestone(
          activeJourney.startDate,
          TEMPLATES[activeJourney.conditionId]?.milestones ?? []
        );
        setExpandedMilestones(new Set([idx]));
      }
    } catch (error) {
      logError('CareJourneyScreen.loadData', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleMilestone = useCallback((index: number) => {
    setExpandedMilestones(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
        markMilestoneViewed(index);
      }
      return next;
    });
  }, []);

  const handleEnableJourney = useCallback(async (conditionId: string) => {
    const tmpl = TEMPLATES[conditionId];
    if (!tmpl) return;
    const newJourney: ActiveJourney = {
      conditionId,
      conditionName: tmpl.name,
      startDate: new Date().toISOString().split('T')[0],
      enabledAt: new Date().toISOString(),
    };
    await setActiveJourney(newJourney);
    setJourney(newJourney);
    setExpandedMilestones(new Set([0]));
  }, []);

  // No journey configured — show setup
  if (loading) {
    return (
      <View style={styles.container}>
        <AuroraBackground variant="hub" />
        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
          <SubScreenHeader title="Care Journey"  />
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.accent} />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (!journey || !template) {
    return (
      <View style={styles.container}>
        <AuroraBackground variant="hub" />
        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
          <SubScreenHeader title="Care Journey"  />
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
            <View style={styles.setupContainer}>
              <Text style={styles.setupTitle}>Start a Care Journey</Text>
              <Text style={styles.setupSubtitle}>
                Follow a guided timeline based on your care needs.
                Content is general education — your provider's instructions always take priority.
              </Text>

              {Object.entries(TEMPLATES).map(([id, tmpl]) => (
                <TouchableOpacity
                  key={id}
                  style={styles.templateCard}
                  onPress={() => handleEnableJourney(id)}
                  activeOpacity={0.7}
                  accessibilityLabel={`Start ${tmpl.name} journey`}
                  accessibilityRole="button"
                >
                  <Text style={styles.templateName}>{tmpl.name}</Text>
                  <Text style={styles.templateDesc}>{tmpl.description}</Text>
                  <Text style={styles.templateMilestones}>
                    {tmpl.milestones.length} milestones
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  // Active journey — render timeline
  return (
    <View style={styles.container}>
      <AuroraBackground variant="hub" />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <SubScreenHeader title={template.name}  />

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* Timeline */}
          <View style={styles.timeline}>
            {template.milestones.map((milestone, index) => {
              const isCompleted = index < currentMilestoneIndex;
              const isCurrent = index === currentMilestoneIndex;
              const isExpanded = expandedMilestones.has(index);
              const showNudge = isCurrent &&
                milestone.nudgeCondition === 'no_upcoming_appointment' &&
                !hasUpcomingAppointment;

              return (
                <View key={index} style={styles.milestoneRow}>
                  {/* Timeline connector */}
                  <View style={styles.connectorColumn}>
                    {/* Line above */}
                    {index > 0 && (
                      <View style={[
                        styles.connectorLine,
                        isCompleted || isCurrent ? styles.connectorLineActive : null,
                      ]} />
                    )}
                    {/* Dot */}
                    <View style={[
                      styles.milestoneDot,
                      isCompleted && styles.milestoneDotCompleted,
                      isCurrent && styles.milestoneDotCurrent,
                    ]}>
                      {isCompleted ? (
                        <Text style={styles.dotCheckmark}>{'\u2713'}</Text>
                      ) : isCurrent ? (
                        <View style={styles.dotPulse} />
                      ) : (
                        <View style={styles.dotEmpty} />
                      )}
                    </View>
                    {/* Line below */}
                    {index < template.milestones.length - 1 && (
                      <View style={[
                        styles.connectorLine,
                        styles.connectorLineBelow,
                        isCompleted ? styles.connectorLineActive : null,
                      ]} />
                    )}
                  </View>

                  {/* Milestone content */}
                  <TouchableOpacity
                    style={[
                      styles.milestoneCard,
                      isCurrent && styles.milestoneCardCurrent,
                      !isCurrent && !isCompleted && styles.milestoneCardFuture,
                    ]}
                    onPress={() => handleToggleMilestone(index)}
                    activeOpacity={0.7}
                    accessibilityLabel={`${milestone.title}, weeks ${milestone.weekRange[0]}–${milestone.weekRange[1]}${isCurrent ? ', current milestone' : ''}`}
                    accessibilityRole="button"
                  >
                    {/* YOU ARE HERE pill */}
                    {isCurrent && (
                      <View style={styles.youAreHerePill}>
                        <Text style={styles.youAreHereText}>YOU ARE HERE</Text>
                      </View>
                    )}

                    <Text style={styles.milestoneWeek}>
                      Week {milestone.weekRange[0]}–{milestone.weekRange[1]}
                    </Text>
                    <Text style={[
                      styles.milestoneTitle,
                      isCompleted && styles.milestoneTitleCompleted,
                    ]}>
                      {milestone.title}
                    </Text>

                    {isExpanded && (
                      <View style={styles.milestoneItems}>
                        {milestone.items.map((item, i) => (
                          <View key={i} style={styles.milestoneItem}>
                            <Text style={styles.milestoneItemBullet}>{'\u2022'}</Text>
                            <Text style={styles.milestoneItemText}>{item}</Text>
                          </View>
                        ))}

                        {/* Nudge box */}
                        {showNudge && milestone.nudgeText && (
                          <TouchableOpacity
                            style={styles.nudgeBox}
                            onPress={() => navigate('/add-appointment')}
                            activeOpacity={0.7}
                            accessibilityLabel={milestone.nudgeText}
                            accessibilityRole="button"
                          >
                            <Text style={styles.nudgeIcon}>{'\uD83D\uDCC5'}</Text>
                            <Text style={styles.nudgeText}>{milestone.nudgeText}</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>

          {/* Disclaimer */}
          <Text style={styles.disclaimer}>{template.disclaimer}</Text>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Setup (no journey)
  setupContainer: {
    paddingTop: 20,
  },
  setupTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  setupSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 24,
  },
  templateCard: {
    backgroundColor: Colors.glass,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: 12,
  },
  templateName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textBright,
    marginBottom: 4,
  },
  templateDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: 8,
  },
  templateMilestones: {
    fontSize: 12,
    color: Colors.textMuted,
  },

  // Timeline
  timeline: {
    paddingTop: 8,
  },
  milestoneRow: {
    flexDirection: 'row',
    minHeight: 60,
  },
  connectorColumn: {
    width: 32,
    alignItems: 'center',
  },
  connectorLine: {
    width: 2,
    flex: 1,
    backgroundColor: Colors.glassDim,
  },
  connectorLineBelow: {
    // same default styling
  },
  connectorLineActive: {
    backgroundColor: Colors.accent,
  },
  milestoneDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.glassDim,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.glassBorder,
  },
  milestoneDotCompleted: {
    backgroundColor: Colors.green,
    borderColor: Colors.green,
  },
  milestoneDotCurrent: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 4,
  },
  dotCheckmark: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '700',
  },
  dotPulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  dotEmpty: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.textMuted,
  },
  milestoneCard: {
    flex: 1,
    marginLeft: 10,
    marginBottom: 12,
    backgroundColor: Colors.glass,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  milestoneCardCurrent: {
    backgroundColor: Colors.accentFaint,
    borderColor: Colors.accentBorder,
  },
  milestoneCardFuture: {
    opacity: 0.6,
  },
  youAreHerePill: {
    backgroundColor: Colors.accent,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  youAreHereText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: 0.5,
  },
  milestoneWeek: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '500',
    marginBottom: 2,
  },
  milestoneTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textBright,
  },
  milestoneTitleCompleted: {
    color: Colors.green,
  },
  milestoneItems: {
    marginTop: 10,
    gap: 6,
  },
  milestoneItem: {
    flexDirection: 'row',
    gap: 6,
  },
  milestoneItemBullet: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 1,
  },
  milestoneItemText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    flex: 1,
  },
  nudgeBox: {
    flexDirection: 'row',
    backgroundColor: Colors.amberFaint,
    borderWidth: 1,
    borderColor: Colors.amberBorder,
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
    gap: 8,
    alignItems: 'center',
  },
  nudgeIcon: {
    fontSize: 16,
  },
  nudgeText: {
    fontSize: 12,
    color: Colors.amber,
    lineHeight: 17,
    flex: 1,
  },
  disclaimer: {
    fontSize: 11,
    color: Colors.textMuted,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 20,
    paddingHorizontal: 20,
    lineHeight: 16,
  },
});
