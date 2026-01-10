// ============================================================================
// INSIGHTS TAB - Enhanced Design
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Spacing } from '../_theme/theme-tokens';
import PageHeader from '../../components/PageHeader';

type TimeRange = '7days' | '30days' | '3months';

export default function InsightsScreen() {
  const router = useRouter();
  const [timeRange, setTimeRange] = useState<TimeRange>('7days');
  const [refreshing, setRefreshing] = useState(false);
  const [showSampleData, setShowSampleData] = useState(false);

  useFocusEffect(useCallback(() => {
    // Check if user declined sample data
    const checkSampleDataStatus = async () => {
      try {
        const userDeclined = await AsyncStorage.getItem('@embermate_user_declined_sample_data');
        const hasData = await AsyncStorage.getItem('@embermate_demo_data_seeded');
        // Only show sample data if user didn't decline AND data was actually seeded
        setShowSampleData(userDeclined !== 'true' && hasData === 'true');
      } catch (error) {
        console.error('Error checking sample data status:', error);
        setShowSampleData(false);
      }
    };
    checkSampleDataStatus();
  }, [timeRange]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // Reload data
    setRefreshing(false);
  }, []);

  // Sample data - only shown if user has sample data enabled
  const adherencePercent = showSampleData ? 85 : 0;
  const chartData = showSampleData ? [70, 85, 80, 95, 75, 100, 90] : [];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={[Colors.backgroundGradientStart, Colors.backgroundGradientEnd]}
        style={styles.gradient}
      >
        {/* Header with Minimalist Line Art */}
        <PageHeader 
          emoji="🪷"
          label="Patterns & Trends"
          title="Insights"
        />
        
        {/* Time Range Selector */}
        <View style={styles.timeRangeWrapper}>
          <View style={styles.timeRange}>
            <TouchableOpacity
              style={[styles.rangeBtn, timeRange === '7days' && styles.rangeBtnActive]}
              onPress={() => setTimeRange('7days')}
            >
              <Text style={[styles.rangeBtnText, timeRange === '7days' && styles.rangeBtnTextActive]}>
                7 days
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.rangeBtn, timeRange === '30days' && styles.rangeBtnActive]}
              onPress={() => setTimeRange('30days')}
            >
              <Text style={[styles.rangeBtnText, timeRange === '30days' && styles.rangeBtnTextActive]}>
                30 days
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.rangeBtn, timeRange === '3months' && styles.rangeBtnActive]}
              onPress={() => setTimeRange('3months')}
            >
              <Text style={[styles.rangeBtnText, timeRange === '3months' && styles.rangeBtnTextActive]}>
                3 months
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          style={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />
          }
        >
          {showSampleData ? (
            <>
              {/* Hero Adherence Card */}
              <View style={styles.adherenceHero}>
                <View style={styles.adherenceStat}>
                  <Text style={styles.adherenceValue}>{adherencePercent}%</Text>
                  <Text style={styles.adherenceLabel}>medication adherence</Text>
                </View>
                
                {/* Mini Chart */}
                <View style={styles.chartMini}>
                  {chartData.map((height, index) => (
                    <View 
                      key={index} 
                      style={[styles.chartBar, { height: `${height}%` }]} 
                    />
                  ))}
                </View>
              </View>

              {/* Pattern Detection Banner */}
              <TouchableOpacity 
                style={styles.insightBanner}
                onPress={() => router.push('/correlation-report')}
              >
                <View style={styles.insightHeader}>
                  <Text style={styles.insightIcon}>💡</Text>
                  <Text style={styles.insightTitle}>Pattern Detected</Text>
                </View>
                <Text style={styles.insightText}>
                  Evening headaches occur 2-3 hours after Metformin. Morning meds have 95% adherence vs 78% evening.
                </Text>
              </TouchableOpacity>

              {/* Vitals History Section */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Vitals History</Text>
                  <TouchableOpacity onPress={() => router.push('/vitals')}>
                    <Text style={styles.viewAll}>View all →</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.historyCard}>
                  <TouchableOpacity 
                    style={styles.historyRow}
                    onPress={() => router.push('/vitals?type=blood-pressure')}
                  >
                    <View style={styles.historyLeft}>
                      <Text style={styles.historyIcon}>💗</Text>
                      <View>
                        <Text style={styles.historyName}>Blood Pressure</Text>
                        <Text style={styles.historyDetail}>120/80 - Today at 8:00 AM</Text>
                      </View>
                    </View>
                    <Text style={styles.historyArrow}>→</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.historyRow}
                    onPress={() => router.push('/vitals?type=temperature')}
                  >
                    <View style={styles.historyLeft}>
                      <Text style={styles.historyIcon}>🌡️</Text>
                      <View>
                        <Text style={styles.historyName}>Temperature</Text>
                        <Text style={styles.historyDetail}>98.6°F - Yesterday</Text>
                      </View>
                    </View>
                    <Text style={styles.historyArrow}>→</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.historyRow}
                    onPress={() => router.push('/vitals?type=weight')}
                  >
                    <View style={styles.historyLeft}>
                      <Text style={styles.historyIcon}>⚖️</Text>
                      <View>
                        <Text style={styles.historyName}>Weight</Text>
                        <Text style={styles.historyDetail}>165 lbs - 2 days ago</Text>
                      </View>
                    </View>
                    <Text style={styles.historyArrow}>→</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Symptoms Log Section */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Symptoms Log</Text>
                  <TouchableOpacity onPress={() => router.push('/symptoms')}>
                    <Text style={styles.viewAll}>View all →</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.historyCard}>
                  <TouchableOpacity 
                    style={styles.historyRow}
                    onPress={() => router.push('/symptoms')}
                  >
                    <View style={styles.historyLeft}>
                      <Text style={styles.historyIcon}>🤕</Text>
                      <View>
                        <Text style={styles.historyName}>Headache</Text>
                        <Text style={styles.historyDetail}>Mild - Yesterday at 3:00 PM</Text>
                      </View>
                    </View>
                    <Text style={styles.historyArrow}>→</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.historyRow}
                    onPress={() => router.push('/symptoms')}
                  >
                    <View style={styles.historyLeft}>
                      <Text style={styles.historyIcon}>😴</Text>
                      <View>
                        <Text style={styles.historyName}>Fatigue</Text>
                        <Text style={styles.historyDetail}>Moderate - 3 days ago</Text>
                      </View>
                    </View>
                    <Text style={styles.historyArrow}>→</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Medication Trends Section */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Medication Trends</Text>
                  <TouchableOpacity onPress={() => router.push('/medications')}>
                    <Text style={styles.viewAll}>View all →</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.historyCard}>
                  <TouchableOpacity 
                    style={styles.historyRow}
                    onPress={() => router.push('/medications')}
                  >
                    <View style={styles.historyLeft}>
                      <Text style={styles.historyIcon}>💊</Text>
                      <View>
                        <Text style={styles.historyName}>Lisinopril</Text>
                        <Text style={styles.historyDetail}>95% adherence this week</Text>
                      </View>
                    </View>
                    <Text style={styles.historyArrow}>→</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.historyRow}
                    onPress={() => router.push('/medications')}
                  >
                    <View style={styles.historyLeft}>
                      <Text style={styles.historyIcon}>💊</Text>
                      <View>
                        <Text style={styles.historyName}>Metformin</Text>
                        <Text style={styles.historyDetail}>78% adherence this week</Text>
                      </View>
                    </View>
                    <Text style={styles.historyArrow}>→</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🪷</Text>
              <Text style={styles.emptyTitle}>No Data Yet</Text>
              <Text style={styles.emptyText}>
                Start tracking medications, vitals, and symptoms to see insights and patterns here.
              </Text>
            </View>
          )}
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
  
  // TIME RANGE WRAPPER
  timeRangeWrapper: {
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  
  // TIME RANGE
  timeRange: {
    flexDirection: 'row',
    gap: 8,
  },
  rangeBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.borderMedium,
    borderRadius: 8,
  },
  rangeBtnActive: {
    backgroundColor: Colors.accentLight,
    borderColor: Colors.accentBorder,
  },
  rangeBtnText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textTertiary,
    textAlign: 'center',
  },
  rangeBtnTextActive: {
    color: Colors.accent,
  },
  
  // CONTENT
  content: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 28,
  },
  
  // ADHERENCE HERO
  adherenceHero: {
    backgroundColor: Colors.accentLight,
    borderWidth: 1,
    borderColor: Colors.accentBorder,
    borderRadius: 16,
    padding: 32,
    marginBottom: 24,
  },
  adherenceStat: {
    alignItems: 'center',
    marginBottom: 24,
  },
  adherenceValue: {
    fontSize: 56,
    fontWeight: '200',
    color: Colors.accent,
    lineHeight: 56,
    marginBottom: 8,
  },
  adherenceLabel: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  
  // MINI CHART
  chartMini: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    height: 60,
    paddingHorizontal: 16,
  },
  chartBar: {
    flex: 1,
    backgroundColor: Colors.success,
    opacity: 0.6,
    borderRadius: 3,
  },
  
  // INSIGHT BANNER
  insightBanner: {
    backgroundColor: 'rgba(74, 222, 128, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.3)',
    borderRadius: 12,
    padding: 18,
    marginBottom: 24,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  insightIcon: {
    fontSize: 20,
  },
  insightTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.success,
  },
  insightText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  
  // SECTIONS
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  viewAll: {
    fontSize: 14,
    color: Colors.textTertiary,
  },
  
  // HISTORY CARDS
  historyCard: {
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    overflow: 'hidden',
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(232, 155, 95, 0.08)',
  },
  historyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  historyIcon: {
    fontSize: 22,
  },
  historyName: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  historyDetail: {
    fontSize: 14,
    color: Colors.textTertiary,
  },
  historyArrow: {
    fontSize: 16,
    color: Colors.textMuted,
  },
  
  // EMPTY STATE
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 20,
    opacity: 0.5,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: Colors.textTertiary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
