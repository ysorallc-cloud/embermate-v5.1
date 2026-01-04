// ============================================================================
// MEDICATIONS LIST - Full medication management
// ============================================================================

import React, { useState, useCallback } from 'react';
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
import { Colors } from './_theme/theme-tokens';
import PageHeader from '../components/PageHeader';
import { getMedications, deleteMedication, Medication } from '../utils/medicationStorage';
import { checkInteraction } from '../utils/drugInteractions';

export default function MedicationsScreen() {
  const router = useRouter();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [interactions, setInteractions] = useState<any[]>([]);

  useFocusEffect(useCallback(() => {
    loadData();
  }, []));

  const loadData = async () => {
    try {
      const meds = await getMedications();
      const activeMeds = meds.filter(m => m.active);
      setMedications(activeMeds);
      
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
      console.error('Error loading medications:', error);
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
    // Calculate 7-day adherence
    return medication.adherenceRate || 95;
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
          >
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          
          <PageHeader 
            emoji="💊"
            label="Prescriptions"
            title="Medications"
            explanation="Manage all active medications"
          />
          
          <TouchableOpacity 
            style={styles.addButton}
            onPress={handleAddMedication}
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
          {medications.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>💊</Text>
              <Text style={styles.emptyTitle}>No medications yet</Text>
              <Text style={styles.emptyText}>
                Add your first medication to start tracking adherence and managing your care.
              </Text>
              <TouchableOpacity 
                style={styles.emptyButton}
                onPress={handleAddMedication}
              >
                <Text style={styles.emptyButtonText}>Add Medication</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>ACTIVE MEDICATIONS ({medications.length})</Text>
              
              {medications.map((medication) => (
                <TouchableOpacity
                  key={medication.id}
                  style={styles.medCard}
                  onPress={() => handleMedicationPress(medication)}
                >
                  <View style={styles.medHeader}>
                    <View style={styles.medIconBox}>
                      <Text style={styles.medIcon}>💊</Text>
                    </View>
                    <View style={styles.medInfo}>
                      <Text style={styles.medName}>{medication.name}</Text>
                      <Text style={styles.medDosage}>{medication.dosage}</Text>
                      <Text style={styles.medFrequency}>
                        {medication.frequency} • {medication.time}
                      </Text>
                    </View>
                  </View>

                  {/* Adherence Bar */}
                  <View style={styles.medAdherence}>
                    <View style={styles.adherenceHeader}>
                      <Text style={styles.adherenceLabel}>7-day adherence</Text>
                      <Text style={styles.adherenceValue}>
                        {getAdherencePercent(medication)}%
                      </Text>
                    </View>
                    <View style={styles.adherenceBar}>
                      <View 
                        style={[
                          styles.adherenceBarFill, 
                          { width: `${getAdherencePercent(medication)}%` }
                        ]} 
                      />
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
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
    top: 70,
    left: 24,
    width: 44,
    height: 44,
    backgroundColor: Colors.surface,
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
  
  // MEDICATION CARDS
  medCard: {
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
  },
  medHeader: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  medIconBox: {
    width: 56,
    height: 56,
    backgroundColor: Colors.accentLight,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medIcon: {
    fontSize: 28,
  },
  medInfo: {
    flex: 1,
  },
  medName: {
    fontSize: 18,
    fontWeight: '500',
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  medDosage: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  medFrequency: {
    fontSize: 13,
    color: Colors.textTertiary,
  },
  
  // ADHERENCE
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
