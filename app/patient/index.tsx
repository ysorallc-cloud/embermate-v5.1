import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Spacing } from '../../theme/theme-tokens';
import PageHeader from '../../components/PageHeader';
import {
  getMedicalInfo,
  saveMedicalInfo,
  MedicalInfo,
  Diagnosis,
  Surgery,
  Hospitalization,
} from '../../utils/medicalInfo';

// ============================================================================
// DEFAULT DATA (shown before user saves anything)
// ============================================================================

const DEFAULT_INFO: MedicalInfo = {
  bloodType: 'O+',
  allergies: ['Penicillin', 'Sulfa drugs'],
  diagnoses: [
    { condition: 'Hypertension', status: 'active' },
    { condition: 'Type 2 Diabetes', status: 'active' },
    { condition: 'Arthritis', status: 'active' },
  ],
  surgeries: [],
  hospitalizations: [],
  currentMedications: [],
  emergencyNotes: undefined,
  lastUpdated: new Date(),
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function PatientScreen() {
  const router = useRouter();
  const [info, setInfo] = useState<MedicalInfo>(DEFAULT_INFO);
  const [editing, setEditing] = useState(false);

  // Inline add fields
  const [newDiagnosis, setNewDiagnosis] = useState('');
  const [newSurgery, setNewSurgery] = useState('');
  const [newHospitalization, setNewHospitalization] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadInfo();
    }, [])
  );

  const loadInfo = async () => {
    const stored = await getMedicalInfo();
    if (stored) setInfo(stored);
  };

  const save = async (updated: MedicalInfo) => {
    setInfo(updated);
    const { lastUpdated, ...rest } = updated;
    await saveMedicalInfo(rest);
  };

  // ---- Diagnoses ----
  const addDiagnosis = async () => {
    const text = newDiagnosis.trim();
    if (!text) return;
    const diag: Diagnosis = { condition: text, status: 'active' };
    await save({ ...info, diagnoses: [...info.diagnoses, diag] });
    setNewDiagnosis('');
  };

  const removeDiagnosis = (index: number) => {
    Alert.alert('Remove Diagnosis', `Remove "${info.diagnoses[index].condition}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          const updated = info.diagnoses.filter((_, i) => i !== index);
          await save({ ...info, diagnoses: updated });
        },
      },
    ]);
  };

  const toggleDiagnosisStatus = async (index: number) => {
    const updated = [...info.diagnoses];
    updated[index] = {
      ...updated[index],
      status: updated[index].status === 'active' ? 'resolved' : 'active',
    };
    await save({ ...info, diagnoses: updated });
  };

  // ---- Surgeries ----
  const addSurgery = async () => {
    const text = newSurgery.trim();
    if (!text) return;
    const surg: Surgery = { procedure: text };
    await save({ ...info, surgeries: [...info.surgeries, surg] });
    setNewSurgery('');
  };

  const removeSurgery = (index: number) => {
    Alert.alert('Remove Surgery', `Remove "${info.surgeries[index].procedure}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          const updated = info.surgeries.filter((_, i) => i !== index);
          await save({ ...info, surgeries: updated });
        },
      },
    ]);
  };

  // ---- Hospitalizations ----
  const addHospitalization = async () => {
    const text = newHospitalization.trim();
    if (!text) return;
    const hosp: Hospitalization = { reason: text };
    await save({ ...info, hospitalizations: [...info.hospitalizations, hosp] });
    setNewHospitalization('');
  };

  const removeHospitalization = (index: number) => {
    Alert.alert('Remove Hospitalization', `Remove "${info.hospitalizations[index].reason}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          const updated = info.hospitalizations.filter((_, i) => i !== index);
          await save({ ...info, hospitalizations: updated });
        },
      },
    ]);
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  const activeDiagnoses = info.diagnoses.filter(d => d.status === 'active');
  const resolvedDiagnoses = info.diagnoses.filter(d => d.status === 'resolved');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={[Colors.backgroundGradientStart, Colors.backgroundGradientEnd]}
        style={styles.gradient}
      >
        <View style={styles.headerWrapper}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backIcon}>{'\u2190'}</Text>
          </TouchableOpacity>

          <PageHeader
            emoji={'\u{1F464}'}
            label="Profile"
            title="Patient"
          />
        </View>

        <ScrollView style={styles.scroll}>
          {/* Basic Info */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>BASIC INFORMATION</Text>
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Blood Type</Text>
                <Text style={styles.infoValue}>{info.bloodType || '\u2014'}</Text>
              </View>
            </View>
          </View>

          {/* Active Diagnoses */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>ACTIVE DIAGNOSES</Text>
            <View style={styles.infoCard}>
              {activeDiagnoses.length === 0 && (
                <Text style={styles.emptyText}>No active diagnoses</Text>
              )}
              {activeDiagnoses.map((d, idx) => {
                const realIdx = info.diagnoses.indexOf(d);
                return (
                  <View key={realIdx} style={styles.listItem}>
                    <Text style={styles.bulletIcon}>{'\u2022'}</Text>
                    <Text style={styles.listText}>{d.condition}</Text>
                    {editing && (
                      <View style={styles.itemActions}>
                        <TouchableOpacity onPress={() => toggleDiagnosisStatus(realIdx)}>
                          <Text style={styles.resolveButton}>Resolve</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => removeDiagnosis(realIdx)}>
                          <Text style={styles.removeButton}>{'\u2715'}</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })}
              {editing && (
                <View style={styles.addRow}>
                  <TextInput
                    style={styles.addInput}
                    placeholder="Add diagnosis..."
                    placeholderTextColor={Colors.textMuted}
                    value={newDiagnosis}
                    onChangeText={setNewDiagnosis}
                    onSubmitEditing={addDiagnosis}
                    returnKeyType="done"
                  />
                  <TouchableOpacity style={styles.addButton} onPress={addDiagnosis}>
                    <Text style={styles.addButtonText}>+</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>

          {/* Resolved Diagnoses */}
          {resolvedDiagnoses.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>RESOLVED DIAGNOSES</Text>
              <View style={styles.infoCard}>
                {resolvedDiagnoses.map((d, idx) => {
                  const realIdx = info.diagnoses.indexOf(d);
                  return (
                    <View key={realIdx} style={styles.listItem}>
                      <Text style={styles.resolvedBullet}>{'\u2713'}</Text>
                      <Text style={styles.resolvedText}>{d.condition}</Text>
                      {editing && (
                        <View style={styles.itemActions}>
                          <TouchableOpacity onPress={() => toggleDiagnosisStatus(realIdx)}>
                            <Text style={styles.reactivateButton}>Reactivate</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => removeDiagnosis(realIdx)}>
                            <Text style={styles.removeButton}>{'\u2715'}</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Allergies */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>ALLERGIES</Text>
            <View style={[styles.infoCard, styles.allergyCard]}>
              {info.allergies.length === 0 && (
                <Text style={styles.emptyText}>No allergies reported</Text>
              )}
              {info.allergies.map((allergy, idx) => (
                <View key={idx} style={styles.listItem}>
                  <Text style={styles.allergyIcon}>{'\u26A0\uFE0F'}</Text>
                  <Text style={styles.allergyText}>{allergy}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Surgeries */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>SURGICAL HISTORY</Text>
            <View style={styles.infoCard}>
              {info.surgeries.length === 0 && !editing && (
                <Text style={styles.emptyText}>No surgeries recorded</Text>
              )}
              {info.surgeries.map((s, idx) => (
                <View key={idx} style={styles.listItem}>
                  <Text style={styles.bulletIcon}>{'\u2022'}</Text>
                  <Text style={styles.listText}>
                    {s.procedure}{s.date ? ` (${s.date})` : ''}{s.notes ? ` \u2014 ${s.notes}` : ''}
                  </Text>
                  {editing && (
                    <TouchableOpacity onPress={() => removeSurgery(idx)}>
                      <Text style={styles.removeButton}>{'\u2715'}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
              {editing && (
                <View style={styles.addRow}>
                  <TextInput
                    style={styles.addInput}
                    placeholder="Add surgery..."
                    placeholderTextColor={Colors.textMuted}
                    value={newSurgery}
                    onChangeText={setNewSurgery}
                    onSubmitEditing={addSurgery}
                    returnKeyType="done"
                  />
                  <TouchableOpacity style={styles.addButton} onPress={addSurgery}>
                    <Text style={styles.addButtonText}>+</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>

          {/* Hospitalizations */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>HOSPITALIZATIONS</Text>
            <View style={styles.infoCard}>
              {info.hospitalizations.length === 0 && !editing && (
                <Text style={styles.emptyText}>No hospitalizations recorded</Text>
              )}
              {info.hospitalizations.map((h, idx) => (
                <View key={idx} style={styles.listItem}>
                  <Text style={styles.bulletIcon}>{'\u2022'}</Text>
                  <Text style={styles.listText}>
                    {h.reason}{h.date ? ` (${h.date})` : ''}{h.duration ? ` \u2014 ${h.duration}` : ''}
                  </Text>
                  {editing && (
                    <TouchableOpacity onPress={() => removeHospitalization(idx)}>
                      <Text style={styles.removeButton}>{'\u2715'}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
              {editing && (
                <View style={styles.addRow}>
                  <TextInput
                    style={styles.addInput}
                    placeholder="Add hospitalization..."
                    placeholderTextColor={Colors.textMuted}
                    value={newHospitalization}
                    onChangeText={setNewHospitalization}
                    onSubmitEditing={addHospitalization}
                    returnKeyType="done"
                  />
                  <TouchableOpacity style={styles.addButton} onPress={addHospitalization}>
                    <Text style={styles.addButtonText}>+</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>

          {/* Edit / Done Button */}
          <TouchableOpacity
            style={[styles.editButton, editing && styles.editButtonDone]}
            onPress={() => setEditing(!editing)}
          >
            <Text style={styles.editButtonText}>{editing ? 'Done Editing' : 'Edit Medical History'}</Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
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
  gradient: {
    flex: 1,
  },
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
  scroll: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },

  // SECTIONS
  section: {
    marginBottom: Spacing.xl,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textTertiary,
    letterSpacing: 1.2,
    marginBottom: Spacing.md,
  },

  // INFO CARDS
  infoCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: Spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  infoLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textPrimary,
  },

  // LIST ITEMS
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  bulletIcon: {
    fontSize: 14,
    color: Colors.accent,
    width: 16,
  },
  listText: {
    flex: 1,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textMuted,
    paddingVertical: Spacing.sm,
  },

  // Resolved
  resolvedBullet: {
    fontSize: 14,
    color: Colors.textMuted,
    width: 16,
  },
  resolvedText: {
    flex: 1,
    fontSize: 14,
    color: Colors.textMuted,
    textDecorationLine: 'line-through',
  },

  // Item actions (edit mode)
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  resolveButton: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.accent,
  },
  reactivateButton: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.amber,
  },
  removeButton: {
    fontSize: 16,
    color: Colors.red,
    paddingHorizontal: 4,
  },

  // Add row
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
  },
  addInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.textPrimary,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  addButton: {
    width: 36,
    height: 36,
    backgroundColor: Colors.accentLight,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.accent,
  },

  // ALLERGY CARD
  allergyCard: {
    backgroundColor: 'rgba(248, 113, 113, 0.1)',
    borderColor: 'rgba(248, 113, 113, 0.3)',
  },
  allergyIcon: {
    fontSize: 16,
    width: 24,
  },
  allergyText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#F87171',
  },

  // EDIT BUTTON
  editButton: {
    backgroundColor: Colors.accent,
    borderRadius: 12,
    padding: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.xxl,
  },
  editButtonDone: {
    backgroundColor: Colors.green,
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.background,
  },
});
