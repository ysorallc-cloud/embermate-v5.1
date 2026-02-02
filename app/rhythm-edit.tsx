import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { AuroraBackground } from '../components/aurora/AuroraBackground';
import { Colors } from '../theme/theme-tokens';
import { getRhythm, updateRhythm, Rhythm } from '../utils/rhythmStorage';

export default function RhythmEditScreen() {
  const router = useRouter();
  const [rhythm, setRhythm] = useState<Rhythm | null>(null);
  const [medications, setMedications] = useState('0');
  const [vitals, setVitals] = useState('0');
  const [meals, setMeals] = useState('0');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRhythm();
  }, []);

  const loadRhythm = async () => {
    const rhythmData = await getRhythm();
    if (rhythmData) {
      setRhythm(rhythmData);
      setMedications(rhythmData.medications.toString());
      setVitals(rhythmData.vitals.toString());
      setMeals(rhythmData.meals.toString());
    }
    setLoading(false);
  };

  const handleSave = async () => {
    try {
      await updateRhythm({
        medications: parseInt(medications) || 0,
        vitals: parseInt(vitals) || 0,
        meals: parseInt(meals) || 0,
      });
      router.back();
    } catch (error) {
      console.error('Error saving rhythm:', error);
    }
  };

  return (
    <View style={styles.container}>
      <AuroraBackground variant="log" />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header with back button */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Daily Rhythm</Text>
          <Text style={styles.subtitle}>Adjust your expected daily pattern</Text>
        </View>

        <Text style={styles.description}>
          These numbers help us understand your typical day. They're not goals or requirements - just observations we use to provide context.
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💊 Medications</Text>
          <Text style={styles.label}>How many doses per day?</Text>
          <TextInput
            style={styles.input}
            value={medications}
            onChangeText={setMedications}
            keyboardType="number-pad"
            placeholderTextColor={Colors.textSecondary}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Vitals</Text>
          <Text style={styles.label}>How many checks per day?</Text>
          <TextInput
            style={styles.input}
            value={vitals}
            onChangeText={setVitals}
            keyboardType="number-pad"
            placeholderTextColor={Colors.textSecondary}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🍽️ Meals</Text>
          <Text style={styles.label}>How many meals per day?</Text>
          <TextInput
            style={styles.input}
            value={meals}
            onChangeText={setMeals}
            keyboardType="number-pad"
            placeholderTextColor={Colors.textSecondary}
          />
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Save Rhythm</Text>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(13, 148, 136, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  backIcon: {
    fontSize: 20,
    color: Colors.textPrimary,
  },
  title: {
    fontSize: 34,
    fontWeight: '300',
    color: '#FFFFFF',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.6)',
    letterSpacing: 0.3,
  },
  description: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    lineHeight: 22,
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 12,
    padding: 14,
    color: Colors.textPrimary,
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: Colors.accent,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonText: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
});
