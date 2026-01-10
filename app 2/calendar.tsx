import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function CalendarModal() {
  const router = useRouter();
  
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient colors={['#1A1F1A', '#0F120F']} style={styles.gradient}>
        <View style={styles.header}>
          <Text style={styles.title}>Calendar</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
            <Ionicons name="close" size={28} color="rgba(255,255,255,0.95)" />
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.scroll}>
          <Text style={styles.subtitle}>Calendar view coming soon</Text>
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
  subtitle: { fontSize: 15, color: 'rgba(255,255,255,0.75)' },
});
