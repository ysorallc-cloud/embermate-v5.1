// ============================================================================
// Phase 5.8.c — requireProfileFields
//
// Reports which profile fields are missing for report generation:
//   • patient — registry name is empty or "Patient" placeholder
//   • caregiver — caregiverProfileRepo has no record
//
// Returns { missing: ['patient' | 'caregiver'] }. Empty array → all present.
// ============================================================================

const mockGetPatientRegistry = jest.fn();
const mockGetCaregiverProfile = jest.fn();

jest.mock('../../storage/patientRegistry', () => ({
  getPatientRegistry: (...a: any[]) => mockGetPatientRegistry(...a),
}));

jest.mock('../../storage/caregiverProfileRepo', () => ({
  getCaregiverProfile: (...a: any[]) => mockGetCaregiverProfile(...a),
}));

import { requireProfileFields } from '../../utils/requireProfileFields';

beforeEach(() => {
  jest.clearAllMocks();
});

function registryWithName(name: string) {
  return {
    patients: [{
      id: 'p1', name, relationship: 'parent', isDefault: true,
      createdAt: '', updatedAt: '',
    }],
    activePatientId: 'p1',
    version: 1,
  };
}

describe('Phase 5.8.c — requireProfileFields', () => {
  it('returns empty missing[] when both fields are populated', async () => {
    mockGetPatientRegistry.mockResolvedValue(registryWithName('Mom'));
    mockGetCaregiverProfile.mockResolvedValue({
      name: 'Sarah', createdAt: '', shortName: 'Sarah',
    });
    const out = await requireProfileFields();
    expect(out.missing).toEqual([]);
  });

  it('flags patient when registry name is "Patient" placeholder', async () => {
    mockGetPatientRegistry.mockResolvedValue(registryWithName('Patient'));
    mockGetCaregiverProfile.mockResolvedValue({
      name: 'Sarah', createdAt: '', shortName: 'Sarah',
    });
    const out = await requireProfileFields();
    expect(out.missing).toContain('patient');
    expect(out.missing).not.toContain('caregiver');
  });

  it('flags patient when registry name is empty', async () => {
    mockGetPatientRegistry.mockResolvedValue(registryWithName('  '));
    mockGetCaregiverProfile.mockResolvedValue({
      name: 'Sarah', createdAt: '', shortName: 'Sarah',
    });
    const out = await requireProfileFields();
    expect(out.missing).toContain('patient');
  });

  it('flags caregiver when no profile saved (null)', async () => {
    mockGetPatientRegistry.mockResolvedValue(registryWithName('Mom'));
    mockGetCaregiverProfile.mockResolvedValue(null);
    const out = await requireProfileFields();
    expect(out.missing).toContain('caregiver');
    expect(out.missing).not.toContain('patient');
  });

  it('flags both when both are missing', async () => {
    mockGetPatientRegistry.mockResolvedValue(registryWithName('Patient'));
    mockGetCaregiverProfile.mockResolvedValue(null);
    const out = await requireProfileFields();
    expect(out.missing).toContain('patient');
    expect(out.missing).toContain('caregiver');
    expect(out.missing.length).toBe(2);
  });

  it('returns the resolved values when present', async () => {
    mockGetPatientRegistry.mockResolvedValue(registryWithName('Mom'));
    mockGetCaregiverProfile.mockResolvedValue({
      name: 'Sarah Cook', shortName: 'Sarah', createdAt: '',
    });
    const out = await requireProfileFields();
    expect(out.patientName).toBe('Mom');
    expect(out.caregiverName).toBe('Sarah Cook');
    expect(out.caregiverShortName).toBe('Sarah');
  });
});
