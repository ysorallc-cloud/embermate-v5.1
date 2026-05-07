// ============================================================================
// Phase 5.13.1.a — useActivePatientName hook.
//
// Canonical patient-name accessor backed by PatientContext. Replaces the
// scattered AsyncStorage[StorageKeys.PATIENT_NAME] reads that drifted out
// of sync with the registry-backed source of truth.
// ============================================================================

let mockActivePatient: { name?: string } | null = null;

jest.mock('../../contexts/PatientContext', () => ({
  usePatient: () => ({
    activePatientId: 'default',
    activePatient: mockActivePatient,
  }),
}));

import {
  useActivePatientName,
  useActivePatientNameRaw,
} from '../../hooks/useActivePatientName';

describe('useActivePatientName — friendly fallback', () => {
  it('returns the real name when set', () => {
    mockActivePatient = { name: 'Mom' };
    expect(useActivePatientName()).toBe('Mom');
  });

  it('trims whitespace before returning', () => {
    mockActivePatient = { name: '  Mom  ' };
    expect(useActivePatientName()).toBe('Mom');
  });

  it('returns "your loved one" when name is empty', () => {
    mockActivePatient = { name: '' };
    expect(useActivePatientName()).toBe('your loved one');
  });

  it('returns "your loved one" when name is the legacy "Patient" placeholder', () => {
    mockActivePatient = { name: 'Patient' };
    expect(useActivePatientName()).toBe('your loved one');
  });

  it('returns "your loved one" when name is the lowercase "patient" placeholder', () => {
    mockActivePatient = { name: 'patient' };
    expect(useActivePatientName()).toBe('your loved one');
  });

  it('returns "your loved one" when activePatient is null', () => {
    mockActivePatient = null;
    expect(useActivePatientName()).toBe('your loved one');
  });
});

describe('useActivePatientNameRaw — raw value or null', () => {
  it('returns the real name when set', () => {
    mockActivePatient = { name: 'Mom' };
    expect(useActivePatientNameRaw()).toBe('Mom');
  });

  it('returns null when name is empty', () => {
    mockActivePatient = { name: '' };
    expect(useActivePatientNameRaw()).toBeNull();
  });

  it('returns null when name is a legacy placeholder', () => {
    mockActivePatient = { name: 'Patient' };
    expect(useActivePatientNameRaw()).toBeNull();
  });

  it('returns null when activePatient is null', () => {
    mockActivePatient = null;
    expect(useActivePatientNameRaw()).toBeNull();
  });
});
