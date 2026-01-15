// utils/vitalThresholds.ts

export const VITAL_THRESHOLDS = {
  glucose: {
    low: 70,
    high: 140,
    criticalLow: 54,
    criticalHigh: 250,
    unit: 'mg/dL',
    name: 'Blood Glucose',
  },
  systolic: {
    low: 90,
    high: 140,
    criticalLow: 80,
    criticalHigh: 180,
    unit: 'mmHg',
    name: 'Systolic BP',
  },
  diastolic: {
    low: 60,
    high: 90,
    criticalLow: 50,
    criticalHigh: 120,
    unit: 'mmHg',
    name: 'Diastolic BP',
  },
  heartRate: {
    low: 60,
    high: 100,
    criticalLow: 40,
    criticalHigh: 150,
    unit: 'bpm',
    name: 'Heart Rate',
  },
  spo2: {
    low: 95,
    high: 100,
    criticalLow: 90,
    criticalHigh: 100,
    unit: '%',
    name: 'Oxygen Saturation',
  },
  temperature: {
    low: 97.0,
    high: 99.5,
    criticalLow: 95.0,
    criticalHigh: 103.0,
    unit: '°F',
    name: 'Temperature',
  },
};

export type VitalType = keyof typeof VITAL_THRESHOLDS;

export const getVitalStatus = (type: VitalType, value: number) => {
  const threshold = VITAL_THRESHOLDS[type];

  if (value <= threshold.criticalLow || value >= threshold.criticalHigh) {
    return { status: 'critical', label: value < threshold.low ? '↓ Critical' : '↑ Critical', color: '#EF4444' };
  }
  if (value < threshold.low) {
    return { status: 'low', label: '↓ Low', color: '#F59E0B' };
  }
  if (value > threshold.high) {
    return { status: 'high', label: '↑ High', color: '#F59E0B' };
  }
  return { status: 'normal', label: '✓ Normal', color: '#10B981' };
};

export const generateVitalAlert = (type: VitalType, value: number): string | null => {
  const threshold = VITAL_THRESHOLDS[type];
  const status = getVitalStatus(type, value);

  if (status.status === 'critical') {
    return `${threshold.name} ${value} ${threshold.unit} is critically ${value < threshold.low ? 'low' : 'high'}. Contact healthcare provider.`;
  }
  if (status.status === 'high') {
    return `${threshold.name} ${value} ${threshold.unit} is above target (${threshold.low}-${threshold.high}). Consider checking again in 2 hours.`;
  }
  if (status.status === 'low') {
    return `${threshold.name} ${value} ${threshold.unit} is below target (${threshold.low}-${threshold.high}). Monitor closely.`;
  }
  return null;
};
