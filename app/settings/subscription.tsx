// ============================================================================
// SUBSCRIPTION SETTINGS SCREEN
// Current tier, feature comparison, promo code entry
// ============================================================================

import React, { useState } from 'react';
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
import { Colors } from '../../theme/theme-tokens';
import { CommonStyles } from '../../theme/commonStyles';
import PageHeader from '../../components/PageHeader';
import { useSubscription } from '../../hooks/useSubscription';
import { TIER_LIMITS } from '../../types/subscription';

export default function SubscriptionScreen() {
  const router = useRouter();
  const { tier, isPremium, loading, activatePromo } = useSubscription();
  const [promoCode, setPromoCode] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);

  const handlePromoSubmit = async () => {
    if (!promoCode.trim()) return;
    setPromoLoading(true);
    try {
      const success = await activatePromo(promoCode);
      if (success) {
        Alert.alert('Welcome to Premium!', 'Your promo code has been applied.');
        setPromoCode('');
      } else {
        Alert.alert('Invalid Code', 'This promo code is not recognized.');
      }
    } catch {
      Alert.alert('Error', 'Could not validate promo code.');
    } finally {
      setPromoLoading(false);
    }
  };

  const features = [
    { label: 'Multi-patient tracking', free: '1 patient', premium: 'Up to 10' },
    { label: 'Medication management', free: 'Unlimited', premium: 'Unlimited' },
    { label: 'Care Plan & daily schedule', free: 'Included', premium: 'Included' },
    { label: 'PDF care summaries', free: 'Included', premium: 'Included' },
    { label: 'Advanced insights', free: 'Included', premium: 'Included' },
    { label: 'Notifications & reminders', free: 'Included', premium: 'Included' },
    { label: 'Data encryption', free: 'AES-256', premium: 'AES-256' },
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
            emoji="&#x2B50;"
            label="Account"
            title="Subscription"
          />
        </View>

        <ScrollView style={styles.content}>
          {/* Current Tier Banner */}
          <View style={[styles.tierBanner, isPremium && styles.tierBannerPremium]}>
            <Text style={styles.tierEmoji}>{isPremium ? '\u2B50' : '\u2728'}</Text>
            <View style={styles.tierInfo}>
              <Text style={styles.tierName}>
                {isPremium ? 'EmberMate Premium' : 'EmberMate Free'}
              </Text>
              <Text style={styles.tierDescription}>
                {isPremium
                  ? 'All features unlocked'
                  : 'Core features included'}
              </Text>
            </View>
          </View>

          {/* Feature Comparison */}
          <Text style={styles.sectionTitle}>Feature Comparison</Text>
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

          {/* Promo Code */}
          {!isPremium && (
            <>
              <Text style={styles.sectionTitle}>Promo Code</Text>
              <View style={styles.promoContainer}>
                <TextInput
                  style={styles.promoInput}
                  placeholder="Enter promo code"
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
                    {promoLoading ? 'Checking...' : 'Apply Code'}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* IAP Placeholder */}
          {!isPremium && (
            <View style={styles.iapSection}>
              <Text style={styles.iapTitle}>In-App Purchase</Text>
              <Text style={styles.iapDescription}>
                Premium subscriptions via the App Store and Google Play are coming in a future update.
              </Text>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </LinearGradient>
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
  tierBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    gap: 12,
  },
  tierBannerPremium: {
    borderColor: 'rgba(20, 184, 166, 0.25)',
    backgroundColor: 'rgba(20, 184, 166, 0.05)',
  },
  tierEmoji: {
    fontSize: 32,
  },
  tierInfo: {
    flex: 1,
  },
  tierName: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  tierDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  table: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
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
  promoContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
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
  iapSection: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  iapTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  iapDescription: {
    fontSize: 13,
    color: Colors.textTertiary,
    lineHeight: 18,
  },
});
