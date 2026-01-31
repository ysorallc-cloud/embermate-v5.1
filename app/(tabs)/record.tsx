// ============================================================================
// RECORD TAB - 8 Collapsible Sections
// All health data recording in one place with collapsible sections
// ============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { AuroraBackground } from '../../components/aurora/AuroraBackground';
import { Colors, Spacing, Typography } from '../../theme/theme-tokens';
import { getMedications, Medication } from '../../utils/medicationStorage';
import {
  saveMedicationLog,
  saveVitalsLog,
  saveMoodLog,
  saveSymptomLog,
  saveSleepLog,
  saveMealsLog,
  saveWaterLog,
  saveNotesLog,
  getTodayMedicationLog,
  getTodayVitalsLog,
  getTodayMoodLog,
  getTodaySymptomLog,
  getTodaySleepLog,
  getTodayMealsLog,
  getTodayWaterLog,
  getTodayNotesLog,
  updateTodayWaterLog,
} from '../../utils/centralStorage';

type SectionId = 'medications' | 'vitals' | 'symptoms' | 'mood' | 'sleep' | 'meals' | 'water' | 'notes';

const COMMON_SYMPTOMS = ['Headache', 'Fatigue', 'Nausea', 'Dizziness', 'Pain', 'Shortness of breath', 'Anxiety', 'Insomnia'];
const COMMON_SIDE_EFFECTS = ['None', 'Dizzy', 'Nausea', 'Tired', 'Headache', 'Drowsy'];
const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
const WATER_GOAL = 8;

