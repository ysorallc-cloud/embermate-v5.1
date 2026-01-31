// ============================================================================
// SAMPLE DATA GENERATOR FOR CORRELATION TESTING
// Generates realistic sample data to test correlation detection
// Use this to populate 30 days of mock data for development
// ============================================================================

import { saveSymptom } from './symptomStorage';
import { saveDailyTracking } from './dailyTrackingStorage';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Generate sample correlation data for testing
 * Creates 30 days of synthetic data with intentional patterns:
 * - Pain correlates negatively with hydration (-0.6 coefficient)
 * - Mood correlates positively with sleep (+0.7 coefficient)
 * - Fatigue correlates negatively with medication adherence (-0.5 coefficient)
 */
export async function generateSampleCorrelationData(): Promise<void> {
  if (__DEV__) console.log('Generating 30 days of sample correlation data...');

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);

  // Batch all data first, then save in bulk to reduce memory pressure
  const symptomBatch: Array<{ symptom: string; severity: number; timestamp: string; date: string }> = [];
  const dailyTrackingBatch: Array<{ date: string; data: { hydration: number; mood: number; sleep: number } }> = [];
  const medLogBatch: Array<[string, string]> = [];

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];

    // Generate correlated data with some noise
    const hydration = 4 + Math.random() * 6; // 4-10 cups
    const sleep = 5 + Math.random() * 4; // 5-9 hours
    const medicationAdherence = 60 + Math.random() * 40; // 60-100%

    // Pain negatively correlates with hydration (-0.6)
    const pain = Math.max(0, Math.min(10, 8 - (hydration * 0.6) + (Math.random() * 3)));

    // Mood positively correlates with sleep (+0.7)
    const mood = Math.max(0, Math.min(10, (sleep * 0.9) - 2 + (Math.random() * 2)));

    // Fatigue negatively correlates with medication adherence (-0.5)
    const fatigue = Math.max(0, Math.min(10, 8 - (medicationAdherence * 0.05) + (Math.random() * 2)));

    // Nausea has mild negative correlation with hydration
    const nausea = Math.max(0, Math.min(10, 5 - (hydration * 0.3) + (Math.random() * 3)));

    // Dizziness has weak correlation
    const dizziness = Math.random() * 4; // 0-4 (generally low)

    // Queue symptom logs (one entry per symptom)
    const timestamp = new Date(dateStr).toISOString();
    if (pain > 2) symptomBatch.push({ symptom: 'Pain', severity: Math.round(pain), timestamp, date: dateStr });
    if (fatigue > 2) symptomBatch.push({ symptom: 'Fatigue', severity: Math.round(fatigue), timestamp, date: dateStr });
    if (nausea > 2) symptomBatch.push({ symptom: 'Nausea', severity: Math.round(nausea), timestamp, date: dateStr });
    if (dizziness > 2) symptomBatch.push({ symptom: 'Dizziness', severity: Math.round(dizziness), timestamp, date: dateStr });

    // Queue daily tracking
    dailyTrackingBatch.push({
      date: dateStr,
      data: {
        hydration: Math.round(hydration * 10) / 10,
        mood: Math.round(mood * 10) / 10,
        sleep: Math.round(sleep * 10) / 10,
      },
    });

    // Queue medication logs for adherence calculation
    const medLogKey = `@medication_logs_${dateStr}`;
    const numMeds = 7;
    const takenCount = Math.round((medicationAdherence / 100) * numMeds);
    const dayTime = new Date(d);
    const medLogs = Array.from({ length: numMeds }, (_, i) => ({
      id: `med-${i}`,
      medicationId: `medication-${i}`,
      date: dateStr,
      timestamp: new Date(dayTime.setHours(8 + i, 0, 0, 0)).toISOString(),
      taken: i < takenCount,
      notes: null,
    }));
    medLogBatch.push([medLogKey, JSON.stringify(medLogs)]);
  }

  // Save all data in batches to reduce memory pressure
  // Save symptoms sequentially (storage util handles array management)
  for (const symptom of symptomBatch) {
    await saveSymptom(symptom);
  }

  // Save daily tracking sequentially
  for (const { date, data } of dailyTrackingBatch) {
    await saveDailyTracking(date, data);
  }

  // Save medication logs in bulk using multiSet
  await AsyncStorage.multiSet(medLogBatch);
  
  if (__DEV__) {
    console.log('Sample data generation complete!');
    console.log('Expected correlations:');
    console.log('  - Pain & Hydration: ~-0.6 (negative)');
    console.log('  - Mood & Sleep: ~+0.7 (positive)');
    console.log('  - Fatigue & Med Adherence: ~-0.5 (negative)');
  }
}

/**
 * Clear all sample correlation data
 */
export async function clearSampleCorrelationData(): Promise<void> {
  if (__DEV__) console.log('Clearing sample correlation data...');

  const allKeys = await AsyncStorage.getAllKeys();
  const keysToRemove = allKeys.filter(key =>
    key.startsWith('@symptom_logs_') ||
    key.startsWith('@daily_tracking_') ||
    key.startsWith('@medication_logs_') ||
    key === '@correlation_cache'
  );

  await AsyncStorage.multiRemove(keysToRemove);
  if (__DEV__) console.log(`Cleared ${keysToRemove.length} keys`);
}

/**
 * Check if sample data exists
 */
export async function hasSampleData(): Promise<boolean> {
  const allKeys = await AsyncStorage.getAllKeys();
  const symptomKeys = allKeys.filter(key => key.startsWith('@symptom_logs_'));
  return symptomKeys.length >= 14;
}

// Export alias for backwards compatibility
export { generateSampleCorrelationData as generateSampleData };
