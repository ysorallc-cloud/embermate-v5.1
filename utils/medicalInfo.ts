// ============================================================================
// MEDICAL INFO STORAGE
// Stores critical medical information for emergency situations
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface MedicalInfo {
  bloodType?: string;
  allergies: string[];
  conditions: string[];
  currentMedications: Array<{
    name: string;
    dosage: string;
  }>;
  emergencyNotes?: string;
  lastUpdated: Date;
}

const MEDICAL_INFO_KEY = 'medical_info';

/**
 * Get medical summary
 */
export async function getMedicalInfo(): Promise<MedicalInfo | null> {
  try {
    const data = await AsyncStorage.getItem(MEDICAL_INFO_KEY);
    if (!data) return null;

    const info = JSON.parse(data);
    info.lastUpdated = new Date(info.lastUpdated);

    return info;
  } catch (error) {
    console.error('Error getting medical info:', error);
    return null;
  }
}

/**
 * Save medical summary
 */
export async function saveMedicalInfo(
  info: Omit<MedicalInfo, 'lastUpdated'>
): Promise<void> {
  try {
    const medicalInfo: MedicalInfo = {
      ...info,
      lastUpdated: new Date(),
    };

    await AsyncStorage.setItem(MEDICAL_INFO_KEY, JSON.stringify(medicalInfo));
  } catch (error) {
    console.error('Error saving medical info:', error);
    throw error;
  }
}

/**
 * Generate emergency summary text
 */
export function generateEmergencySummary(info: MedicalInfo): string {
  const lines: string[] = [];

  if (info.bloodType) {
    lines.push(`Blood Type: ${info.bloodType}`);
  }

  if (info.allergies.length > 0) {
    lines.push(`Allergies: ${info.allergies.join(', ')}`);
  }

  if (info.conditions.length > 0) {
    lines.push(`Conditions: ${info.conditions.join(', ')}`);
  }

  if (info.currentMedications.length > 0) {
    const meds = info.currentMedications
      .map(m => (m.dosage ? `${m.name} (${m.dosage})` : m.name))
      .join(', ');
    lines.push(`Medications: ${meds}`);
  }

  if (info.emergencyNotes) {
    lines.push(`Notes: ${info.emergencyNotes}`);
  }

  return lines.join('\n');
}

/**
 * Check if medical info has critical data
 */
export function hasCriticalInfo(info: MedicalInfo): boolean {
  return !!(
    info.bloodType ||
    info.allergies.length > 0 ||
    info.conditions.length > 0 ||
    info.currentMedications.length > 0
  );
}