export default function RecordTab() {
  const [expandedSections, setExpandedSections] = useState<Set<SectionId>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Medications state
  const [medications, setMedications] = useState<Medication[]>([]);
  const [selectedMedIds, setSelectedMedIds] = useState<string[]>([]);
  const [sideEffects, setSideEffects] = useState<string[]>([]);

  // Vitals state
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [heartRate, setHeartRate] = useState('');
  const [glucose, setGlucose] = useState('');
  const [weight, setWeight] = useState('');

  // Symptoms state
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [symptomNotes, setSymptomNotes] = useState('');

  // Mood state
  const [mood, setMood] = useState<number | null>(null);
  const [energy, setEnergy] = useState<number | null>(null);
  const [pain, setPain] = useState<number | null>(null);

  // Sleep state
  const [sleepHours, setSleepHours] = useState('');
  const [sleepQuality, setSleepQuality] = useState<number>(0);

  // Meals state
  const [mealsLogged, setMealsLogged] = useState<string[]>([]);
  const [mealDescription, setMealDescription] = useState('');

  // Water state
  const [waterGlasses, setWaterGlasses] = useState(0);

  // Notes state
  const [notes, setNotes] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadTodayData();
    }, [])
  );

  const loadTodayData = async () => {
    try {
      setLoading(true);

      // Load medications from existing storage
      const allMeds = await getMedications();
      const activeMeds = allMeds.filter(m => m.active !== false);
      setMedications(activeMeds);

      // Load today's logs from central storage
      const [todayMeds, todayVitals, todayMood, todaySymptoms, todaySleep, todayMeals, todayWater, todayNotes] = await Promise.all([
        getTodayMedicationLog(),
        getTodayVitalsLog(),
        getTodayMoodLog(),
        getTodaySymptomLog(),
        getTodaySleepLog(),
        getTodayMealsLog(),
        getTodayWaterLog(),
        getTodayNotesLog(),
      ]);

      // Restore medications state
      if (todayMeds) {
        setSelectedMedIds(todayMeds.medicationIds);
        setSideEffects(todayMeds.sideEffects || []);
      } else {
        // Pre-select all medications by default
        setSelectedMedIds(activeMeds.map(m => m.id));
      }

      // Restore vitals state
      if (todayVitals) {
        setSystolic(todayVitals.systolic?.toString() || '');
        setDiastolic(todayVitals.diastolic?.toString() || '');
        setHeartRate(todayVitals.heartRate?.toString() || '');
        setGlucose(todayVitals.glucose?.toString() || '');
        setWeight(todayVitals.weight?.toString() || '');
      }

      // Restore mood state
      if (todayMood) {
        setMood(todayMood.mood);
        setEnergy(todayMood.energy);
        setPain(todayMood.pain);
      }

      // Restore symptoms state
      if (todaySymptoms) {
        setSymptoms(todaySymptoms.symptoms);
        setSymptomNotes(todaySymptoms.notes || '');
      }

      // Restore sleep state
      if (todaySleep) {
        setSleepHours(todaySleep.hours.toString());
        setSleepQuality(todaySleep.quality);
      }

      // Restore meals state
      if (todayMeals) {
        setMealsLogged(todayMeals.meals);
        setMealDescription(todayMeals.description || '');
      }

      // Restore water state
      if (todayWater) {
        setWaterGlasses(todayWater.glasses);
      }

      // Restore notes state
      if (todayNotes) {
        setNotes(todayNotes.content);
      }

    } catch (error) {
      console.error('Error loading today data:', error);
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (sectionId: SectionId) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const toggleMedication = (medId: string) => {
    setSelectedMedIds(prev =>
      prev.includes(medId)
        ? prev.filter(id => id !== medId)
        : [...prev, medId]
    );
  };

  const toggleChip = (value: string, currentArray: string[], setter: (arr: string[]) => void) => {
    if (currentArray.includes(value)) {
      setter(currentArray.filter(v => v !== value));
    } else {
      setter([...currentArray, value]);
    }
  };

  const incrementWater = () => {
    setWaterGlasses(prev => Math.min(prev + 1, WATER_GOAL + 4));
  };

  const decrementWater = () => {
    setWaterGlasses(prev => Math.max(prev - 1, 0));
  };

  const handleSaveAll = async () => {
    try {
      setSaving(true);
      const timestamp = new Date().toISOString();
      let savedCount = 0;

      // Save medications if any selected
      if (selectedMedIds.length > 0) {
        await saveMedicationLog({
          timestamp,
          medicationIds: selectedMedIds,
          sideEffects: sideEffects.length > 0 ? sideEffects : undefined,
        });
        savedCount++;
      }

      // Save vitals if any filled
      if (systolic || diastolic || heartRate || glucose || weight) {
        await saveVitalsLog({
          timestamp,
          systolic: systolic ? parseInt(systolic) : undefined,
          diastolic: diastolic ? parseInt(diastolic) : undefined,
          heartRate: heartRate ? parseInt(heartRate) : undefined,
          glucose: glucose ? parseInt(glucose) : undefined,
          weight: weight ? parseFloat(weight) : undefined,
        });
        savedCount++;
      }

      // Save symptoms if any selected
      if (symptoms.length > 0) {
        await saveSymptomLog({
          timestamp,
          symptoms,
          notes: symptomNotes || undefined,
        });
        savedCount++;
      }

      // Save mood if any set
      if (mood !== null || energy !== null || pain !== null) {
        await saveMoodLog({
          timestamp,
          mood,
          energy,
          pain,
        });
        savedCount++;
      }

      // Save sleep if hours entered
      if (sleepHours) {
        await saveSleepLog({
          timestamp,
          hours: parseFloat(sleepHours),
          quality: sleepQuality || 3,
        });
        savedCount++;
      }

      // Save meals if any logged
      if (mealsLogged.length > 0) {
        await saveMealsLog({
          timestamp,
          meals: mealsLogged,
          description: mealDescription || undefined,
        });
        savedCount++;
      }

      // Save water if any logged
      if (waterGlasses > 0) {
        await updateTodayWaterLog(waterGlasses);
        savedCount++;
      }

      // Save notes if any entered
      if (notes.trim()) {
        await saveNotesLog({
          timestamp,
          content: notes.trim(),
        });
        savedCount++;
      }

      if (savedCount > 0) {
        Alert.alert('Saved', `${savedCount} ${savedCount === 1 ? 'section' : 'sections'} saved successfully`);
        // Collapse all sections after save
        setExpandedSections(new Set());
      } else {
        Alert.alert('Nothing to Save', 'Please fill in at least one section before saving.');
      }

    } catch (error) {
      console.error('Error saving data:', error);
      Alert.alert('Error', 'Failed to save some data. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const getSectionStatus = (sectionId: SectionId): {
    text: string;
    status: 'pending' | 'complete' | 'optional';
    count?: string;
  } => {
    switch (sectionId) {
      case 'medications':
        if (medications.length === 0) return { text: 'No medications', status: 'optional' };
        if (selectedMedIds.length === 0) {
          return { text: `${medications.length} medications pending`, status: 'pending', count: String(medications.length) };
        }
        return {
          text: selectedMedIds.length === medications.length ? 'All selected' : `${selectedMedIds.length} selected`,
          status: 'complete',
          count: `${selectedMedIds.length}/${medications.length}`
        };

      case 'vitals':
        const filledVitals = [systolic, diastolic, heartRate, glucose, weight].filter(Boolean).length;
        if (filledVitals === 0) {
          return { text: 'Blood pressure, heart rate', status: 'optional' };
        }
        return { text: `${filledVitals} vitals logged`, status: 'complete' };

      case 'symptoms':
        if (symptoms.length === 0) {
          return { text: 'Track symptoms', status: 'optional' };
        }
        return { text: `${symptoms.length} symptoms logged`, status: 'complete' };

      case 'mood':
        if (mood === null && energy === null && pain === null) {
          return { text: 'How are they feeling?', status: 'optional' };
        }
        const moodText = mood !== null ? (mood >= 7 ? 'Feeling good' : mood >= 4 ? 'Feeling okay' : 'Struggling') : 'Logged';
        return { text: moodText, status: 'complete' };

      case 'sleep':
        if (!sleepHours) {
          return { text: 'Hours slept last night', status: 'optional' };
        }
        return { text: `${sleepHours} hours`, status: 'complete' };

      case 'meals':
        if (mealsLogged.length === 0) {
          return { text: 'Which meals today?', status: 'optional' };
        }
        return { text: `${mealsLogged.length} meals logged`, status: 'complete' };

      case 'water':
        if (waterGlasses === 0) {
          return { text: `0/${WATER_GOAL} glasses`, status: 'optional' };
        }
        return { text: `${waterGlasses}/${WATER_GOAL} glasses`, status: waterGlasses >= WATER_GOAL ? 'complete' : 'pending' };

      case 'notes':
        if (!notes.trim()) {
          return { text: 'Add observations', status: 'optional' };
        }
        return { text: 'Note added', status: 'complete' };

      default:
        return { text: '', status: 'optional' };
    }
  };

  const getCompletedCount = () => {
    let count = 0;
    if (selectedMedIds.length > 0) count++;
    if (systolic || diastolic || heartRate || glucose || weight) count++;
    if (symptoms.length > 0) count++;
    if (mood !== null || energy !== null || pain !== null) count++;
    if (sleepHours) count++;
    if (mealsLogged.length > 0) count++;
    if (waterGlasses > 0) count++;
    if (notes.trim()) count++;
    return count;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <AuroraBackground variant="log" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.accent} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  const completedCount = getCompletedCount();
  const progressPercent = (completedCount / 8) * 100;

  return (
    <View style={styles.container}>
      <AuroraBackground variant="log" />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header with Gradient Demarcation */}
          <LinearGradient
            colors={['rgba(94, 234, 212, 0.08)', 'rgba(94, 234, 212, 0.02)']}
            style={styles.headerGradient}
          >
            <View style={styles.header}>
              <Text style={styles.title}>Record</Text>
              <Text style={styles.subtitle}>Tap sections to expand</Text>
            </View>
          </LinearGradient>

          {/* Progress Indicator */}
          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>{completedCount}/8 complete</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
            </View>
          </View>

          {/* Medications Section */}
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => toggleSection('medications')}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={`Medications. ${getSectionStatus('medications').text}`}
              accessibilityState={{ expanded: expandedSections.has('medications') }}
            >
              <Text style={styles.sectionIcon}>💊</Text>
              <View style={styles.sectionMain}>
                <View style={styles.sectionTitleRow}>
                  <Text style={styles.sectionTitle}>Medications</Text>
                  {getSectionStatus('medications').count && (
                    <View style={styles.sectionCount}>
                      <Text style={styles.sectionCountText}>{getSectionStatus('medications').count}</Text>
                    </View>
                  )}
                </View>
                <View style={styles.sectionStatusRow}>
                  <View style={[styles.statusDot, styles[`statusDot_${getSectionStatus('medications').status}`]]} />
                  <Text style={styles.sectionStatus}>{getSectionStatus('medications').text}</Text>
                </View>
              </View>
              <Text style={[styles.chevron, expandedSections.has('medications') && styles.chevronExpanded]}>›</Text>
            </TouchableOpacity>

            {expandedSections.has('medications') && (
              <View style={styles.sectionContent}>
                {medications.length === 0 ? (
                  <Text style={styles.emptyText}>No medications added yet</Text>
                ) : (
                  <View style={styles.medList}>
                    {medications.map(med => (
                      <TouchableOpacity
                        key={med.id}
                        style={[styles.medItem, selectedMedIds.includes(med.id) && styles.medItemSelected]}
                        onPress={() => toggleMedication(med.id)}
                      >
                        <View style={[styles.checkbox, selectedMedIds.includes(med.id) && styles.checkboxChecked]}>
                          {selectedMedIds.includes(med.id) && <Text style={styles.checkmark}>✓</Text>}
                        </View>
                        <View style={styles.medInfo}>
                          <Text style={styles.medName}>{med.name}</Text>
                          <Text style={styles.medDosage}>{med.dosage} - {med.timeSlot}</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                <View style={styles.formSection}>
                  <Text style={styles.formLabel}>Side Effects?</Text>
                  <View style={styles.chipRow}>
                    {COMMON_SIDE_EFFECTS.map(effect => (
                      <TouchableOpacity
                        key={effect}
                        style={[styles.chip, sideEffects.includes(effect) && styles.chipSelected]}
                        onPress={() => toggleChip(effect, sideEffects, setSideEffects)}
                      >
                        <Text style={[styles.chipText, sideEffects.includes(effect) && styles.chipTextSelected]}>
                          {effect}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* Vitals Section */}
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => toggleSection('vitals')}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={`Vitals. ${getSectionStatus('vitals').text}`}
              accessibilityState={{ expanded: expandedSections.has('vitals') }}
            >
              <Text style={styles.sectionIcon}>📊</Text>
              <View style={styles.sectionMain}>
                <View style={styles.sectionTitleRow}>
                  <Text style={styles.sectionTitle}>Vitals</Text>
                </View>
                <View style={styles.sectionStatusRow}>
                  <View style={[styles.statusDot, styles[`statusDot_${getSectionStatus('vitals').status}`]]} />
                  <Text style={styles.sectionStatus}>{getSectionStatus('vitals').text}</Text>
                </View>
              </View>
              <Text style={[styles.chevron, expandedSections.has('vitals') && styles.chevronExpanded]}>›</Text>
            </TouchableOpacity>

            {expandedSections.has('vitals') && (
              <View style={styles.sectionContent}>
                <View style={styles.vitalRow}>
                  <Text style={styles.vitalLabel}>Blood Pressure</Text>
                  <View style={styles.vitalInputs}>
                    <TextInput
                      style={styles.vitalInput}
                      placeholder="120"
                      placeholderTextColor="rgba(255,255,255,0.25)"
                      keyboardType="numeric"
                      value={systolic}
                      onChangeText={setSystolic}
                    />
                    <Text style={styles.vitalSlash}>/</Text>
                    <TextInput
                      style={styles.vitalInput}
                      placeholder="80"
                      placeholderTextColor="rgba(255,255,255,0.25)"
                      keyboardType="numeric"
                      value={diastolic}
                      onChangeText={setDiastolic}
                    />
                    <Text style={styles.vitalUnit}>mmHg</Text>
                  </View>
                </View>

                <View style={styles.vitalRow}>
                  <Text style={styles.vitalLabel}>Heart Rate</Text>
                  <View style={styles.vitalInputs}>
                    <TextInput
                      style={styles.vitalInput}
                      placeholder="72"
                      placeholderTextColor="rgba(255,255,255,0.25)"
                      keyboardType="numeric"
                      value={heartRate}
                      onChangeText={setHeartRate}
                    />
                    <Text style={styles.vitalUnit}>bpm</Text>
                  </View>
                </View>

                <View style={styles.vitalRow}>
                  <Text style={styles.vitalLabel}>Blood Glucose</Text>
                  <View style={styles.vitalInputs}>
                    <TextInput
                      style={styles.vitalInput}
                      placeholder="100"
                      placeholderTextColor="rgba(255,255,255,0.25)"
                      keyboardType="numeric"
                      value={glucose}
                      onChangeText={setGlucose}
                    />
                    <Text style={styles.vitalUnit}>mg/dL</Text>
                  </View>
                </View>

                <View style={styles.vitalRow}>
                  <Text style={styles.vitalLabel}>Weight</Text>
                  <View style={styles.vitalInputs}>
                    <TextInput
                      style={styles.vitalInput}
                      placeholder="150"
                      placeholderTextColor="rgba(255,255,255,0.25)"
                      keyboardType="numeric"
                      value={weight}
                      onChangeText={setWeight}
                    />
                    <Text style={styles.vitalUnit}>lbs</Text>
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* Symptoms Section */}
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => toggleSection('symptoms')}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={`Symptoms. ${getSectionStatus('symptoms').text}`}
              accessibilityState={{ expanded: expandedSections.has('symptoms') }}
            >
              <Text style={styles.sectionIcon}>🩺</Text>
              <View style={styles.sectionMain}>
                <View style={styles.sectionTitleRow}>
                  <Text style={styles.sectionTitle}>Symptoms</Text>
                </View>
                <View style={styles.sectionStatusRow}>
                  <View style={[styles.statusDot, styles[`statusDot_${getSectionStatus('symptoms').status}`]]} />
                  <Text style={styles.sectionStatus}>{getSectionStatus('symptoms').text}</Text>
                </View>
              </View>
              <Text style={[styles.chevron, expandedSections.has('symptoms') && styles.chevronExpanded]}>›</Text>
            </TouchableOpacity>

            {expandedSections.has('symptoms') && (
              <View style={styles.sectionContent}>
                <View style={styles.chipRow}>
                  {COMMON_SYMPTOMS.map(symptom => (
                    <TouchableOpacity
                      key={symptom}
                      style={[styles.chip, symptoms.includes(symptom) && styles.chipSelected]}
                      onPress={() => toggleChip(symptom, symptoms, setSymptoms)}
                    >
                      <Text style={[styles.chipText, symptoms.includes(symptom) && styles.chipTextSelected]}>
                        {symptom}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TextInput
                  style={styles.textArea}
                  placeholder="Additional notes about symptoms..."
                  placeholderTextColor="rgba(255,255,255,0.25)"
                  multiline
                  numberOfLines={3}
                  value={symptomNotes}
                  onChangeText={setSymptomNotes}
                />
              </View>
            )}
          </View>

          {/* Mood & Energy Section */}
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => toggleSection('mood')}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={`Mood and Energy. ${getSectionStatus('mood').text}`}
              accessibilityState={{ expanded: expandedSections.has('mood') }}
            >
              <Text style={styles.sectionIcon}>😊</Text>
              <View style={styles.sectionMain}>
                <View style={styles.sectionTitleRow}>
                  <Text style={styles.sectionTitle}>Mood & Energy</Text>
                </View>
                <View style={styles.sectionStatusRow}>
                  <View style={[styles.statusDot, styles[`statusDot_${getSectionStatus('mood').status}`]]} />
                  <Text style={styles.sectionStatus}>{getSectionStatus('mood').text}</Text>
                </View>
              </View>
              <Text style={[styles.chevron, expandedSections.has('mood') && styles.chevronExpanded]}>›</Text>
            </TouchableOpacity>

            {expandedSections.has('mood') && (
              <View style={styles.sectionContent}>
                <View style={styles.sliderGroup}>
                  <View style={styles.sliderItem}>
                    <View style={styles.sliderHeader}>
                      <Text style={styles.sliderLabel}>Mood</Text>
                      <Text style={styles.sliderValue}>{mood || 0}/10</Text>
                    </View>
                    <View style={styles.sliderTrack}>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(value => (
                        <TouchableOpacity
                          key={value}
                          style={[styles.sliderSegment, mood !== null && mood >= value && styles.sliderSegmentFilled]}
                          onPress={() => setMood(value)}
                        />
                      ))}
                    </View>
                  </View>

                  <View style={styles.sliderItem}>
                    <View style={styles.sliderHeader}>
                      <Text style={styles.sliderLabel}>Energy</Text>
                      <Text style={styles.sliderValue}>{energy || 0}/10</Text>
                    </View>
                    <View style={styles.sliderTrack}>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(value => (
                        <TouchableOpacity
                          key={value}
                          style={[styles.sliderSegment, energy !== null && energy >= value && styles.sliderSegmentFilledEnergy]}
                          onPress={() => setEnergy(value)}
                        />
                      ))}
                    </View>
                  </View>

                  <View style={styles.sliderItem}>
                    <View style={styles.sliderHeader}>
                      <Text style={styles.sliderLabel}>Pain Level</Text>
                      <Text style={styles.sliderValue}>{pain || 0}/10</Text>
                    </View>
                    <View style={styles.sliderTrack}>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(value => (
                        <TouchableOpacity
                          key={value}
                          style={[styles.sliderSegment, pain !== null && pain >= value && styles.sliderSegmentFilledPain]}
                          onPress={() => setPain(value)}
                        />
                      ))}
                    </View>
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* Sleep Section */}
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => toggleSection('sleep')}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={`Sleep. ${getSectionStatus('sleep').text}`}
              accessibilityState={{ expanded: expandedSections.has('sleep') }}
            >
              <Text style={styles.sectionIcon}>😴</Text>
              <View style={styles.sectionMain}>
                <View style={styles.sectionTitleRow}>
                  <Text style={styles.sectionTitle}>Sleep</Text>
                </View>
                <View style={styles.sectionStatusRow}>
                  <View style={[styles.statusDot, styles[`statusDot_${getSectionStatus('sleep').status}`]]} />
                  <Text style={styles.sectionStatus}>{getSectionStatus('sleep').text}</Text>
                </View>
              </View>
              <Text style={[styles.chevron, expandedSections.has('sleep') && styles.chevronExpanded]}>›</Text>
            </TouchableOpacity>

            {expandedSections.has('sleep') && (
              <View style={styles.sectionContent}>
                <View style={styles.vitalRow}>
                  <Text style={styles.vitalLabel}>Hours Slept</Text>
                  <View style={styles.vitalInputs}>
                    <TextInput
                      style={styles.vitalInput}
                      placeholder="8"
                      placeholderTextColor="rgba(255,255,255,0.25)"
                      keyboardType="numeric"
                      value={sleepHours}
                      onChangeText={setSleepHours}
                    />
                    <Text style={styles.vitalUnit}>hours</Text>
                  </View>
                </View>

                <View style={styles.formSection}>
                  <Text style={styles.formLabel}>Sleep Quality</Text>
                  <View style={styles.chipRow}>
                    {[1, 2, 3, 4, 5].map(rating => (
                      <TouchableOpacity
                        key={rating}
                        style={[styles.ratingChip, sleepQuality === rating && styles.chipSelected]}
                        onPress={() => setSleepQuality(rating)}
                      >
                        <Text style={[styles.ratingText, sleepQuality === rating && styles.chipTextSelected]}>
                          {rating === 1 ? '😫' : rating === 2 ? '😕' : rating === 3 ? '😐' : rating === 4 ? '😊' : '😴'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* Meals Section */}
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => toggleSection('meals')}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={`Meals. ${getSectionStatus('meals').text}`}
              accessibilityState={{ expanded: expandedSections.has('meals') }}
            >
              <Text style={styles.sectionIcon}>🍽️</Text>
              <View style={styles.sectionMain}>
                <View style={styles.sectionTitleRow}>
                  <Text style={styles.sectionTitle}>Meals</Text>
                </View>
                <View style={styles.sectionStatusRow}>
                  <View style={[styles.statusDot, styles[`statusDot_${getSectionStatus('meals').status}`]]} />
                  <Text style={styles.sectionStatus}>{getSectionStatus('meals').text}</Text>
                </View>
              </View>
              <Text style={[styles.chevron, expandedSections.has('meals') && styles.chevronExpanded]}>›</Text>
            </TouchableOpacity>

            {expandedSections.has('meals') && (
              <View style={styles.sectionContent}>
                <View style={styles.chipRow}>
                  {MEAL_TYPES.map(meal => (
                    <TouchableOpacity
                      key={meal}
                      style={[styles.chip, mealsLogged.includes(meal) && styles.chipSelected]}
                      onPress={() => toggleChip(meal, mealsLogged, setMealsLogged)}
                    >
                      <Text style={[styles.chipText, mealsLogged.includes(meal) && styles.chipTextSelected]}>
                        {meal}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TextInput
                  style={styles.textArea}
                  placeholder="What did they eat? (optional)"
                  placeholderTextColor="rgba(255,255,255,0.25)"
                  multiline
                  numberOfLines={3}
                  value={mealDescription}
                  onChangeText={setMealDescription}
                />
              </View>
            )}
          </View>

          {/* Water Section */}
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => toggleSection('water')}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={`Water. ${getSectionStatus('water').text}`}
              accessibilityState={{ expanded: expandedSections.has('water') }}
            >
              <Text style={styles.sectionIcon}>💧</Text>
              <View style={styles.sectionMain}>
                <View style={styles.sectionTitleRow}>
                  <Text style={styles.sectionTitle}>Water</Text>
                </View>
                <View style={styles.sectionStatusRow}>
                  <View style={[styles.statusDot, styles[`statusDot_${getSectionStatus('water').status}`]]} />
                  <Text style={styles.sectionStatus}>{getSectionStatus('water').text}</Text>
                </View>
              </View>
              <Text style={[styles.chevron, expandedSections.has('water') && styles.chevronExpanded]}>›</Text>
            </TouchableOpacity>

            {expandedSections.has('water') && (
              <View style={styles.sectionContent}>
                <View style={styles.waterCounter}>
                  <TouchableOpacity style={styles.waterButton} onPress={decrementWater}>
                    <Text style={styles.waterButtonText}>−</Text>
                  </TouchableOpacity>
                  <View style={styles.waterDisplay}>
                    <Text style={styles.waterCount}>{waterGlasses}</Text>
                    <Text style={styles.waterGoal}>of {WATER_GOAL} glasses</Text>
                  </View>
                  <TouchableOpacity style={styles.waterButton} onPress={incrementWater}>
                    <Text style={styles.waterButtonText}>+</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.waterProgressBar}>
                  <View style={[styles.waterProgressFill, { width: `${Math.min((waterGlasses / WATER_GOAL) * 100, 100)}%` }]} />
                </View>
              </View>
            )}
          </View>

          {/* Notes Section */}
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => toggleSection('notes')}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={`Notes. ${getSectionStatus('notes').text}`}
              accessibilityState={{ expanded: expandedSections.has('notes') }}
            >
              <Text style={styles.sectionIcon}>📝</Text>
              <View style={styles.sectionMain}>
                <View style={styles.sectionTitleRow}>
                  <Text style={styles.sectionTitle}>Notes</Text>
                </View>
                <View style={styles.sectionStatusRow}>
                  <View style={[styles.statusDot, styles[`statusDot_${getSectionStatus('notes').status}`]]} />
                  <Text style={styles.sectionStatus}>{getSectionStatus('notes').text}</Text>
                </View>
              </View>
              <Text style={[styles.chevron, expandedSections.has('notes') && styles.chevronExpanded]}>›</Text>
            </TouchableOpacity>

            {expandedSections.has('notes') && (
              <View style={styles.sectionContent}>
                <TextInput
                  style={styles.textAreaLarge}
                  placeholder="Any observations, concerns, or things to remember..."
                  placeholderTextColor="rgba(255,255,255,0.25)"
                  multiline
                  numberOfLines={5}
                  value={notes}
                  onChangeText={setNotes}
                />
              </View>
            )}
          </View>

          {/* Bottom spacing */}
          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Bottom Save Button */}
        <View style={styles.bottomActions}>
          <TouchableOpacity
            style={[styles.btnPrimary, saving && styles.btnPrimaryDisabled]}
            onPress={handleSaveAll}
            disabled={saving}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Save All"
            accessibilityHint="Saves all entered health data"
          >
            {saving ? (
              <ActivityIndicator size="small" color={Colors.background} />
            ) : (
              <Text style={styles.btnPrimaryText}>Save All ✓</Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: 16,
    marginTop: 10,
  },
  scrollView: {
    flex: 1,
  },
  // Header with gradient demarcation
  headerGradient: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(94, 234, 212, 0.1)',
  },
  header: {
    paddingTop: 60, // Clears iPhone notch
    paddingHorizontal: 20,
    paddingBottom: 20,
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
  progressContainer: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  progressText: {
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.accent,
  },

  // Section styles
  section: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  sectionHeader: {
    padding: 18,
    paddingHorizontal: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  sectionIcon: {
    fontSize: 26,
  },
  sectionMain: {
    flex: 1,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  sectionCount: {
    backgroundColor: `${Colors.accent}20`,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  sectionCountText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.accent,
  },
  sectionStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionStatus: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusDot_pending: {
    backgroundColor: Colors.red,
    shadowColor: Colors.red,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 3,
  },
  statusDot_complete: {
    backgroundColor: Colors.green,
    shadowColor: Colors.green,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 3,
  },
  statusDot_optional: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  chevron: {
    fontSize: 22,
    color: 'rgba(255,255,255,0.3)',
  },
  chevronExpanded: {
    transform: [{ rotate: '90deg' }],
  },
  sectionContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: 22,
    paddingTop: 16,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.04)',
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: Spacing.lg,
  },

  // Medication list
  medList: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 8,
    overflow: 'hidden',
  },
  medItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    paddingHorizontal: 16,
    backgroundColor: Colors.background,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  medItemSelected: {
    backgroundColor: `${Colors.accent}10`,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: `${Colors.accent}50`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  checkmark: {
    color: Colors.background,
    fontSize: 14,
    fontWeight: '700',
  },
  medInfo: {
    flex: 1,
  },
  medName: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  medDosage: {
    fontSize: 13,
    color: Colors.textMuted,
  },

  // Form elements
  formSection: {
    marginTop: 18,
  },
  formLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
    fontWeight: '600',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingVertical: 9,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 7,
  },
  chipSelected: {
    backgroundColor: `${Colors.accent}20`,
    borderColor: `${Colors.accent}50`,
  },
  chipText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  chipTextSelected: {
    color: Colors.accent,
  },
  ratingChip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
  },
  ratingText: {
    fontSize: 24,
  },

  // Vitals inputs
  vitalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  vitalLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    minWidth: 100,
    fontWeight: '500',
  },
  vitalInputs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    flex: 1,
  },
  vitalInput: {
    width: 60,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 7,
    padding: 10,
    paddingHorizontal: 8,
    color: Colors.textPrimary,
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  vitalSlash: {
    fontSize: 16,
    color: Colors.textMuted,
  },
  vitalUnit: {
    fontSize: 13,
    color: Colors.textMuted,
  },

  // Sliders
  sliderGroup: {
    gap: 18,
  },
  sliderItem: {
    gap: 8,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sliderLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  sliderValue: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.accent,
  },
  sliderTrack: {
    flexDirection: 'row',
    gap: 3,
    height: 8,
  },
  sliderSegment: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 4,
  },
  sliderSegmentFilled: {
    backgroundColor: Colors.accent,
  },
  sliderSegmentFilledEnergy: {
    backgroundColor: Colors.gold,
  },
  sliderSegmentFilledPain: {
    backgroundColor: Colors.red,
  },

  // Text areas
  textArea: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    padding: 14,
    color: Colors.textPrimary,
    fontSize: 14,
    minHeight: 90,
    textAlignVertical: 'top',
    marginTop: 10,
  },
  textAreaLarge: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    padding: 14,
    color: Colors.textPrimary,
    fontSize: 14,
    minHeight: 120,
    textAlignVertical: 'top',
  },

  // Water counter
  waterCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 16,
  },
  waterButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${Colors.cyan}20`,
    borderWidth: 1,
    borderColor: `${Colors.cyan}40`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waterButtonText: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.cyan,
  },
  waterDisplay: {
    alignItems: 'center',
  },
  waterCount: {
    fontSize: 36,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  waterGoal: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  waterProgressBar: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  waterProgressFill: {
    height: '100%',
    backgroundColor: Colors.cyan,
    borderRadius: 3,
  },

  // Bottom actions
  bottomActions: {
    flexDirection: 'row',
    padding: Spacing.xl,
    gap: 12,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  btnPrimary: {
    flex: 1,
    padding: 16,
    backgroundColor: Colors.accent,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimaryDisabled: {
    opacity: 0.7,
  },
  btnPrimaryText: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: '700',
  },
});
