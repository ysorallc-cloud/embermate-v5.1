// ============================================================================
// SETTINGS → PROFILE — Phase 5.8.c
//
// Surfaces both the active patient's name (patientRegistry) and the
// caregiver name (caregiverProfileRepo). Both editable. Save persists
// each via its native repo and emits the standard data-update event so
// other screens refresh.
// ============================================================================

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../contexts/ThemeContext';
import { Spacing, Sizing } from '../../theme/theme-tokens';
import { SubScreenHeader } from '../../components/SubScreenHeader';
import { getPatientRegistry } from '../../storage/patientRegistry';
import { writePatientName } from '../../utils/patientNameWriter';
import {
  getCaregiverProfile,
  saveCaregiverProfile,
} from '../../storage/caregiverProfileRepo';
import { logError } from '../../utils/devLog';
import { hapticSuccess } from '../../utils/hapticFeedback';

export default function ProfileScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [activePatientId, setActivePatientId] = useState<string | null>(null);
  const [patientName, setPatientName] = useState('');
  const [caregiverName, setCaregiverName] = useState('');
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const reg = await getPatientRegistry();
        if (cancelled) return;
        const active = reg.patients.find((p) => p.id === reg.activePatientId)
          ?? reg.patients[0];
        setActivePatientId(active?.id ?? null);
        const raw = (active?.name ?? '').trim();
        setPatientName(raw === 'Patient' ? '' : raw);
        const caregiver = await getCaregiverProfile();
        if (cancelled) return;
        setCaregiverName(caregiver?.name ?? '');
      } catch (err) {
        logError('SettingsProfile.load', err);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleSave = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    try {
      const trimmedPatient = patientName.trim();
      const trimmedCaregiver = caregiverName.trim();
      if (activePatientId && trimmedPatient.length > 0) {
        await writePatientName(activePatientId, trimmedPatient);
      }
      if (trimmedCaregiver.length > 0) {
        const shortName = trimmedCaregiver.split(/\s+/)[0];
        await saveCaregiverProfile({
          name: trimmedCaregiver,
          shortName: shortName || undefined,
        });
      }
      void hapticSuccess();
      Alert.alert('Saved', 'Profile updated.');
    } catch (err) {
      logError('SettingsProfile.save', err);
      Alert.alert('Error', 'Could not save profile.');
    } finally {
      setSaving(false);
    }
  }, [saving, activePatientId, patientName, caregiverName]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={[colors.backgroundGradientStart, colors.backgroundGradientEnd]}
        style={styles.gradient}
      >
        <SubScreenHeader title="Profile" subtitle="Names that appear on your reports." />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
          keyboardVerticalOffset={90}
        >
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.context}>
              Your reports use these names so the next caregiver or doctor knows
              who they're about and who logged the data.
            </Text>

            <Text style={styles.label}>Patient name</Text>
            <TextInput
              style={styles.input}
              value={patientName}
              onChangeText={setPatientName}
              placeholder="e.g. Margaret"
              placeholderTextColor={colors.textTertiary}
              accessibilityLabel="Patient name"
              editable={loaded}
              returnKeyType="next"
            />

            <Text style={[styles.label, { marginTop: Spacing.md }]}>Your name</Text>
            <TextInput
              style={styles.input}
              value={caregiverName}
              onChangeText={setCaregiverName}
              placeholder="e.g. Sarah"
              placeholderTextColor={colors.textTertiary}
              accessibilityLabel="Your name"
              editable={loaded}
              returnKeyType="done"
            />

            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={saving || !loaded}
              accessibilityRole="button"
              accessibilityLabel="Save profile"
              accessibilityState={{ disabled: saving || !loaded }}
            >
              <Text style={styles.saveButtonText}>{saving ? 'Saving…' : 'Save'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const createStyles = (c: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  gradient: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { padding: 20 },
  context: {
    fontSize: 13,
    color: c.textSecondary,
    lineHeight: 19,
    marginBottom: Spacing.md,
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
    marginTop: Spacing.md,
    backgroundColor: c.accent,
    borderRadius: Sizing.cardRadius,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#0a0c0a',
  },
});
