// ============================================================================
// Phase 5.13.1.b — patientNameWriter unifies the three-operation write path.
// ============================================================================

const mockSetItem = jest.fn();
const mockUpdatePatient = jest.fn();
const mockEmit = jest.fn();

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { setItem: (k: string, v: string) => mockSetItem(k, v) },
}));

jest.mock('../../storage/patientRegistry', () => ({
  updatePatient: (id: string, updates: any) => mockUpdatePatient(id, updates),
}));

jest.mock('../../lib/events', () => ({
  emitDataUpdate: (cat: string) => mockEmit(cat),
}));

jest.mock('../../lib/eventNames', () => ({
  EVENT: { PATIENT: 'patient' },
}));

import { writePatientName } from '../../utils/patientNameWriter';
import { StorageKeys } from '../../utils/storageKeys';

beforeEach(() => {
  mockSetItem.mockReset();
  mockUpdatePatient.mockReset();
  mockEmit.mockReset();
  mockUpdatePatient.mockResolvedValue({ id: 'default', name: 'Mom' });
  mockSetItem.mockResolvedValue(undefined);
});

describe('writePatientName — happy path', () => {
  it('updates the registry with the trimmed name', async () => {
    await writePatientName('default', 'Mom');
    expect(mockUpdatePatient).toHaveBeenCalledWith('default', { name: 'Mom' });
  });

  it('mirrors the trimmed name to AsyncStorage', async () => {
    await writePatientName('default', '  Mom  ');
    expect(mockSetItem).toHaveBeenCalledWith(StorageKeys.PATIENT_NAME, 'Mom');
  });

  it('emits EVENT.PATIENT to refresh downstream subscribers', async () => {
    await writePatientName('default', 'Mom');
    expect(mockEmit).toHaveBeenCalledWith('patient');
  });

  it('runs the registry write before the mirror write before the emit', async () => {
    const order: string[] = [];
    mockUpdatePatient.mockImplementation(async () => { order.push('registry'); });
    mockSetItem.mockImplementation(async () => { order.push('mirror'); });
    mockEmit.mockImplementation(() => { order.push('emit'); });
    await writePatientName('default', 'Mom');
    expect(order).toEqual(['registry', 'mirror', 'emit']);
  });
});

describe('writePatientName — no-op cases', () => {
  it('does nothing on empty input', async () => {
    await writePatientName('default', '');
    expect(mockUpdatePatient).not.toHaveBeenCalled();
    expect(mockSetItem).not.toHaveBeenCalled();
    expect(mockEmit).not.toHaveBeenCalled();
  });

  it('does nothing on whitespace-only input', async () => {
    await writePatientName('default', '   ');
    expect(mockUpdatePatient).not.toHaveBeenCalled();
    expect(mockSetItem).not.toHaveBeenCalled();
    expect(mockEmit).not.toHaveBeenCalled();
  });
});

describe('writePatientName — error propagation', () => {
  it('rethrows when the registry write fails', async () => {
    mockUpdatePatient.mockRejectedValueOnce(new Error('registry boom'));
    await expect(writePatientName('default', 'Mom')).rejects.toThrow('registry boom');
  });
});
