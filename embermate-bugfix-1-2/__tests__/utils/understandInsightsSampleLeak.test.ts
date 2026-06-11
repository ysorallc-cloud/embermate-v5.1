// ============================================================================
// SAMPLE-DATA LEAK — Insights fabricates data on a FRESH account.
//
// Bug (found 2026-05-24, device-confirmed): on a genuinely new account
// where the user chose "Start Fresh" (NOT sample/example mode), the
// Insights tab renders fabricated content — synthetic correlations
// ("Sleep & Mood", "Hydration & Energy"), positive observations, and
// stand-out insights that describe a patient who does not exist.
//
// Root cause: loadUnderstandPageData's synthetic-preview fallback gates
// only on ABSENCE of data:
//
//   shouldShowSample = !hasEnoughData && !hasCarePlanData
//                      && daysOfData < 5 && !sampleDismissed
//
// A fresh Start-Fresh account satisfies every condition, so
// getSampleData() runs even though the user never opted into sample
// mode. The gate is missing the one condition that matters: the user
// explicitly chose sample data during onboarding, recorded as
// `sample_data_seeded === 'true'` (the same flag appStartup's
// sampleData phase guards on).
//
// Contract pinned here:
//   • Fresh account, sample mode NOT chosen → isSampleData must be
//     false and no synthetic correlation/insight content may appear.
//   • Sample mode explicitly chosen (sample_data_seeded === 'true')
//     → synthetic preview is allowed (isSampleData true).
//
// This is a trust/safety contract for a care app: a new caregiver must
// never see fabricated health data that could be mistaken for their
// loved one's real record.
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadUnderstandPageData } from '../../utils/understandInsights';

jest.mock('../../utils/devLog', () => ({
  logError: () => {},
  devLog: () => {},
}));

describe('Insights sample-data leak — fresh account must not fabricate data', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
  });

  it('fresh Start-Fresh account (no sample flag) gets NO synthetic sample data', async () => {
    // Fresh account: AsyncStorage is empty — no logs, no care plan,
    // no baselines, and critically NO sample_data_seeded flag.
    const pageData = await loadUnderstandPageData(7);

    expect(pageData.isSampleData).toBe(false);
    // Honest empty-state guidance ("No clear patterns yet…") is fine.
    // Fabricated sample content is not — sample fixtures all carry
    // 'sample-' ids and synthetic correlation cards.
    expect(pageData.correlationCards).toEqual([]);
    const allIds = [
      ...pageData.standOutInsights.map((i) => i.id),
      ...pageData.positiveObservations.map((o) => o.id),
    ];
    expect(allIds.filter((id) => id.startsWith('sample-'))).toEqual([]);
  });

  it('account that explicitly chose sample mode still gets the synthetic preview', async () => {
    // User opted into sample/example mode during onboarding.
    await AsyncStorage.setItem('sample_data_seeded', JSON.stringify('true'));

    const pageData = await loadUnderstandPageData(7);

    expect(pageData.isSampleData).toBe(true);
  });

  it('sample-mode preview still respects prior dismissal', async () => {
    await AsyncStorage.setItem('sample_data_seeded', JSON.stringify('true'));
    await AsyncStorage.setItem(
      '@understand_sample_dismissed',
      JSON.stringify('true'),
    );

    const pageData = await loadUnderstandPageData(7);

    expect(pageData.isSampleData).toBe(false);
  });
});
