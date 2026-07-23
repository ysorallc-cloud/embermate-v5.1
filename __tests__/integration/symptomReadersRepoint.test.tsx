// ============================================================================
// Symptom readers repointed off the dead eventRepo `symptom_reported` stream to
// the LIVE symptom store (via the getSymptomEventsInRange adapter). Drives the
// REAL writer (saveSymptom — what log-symptom/log-pain call) and asserts each
// reader surfaces the symptom. NOT a synthetic eventRepo array, and NOT a mock of
// the store being read (that's exactly how the original empty-store bug hid).
//
// Readers covered: the adapter, functionalIssueExtraction (mobility),
// narrativeSummaryBuilder (summary pill), and useDayEvents (EventsTimeline source).
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { renderHook, waitFor } from '@testing-library/react-native';
import { saveSymptom } from '../../utils/symptomStorage';
import { getSymptomEventsInRange } from '../../utils/symptomEvents';
import { extractFunctionalIssues } from '../../services/functionalIssueExtraction';
import { buildDayNarrative } from '../../utils/narrativeSummaryBuilder';
import { detectDayLevelChanges } from '../../services/dayLevelChanges';
import { useDayEvents } from '../../hooks/useDayEvents';
import { DEFAULT_PATIENT_ID } from '../../storage/carePlanRepo';

jest.mock('../../storage/patientRegistry', () => ({
  getActivePatientId: jest.fn(async () => 'default'),
}));

async function clearAll(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  if (keys.length > 0) await AsyncStorage.multiRemove(keys as string[]);
}

async function logSymptom(name: string, day: string, severity = 5): Promise<void> {
  await saveSymptom({
    symptom: name,
    severity,
    description: '',
    timestamp: `${day}T12:00:00.000Z`,
    date: day,
  } as any);
}

const RANGE = { start: '2026-06-01', end: '2026-06-14' };

describe('symptom readers — repointed to the live store, driven by saveSymptom', () => {
  beforeEach(async () => { await clearAll(); });

  it('ADAPTER: saveSymptom → getSymptomEventsInRange returns synthetic symptom_reported events in the window', async () => {
    await logSymptom('Dizziness', '2026-06-05', 6);
    await logSymptom('Nausea', '2026-05-20');  // before window → excluded
    const events = await getSymptomEventsInRange(DEFAULT_PATIENT_ID, RANGE.start, RANGE.end);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('symptom_reported');
    expect((events[0].metadata as any).symptomName).toBe('Dizziness');
    expect((events[0].metadata as any).severity).toBe(6);
  });

  it('functionalIssueExtraction: logged fall symptoms → a "mobility" issue surfaces', async () => {
    await logSymptom('Had a fall', '2026-06-03');
    await logSymptom('Near fall in the hallway', '2026-06-10');
    const issues = await extractFunctionalIssues(DEFAULT_PATIENT_ID, RANGE);
    const mobility = issues.find((i) => i.category === 'mobility');
    expect(mobility).toBeDefined();
    expect(mobility!.observation.toLowerCase()).toMatch(/fall/);
  });

  it('narrativeSummaryBuilder: a symptom on the day → the day narrative shows a symptom pill', async () => {
    await logSymptom('Headache', '2026-06-08');
    const narrative = await buildDayNarrative('2026-06-08');
    const pill = narrative.summaryPills.find((p) => /symptom/i.test(p.label));
    expect(pill).toBeDefined();
    expect(pill!.label).toMatch(/1 symptom/);
  });

  it('dayLevelChanges: a symptom newly logged on the day → a "symptoms" day-change fires', async () => {
    await logSymptom('Blurred vision', '2026-06-14');
    const result = await detectDayLevelChanges('2026-06-14');
    const symptomChange = result.changes.find((c) => c.category === 'symptoms');
    expect(symptomChange).toBeDefined();
  });

  it('useDayEvents (EventsTimeline source): saveSymptom → the day\'s events include the symptom', async () => {
    await logSymptom('Cramping', '2026-06-08');
    const { result } = renderHook(() => useDayEvents('2026-06-08'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    const symptom = result.current.events.find((e) => e.type === 'symptom_reported');
    expect(symptom).toBeDefined();
    expect((symptom!.metadata as any).symptomName).toBe('Cramping');
  });
});
