// ============================================================================
// UPGRADE PROMPT
// Modal shown when free-tier user hits a feature gate
// ============================================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../theme/theme-tokens';
import { activatePromoCode } from '../storage/subscriptionRepo';

interface UpgradePromptProps {
  visible: boolean;
  onClose: () => void;
  feature: string;
  reason?: string;
}

export default function UpgradePrompt({ visible, onClose, feature, reason }: UpgradePromptProps) {
  const [promoCode, setPromoCode] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);

  const handlePromoSubmit = async () => {
    if (!promoCode.trim()) return;
    setPromoLoading(true);
    try {
      const success = await activatePromoCode(promoCode);
      if (success) {
        Alert.alert('Welcome to Premium!', 'Your promo code has been applied.', [
          { text: 'OK', onPress: onClose },
        ]);
        setPromoCode('');
      } else {
        Alert.alert('Invalid Code', 'This promo code is not recognized. Please check and try again.');
      }
    } catch {
      Alert.alert('Error', 'Could not validate promo code. Please try again.');
    } finally {
      setPromoLoading(false);
    }
  };

  const features = [
    { label: 'Multi-patient tracking', free: 'Up to 1', premium: 'Up to 10' },
    { label: 'PDF export', free: 'Included', premium: 'Included' },
    { label: 'Advanced insights', free: 'Included', premium: 'Included' },
    { label: 'All core features', free: 'Included', premium: 'Included' },
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <LinearGradient
            colors={['#0A2622', '#051614']}
            style={styles.gradient}
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.emoji}>&#x2B50;</Text>
              <Text style={styles.title}>Upgrade to Premium</Text>
              {reason && <Text style={styles.reason}>{reason}</Text>}
            </View>

            {/* Feature comparison */}
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableCell, styles.featureLabel]}>Feature</Text>
                <Text style={[styles.tableCell, styles.tierLabel]}>Free</Text>
                <Text style={[styles.tableCell, styles.tierLabel, styles.premiumLabel]}>Premium</Text>
              </View>
              {features.map((f) => (
                <View key={f.label} style={styles.tableRow}>
                  <Text style={[styles.tableCell, styles.featureLabel]}>{f.label}</Text>
                  <Text style={[styles.tableCell, styles.tierValue]}>{f.free}</Text>
                  <Text style={[styles.tableCell, styles.tierValue, styles.premiumValue]}>{f.premium}</Text>
                </View>
              ))}
            </View>

            {/* Promo code */}
            <View style={styles.promoSection}>
              <Text style={styles.promoLabel}>Have a promo code?</Text>
              <View style={styles.promoRow}>
                <TextInput
                  style={styles.promoInput}
                  placeholder="Enter code"
                  placeholderTextColor={Colors.textMuted}
                  value={promoCode}
                  onChangeText={setPromoCode}
                  autoCapitalize="characters"
                  accessibilityLabel="Promo code"
                />
                <TouchableOpacity
                  style={[styles.promoButton, promoLoading && styles.promoButtonDisabled]}
                  onPress={handlePromoSubmit}
                  disabled={promoLoading}
                  accessibilityLabel={promoLoading ? 'Checking promo code' : 'Apply promo code'}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: promoLoading }}
                >
                  <Text style={styles.promoButtonText}>
                    {promoLoading ? '...' : 'Apply'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* IAP placeholder */}
            <View style={styles.iapPlaceholder}>
              <Text style={styles.iapText}>In-app purchase coming soon</Text>
            </View>

            {/* Close */}
            <TouchableOpacity style={styles.closeButton} onPress={onClose} accessibilityLabel="Dismiss upgrade prompt" accessibilityRole="button">
              <Text style={styles.closeButtonText}>Maybe Later</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    maxHeight: '85%',
  },
  gradient: {
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  emoji: {
    fontSize: 40,
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  reason: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  table: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  tableCell: {
    flex: 1,
    fontSize: 13,
  },
  featureLabel: {
    flex: 1.5,
    color: Colors.textSecondary,
  },
  tierLabel: {
    color: Colors.textMuted,
    fontWeight: '600',
    textAlign: 'center',
  },
  premiumLabel: {
    color: Colors.accent,
  },
  tierValue: {
    color: Colors.textTertiary,
    textAlign: 'center',
  },
  premiumValue: {
    color: Colors.accent,
  },
  promoSection: {
    marginBottom: 16,
  },
  promoLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  promoRow: {
    flexDirection: 'row',
    gap: 8,
  },
  promoInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: Colors.textPrimary,
    fontSize: 14,
  },
  promoButton: {
    backgroundColor: Colors.accent,
    borderRadius: 10,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  promoButtonDisabled: {
    opacity: 0.5,
  },
  promoButtonText: {
    color: '#051614',
    fontWeight: '600',
    fontSize: 14,
  },
  iapPlaceholder: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  iapText: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  closeButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  closeButtonText: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
});
