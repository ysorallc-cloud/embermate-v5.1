// VITAL SIGN ALERT SYSTEM
// Threshold-based monitoring with care team notifications

import { Alert } from 'react-native';

export interface VitalSign {
  type: 'bp' | 'hr' | 'temp' | 'glucose' | 'o2sat';
  value: number | string;
  unit?: string;
  timestamp: Date;
  notes?: string;
}

export interface VitalThreshold {
  type: VitalSign['type'];
  label: string;
  criticalHigh?: number;
  high?: number;
  low?: number;
  criticalLow?: number;
  unit: string;
  enabled: boolean;
}

export interface AlertResult {
  level: 'normal' | 'attention' | 'critical';
  message: string;
  action: string;
  color: string;
  vital: VitalSign;
}

// Default clinical thresholds based on general medical guidelines
export const DEFAULT_THRESHOLDS: VitalThreshold[] = [
  {
    type: 'bp',
    label: 'Blood Pressure',
    criticalHigh: 180,
    high: 140,
    low: 90,
    criticalLow: 80,
    unit: 'mmHg (systolic)',
    enabled: true,
  },
  {
    type: 'hr',
    label: 'Heart Rate',
    criticalHigh: 120,
    high: 100,
    low: 50,
    criticalLow: 40,
    unit: 'bpm',
    enabled: true,
  },
  {
    type: 'temp',
    label: 'Temperature',
    criticalHigh: 103,
    high: 100.4,
    low: 95,
    criticalLow: 94,
    unit: '°F',
    enabled: true,
  },
  {
    type: 'glucose',
    label: 'Blood Glucose',
    criticalHigh: 250,
    high: 180,
    low: 70,
    criticalLow: 54,
    unit: 'mg/dL',
    enabled: true,
  },
  {
    type: 'o2sat',
    label: 'Oxygen Saturation',
    low: 92,
    criticalLow: 88,
    unit: '%',
    enabled: true,
  },
];

// Parse blood pressure string "120/80" to get systolic value
function parseBP(value: string | number): number {
  if (typeof value === 'number') return value;
  const match = value.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

// Get numeric value from vital sign
function getNumericValue(vital: VitalSign): number {
  if (vital.type === 'bp') {
    return parseBP(vital.value);
  }
  return typeof vital.value === 'number' ? vital.value : parseFloat(vital.value);
}

// Check vital against thresholds and return alert level
export function checkVital(
  vital: VitalSign,
  thresholds: VitalThreshold[] = DEFAULT_THRESHOLDS
): AlertResult {
  const threshold = thresholds.find(t => t.type === vital.type);
  
  if (!threshold || !threshold.enabled) {
    return {
      level: 'normal',
      message: 'No threshold configured',
      action: '',
      color: '#4CAF50',
      vital,
    };
  }

  const value = getNumericValue(vital);
  
  // Check critical high
  if (threshold.criticalHigh !== undefined && value >= threshold.criticalHigh) {
    return {
      level: 'critical',
      message: `${threshold.label} critically high: ${vital.value} ${threshold.unit}`,
      action: 'Seek immediate medical attention',
      color: '#DC2626',
      vital,
    };
  }
  
  // Check critical low
  if (threshold.criticalLow !== undefined && value <= threshold.criticalLow) {
    return {
      level: 'critical',
      message: `${threshold.label} critically low: ${vital.value} ${threshold.unit}`,
      action: 'Seek immediate medical attention',
      color: '#DC2626',
      vital,
    };
  }
  
  // Check high
  if (threshold.high !== undefined && value >= threshold.high) {
    return {
      level: 'attention',
      message: `${threshold.label} elevated: ${vital.value} ${threshold.unit}`,
      action: 'Monitor closely and consider contacting provider',
      color: '#F59E0B',
      vital,
    };
  }
  
  // Check low
  if (threshold.low !== undefined && value <= threshold.low) {
    return {
      level: 'attention',
      message: `${threshold.label} low: ${vital.value} ${threshold.unit}`,
      action: 'Monitor closely and consider contacting provider',
      color: '#F59E0B',
      vital,
    };
  }
  
  // Normal
  return {
    level: 'normal',
    message: `${threshold.label} within normal range`,
    action: '',
    color: '#4CAF50',
    vital,
  };
}

// Check and alert if abnormal - shows alert dialog
export function checkAndAlertVital(
  vital: VitalSign,
  thresholds?: VitalThreshold[],
  onEmergency?: () => void
): AlertResult {
  const result = checkVital(vital, thresholds);
  
  if (result.level !== 'normal') {
    const buttons: any[] = [{ text: 'Dismiss', style: 'cancel' }];
    
    if (result.level === 'critical' && onEmergency) {
      buttons.push({
        text: 'Emergency Mode',
        style: 'destructive',
        onPress: onEmergency,
      });
    }
    
    Alert.alert(
      result.level === 'critical' ? '⚠️ Critical Alert' : '⚡ Attention',
      `${result.message}\n\n${result.action}`,
      buttons
    );
  }
  
  return result;
}

// Get threshold for specific vital type
export function getThreshold(
  type: VitalSign['type'],
  thresholds: VitalThreshold[] = DEFAULT_THRESHOLDS
): VitalThreshold | undefined {
  return thresholds.find(t => t.type === type);
}

// Get alert color for vital value
export function getVitalColor(
  vital: VitalSign,
  thresholds?: VitalThreshold[]
): string {
  const result = checkVital(vital, thresholds);
  return result.color;
}

// Format vital value for display
export function formatVitalValue(vital: VitalSign): string {
  const threshold = getThreshold(vital.type);
  return `${vital.value} ${threshold?.unit || ''}`;
}

// Validate vital value is within reasonable bounds
export function validateVital(vital: VitalSign): { valid: boolean; error?: string } {
  const value = getNumericValue(vital);
  
  const bounds: Record<string, { min: number; max: number }> = {
    bp: { min: 40, max: 300 },
    hr: { min: 20, max: 250 },
    temp: { min: 85, max: 115 },
    glucose: { min: 10, max: 600 },
    o2sat: { min: 50, max: 100 },
  };
  
  const range = bounds[vital.type];
  if (!range) return { valid: true };
  
  if (value < range.min || value > range.max) {
    return {
      valid: false,
      error: `Value must be between ${range.min} and ${range.max}`,
    };
  }
  
  return { valid: true };
}
