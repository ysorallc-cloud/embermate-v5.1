// ============================================================================
// PATIENT SWITCHER MODAL
// Bottom sheet for quick patient switching from Now tab
// ============================================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { Colors } from '../../theme/theme-tokens';
import { usePatient } from '../../contexts/PatientContext';

interface PatientSwitcherModalProps {
  visible: boolean;
  onClose: () => void;
}

export function PatientSwitcherModal({ visible, onClose }: PatientSwitcherModalProps) {
  const { activePatientId, patients, switchPatient, addPatient, loading } = usePatient();
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);

  const handleSwitch = async (patientId: string) => {
    if (patientId === activePatientId) {
      onClose();
      return;
    }
    try {
      await switchPatient(patientId);
      onClose();
    } catch {
      Alert.alert('Error', 'Failed to switch patient');
    }
  };

  const handleAdd = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;

    setAdding(true);
    try {
      const patient = await addPatient(trimmed);
      await switchPatient(patient.id);
      setNewName('');
      setShowAdd(false);
      onClose();
    } catch (error: any) {
      Alert.alert('Cannot Add Patient', error?.message || 'Failed to add patient');
    } finally {
      setAdding(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity activeOpacity={1} style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>Switch Patient</Text>

          {/* Patient list */}
          {patients.map((patient) => {
            const isActive = patient.id === activePatientId;
            return (
              <TouchableOpacity
                key={patient.id}
                style={[styles.patientRow, isActive && styles.patientRowActive]}
                onPress={() => handleSwitch(patient.id)}
                accessibilityLabel={`Switch to ${patient.name}`}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
              >
                <View style={[styles.avatar, isActive && styles.avatarActive]}>
                  <Text style={styles.avatarText}>
                    {patient.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.patientInfo}>
                  <Text style={[styles.patientName, isActive && styles.patientNameActive]}>
                    {patient.name}
                  </Text>
                  {patient.relationship && (
                    <Text style={styles.patientRelation}>{patient.relationship}</Text>
                  )}
                </View>
                {isActive && <Text style={styles.activeCheck}>{'\u2713'}</Text>}
              </TouchableOpacity>
            );
          })}

          {/* Add patient */}
          {showAdd ? (
            <View style={styles.addForm}>
              <TextInput
                style={styles.addInput}
                value={newName}
                onChangeText={setNewName}
                placeholder="Patient name"
                placeholderTextColor={Colors.textPlaceholder}
                autoFocus
                accessibilityLabel="New patient name"
              />
              <View style={styles.addActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => { setShowAdd(false); setNewName(''); }}
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.addButton, (!newName.trim() || adding) && styles.addButtonDisabled]}
                  onPress={handleAdd}
                  disabled={!newName.trim() || adding}
                >
                  <Text style={styles.addButtonText}>
                    {adding ? 'Adding...' : 'Add'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.addPatientRow}
              onPress={() => setShowAdd(true)}
              accessibilityLabel="Add a new patient"
              accessibilityRole="button"
            >
              <Text style={styles.addIcon}>+</Text>
              <Text style={styles.addLabel}>Add Patient</Text>
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.menuSurface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.glassBorder,
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  patientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: Colors.glass,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    gap: 12,
  },
  patientRowActive: {
    backgroundColor: Colors.accentHint,
    borderColor: Colors.accent,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.glassSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarActive: {
    backgroundColor: Colors.accent,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  patientNameActive: {
    color: Colors.accent,
  },
  patientRelation: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  activeCheck: {
    fontSize: 16,
    color: Colors.accent,
    fontWeight: 'bold',
  },
  addPatientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
    marginTop: 4,
  },
  addIcon: {
    fontSize: 20,
    color: Colors.accent,
    fontWeight: '600',
  },
  addLabel: {
    fontSize: 15,
    color: Colors.accent,
    fontWeight: '500',
  },
  addForm: {
    marginTop: 8,
    gap: 12,
  },
  addInput: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  addActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  cancelButton: {
    padding: 10,
  },
  cancelText: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  addButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.accent,
    borderRadius: 8,
  },
  addButtonDisabled: {
    opacity: 0.4,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
});
