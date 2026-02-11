import React from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, Pressable } from 'react-native';
import { GlassCard } from '../../../components/aurora/GlassCard';
import { Colors, Typography, Spacing, BorderRadius } from '../../../theme/theme-tokens';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export const DisclaimerModal: React.FC<Props> = ({ visible, onClose }) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <GlassCard style={styles.card}>
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
              <Text style={styles.title}>HIPAA Non-Compliance Disclaimer</Text>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>1. Not HIPAA Compliant</Text>
                <Text style={styles.sectionText}>
                  EmberMate is NOT a HIPAA-compliant service. We do not guarantee the security
                  or privacy of Protected Health Information (PHI) as defined by HIPAA regulations.
                </Text>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>2. Not for Medical Use</Text>
                <Text style={styles.sectionText}>
                  This app is for personal tracking and informational purposes only. It is NOT
                  intended to diagnose, treat, cure, or prevent any disease. Always consult
                  qualified healthcare professionals for medical advice.
                </Text>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>3. Data Security</Text>
                <Text style={styles.sectionText}>
                  While we implement reasonable security measures, we cannot guarantee absolute
                  security. By using EmberMate, you acknowledge the risk of storing health
                  information in a non-HIPAA-compliant system.
                </Text>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>4. Your Responsibility</Text>
                <Text style={styles.sectionText}>
                  You are solely responsible for deciding what information to enter. Do not input
                  data you consider highly sensitive or that you need protected under HIPAA. We
                  recommend consulting with your healthcare provider about appropriate tracking methods.
                </Text>
              </View>

              <View style={styles.warningBox}>
                <Text style={styles.warningText}>
                  ⚠️ By using EmberMate, you explicitly acknowledge and accept these limitations.
                </Text>
              </View>

              <Pressable
                style={styles.closeButton}
                onPress={onClose}
                accessibilityLabel="Close disclaimer"
                accessibilityRole="button"
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </Pressable>
            </ScrollView>
          </GlassCard>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xxl,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
  },
  card: {
    maxHeight: '100%',
  },
  scrollView: {
    maxHeight: '100%',
  },
  title: {
    ...Typography.h2,
    color: Colors.textPrimary,
    marginBottom: Spacing.xl,
    textAlign: 'center',
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    ...Typography.h3,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  sectionText: {
    ...Typography.body,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  warningBox: {
    backgroundColor: 'rgba(255, 200, 100, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 200, 100, 0.3)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  warningText: {
    ...Typography.body,
    color: 'rgba(255, 220, 150, 1)',
    textAlign: 'center',
    fontWeight: '600',
  },
  closeButton: {
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  closeButtonText: {
    ...Typography.label,
    color: Colors.textPrimary,
  },
});

export default DisclaimerModal;
