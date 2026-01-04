// ============================================================================
// COFFEE MOMENT SCREEN
// A peaceful break for caregivers
// ============================================================================

import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

export default function CoffeeMoment() {
  const router = useRouter();
  
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient colors={['#1A1F1A', '#0F120F']} style={styles.gradient}>
        <View style={styles.header}>
          <Text style={styles.title}>Coffee Moment</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
            <Ionicons name="close" size={28} color="rgba(255,255,255,0.95)" />
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.scroll}>
          <Text style={styles.subtitle}>Take a moment for yourself</Text>
          
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🫁 Breathing Exercise</Text>
            <Text style={styles.sectionText}>Inhale for 4 seconds, hold for 4 seconds, exhale for 4 seconds.</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💭 Today's Affirmation</Text>
            <Text style={styles.sectionText}>You are doing an amazing job as a caregiver.</Text>
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1A1F1A' },
  gradient: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: { fontSize: 28, fontWeight: '300', color: 'rgba(255,255,255,0.95)' },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { flex: 1, paddingHorizontal: 20 },
  subtitle: { fontSize: 15, color: 'rgba(255,255,255,0.75)', marginBottom: 24 },
  section: {
    padding: 20,
    backgroundColor: 'rgba(139, 168, 136, 0.1)',
    borderRadius: 12,
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: 'rgba(255,255,255,0.95)', marginBottom: 8 },
  sectionText: { fontSize: 15, color: 'rgba(255,255,255,0.8)', lineHeight: 22 },
});
