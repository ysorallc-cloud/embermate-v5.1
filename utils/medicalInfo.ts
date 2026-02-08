// ============================================================================
// MEDICAL INFO STORAGE
// Stores critical medical information for emergency situations
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================================================
// TYPES
// ============================================================================

export interface Diagnosis {
  condition: string;
  diagnosedDate?: string;
  status: 'active' | 'resolved';
}

export interface Surgery {
  procedure: string;
  date?: string;
  notes?: string;
}

export interface Hospitalization {
  reason: string;
  date?: string;
  duration?: string;
}

export interface MedicalInfo {
  bloodType?: string;
  allergies: string[];
  diagnoses: Diagnosis[];
  surgeries: Surgery[];
  hospitalizations: Hospitalization[];
  currentMedications: Array<{
    name: string;
    dosage: string;
  }>;
  emergencyNotes?: string;
  lastUpdated: Date;
}

const MEDICAL_INFO_KEY = 'medical_info';

// ============================================================================
// MIGRATION
// ============================================================================

/**
 * Migrate legacy data that used flat `conditions: string[]` to the new
 * structured `diagnoses: Diagnosis[]` format. Runs transparently on read.
 */
function migrateLegacyInfo(raw: any): MedicalInfo {
  // If the old `conditions` array exists but `diagnoses` does not, migrate
  if (Array.isArray(raw.conditions) && !Array.isArray(raw.diagnoses)) {
    raw.diagnoses = (raw.conditions as string[]).map((c: string) => ({
      condition: c,
      status: 'active' as const,
    }));
  }

  return {
    bloodType: raw.bloodType,
    allergies: Array.isArray(raw.allergies) ? raw.allergies : [],
    diagnoses: Array.isArray(raw.diagnoses) ? raw.diagnoses : [],
    surgeries: Array.isArray(raw.surgeries) ? raw.surgeries : [],
    hospitalizations: Array.isArray(raw.hospitalizations) ? raw.hospitalizations : [],
    currentMedications: Array.isArray(raw.currentMedications) ? raw.currentMedications : [],
    emergencyNotes: raw.emergencyNotes,
    lastUpdated: raw.lastUpdated ? new Date(raw.lastUpdated) : new Date(),
  };
}

// ============================================================================
// CRUD OPERATIONS
// ============================================================================

/**
 * Get medical summary (auto-migrates legacy data)
 */
export async function getMedicalInfo(): Promise<MedicalInfo | null> {
  try {
    const data = await AsyncStorage.getItem(MEDICAL_INFO_KEY);
    if (!data) return null;

    const raw = JSON.parse(data);
    return migrateLegacyInfo(raw);
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

// ============================================================================
// SUMMARY GENERATION
// ============================================================================

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

  const activeDiagnoses = info.diagnoses.filter(d => d.status === 'active');
  if (activeDiagnoses.length > 0) {
    lines.push(`Active Conditions: ${activeDiagnoses.map(d => d.condition).join(', ')}`);
  }

  const resolvedDiagnoses = info.diagnoses.filter(d => d.status === 'resolved');
  if (resolvedDiagnoses.length > 0) {
    lines.push(`Past Conditions: ${resolvedDiagnoses.map(d => d.condition).join(', ')}`);
  }

  if (info.surgeries.length > 0) {
    const surgs = info.surgeries
      .map(s => (s.date ? `${s.procedure} (${s.date})` : s.procedure))
      .join(', ');
    lines.push(`Surgeries: ${surgs}`);
  }

  if (info.hospitalizations.length > 0) {
    const hosps = info.hospitalizations
      .map(h => (h.date ? `${h.reason} (${h.date})` : h.reason))
      .join(', ');
    lines.push(`Hospitalizations: ${hosps}`);
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
    info.diagnoses.length > 0 ||
    info.surgeries.length > 0 ||
    info.hospitalizations.length > 0 ||
    info.currentMedications.length > 0
  );
}
