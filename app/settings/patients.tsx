// ============================================================================
// PATIENT MANAGEMENT SCREEN
// List, add, switch, and edit patients
// ============================================================================

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Colors } from '../../theme/theme-tokens';
import { CommonStyles } from '../../theme/commonStyles';
import PageHeader from '../../components/PageHeader';
import UpgradePrompt from '../../components/UpgradePrompt';
import { usePatient } from '../../contexts/PatientContext';
import { updatePatient, removePatient } from '../../storage/patientRegistry';
import { checkFeatureAccess } from '../../utils/featureGate';
import { Patient } from '../../types/patient';

export default function PatientsScreen() {
  const router = useRouter();
  const { patients, activePatientId, switchPatient, addPatient, refresh } = usePatient();
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRelationship, setNewRelationship] = useState<Patient['relationship']>();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState('');

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const handleAddPatient = async () => {
    if (!newName.trim()) {
      Alert.alert('Name Required', 'Please enter a name for the patient.');
      return;
    }

    // Check feature gate
    const access = await checkFeatureAccess('multi_patient');
    if (!access.allowed) {
      setUpgradeReason(access.reason || 'Upgrade to add more patients.');
      setShowUpgrade(true);
      return;
    }

    try {
      await addPatient(newName.trim(), newRelationship);
      setNewName('');
      setNewRelationship(undefined);
      setShowAdd(false);
    } catch (error) {
      Alert.alert('Error', 'Could not add patient.');
    }
  };

  const handleSwitchPatient = async (patientId: string) => {
    if (patientId === activePatientId) return;
    try {
      await switchPatient(patientId);
    } catch (error) {
      Alert.alert('Error', 'Could not switch patient.');
    }
  };

  const handleEditName = (patient: Patient) => {
    Alert.prompt(
      'Edit Name',
      'Enter new name:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save',
          onPress: async (name?: string) => {
            if (name?.trim()) {
              await updatePatient(patient.id, { name: name.trim() });
              refresh();
            }
          },
        },
      ],
      'plain-text',
      patient.name
    );
  };

  const handleRemovePatient = (patient: Patient) => {
    if (patient.isDefault) {
      Alert.alert('Cannot Remove', 'The default patient cannot be removed.');
      return;
    }

    Alert.alert(
      'Remove Patient',
      `Remove "${patient.name}"? This will not delete their stored data, but it will be inaccessible until re-added.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await removePatient(patient.id);
            refresh();
          },
        },
      ]
    );
  };

  const relationships: { value: Patient['relationship']; label: string }[] = [
    { value: 'self', label: 'Self' },
    { value: 'parent', label: 'Parent' },
    { value: 'spouse', label: 'Spouse' },
    { value: 'child', label: 'Child' },
    { value: 'other', label: 'Other' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={[Colors.backgroundGradientStart, Colors.backgroundGradientEnd]}
        style={styles.gradient}
      >
        <View style={CommonStyles.headerWrapper}>
          <TouchableOpacity
            style={CommonStyles.backButton}
            onPress={() => router.back()}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Text style={CommonStyles.backIcon}>&#x2190;</Text>
          </TouchableOpacity>
          <PageHeader
            emoji="&#x1F465;"
            label="Multi-Patient"
            title="Manage Patients"
          />
        </View>

        <ScrollView style={styles.content}>
          {/* Patient List */}
          {patients.map((patient) => {
            const isActive = patient.id === activePatientId;
            return (
              <TouchableOpacity
                key={patient.id}
                style={[styles.patientCard, isActive && styles.patientCardActive]}
                onPress={() => handleSwitchPatient(patient.id)}
                activeOpacity={0.7}
                accessibilityLabel={`Switch to patient ${patient.name}${isActive ? ', currently active' : ''}`}
                accessibilityRole="radio"
                accessibilityState={{ selected: isActive }}
              >
                <View style={styles.patientInfo}>
                  <View style={styles.patientNameRow}>
                    <Text style={styles.patientName}>{patient.name}</Text>
                    {isActive && (
                      <View style={styles.activeBadge}>
                        <Text style={styles.activeBadgeText}>Active</Text>
                      </View>
                    )}
                    {patient.isDefault && (
                      <View style={styles.defaultBadge}>
                        <Text style={styles.defaultBadgeText}>Default</Text>
                      </View>
                    )}
                  </View>
                  {patient.relationship && (
                    <Text style={styles.patientRelationship}>
                      {patient.relationship.charAt(0).toUpperCase() + patient.relationship.slice(1)}
                    </Text>
                  )}
                </View>

                <View style={styles.patientActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleEditName(patient)}
                    accessibilityLabel={`Edit name for ${patient.name}`}
                    accessibilityRole="button"
                  >
                    <Text style={styles.actionIcon}>&#x270F;&#xFE0F;</Text>
                  </TouchableOpacity>
                  {!patient.isDefault && (
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleRemovePatient(patient)}
                      accessibilityLabel={`Remove ${patient.name}`}
                      accessibilityRole="button"
                    >
                      <Text style={styles.actionIcon}>&#x1F5D1;&#xFE0F;</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}

          {/* Add Patient */}
          {showAdd ? (
            <View style={styles.addForm}>
              <Text style={styles.addFormTitle}>Add Patient</Text>
              <TextInput
                style={styles.input}
                placeholder="Patient name"
                placeholderTextColor={Colors.textMuted}
                value={newName}
                onChangeText={setNewName}
                accessibilityLabel="Patient name"
              />

              <Text style={styles.fieldLabel}>Relationship</Text>
              <View style={styles.relationshipRow}>
                {relationships.map((r) => (
                  <TouchableOpacity
                    key={r.value}
                    style={[
                      styles.relationshipChip,
                      newRelationship === r.value && styles.relationshipChipActive,
                    ]}
                    onPress={() => setNewRelationship(r.value)}
                    accessibilityLabel={`${r.label} relationship`}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: newRelationship === r.value }}
                  >
                    <Text
                      style={[
                        styles.relationshipChipText,
                        newRelationship === r.value && styles.relationshipChipTextActive,
                      ]}
                    >
                      {r.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.addFormButtons}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => { setShowAdd(false); setNewName(''); setNewRelationship(undefined); }}
                  accessibilityLabel="Cancel adding patient"
                  accessibilityRole="button"
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleAddPatient}
                  accessibilityLabel="Add patient"
                  accessibilityRole="button"
                >
                  <Text style={styles.saveButtonText}>Add Patient</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowAdd(true)}
              accessibilityLabel="Add patient"
              accessibilityRole="button"
            >
              <Text style={styles.addButtonIcon}>+</Text>
              <Text style={styles.addButtonText}>Add Patient</Text>
            </TouchableOpacity>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </LinearGradient>

      <UpgradePrompt
        visible={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        feature="multi_patient"
        reason={upgradeReason}
      />
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
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  patientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  patientCardActive: {
    borderColor: 'rgba(20, 184, 166, 0.25)',
    backgroundColor: 'rgba(20, 184, 166, 0.05)',
  },
  patientInfo: {
    flex: 1,
  },
  patientNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  activeBadge: {
    backgroundColor: 'rgba(20, 184, 166, 0.15)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  activeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.accent,
  },
  defaultBadge: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  defaultBadgeText: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  patientRelationship: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  patientActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIcon: {
    fontSize: 16,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    gap: 8,
    borderStyle: 'dashed',
  },
  addButtonIcon: {
    fontSize: 20,
    color: Colors.accent,
    fontWeight: '600',
  },
  addButtonText: {
    fontSize: 15,
    color: Colors.accent,
    fontWeight: '500',
  },
  addForm: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  addFormTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: Colors.textPrimary,
    fontSize: 14,
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  relationshipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  relationshipChip: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  relationshipChipActive: {
    borderColor: Colors.accent,
    backgroundColor: 'rgba(20, 184, 166, 0.1)',
  },
  relationshipChipText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  relationshipChipTextActive: {
    color: Colors.accent,
    fontWeight: '500',
  },
  addFormButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  saveButton: {
    flex: 1,
    backgroundColor: Colors.accent,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#051614',
  },
});
