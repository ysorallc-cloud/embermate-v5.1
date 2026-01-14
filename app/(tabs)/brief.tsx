// ============================================================================
// CARE HUB - Simplified Overview
// Quick access to key metrics and navigation
// ============================================================================

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Spacing } from '../_theme/theme-tokens';
import { Platform } from 'react-native';
import { getMedications } from '../../utils/medicationStorage';

export default function CareHubScreen() {
  const router = useRouter();
  const [medications, setMedications] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(useCallback(() => {
    loadData();
  }, []));

  const loadData = async () => {
    try {
      const meds = await getMedications();
      setMedications(meds.filter(m => m.active));
    } catch (e) {
      console.error('Error loading data:', e);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  const completedCount = medications.filter(m => m?.taken).length;
  const totalCount = medications.length;
  const adherencePercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 100;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <LinearGradient
        colors={[Colors.backgroundGradientStart, Colors.backgroundGradientEnd]}
        style={styles.gradient}
      >
        {/* Tinted Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Care Hub 🌱</Text>
            <Text style={styles.dateSubtitle}>This Week • {adherencePercent}% adherence</Text>
          </View>
          <TouchableOpacity style={styles.coffeeButton} onPress={() => router.push('/coffee')}>
            <Text style={styles.coffeeIcon}>☕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.accent}
            />
          }
        >

          {/* Summary Card */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{adherencePercent}%</Text>
            <Text style={styles.summaryLabel}>medication adherence</Text>

            <View style={styles.summaryStats}>
              <View style={styles.summaryStatItem}>
                <Text style={styles.summaryStatValue}>7</Text>
                <Text style={styles.summaryStatLabel}>streak</Text>
              </View>

              <View style={styles.summaryStatDivider} />

              <View style={styles.summaryStatItem}>
                <Text style={styles.summaryStatValue}>↑23%</Text>
                <Text style={styles.summaryStatLabel}>trend</Text>
              </View>

              <View style={styles.summaryStatDivider} />

              <View style={styles.summaryStatItem}>
                <Text style={styles.summaryStatValue}>😊</Text>
                <Text style={styles.summaryStatLabel}>mood</Text>
              </View>
            </View>
          </View>

          {/* Single Insight Card */}
          <TouchableOpacity style={styles.insightCard}>
            <Text style={styles.insightIcon}>💡</Text>
            <Text style={styles.insightText}>Saturday mornings often missed — add a 9am reminder?</Text>
            <TouchableOpacity style={styles.insightButton}>
              <Text style={styles.insightButtonText}>Add</Text>
            </TouchableOpacity>
          </TouchableOpacity>

          {/* Quick Links Grid */}
          <View style={styles.quickLinks}>
            <TouchableOpacity
              style={styles.quickLinkButton}
              onPress={() => router.push('/medications')}
            >
              <Text style={styles.quickLinkIcon}>💊</Text>
              <Text style={styles.quickLinkText}>Meds</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickLinkButton}
              onPress={() => router.push('/appointments')}
            >
              <Text style={styles.quickLinkIcon}>📅</Text>
              <Text style={styles.quickLinkText}>Appts</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickLinkButton}
              onPress={() => router.push('/vitals-log')}
            >
              <Text style={styles.quickLinkIcon}>❤️</Text>
              <Text style={styles.quickLinkText}>Vitals</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickLinkButton}
              onPress={() => router.push('/care-summary-export')}
            >
              <Text style={styles.quickLinkIcon}>📊</Text>
              <Text style={styles.quickLinkText}>Report</Text>
            </TouchableOpacity>
          </View>

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
    paddingTop: 20,
  },

  // Tinted Header
  header: {
    backgroundColor: 'rgba(139, 168, 136, 0.03)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(139, 168, 136, 0.15)',
    paddingTop: 56,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greeting: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 24,
    color: Colors.textPrimary,
  },
  dateSubtitle: {
    fontSize: 14,
    color: Colors.textMuted,
    marginTop: 6,
  },
  coffeeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(139, 90, 43, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(139, 90, 43, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coffeeIcon: {
    fontSize: 22,
  },

  // Summary Card
  summaryCard: {
    backgroundColor: '#0f1f1a',
    borderWidth: 1,
    borderColor: 'rgba(139, 168, 136, 0.2)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 48,
    fontWeight: '600',
    color: '#34d399',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 24,
  },
  summaryStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  summaryStatItem: {
    alignItems: 'center',
  },
  summaryStatValue: {
    fontSize: 20,
    fontWeight: '500',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  summaryStatLabel: {
    fontSize: 11,
    color: Colors.textTertiary,
  },
  summaryStatDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(139, 168, 136, 0.15)',
  },

  // Insight Card
  insightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)',
  },
  insightIcon: {
    fontSize: 20,
  },
  insightText: {
    flex: 1,
    fontSize: 13,
    color: '#e8f0e8',
    lineHeight: 18,
  },
  insightButton: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: '#fbbf24',
  },
  insightButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000',
  },

  // Quick Links Grid
  quickLinks: {
    flexDirection: 'row',
    gap: 10,
  },
  quickLinkButton: {
    flex: 1,
    backgroundColor: '#0f1f1a',
    borderWidth: 1,
    borderColor: 'rgba(139, 168, 136, 0.2)',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    gap: 6,
  },
  quickLinkIcon: {
    fontSize: 24,
  },
  quickLinkText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
});
