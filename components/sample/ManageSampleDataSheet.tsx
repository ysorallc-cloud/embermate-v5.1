// ============================================================================
// MANAGE SAMPLE DATA SHEET
//
// Bottom sheet that owns the two transitions out of sample mode:
//   1. Set up my loved one — collects a real name, clears example data,
//      writes the new patient profile, emits SAMPLE_DATA_CLEARED + PATIENT.
//   2. Remove example data — destructive confirm flow that wipes example
//      records and leaves an empty profile.
//
// Mounted from now.tsx (banner pill or PatientSwitcherModal hand-off) and
// from settings/index.tsx (Manage example data row).
// ============================================================================

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Modal,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { clearSampleData } from '../../utils/sampleDataManager';
import { writePatientName } from '../../utils/patientNameWriter';
import { emitDataUpdate } from '../../lib/events';
import { EVENT } from '../../lib/eventNames';
import { logError } from '../../utils/devLog';

import { Spacing } from '../../theme/theme-tokens';
export type ManageSampleFocus = 'setup' | 'remove';

export interface ManageSampleDataSheetProps {
  visible: boolean;
  onClose: () => void;
  focusOn?: ManageSampleFocus;
  /** Optional active patient name for the Remove confirmation copy. */
  activePatientName?: string;
}

type Mode = 'menu' | 'setup' | 'remove' | 'success';

