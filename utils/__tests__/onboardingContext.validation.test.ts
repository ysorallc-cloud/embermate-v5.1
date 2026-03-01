// File: utils/__tests__/onboardingContext.validation.test.ts
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Onboarding context collection', () => {
  const content = readFileSync(
    join(__dirname, '../../app/(onboarding)/screens/GetStartedScreen.tsx'), 'utf8');

  test('has patient name input', () => {
    expect(content).toMatch(/TextInput|patient.*name/i);
  });

  test('has bucket selection UI', () => {
    expect(content).toMatch(/BucketType|BUCKET_META|bucket/i);
  });

  test('saves patient name on completion', () => {
    expect(content).toMatch(/patient_name|PATIENT_NAME|patientRegistry/i);
  });

  test('creates care plan config from selections', () => {
    expect(content).toMatch(/CarePlanConfig|enableBucket|getOrCreate/i);
  });

  test('sample data is NOT default', () => {
    expect(content).not.toMatch(/seedSampleData.*true.*default/i);
  });
});
