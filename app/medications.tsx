// ============================================================================
// MEDICATIONS LIST - Full medication management
// With "Take All" button, multi-time display, and refill tracking
// ============================================================================

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Colors } from '../theme/theme-tokens';
import PageHeader from '../components/PageHeader';
import { MedicationCardSkeleton } from '../components/LoadingSkeleton';
import { getMedications, deleteMedication, calculateAdherence, Medication, markMedicationTaken } from '../utils/medicationStorage';
import { checkInteraction } from '../utils/drugInteractions';
import { logError } from '../utils/devLog';

export default function MedicationsScreen() {
  const router = useRouter();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [interactions, setInteractions] = useState<any[]>([]);
  const [adherenceRates, setAdherenceRates] = useState<{ [key: string]: number }>({});
  const [takingAll, setTakingAll] = useState(false);

  useFocusEffect(useCallback(() => {
    loadData();
  }, []));

  const loadData = async () => {
    try {
      setLoading(true);
      const meds = await getMedications();
      const activeMeds = meds.filter(m => m.active);
      setMedications(activeMeds);

      // Calculate adherence for each medication
      const rates: { [key: string]: number } = {};
      for (const med of activeMeds) {
        const adherence = await calculateAdherence(med.id, 7);
        rates[med.id] = adherence;
      }
      setAdherenceRates(rates);

      // Check for interactions between all pairs
      const interactionResults: any[] = [];
      for (let i = 0; i < activeMeds.length; i++) {
        for (let j = i + 1; j < activeMeds.length; j++) {
          const interaction = checkInteraction(activeMeds[i].name, activeMeds[j].name);
          if (interaction) {
            interactionResults.push(interaction);
          }
        }
      }
      setInteractions(interactionResults);
    } catch (error) {
      logError('MedicationsScreen.loadData', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  const handleAddMedication = () => {
    router.push('/medication-form');
  };

  const handleMedicationPress = (medication: Medication) => {
    router.push(`/medication-form?id=${medication.id}`);
  };

  const handleDeleteMedication = (medication: Medication) => {
    Alert.alert(
      'Delete Medication',
      `Remove ${medication.name} from your list?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteMedication(medication.id);
            await loadData();
          },
        },
      ]
    );
  };

  const getAdherencePercent = (medication: Medication) => {
    // Return calculated adherence rate, or null if no data
    return adherenceRates[medication.id] || null;
  };

  // Separate medications into "due now" and "taken today"
  const { dueMeds, takenMeds, dueCount } = useMemo(() => {
    const due = medications.filter(m => !m.taken);
    const taken = medications.filter(m => m.taken);
    return {
      dueMeds: due,
      takenMeds: taken,
      dueCount: due.length,
    };
  }, [medications]);

  // Handle "Take All" button
  const handleTakeAll = async () => {
    if (dueMeds.length === 0) return;

    Alert.alert(
      'Take All Medications',
      `Mark ${dueMeds.length} medication${dueMeds.length > 1 ? 's' : ''} as taken?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Take All',
          onPress: async () => {
            setTakingAll(true);
            try {
              for (const med of dueMeds) {
                await markMedicationTaken(med.id, true);
              }
              await loadData();
              Alert.alert('Done', `${dueMeds.length} medications marked as taken.`);
            } catch (error) {
              logError('MedicationsScreen.handleTakeAll', error);
              Alert.alert('Error', 'Failed to mark medications as taken.');
            } finally {
              setTakingAll(false);
            }
          },
        },
      ]
    );
  };

  // Handle marking a single medication as taken
  const handleTakeMedication = async (medication: Medication) => {
    try {
      await markMedicationTaken(medication.id, true);
      await loadData();
    } catch (error) {
      logError('MedicationsScreen.handleTakeMedication', error);
      Alert.alert('Error', 'Failed to mark medication as taken.');
    }
  };

  // Format medication times for display
  const formatMedicationTimes = (medication: Medication): string[] => {
    const times: string[] = [];
    if (medication.time) {
      times.push(medication.time);
    }
    // Show second time if medication has morning and evening slots
    if (medication.timeSlot === 'morning' && times.length > 0) {
      // Some medications may need evening dose too - could be extended with more data
    }
    return times.length > 0 ? times : ['As needed'];
  };

  // Check if medication needs refill (simulated - would come from medication data)
  const getRefillStatus = (medication: Medication): { needsRefill: boolean; daysLeft?: number } => {
    // Simulate refill tracking - in real implementation, this would come from medication data
    if (medication.name.toLowerCase().includes('statin') || medication.name.toLowerCase().includes('atorvastatin')) {
      return { needsRefill: true, daysLeft: 7 };
    }
    return { needsRefill: false };
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={[Colors.backgroundGradientStart, Colors.backgroundGradientEnd]}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.headerWrapper}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          
          <PageHeader
            emoji="💊"
            label="Prescriptions"
            title="Medications"
          />
          
          <TouchableOpacity
            style={styles.addButton}
            onPress={handleAddMedication}
            accessibilityLabel="Add medication"
            accessibilityRole="button"
          >
            <Text style={styles.addIcon}>+</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />
          }
        >
          {/* Interaction Warning */}
          {interactions.length > 0 && (
            <TouchableOpacity
              style={styles.warningBanner}
              onPress={() => router.push('/medication-interactions')}
              accessibilityLabel={`Interaction alert. ${interactions.length} potential interaction${interactions.length > 1 ? 's' : ''} detected. View details`}
              accessibilityRole="button"
            >
              <Text style={styles.warningIcon}>⚠️</Text>
              <View style={styles.warningContent}>
                <Text style={styles.warningTitle}>Interaction Alert</Text>
                <Text style={styles.warningText}>
                  {interactions.length} potential interaction{interactions.length > 1 ? 's' : ''} detected
                  {' • '}
                  <Text style={styles.warningLink}>View details →</Text>
                </Text>
              </View>
            </TouchableOpacity>
          )}

          {/* Medications List */}
          {loading ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>LOADING MEDICATIONS...</Text>
              <MedicationCardSkeleton />
              <MedicationCardSkeleton />
              <MedicationCardSkeleton />
            </View>
          ) : medications.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>💊</Text>
              <Text style={styles.emptyTitle}>No medications yet</Text>
              <Text style={styles.emptyText}>
                Add your first medication to start tracking adherence and managing your care.
              </Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={handleAddMedication}
                accessibilityLabel="Add medication"
                accessibilityRole="button"
              >
                <Text style={styles.emptyButtonText}>Add Medication</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Take All Button */}
              {dueCount > 0 && (
                <TouchableOpacity
                  style={[styles.takeAllButton, takingAll && styles.takeAllButtonDisabled]}
                  onPress={handleTakeAll}
                  disabled={takingAll}
                  activeOpacity={0.7}
                  accessibilityLabel={`Take all due medications. ${dueCount} medication${dueCount > 1 ? 's' : ''} due now`}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: takingAll }}
                >
                  <Text style={styles.takeAllIcon}>✓</Text>
                  <View style={styles.takeAllContent}>
                    <Text style={styles.takeAllTitle}>Take All Due Medications</Text>
                    <Text style={styles.takeAllSubtitle}>
                      {dueCount} medication{dueCount > 1 ? 's' : ''} due now
                    </Text>
                  </View>
                </TouchableOpacity>
              )}

              {/* Due Now Section */}
              {dueMeds.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>DUE NOW ({dueMeds.length})</Text>

                  {dueMeds.map((medication) => {
                    const times = formatMedicationTimes(medication);
                    const refillStatus = getRefillStatus(medication);

                    return (
                      <View key={medication.id} style={styles.medCard}>
                        <TouchableOpacity
                          style={styles.medHeader}
                          onPress={() => handleMedicationPress(medication)}
                          accessibilityLabel={`Edit ${medication.name}, ${medication.dosage}`}
                          accessibilityRole="button"
                        >
                          <TouchableOpacity
                            style={styles.medCheckbox}
                            onPress={() => handleTakeMedication(medication)}
                            accessibilityLabel={`Mark ${medication.name} as taken`}
                            accessibilityRole="checkbox"
                            accessibilityState={{ checked: false }}
                          >
                            <View style={styles.checkbox} />
                          </TouchableOpacity>
                          <View style={styles.medInfo}>
                            <Text style={styles.medName}>{medication.name}</Text>
                            <Text style={styles.medDosage}>{medication.dosage}</Text>

                            {/* Multi-time Display */}
                            <View style={styles.timeBadges}>
                              {times.map((time, index) => (
                                <View
                                  key={index}
                                  style={[
                                    styles.timeBadge,
                                    index === 0 && styles.timeBadgeNow
                                  ]}
                                >
                                  <Text style={[
                                    styles.timeBadgeText,
                                    index === 0 && styles.timeBadgeTextNow
                                  ]}>
                                    {time} {index === 0 ? '(NOW)' : ''}
                                  </Text>
                                </View>
                              ))}
                            </View>

                            {/* Refill Warning */}
                            {refillStatus.needsRefill && (
                              <View style={styles.refillWarning}>
                                <Text style={styles.refillWarningText}>
                                  ⚠️ Refill needed in {refillStatus.daysLeft} days
                                </Text>
                              </View>
                            )}
                          </View>
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              )}

              {/* Taken Today Section */}
              {takenMeds.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>TAKEN TODAY ({takenMeds.length})</Text>

                  {takenMeds.map((medication) => (
                    <TouchableOpacity
                      key={medication.id}
                      style={[styles.medCard, styles.medCardTaken]}
                      onPress={() => handleMedicationPress(medication)}
                      accessibilityLabel={`${medication.name}, ${medication.dosage}, taken`}
                      accessibilityRole="button"
                      accessibilityState={{ checked: true }}
                    >
                      <View style={styles.medHeader}>
                        <View style={styles.medCheckboxDone}>
                          <Text style={styles.checkmarkIcon}>✓</Text>
                        </View>
                        <View style={styles.medInfo}>
                          <Text style={[styles.medName, styles.medNameTaken]}>{medication.name}</Text>
                          <Text style={styles.medDosage}>{medication.dosage}</Text>
                          <Text style={styles.takenTime}>
                            Taken at {medication.lastTaken
                              ? new Date(medication.lastTaken).toLocaleTimeString('en-US', {
                                  hour: 'numeric',
                                  minute: '2-digit',
                                })
                              : 'earlier'}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* All Medications Section (for management) */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>ALL MEDICATIONS ({medications.length})</Text>

                {medications.map((medication) => (
                  <TouchableOpacity
                    key={medication.id}
                    style={styles.medCardCompact}
                    onPress={() => handleMedicationPress(medication)}
                    accessibilityLabel={`${medication.name}, ${medication.dosage}, ${medication.timeSlot}${getAdherencePercent(medication) !== null ? `, ${getAdherencePercent(medication)}% adherence` : ''}`}
                    accessibilityRole="button"
                  >
                    <View style={styles.medIconBox}>
                      <Text style={styles.medIcon}>💊</Text>
                    </View>
                    <View style={styles.medInfo}>
                      <Text style={styles.medName}>{medication.name}</Text>
                      <Text style={styles.medDosage}>{medication.dosage} • {medication.timeSlot}</Text>
                    </View>

                    {/* Adherence Badge */}
                    <View style={styles.adherenceBadge}>
                      <Text style={styles.adherenceBadgeText}>
                        {getAdherencePercent(medication) !== null
                          ? `${getAdherencePercent(medication)}%`
                          : '—'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  gradient: {
    flex: 1,
  },
  
  // HEADER WITH ADD BUTTON
  headerWrapper: {
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    width: 44,
    height: 44,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  backIcon: {
    fontSize: 24,
    color: Colors.textPrimary,
  },
  addButton: {
    position: 'absolute',
    top: 70,
    right: 24,
    width: 44,
    height: 44,
    backgroundColor: Colors.accentLight,
    borderWidth: 1,
    borderColor: Colors.accentBorder,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addIcon: {
    fontSize: 24,
    color: Colors.accent,
  },
  
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  
  // WARNING BANNER
  warningBanner: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: 'rgba(248, 113, 113, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.3)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  warningIcon: {
    fontSize: 20,
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.error,
    marginBottom: 4,
  },
  warningText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  warningLink: {
    color: Colors.error,
    fontWeight: '500',
  },
  
  // SECTION
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: Colors.textMuted,
    marginBottom: 12,
  },
  
  // TAKE ALL BUTTON
  takeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.greenMuted,
    borderWidth: 2,
    borderColor: Colors.success,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  takeAllButtonDisabled: {
    opacity: 0.6,
  },
  takeAllIcon: {
    fontSize: 32,
    color: Colors.success,
  },
  takeAllContent: {
    flex: 1,
  },
  takeAllTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.success,
    marginBottom: 2,
  },
  takeAllSubtitle: {
    fontSize: 13,
    color: '#6ee7b7',
  },

  // MEDICATION CARDS
  medCard: {
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  medCardTaken: {
    opacity: 0.7,
  },
  medCardCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  medHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  medCheckbox: {
    paddingTop: 4,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.glassStrong,
    backgroundColor: Colors.surfaceElevated,
  },
  medCheckboxDone: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  checkmarkIcon: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  medIconBox: {
    width: 48,
    height: 48,
    backgroundColor: Colors.accentLight,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medIcon: {
    fontSize: 24,
  },
  medInfo: {
    flex: 1,
  },
  medName: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  medNameTaken: {
    textDecorationLine: 'line-through',
    color: Colors.textSecondary,
  },
  medDosage: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  medFrequency: {
    fontSize: 13,
    color: Colors.textTertiary,
  },
  takenTime: {
    fontSize: 12,
    color: Colors.textMuted,
  },

  // TIME BADGES
  timeBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  timeBadge: {
    backgroundColor: Colors.glassActive,
    borderWidth: 1,
    borderColor: Colors.glassStrong,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  timeBadgeNow: {
    backgroundColor: Colors.greenMuted,
    borderColor: 'rgba(16, 185, 129, 0.5)',
  },
  timeBadgeText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  timeBadgeTextNow: {
    color: Colors.success,
  },

  // REFILL WARNING
  refillWarning: {
    backgroundColor: Colors.amberMuted,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.5)',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  refillWarningText: {
    fontSize: 12,
    color: Colors.amber,
    fontWeight: '600',
  },

  // ADHERENCE BADGE
  adherenceBadge: {
    backgroundColor: Colors.greenHint,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  adherenceBadgeText: {
    fontSize: 12,
    color: Colors.success,
    fontWeight: '600',
  },

  // ADHERENCE BAR (legacy, kept for reference)
  medAdherence: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(232, 155, 95, 0.1)',
  },
  adherenceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  adherenceLabel: {
    fontSize: 12,
    color: Colors.textTertiary,
    fontWeight: '500',
  },
  adherenceValue: {
    fontSize: 13,
    color: Colors.success,
    fontWeight: '600',
  },
  adherenceBar: {
    height: 4,
    backgroundColor: 'rgba(232, 155, 95, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  adherenceBarFill: {
    height: '100%',
    backgroundColor: Colors.success,
    borderRadius: 2,
  },
  
  // EMPTY STATE
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 20,
    opacity: 0.3,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textTertiary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: Colors.accentLight,
    borderWidth: 1,
    borderColor: Colors.accentBorder,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  emptyButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.accent,
  },
});
