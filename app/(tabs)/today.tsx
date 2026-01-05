// ============================================================================
// TODAY TAB - Mindful Redesign with Cup Metaphor
// Preserves ALL existing functionality
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
  Modal,
  TextInput,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Spacing, BorderRadius, Typography } from '../_theme/theme-tokens';
import { getMedications, markMedicationTaken, Medication } from '../../utils/medicationStorage';
import { getUpcomingAppointments, Appointment } from '../../utils/appointmentStorage';
import { hapticSuccess } from '../../utils/hapticFeedback';
import { checkInteraction } from '../../utils/drugInteractions';
import { scheduleMedicationNotifications } from '../../utils/notificationService';
import { logActivity, getCurrentUser } from '../../utils/collaborativeCare';

export default function TodayScreen() {
  const router = useRouter();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showFeelingPrompt, setShowFeelingPrompt] = useState(false);
  const [feelingNote, setFeelingNote] = useState('');
  const [lastConfirmedMed, setLastConfirmedMed] = useState<Medication | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<{[key: string]: boolean}>({
    flow: false, // Today's flow expanded
  });
  const [dailyNotes, setDailyNotes] = useState('');
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);

  useFocusEffect(useCallback(() => {
    loadData();
    checkForInteractions();
  }, []));

  const loadData = async () => {
    try {
      const meds = await getMedications();
      setMedications(meds.filter(m => m.active));
      await scheduleMedicationNotifications(meds.filter(m => m.active));
    } catch (e) {
      console.log('Error loading medications:', e);
    }
    try {
      const appts = await getUpcomingAppointments();
      setAppointments(appts);
    } catch (e) {
      console.log('Error loading appointments:', e);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    await checkForInteractions();
    setRefreshing(false);
  }, []);

  const checkForInteractions = async () => {
    try {
      const meds = await getMedications();
      const activeMeds = meds.filter(m => m.active);
      
      for (let i = 0; i < activeMeds.length; i++) {
        for (let j = i + 1; j < activeMeds.length; j++) {
          const interaction = checkInteraction(activeMeds[i].name, activeMeds[j].name);
          
          if (interaction && interaction.severity === 'high') {
            Alert.alert(
              '⚠️ Drug Interaction Warning',
              `${interaction.description}\n\nConsult with Dr. Chen before taking.`,
              [
                { text: 'View Details', onPress: () => router.push('/medication-interactions') },
                { text: 'Dismiss', style: 'cancel' }
              ]
            );
            break;
          }
        }
      }
    } catch (e) {
      console.log('Error checking interactions:', e);
    }
  };

  const handleQuickConfirm = async (med: Medication) => {
    try {
      hapticSuccess();
      const taken = await markMedicationTaken(med.id);
      
      const user = await getCurrentUser();
      await logActivity({
        type: 'medication_taken',
        userId: user?.id || 'primary',
        description: `${user?.name || 'You'} marked ${med.name} as taken`,
        timestamp: new Date().toISOString(),
        metadata: { medicationId: med.id, medicationName: med.name }
      });
      
      setLastConfirmedMed(med);
      setTimeout(() => setLastConfirmedMed(null), 3000);
      await loadData();
    } catch (e) {
      Alert.alert('Error', 'Could not mark medication as taken');
    }
  };

  const getTodayTasks = () => {
    const today = new Date();
    const todayMeds = (medications || []).filter(med => {
      if (!med?.schedule?.times) return false;
      return true;
    });
    
    const todayAppts = (appointments || []).filter(appt => {
      if (!appt?.dateTime) return false;
      const apptDate = new Date(appt.dateTime);
      return apptDate.toDateString() === today.toDateString();
    });

    return { meds: todayMeds, appointments: todayAppts };
  };

  const getTaskCounts = () => {
    const { meds } = getTodayTasks();
    const total = meds.length;
    const completed = meds.filter(m => m?.taken).length;
    return { completed, total };
  };

  const hasMissedDoses = () => {
    const now = new Date();
    const currentHour = now.getHours();
    
    return (medications || []).some(med => {
      if (med?.taken || !med?.schedule?.times) return false;
      const times = med.schedule.times || [];
      return times.some(time => {
        const [hour] = time.split(':').map(Number);
        return currentHour >= hour + 2;
      });
    });
  };

  const getMoodPromptText = () => {
    return "How is Mom today?";
  };

  const counts = getTaskCounts();
  const missedDoses = hasMissedDoses();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <LinearGradient
        colors={[Colors.backgroundGradientStart, Colors.backgroundGradientEnd]}
        style={styles.gradient}
      >
        {/* Cup Hero Section */}
        <TouchableOpacity 
          style={styles.hero}
          onPress={() => router.push('/coffee')}
          activeOpacity={0.8}
        >
          <Text style={styles.steam}>))))</Text>
          <Text style={styles.cupIcon}>☕</Text>
          <Text style={styles.heroLabel}>YOUR CUP TODAY</Text>
          <Text style={styles.heroMessage}>
            A steady rhythm,{'\n'}mindful care.
          </Text>
          <Text style={styles.heroDetail}>
            {counts.total} tasks • {(appointments || []).length} appointments
          </Text>
        </TouchableOpacity>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.accent}
            />
          }
        >
          {/* Caregiver Wellness Card */}
          <View style={styles.wellnessCard}>
            <Text style={styles.wellnessLabel}>A MOMENT FOR YOU</Text>
            <Text style={styles.wellnessTitle}>CAREGIVER WELLNESS</Text>
            <Text style={styles.wellnessText}>
              You've been caring non-stop. A short walk or warm tea can restore your energy.
            </Text>
            <Text style={styles.wellnessAction}>
              Tap when you've taken a moment for yourself.
            </Text>
          </View>

          {/* Care Energy Bar */}
          <View style={styles.energyCard}>
            <Text style={styles.energyHeader}>YOUR CARE ENERGY</Text>
            <View style={styles.energyBarContainer}>
              <View style={[styles.energyBarFill, { width: counts.total > 0 ? `${(counts.completed / counts.total) * 100}%` : '0%' }]} />
            </View>
            <Text style={styles.energyText}>
              {counts.completed} of {counts.total} tasks complete • Keep your gentle pace
            </Text>
          </View>

          {/* Priority Alert if needed */}
          {missedDoses && (
            <View style={styles.priorityAlert}>
              <Text style={styles.priorityIcon}>⚠️</Text>
              <Text style={styles.priorityText}>Evening medications overdue</Text>
              <View style={styles.priorityBadge}>
                <Text style={styles.priorityBadgeText}>1</Text>
              </View>
              <Text style={styles.priorityChevron}>›</Text>
            </View>
          )}

          {/* Before Your Next Step */}
          <Text style={styles.sectionLabel}>BEFORE YOUR NEXT STEP</Text>
          <View style={styles.actionCards}>
            <TouchableOpacity style={styles.actionCard}>
              <Text style={styles.actionCardHeader}>DUE SOON</Text>
              <Text style={styles.actionCardTitle}>Evening meds</Text>
              <Text style={styles.actionCardDetail}>8:00 pm • 3 doses</Text>
              <View style={styles.actionCardButton}>
                <Text style={styles.actionCardButtonText}>When ready</Text>
              </View>
            </TouchableOpacity>
            
            {appointments && appointments.length > 0 && appointments[0] && (
              <TouchableOpacity 
                style={styles.actionCard}
                onPress={() => router.push('/appointments')}
              >
                <Text style={styles.actionCardHeader}>NEXT</Text>
                <Text style={styles.actionCardTitle} numberOfLines={1}>
                  {appointments[0].location || 'Appointment'}
                </Text>
                <Text style={styles.actionCardDetail}>
                  {new Date(appointments[0].dateTime).toLocaleTimeString('en-US', { 
                    hour: 'numeric', 
                    minute: '2-digit' 
                  })}
                </Text>
                <View style={styles.actionCardButton}>
                  <Text style={styles.actionCardButtonText}>Review notes</Text>
                </View>
              </TouchableOpacity>
            )}
          </View>

          {/* Patient Mood Check */}
          <Text style={styles.sectionLabel}>HOW IS MOM TODAY</Text>
          <View style={styles.signalsGrid}>
            {[
              { emoji: '😊', label: 'Great' },
              { emoji: '🙂', label: 'Good' },
              { emoji: '😐', label: 'Okay' },
              { emoji: '😔', label: 'Low' }
            ].map((mood) => (
              <TouchableOpacity 
                key={mood.emoji}
                style={[
                  styles.signalItem,
                  selectedMood === mood.emoji && styles.signalItemSelected
                ]}
                onPress={() => setSelectedMood(mood.emoji)}
              >
                <Text style={styles.signalIcon}>{mood.emoji}</Text>
                <Text style={styles.signalLabel}>{mood.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Today's Flow */}
          <Text style={styles.sectionLabel}>TODAY'S FLOW</Text>
          <View style={styles.flowList}>
            {(medications || []).slice(0, 5).map((med) => (
              <TouchableOpacity
                key={med.id}
                style={styles.flowItem}
                onPress={() => !med.taken && handleQuickConfirm(med)}
              >
                <View style={[styles.flowCheck, med.taken && styles.flowCheckDone]}>
                  {med.taken && <Text style={styles.flowCheckmark}>✓</Text>}
                </View>
                <View style={styles.flowInfo}>
                  <Text style={styles.flowName}>{med.name}</Text>
                  <Text style={styles.flowTime}>
                    {med.schedule?.times?.[0] || '8:00 AM'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
            
            {(appointments || []).map((appt) => (
              <TouchableOpacity
                key={appt.id}
                style={styles.flowItem}
                onPress={() => router.push('/appointments')}
              >
                <View style={styles.flowCheck} />
                <View style={styles.flowInfo}>
                  <Text style={styles.flowName}>{appt.location}</Text>
                  <Text style={styles.flowTime}>
                    {new Date(appt.dateTime).toLocaleTimeString('en-US', { 
                      hour: 'numeric', 
                      minute: '2-digit' 
                    })} • {appt.type}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </LinearGradient>

      {/* Feeling Prompt Modal - preserved from original */}
      <Modal
        visible={showFeelingPrompt}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFeelingPrompt(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowFeelingPrompt(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{getMoodPromptText()}</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Add a note (optional)"
              placeholderTextColor={Colors.textTertiary}
              value={feelingNote}
              onChangeText={setFeelingNote}
              multiline
            />
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => {
                setFeelingNote('');
                setShowFeelingPrompt(false);
              }}
            >
              <Text style={styles.modalButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Notes Modal - preserved from original */}
      <Modal
        visible={showNotesModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNotesModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowNotesModal(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Daily Notes</Text>
            <TextInput
              style={[styles.modalInput, { height: 120 }]}
              placeholder="Add notes about today..."
              placeholderTextColor={Colors.textTertiary}
              value={dailyNotes}
              onChangeText={setDailyNotes}
              multiline
            />
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setShowNotesModal(false)}
            >
              <Text style={styles.modalButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Confirmation Toast - preserved from original */}
      {lastConfirmedMed && (
        <View style={styles.toast}>
          <Text style={styles.toastText}>✓ {lastConfirmedMed.name} marked as taken</Text>
        </View>
      )}
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
  
  // Hero Section
  hero: {
    alignItems: 'center',
    paddingTop: Platform.OS === 'web' ? 80 : 50,
    paddingBottom: Platform.OS === 'web' ? 45 : 30,
    paddingHorizontal: Platform.OS === 'web' ? 32 : 24,
  },
  steam: {
    fontSize: Platform.OS === 'web' ? 42 : 30,
    opacity: 0.6,
    marginBottom: Platform.OS === 'web' ? -14 : -10,
  },
  cupIcon: {
    fontSize: Platform.OS === 'web' ? 140 : 100,
    marginBottom: Platform.OS === 'web' ? 28 : 20,
    opacity: 0.9,
  },
  heroLabel: {
    fontSize: Platform.OS === 'web' ? 13 : 11,
    letterSpacing: 3,
    color: Colors.accent,
    marginBottom: Platform.OS === 'web' ? 16 : 12,
    fontWeight: '800',
  },
  heroMessage: {
    fontSize: Platform.OS === 'web' ? 30 : 26,
    fontWeight: '300',
    lineHeight: Platform.OS === 'web' ? 42 : 36,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Platform.OS === 'web' ? 8 : 6,
  },
  heroDetail: {
    fontSize: Platform.OS === 'web' ? 17 : 15,
    color: Colors.textTertiary,
  },
  
  // Content
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: Platform.OS === 'web' ? 32 : 24,
    paddingBottom: Platform.OS === 'web' ? 120 : 100,
  },
  
  // Wellness Card
  wellnessCard: {
    backgroundColor: 'rgba(232, 155, 95, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(232, 155, 95, 0.15)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  wellnessLabel: {
    fontSize: 10,
    letterSpacing: 2,
    color: 'rgba(232, 155, 95, 0.8)',
    marginBottom: 12,
    fontWeight: '800',
  },
  wellnessTitle: {
    fontSize: 12,
    letterSpacing: 1.5,
    color: Colors.textTertiary,
    marginBottom: 8,
    fontWeight: '600',
  },
  wellnessText: {
    fontSize: 15,
    lineHeight: 24,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  wellnessAction: {
    fontSize: 13,
    fontStyle: 'italic',
    color: 'rgba(232, 155, 95, 0.8)',
  },
  
  // Energy Card
  energyCard: {
    backgroundColor: 'rgba(79, 209, 197, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(79, 209, 197, 0.2)',
    borderRadius: 14,
    padding: 18,
    marginBottom: 20,
  },
  energyHeader: {
    fontSize: 10,
    letterSpacing: 2,
    color: Colors.accent,
    marginBottom: 12,
    fontWeight: '800',
  },
  energyBarContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 10,
  },
  energyBarFill: {
    backgroundColor: Colors.accent,
    height: '100%',
    borderRadius: 4,
  },
  energyText: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
  
  // Priority Alert
  priorityAlert: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderLeftWidth: 3,
    borderLeftColor: Colors.error,
    borderRadius: 8,
    padding: 12,
    paddingLeft: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  priorityIcon: {
    fontSize: 20,
  },
  priorityText: {
    flex: 1,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  priorityBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  priorityBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.error,
  },
  priorityChevron: {
    fontSize: 16,
    color: Colors.textMuted,
  },
  
  // Section Labels
  sectionLabel: {
    fontSize: 10,
    letterSpacing: 2,
    color: Colors.textMuted,
    marginBottom: 12,
    fontWeight: '800',
  },
  
  // Action Cards
  actionCards: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  actionCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    padding: 16,
  },
  actionCardHeader: {
    fontSize: 10,
    color: Colors.textMuted,
    marginBottom: 8,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  actionCardTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  actionCardDetail: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginBottom: 10,
  },
  actionCardButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionCardButtonText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  
  // Signals Grid
  signalsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  signalItem: {
    flex: 1,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 14,
    paddingVertical: 10,
    alignItems: 'center',
  },
  signalItemSelected: {
    backgroundColor: Colors.accentLight,
    borderColor: Colors.accentBorder,
  },
  signalIcon: {
    fontSize: 28,
    marginBottom: 6,
  },
  signalLabel: {
    fontSize: 10,
    color: Colors.textTertiary,
  },
  
  // Flow List
  flowList: {
    marginBottom: 24,
  },
  flowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.03)',
  },
  flowCheck: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: 'rgba(79, 209, 197, 0.5)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flowCheckDone: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  flowCheckmark: {
    color: Colors.background,
    fontSize: 14,
    fontWeight: 'bold',
  },
  flowInfo: {
    flex: 1,
  },
  flowName: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 3,
  },
  flowTime: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  
  // Modals - preserved from original
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: Colors.menuSurface,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '500',
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  modalButton: {
    backgroundColor: Colors.accent,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.background,
  },
  
  // Toast - preserved from original
  toast: {
    position: 'absolute',
    bottom: 100,
    left: 24,
    right: 24,
    backgroundColor: Colors.success,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  toastText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
  },
});
