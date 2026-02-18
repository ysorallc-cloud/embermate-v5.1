// ============================================================================
// CLINICAL CARE SETTINGS
// AsyncStorage-backed toggle for clinical care opt-in (Tier 3)
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { logError } from './devLog';

const CLINICAL_CARE_KEY = '@embermate_clinical_care_settings';

export interface ClinicalCareSettings {
  enabled: boolean;
  enabledAt?: string;
  mobilityStatus?: string;
  cognitiveBaseline?: string;
  fallRisk?: boolean;
  codeStatus?: string;
  dnr?: boolean;
  wanderingRisk?: boolean;
  fluidTargetOz?: number;
  swallowingIssues?: boolean;
}

export async function getClinicalCareSettings(): Promise<ClinicalCareSettings> {
  try {
    const data = await AsyncStorage.getItem(CLINICAL_CARE_KEY);
    if (!data) return { enabled: false };
    return JSON.parse(data);
  } catch (error) {
    logError('clinicalCareSettings.get', error);
    return { enabled: false };
  }
}

export async function getClinicalCareEnabled(): Promise<boolean> {
  const settings = await getClinicalCareSettings();
  return settings.enabled;
}

export async function setClinicalCareEnabled(enabled: boolean): Promise<void> {
  try {
    const existing = await getClinicalCareSettings();
    const updated: ClinicalCareSettings = {
      ...existing,
      enabled,
      enabledAt: enabled ? new Date().toISOString() : existing.enabledAt,
    };
    await AsyncStorage.setItem(CLINICAL_CARE_KEY, JSON.stringify(updated));
  } catch (error) {
    logError('clinicalCareSettings.setEnabled', error);
  }
}

export async function saveClinicalCareSettings(settings: ClinicalCareSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(CLINICAL_CARE_KEY, JSON.stringify(settings));
  } catch (error) {
    logError('clinicalCareSettings.save', error);
  }
}
