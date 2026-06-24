// ============================================================================
// onboarding-personalize — relationship surfaces on the visible paths.
//
// Q1 persists the relationship to the patientRegistry (via updatePatient),
// because the surfaces that DISPLAY it — the care-report copy
// (careSummaryBuilder), the Journal patient snapshot, and the
// Switch-Patient label — all read patientRegistry.relationship, NOT the
// PATIENT_RELATIONSHIP key. This pins that the registry write reaches the
// report-copy path; plus source-pins for the wiring + the switcher label.
//
// Real storage (jest.setup AsyncStorage), no mocks on the registry pipeline.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { updatePatient } from '../../storage/patientRegistry';
import { buildCareBrief } from '../../utils/careSummaryBuilder';

const ROOT = join(__dirname, '../..');

async function clearAll(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  if (keys.length > 0) await AsyncStorage.multiRemove(keys as string[]);
}

beforeEach(async () => {
  await clearAll();
});

describe('onboarding-personalize — relationship surfaces in the report-copy path', () => {
  it("contract 1 (REPORT COPY): registry.relationship='parent' → buildCareBrief patient.relationship is 'parent'", async () => {
    await updatePatient('default', { name: 'Mommy', relationship: 'parent' });

    const brief = await buildCareBrief();
    expect(brief.patient.relationship).toBe('parent');
  });

  it("contract 2 ('self' SUPPRESSED): a 'self' relationship is not surfaced as report copy (reads as undefined)", async () => {
    await updatePatient('default', { name: 'Me', relationship: 'self' });

    const brief = await buildCareBrief();
    expect(brief.patient.relationship).toBeUndefined();
  });
});

describe('onboarding-personalize — wiring + switcher label source-pins', () => {
  const indexSrc = readFileSync(join(ROOT, 'app/(onboarding)/index.tsx'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '');
  const switcherSrc = readFileSync(
    join(ROOT, 'components/now/PatientSwitcherModal.tsx'),
    'utf8',
  );

  it('contract 3 (PERSIST TO REGISTRY + MIRROR): completeOnboarding writes relationship to the registry and mirrors to PATIENT_RELATIONSHIP', () => {
    expect(indexSrc).toMatch(/updatePatient\(\s*DEFAULT_PATIENT_ID\s*,\s*\{\s*relationship\s*\}/);
    expect(indexSrc).toMatch(/safeSetItem\(\s*StorageKeys\.PATIENT_RELATIONSHIP\s*,\s*relationship\s*\)/);
  });

  it('contract 4 (NO COLLECTED-ANSWER BYPASS): the generator is fed the collected careAreas, not a hardcoded list', () => {
    expect(indexSrc).toMatch(/careAreas\s*,/);          // collected state threaded
    expect(indexSrc).not.toMatch(/careAreas:\s*\[\s*'medications'\s*,\s*'wellness'\s*\]/); // old hardcode gone
  });

  it('contract 5 (SWITCH-PATIENT LABEL): the switcher reads patient.relationship (registry)', () => {
    expect(switcherSrc).toMatch(/patient\.relationship/);
  });
});
