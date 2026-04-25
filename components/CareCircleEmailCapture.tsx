// ============================================================================
// CARE CIRCLE EMAIL CAPTURE — Bottom-sheet modal for v7 waitlist sign-up
// ============================================================================

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { safeSetItem } from '../utils/safeStorage';
import { logError, devLog } from '../utils/devLog';
import { Colors } from '../theme/theme-tokens';

// ============================================================================
// CONSTANTS
// ============================================================================

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const JOINED_KEY = 'embermate.careCircle.earlyAccessJoined';

// Read the waitlist endpoint from the Expo env. The actual URL is set in
// eas.json or .env — not hardcoded here. If absent, submissions are
// logged locally but not sent to a server.
const waitlistUrl = process.env.EXPO_PUBLIC_WAITLIST_URL || '';

if (!waitlistUrl && typeof __DEV__ !== 'undefined' && __DEV__) {
  devLog('[CareCircleEmailCapture] EXPO_PUBLIC_WAITLIST_URL is not set — submissions will be local-only.');
}

// ============================================================================
// PROPS
// ============================================================================

interface CareCircleEmailCaptureProps {
  visible: boolean;
  onClose: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function CareCircleEmailCapture({ visible, onClose }: CareCircleEmailCaptureProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const isValid = EMAIL_REGEX.test(email.trim());

  const handleSubmit = useCallback(async () => {
    if (!isValid || submitting) return;
    setSubmitting(true);
    setError('');

    try {
      if (waitlistUrl) {
        const response = await fetch(waitlistUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim(), source: 'embermate-ios' }),
        });
        if (!response.ok) {
          throw new Error(`Server returned ${response.status}`);
        }
      } else {
        // No endpoint configured — log locally for dev builds
        devLog('[CareCircleEmailCapture] Would POST:', email.trim());
      }

      await safeSetItem(JOINED_KEY, 'true');
      setSubmitted(true);
    } catch (err) {
      logError('CareCircleEmailCapture.handleSubmit', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [email, isValid, submitting]);

  const handleClose = useCallback(() => {
    setEmail('');
    setError('');
    onClose();
  }, [onClose]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Care Circle Early Access</Text>
          <TouchableOpacity
            onPress={handleClose}
            accessibilityLabel="Close"
            accessibilityRole="button"
          >
            <Text style={styles.closeText}>Done</Text>
          </TouchableOpacity>
        </View>

        {submitted ? (
          /* ── Confirmation state ── */
          <View style={styles.confirmationContainer}>
            <Text style={styles.confirmationEmoji}>✓</Text>
            <Text style={styles.confirmationTitle}>You're on the list</Text>
            <Text style={styles.confirmationBody}>
              We'll email you once when Care Circle launches. That's it — no
              marketing, no third parties.
            </Text>
            <TouchableOpacity
              style={styles.doneButton}
              onPress={handleClose}
              activeOpacity={0.7}
            >
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* ── Input state ── */
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Your email</Text>
            <TextInput
              style={styles.emailInput}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
              returnKeyType="send"
              onSubmitEditing={handleSubmit}
              accessibilityLabel="Email address"
            />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Text style={styles.privacyLine}>
              We'll email you once when Care Circle launches. No marketing, no third parties.
            </Text>

            <TouchableOpacity
              style={[styles.submitButton, !isValid && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={!isValid || submitting}
              activeOpacity={0.7}
              accessibilityLabel="Join waitlist"
              accessibilityRole="button"
              accessibilityState={{ disabled: !isValid }}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Join early access →</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const createStyles = (c: typeof Colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: c.warmSurfaceBorder,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: c.textPrimary,
  },
  closeText: {
    fontSize: 15,
    fontWeight: '500',
    color: c.accent,
  },
  inputContainer: {
    padding: 20,
    paddingTop: 24,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: c.textWarmMuted,
    marginBottom: 8,
  },
  emailInput: {
    backgroundColor: c.warmSurface,
    borderWidth: 1,
    borderColor: c.warmSurfaceBorder,
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    color: c.textPrimary,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 12,
    color: c.red,
    marginBottom: 8,
  },
  privacyLine: {
    fontSize: 11,
    color: c.textWarmDim,
    lineHeight: 16,
    marginBottom: 20,
  },
  submitButton: {
    backgroundColor: '#9f7aea',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.4,
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  confirmationContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  confirmationEmoji: {
    fontSize: 40,
    color: c.accent,
    marginBottom: 16,
  },
  confirmationTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: c.textPrimary,
    marginBottom: 8,
  },
  confirmationBody: {
    fontSize: 14,
    color: c.textWarmMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  doneButton: {
    backgroundColor: c.accent,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  doneButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0a0c0a',
  },
});