export function ManageSampleDataSheet({
  visible,
  onClose,
  focusOn,
  activePatientName,
}: ManageSampleDataSheetProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const initialMode: Mode = focusOn === 'setup' ? 'setup' : focusOn === 'remove' ? 'remove' : 'menu';
  const [mode, setMode] = useState<Mode>(initialMode);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Re-sync mode when the sheet is re-opened with a different focus.
  useEffect(() => {
    if (visible) {
      setMode(focusOn === 'setup' ? 'setup' : focusOn === 'remove' ? 'remove' : 'menu');
      setName('');
    }
  }, [visible, focusOn]);

  const handleSetUp = useCallback(async () => {
    const trimmed = name.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    try {
      await clearSampleData();
      // Phase 5.13.1.b — patient name now flows through the canonical
      // writer (registry + AsyncStorage mirror + EVENT.PATIENT). The
      // sample-cleared emit stays separate.
      await writePatientName('default', trimmed);
      emitDataUpdate(EVENT.SAMPLE_DATA_CLEARED);
      setSuccessMessage(`Welcome — ${trimmed}'s profile is ready.`);
      setMode('success');
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      logError('ManageSampleDataSheet.handleSetUp', error);
    } finally {
      setBusy(false);
    }
  }, [name, busy, onClose]);

  const handleRemove = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      await clearSampleData();
      emitDataUpdate(EVENT.SAMPLE_DATA_CLEARED);
      setSuccessMessage('Example data removed.');
      setMode('success');
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      logError('ManageSampleDataSheet.handleRemove', error);
    } finally {
      setBusy(false);
    }
  }, [busy, onClose]);

  const renderMenu = () => (
    <>
      <Text style={styles.glyph}>{'✦'}</Text>
      <Text style={styles.title}>{'Example data'}</Text>
      <Text style={styles.body}>
        {'You’re exploring with a sample profile. When you’re ready, set up your own — or remove the example.'}
      </Text>

      <TouchableOpacity
        style={styles.primaryCard}
        onPress={() => setMode('setup')}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Set up my loved one"
      >
        <Text style={styles.primaryCardTitle}>{'Set up my loved one'}</Text>
        <Text style={styles.primaryCardSubtitle}>
          {'Add a real name and start fresh — example records will be cleared.'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryCard}
        onPress={() => setMode('remove')}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Remove example data"
      >
        <Text style={styles.secondaryCardTitle}>{'Remove example data'}</Text>
        <Text style={styles.secondaryCardSubtitle}>
          {'Wipe the demo and leave an empty profile.'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.tertiaryLink}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Keep exploring with example data"
      >
        <Text style={styles.tertiaryText}>{'Keep exploring'}</Text>
      </TouchableOpacity>
    </>
  );

  const renderSetup = () => (
    <>
      <Text style={styles.glyph}>{'✦'}</Text>
      <Text style={styles.title}>{'Set up your profile'}</Text>
      <Text style={styles.body}>
        {'Just a name to get started — example data will be cleared.'}
      </Text>

      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder={'e.g. Mom, Dad, Linda'}
        placeholderTextColor={colors.textPlaceholder}
        autoCapitalize="words"
        autoFocus
        returnKeyType="done"
        onSubmitEditing={handleSetUp}
        accessibilityLabel="New patient name"
      />

      <TouchableOpacity
        style={[styles.primaryButton, (!name.trim() || busy) && styles.primaryButtonDisabled]}
        onPress={handleSetUp}
        disabled={!name.trim() || busy}
        accessibilityRole="button"
        accessibilityLabel="Set up profile"
        accessibilityState={{ disabled: !name.trim() || busy }}
      >
        <Text style={styles.primaryButtonText}>{busy ? 'Setting up…' : 'Set up'}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.tertiaryLink}
        onPress={focusOn === 'setup' ? onClose : () => setMode('menu')}
        accessibilityRole="button"
        accessibilityLabel={focusOn === 'setup' ? 'Cancel' : 'Back'}
      >
        <Text style={styles.tertiaryText}>{focusOn === 'setup' ? 'Cancel' : 'Back'}</Text>
      </TouchableOpacity>
    </>
  );

  const renderRemove = () => {
    const target = activePatientName?.trim() || 'the';
    return (
      <>
        <Text style={[styles.glyph, styles.glyphDanger]}>{'⚠'}</Text>
        <Text style={styles.title}>{`Remove ${target}${target === 'the' ? ' example data?' : "’s example data?"}`}</Text>
        <Text style={styles.body}>
          {'This will permanently delete the example records. Your real data stays intact.'}
        </Text>

        <TouchableOpacity
          style={[styles.dangerButton, busy && styles.primaryButtonDisabled]}
          onPress={handleRemove}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel="Confirm — remove example data"
          accessibilityState={{ disabled: busy }}
        >
          <Text style={styles.dangerButtonText}>{busy ? 'Removing…' : 'Confirm'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tertiaryLink}
          onPress={focusOn === 'remove' ? onClose : () => setMode('menu')}
          accessibilityRole="button"
          accessibilityLabel="Cancel"
        >
          <Text style={styles.tertiaryText}>{'Cancel'}</Text>
        </TouchableOpacity>
      </>
    );
  };

  const renderSuccess = () => (
    <>
      <Text style={styles.glyph}>{'✓'}</Text>
      <Text style={styles.title}>{'Done.'}</Text>
      <Text style={styles.body}>{successMessage}</Text>
    </>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.select({ ios: 'padding', android: undefined })}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <TouchableOpacity
            activeOpacity={1}
            style={styles.sheet}
            accessibilityRole="none"
            accessibilityLabel="Manage example data"
          >
            <View style={styles.handle} />
            {mode === 'menu' && renderMenu()}
            {mode === 'setup' && renderSetup()}
            {mode === 'remove' && renderRemove()}
            {mode === 'success' && renderSuccess()}
          </TouchableOpacity>
        </TouchableOpacity>
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
    marginBottom: Spacing.md,
  },
  glyph: {
    fontSize: 28,
    color: c.caregiverAccent,
    textAlign: 'center',
    marginBottom: 8,
  },
  glyphDanger: {
    color: c.error,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: c.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  body: {
    fontSize: 14,
    color: c.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  primaryCard: {
    backgroundColor: c.accent,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
  },
  primaryCardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: c.textPrimary,
    marginBottom: 4,
  },
  primaryCardSubtitle: {
    fontSize: 13,
    color: c.textPrimary,
    opacity: 0.85,
    lineHeight: 18,
  },
  secondaryCard: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: c.error,
    borderRadius: 12,
    padding: 16,
    marginBottom: Spacing.md,
  },
  secondaryCardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: c.error,
    marginBottom: 4,
  },
  secondaryCardSubtitle: {
    fontSize: 13,
    color: c.textSecondary,
    lineHeight: 18,
  },
  tertiaryLink: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  tertiaryText: {
    fontSize: 13,
    color: c.textTertiary,
  },
  input: {
    backgroundColor: c.glass,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    color: c.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: c.accent,
    borderRadius: 10,
    paddingVertical: 14, // allow: tap-target padding (Apple HIG ≥44pt)
    alignItems: 'center',
    marginBottom: 4,
  },
  primaryButtonDisabled: {
    opacity: 0.4,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: c.textPrimary,
  },
  dangerButton: {
    backgroundColor: c.error,
    borderRadius: 10,
    paddingVertical: 14, // allow: tap-target padding (Apple HIG ≥44pt)
    alignItems: 'center',
    marginBottom: 4,
  },
  dangerButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: c.textPrimary,
  },
});

export default ManageSampleDataSheet;
