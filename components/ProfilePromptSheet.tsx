// ============================================================================
// PROFILE PROMPT SHEET — Phase 5.8.c
//
// Surfaces when a report (handoff or visit-prep) would be generated
// without complete profile. Two text inputs:
//   • Patient's name → patientRegistry.updatePatient(activeId, { name })
//   • Your name      → caregiverProfileRepo.saveCaregiverProfile({ name })
//
// Pre-populates from existing values when available — partial profiles
// only require the missing piece. Save fires onSaved(); the report
// generator re-runs the precondition check and proceeds.
// ============================================================================

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { Spacing, Sizing } from '../theme/theme-tokens';
import {
  getPatientRegistry,
  updatePatient,
} from '../storage/patientRegistry';
import {
  getCaregiverProfile,
  saveCaregiverProfile,
} from '../storage/caregiverProfileRepo';
import { logError } from '../utils/devLog';

export type ProfilePromptField = 'patient' | 'caregiver';

export interface ProfilePromptSheetProps {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
  missing: ProfilePromptField[];
}

const PATIENT_PLACEHOLDER_NAMES = new Set(['patient']);

export function ProfilePromptSheet({
  visible,
  onClose,
  onSaved,
  missing,
}: ProfilePromptSheetProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [patientName, setPatientName] = useState('');
  const [caregiverName, setCaregiverName] = useState('');
  const [activePatientId, setActivePatientId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Pre-populate any existing values when the sheet opens.
  useEffect(() => {
    let cancelled = false;
    if (!visible) return;
    (async () => {
      try {
        const reg = await getPatientRegistry();
        const active = reg.patients.find((p) => p.id === reg.activePatientId)
          ?? reg.patients[0];
        if (cancelled) return;
        setActivePatientId(active?.id ?? null);
        const raw = (active?.name ?? '').trim();
        const isPlaceholder =
          raw.length === 0 || PATIENT_PLACEHOLDER_NAMES.has(raw.toLowerCase());
        setPatientName(isPlaceholder ? '' : raw);
        const caregiver = await getCaregiverProfile();
        if (cancelled) return;
        setCaregiverName(caregiver?.name ?? '');
      } catch (err) {
        logError('ProfilePromptSheet.load', err);
      }
    })();
    return () => { cancelled = true; };
  }, [visible]);

  const handleSave = useCallback(async () => {
    if (saving) return;
    const trimmedPatient = patientName.trim();
    const trimmedCaregiver = caregiverName.trim();
    // Only save the field(s) the user filled in. The caller's `missing`
    // tells us which fields are gating; we don't overwrite valid ones.
    setSaving(true);
    try {
      if (activePatientId && trimmedPatient.length > 0) {
        await updatePatient(activePatientId, { name: trimmedPatient });
      }
      if (trimmedCaregiver.length > 0) {
        const shortName = trimmedCaregiver.split(/\s+/)[0];
        await saveCaregiverProfile({
          name: trimmedCaregiver,
          shortName: shortName || undefined,
        });
      }
      onSaved();
    } catch (err) {
      logError('ProfilePromptSheet.save', err);
    } finally {
      setSaving(false);
    }
  }, [saving, activePatientId, patientName, caregiverName, onSaved]);

  const showPatient = missing.includes('patient');
  const showCaregiver = missing.includes('caregiver');
  const canSave =
    (!showPatient || patientName.trim().length > 0) &&
    (!showCaregiver || caregiverName.trim().length > 0);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close profile prompt"
        />
        <View
          style={styles.sheet}
          accessibilityRole="none"
          accessibilityLabel="Profile prompt"
        >
          <View style={styles.handle} />
          <Text style={styles.title}>{'A few details first'}</Text>
          <Text style={styles.subtitle}>
            {"We use these to label the report so the next caregiver or doctor knows who it's about."}
          </Text>

          {showPatient && (
            <View style={styles.field}>
              <Text style={styles.label}>{"Mom's name?"}</Text>
              <TextInput
                style={styles.input}
                value={patientName}
                onChangeText={setPatientName}
                placeholder="e.g. Margaret"
                placeholderTextColor={colors.textTertiary}
                accessibilityLabel="Patient's name"
                returnKeyType="next"
              />
            </View>
          )}

          {showCaregiver && (
            <View style={styles.field}>
              <Text style={styles.label}>{'Your name?'}</Text>
              <TextInput
                style={styles.input}
                value={caregiverName}
                onChangeText={setCaregiverName}
                placeholder="e.g. Sarah"
                placeholderTextColor={colors.textTertiary}
                accessibilityLabel="Your name"
                returnKeyType="done"
                onSubmitEditing={canSave ? handleSave : undefined}
              />
            </View>
          )}

          <TouchableOpacity
            style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={!canSave || saving}
            accessibilityRole="button"
            accessibilityLabel="Save profile"
            accessibilityState={{ disabled: !canSave || saving }}
          >
            <Text style={styles.saveButtonText}>{saving ? 'Saving…' : 'Save'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelLink}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Not now"
          >
            <Text style={styles.cancelText}>{'Not now'}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const createStyles = (c: any) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: c.overlay,
    justifyContent: 'flex-end',
  },
  backdrop: { flex: 1 },
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
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: c.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: c.textSecondary,
    lineHeight: 18,
    marginBottom: Spacing.md,
  },
  field: {
    marginBottom: Spacing.sm,
  },
  label: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: c.textSecondary,
    letterSpacing: 0.3,
    marginBottom: 6,
  },
  input: {
    fontSize: 15,
    color: c.textPrimary,
    backgroundColor: c.glass,
    borderWidth: 0.5,
    borderColor: c.glassBorder,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  saveButton: {
    marginTop: Spacing.sm,
    backgroundColor: c.accent,
    borderRadius: Sizing.cardRadius,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#0a0c0a',
  },
  cancelLink: {
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 13,
    color: c.textTertiary,
  },
});

export default ProfilePromptSheet;
