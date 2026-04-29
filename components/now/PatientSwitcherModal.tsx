// ============================================================================
// PATIENT SWITCHER MODAL
// Bottom sheet for quick patient switching from Now tab
// ============================================================================

import React, { useState, useMemo } from 'react';
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
import { useTheme } from '../../contexts/ThemeContext';
import { usePatient } from '../../contexts/PatientContext';
import { checkFeatureAccess } from '../../utils/featureGate';
import { navigate } from '../../lib/navigate';
import { useSampleMode } from '../../hooks/useSampleMode';

interface PatientSwitcherModalProps {
  visible: boolean;
  onClose: () => void;
  onManageSample?: (focus: 'setup' | 'remove') => void;
}

export function PatientSwitcherModal({ visible, onClose, onManageSample }: PatientSwitcherModalProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { activePatientId, patients, switchPatient, addPatient, loading } = usePatient();
  const { isSampleMode } = useSampleMode();
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);

  // Active patient's display name for the "View [name]'s profile" link. Falls
  // back to the standard "your loved one" when the context hasn't resolved.
  const activePatient = patients.find(p => p.id === activePatientId);
  const activeName =
    activePatient?.name && activePatient.name !== 'Patient'
      ? activePatient.name
      : 'your loved one';

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
        accessibilityRole="button"
        accessibilityLabel="Close patient switcher"
      >
        <TouchableOpacity
          activeOpacity={1}
          style={styles.sheet}
          accessibilityRole="none"
          accessibilityLabel="Switch patient sheet"
        >
          <View style={styles.handle} />
          <Text style={styles.title}>Switch Patient</Text>

          {/* Patient list */}
          {patients.map((patient) => {
            const isActive = patient.id === activePatientId;
            const isSelf = patient.relationship === 'self';
            // Display label: "self" reads awkwardly in a list of relationships
            // ("Mom", "Dad", "self"). Surface it as "You" instead. Other
            // relationships still pass through unchanged.
            const relationshipLabel = isSelf
              ? 'You'
              : patient.relationship;
            return (
              <TouchableOpacity
                key={patient.id}
                style={[styles.patientRow, isActive && styles.patientRowActive]}
                onPress={() => handleSwitch(patient.id)}
                accessibilityLabel={`Switch to ${patient.name}${isSelf ? ' (you)' : ''}`}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
              >
                <View
                  style={[
                    styles.avatar,
                    // Active (non-self) patients get the filled mint fill.
                    // Self patients get a distinct outline regardless of
                    // active state, so the avatar carries a single, unambiguous
                    // signal \u2014 "this row is you".
                    isActive && !isSelf && styles.avatarActive,
                    isSelf && styles.avatarSelf,
                  ]}
                >
                  <Text style={[styles.avatarText, isSelf && styles.avatarTextSelf]}>
                    {patient.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.patientInfo}>
                  <View style={styles.patientNameRow}>
                    <Text style={styles.patientName}>{patient.name}</Text>
                    {isSampleMode && isActive && (
                      <View style={styles.exampleBadge} accessibilityLabel="Example data">
                        <Text style={styles.exampleBadgeText}>{'EXAMPLE'}</Text>
                      </View>
                    )}
                  </View>
                  {relationshipLabel && (
                    <Text style={styles.patientRelation}>{relationshipLabel}</Text>
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
                placeholderTextColor={colors.textPlaceholder}
                autoFocus
                accessibilityLabel="New patient name"
              />
              <View style={styles.addActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => { setShowAdd(false); setNewName(''); }}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel adding patient"
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.addButton, (!newName.trim() || adding) && styles.addButtonDisabled]}
                  onPress={handleAdd}
                  disabled={!newName.trim() || adding}
                  accessibilityRole="button"
                  accessibilityLabel="Add patient"
                  accessibilityState={{ disabled: !newName.trim() || adding }}
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
              onPress={async () => {
                const result = await checkFeatureAccess('multi_patient');
                if (!result.allowed) {
                  Alert.alert('Upgrade Required', result.reason || 'Multi-patient support requires an upgrade.');
                  return;
                }
                setShowAdd(true);
              }}
              accessibilityLabel="Add a new patient"
              accessibilityRole="button"
            >
              <Text style={styles.addIcon}>+</Text>
              <Text style={styles.addLabel}>Add Patient</Text>
            </TouchableOpacity>
          )}

          {/* View Profile link */}
          <View style={styles.profileDivider} />
          <TouchableOpacity
            style={styles.profileRow}
            onPress={() => { onClose(); navigate('/patient'); }}
            accessibilityLabel={`View ${activeName}'s profile`}
            accessibilityRole="button"
          >
            <Text style={styles.profileIcon}>{'\uD83D\uDC64'}</Text>
            <Text style={styles.profileLabel}>{`View ${activeName}'s profile`}</Text>
            <Text style={styles.profileArrow}>{'\u2192'}</Text>
          </TouchableOpacity>

          {/* Sample-mode action section — only visible while exploring
              with example data. Lets the user transition out (set up real
              profile) or remove the example entirely without leaving the
              switcher. Both routes hand off to ManageSampleDataSheet so the
              actual persistence / destructive work lives in one place. */}
          {isSampleMode && (
            <View style={styles.sampleSection}>
              <View style={styles.sampleDivider} />
              <Text style={styles.sampleSectionTitle}>{'Example data'}</Text>
              <TouchableOpacity
                style={styles.setupSampleButton}
                onPress={() => { onClose(); onManageSample?.('setup'); }}
                accessibilityRole="button"
                accessibilityLabel="Set up my loved one. Replace example data with a real profile."
              >
                <Text style={styles.setupSampleButtonText}>{'Set up my loved one'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.removeSampleButton}
                onPress={() => { onClose(); onManageSample?.('remove'); }}
                accessibilityRole="button"
                accessibilityLabel="Remove example data"
              >
                <Text style={styles.removeSampleButtonText}>{'Remove example data'}</Text>
              </TouchableOpacity>
            </View>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const createStyles = (c: typeof Colors) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: c.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: c.menuSurface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: c.glassBorder,
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: c.textPrimary,
    marginBottom: 16,
  },
  patientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: c.glass,
    borderWidth: 1,
    borderColor: c.glassBorder,
    gap: 12,
  },
  patientRowActive: {
    backgroundColor: c.accentHint,
    borderColor: c.accent,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: c.glassSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarActive: {
    backgroundColor: c.accent,
  },
  // Self-patient avatar: outlined accent ring on a transparent fill, distinct
  // from the solid mint "active" avatar so the two indicators don't collide.
  avatarSelf: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: c.accent,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: c.textPrimary,
  },
  avatarTextSelf: {
    color: c.accent,
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 15,
    fontWeight: '500',
    color: c.textPrimary,
  },
  // Active patient name stays at textPrimary — selection signal lives on the
  // row's mint border + the right-side check, per the global selection
  // contrast contract (__tests__/components/selectionListContrast.test.tsx).
  patientNameActive: {
    fontWeight: '600',
  },
  patientRelation: {
    fontSize: 12,
    color: c.textMuted,
    marginTop: 2,
  },
  activeCheck: {
    fontSize: 16,
    color: c.accent,
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
    color: c.accent,
    fontWeight: '600',
  },
  addLabel: {
    fontSize: 15,
    color: c.accent,
    fontWeight: '500',
  },
  addForm: {
    marginTop: 8,
    gap: 12,
  },
  addInput: {
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: c.textPrimary,
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
    color: c.textMuted,
  },
  addButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: c.accent,
    borderRadius: 8,
  },
  addButtonDisabled: {
    opacity: 0.4,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: c.textPrimary,
  },
  profileDivider: {
    borderTopWidth: 1,
    borderTopColor: c.border,
    marginTop: 8,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 6,
  },
  profileIcon: {
    fontSize: 13,
  },
  profileLabel: {
    fontSize: 14,
    color: c.accent,
    fontWeight: '500',
  },
  profileArrow: {
    fontSize: 13,
    color: c.accent,
  },
  patientNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  exampleBadge: {
    backgroundColor: c.caregiverAccentBg,
    borderWidth: 0.5,
    borderColor: c.caregiverAccentBorder,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  exampleBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: c.caregiverAccentText,
    letterSpacing: 0.5,
  },
  sampleSection: {
    marginTop: 4,
  },
  sampleDivider: {
    borderTopWidth: 1,
    borderTopColor: c.border,
    marginTop: 8,
    marginBottom: 12,
  },
  sampleSectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: c.textTertiary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  setupSampleButton: {
    backgroundColor: c.accent,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  setupSampleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: c.textPrimary,
  },
  removeSampleButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: c.error,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  removeSampleButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: c.error,
  },
});
