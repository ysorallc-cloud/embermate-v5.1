// ============================================================================
// Phase 27.5b F3 — buildShapeOfDay builder.
//
// Replaces buildDayNarrative({ factualOnly: true }) for the Journal
// Section 1 (Subjective) gestalt line. The pre-27.5b output was a
// count-only roll-up:
//
//   "5/5 medications logged. 1 wellness check recorded."
//
// Phase 27.5b reframes the line as a shape-of-day description —
// observational prose that conveys what was done, what's pending, and
// what's standing out, in a witness voice consistent with the rest of
// the Journal handoff-document register.
//
// Per audit D4 + D5:
//   • Four state shapes the builder must handle naturally: fresh /
//     mid-day / end-of-day / mostly-missed. These are configurations
//     of the underlying data, NOT separate tone templates — same
//     observational voice across all four (no celebratory / shaming
//     templates per D4's "avoid tone categorization" guard).
//   • New builder, not a flag on buildDayNarrative (D5). Preserves
//     factualOnly for any other consumer (the audit found zero
//     production consumers post-F3, but the orphan call site in
//     NarrativeSnapshot.tsx keeps the flag alive for the file).
//   • Forbidden-vocab guardrails mirror nowStatusBuilder /
//     notableMomentsBuilder:
//       — No "you've..." / second-person warmth
//       — No "great work" / emotional language
//       — Counts inline, not as the lead phrase
//
// Pinned contracts:
//   1. hasData=false + empty summary when there are no instances for
//      the day (the GestaltSummary fallback "No record from this day."
//      then renders via its existing handling).
//   2. fresh state — instances exist but nothing completed yet —
//      surfaces what is scheduled, no judgment.
//   3. mid-day state — partial completion — surfaces both completed
//      and pending in the same line.
//   4. end-of-day state — all categories complete — surfaces
//      completion without celebratory language.
//   5. mostly-missed state — significant missed count — surfaces the
//      missed signal factually, no shaming.
//   6. forbidden-vocab sweep — no "you've", "great", "good job", etc.
//      in any output across the fixture set.
//   7. forbidden-vocab sweep — no second-person constructions
//      ("you've logged", "your meds", etc.).
//   8. summary is bounded — never more than 3 sentences.
// ============================================================================

const mockListDailyInstances = jest.fn();
const mockGetActivePatientId = jest.fn();

jest.mock('../../storage/carePlanRepo', () => ({
  listDailyInstances: (...a: any[]) => mockListDailyInstances(...a),
  DEFAULT_PATIENT_ID: 'default',
}));

jest.mock('../../storage/patientRegistry', () => ({
  getActivePatientId: (...a: any[]) => mockGetActivePatientId(...a),
}));

jest.mock('../../utils/devLog', () => ({
  logError: jest.fn(),
}));

import { buildShapeOfDay } from '../../utils/buildShapeOfDay';

beforeEach(() => {
  mockListDailyInstances.mockReset();
  mockGetActivePatientId.mockReset();
  mockGetActivePatientId.mockResolvedValue('default');
});

// Forbidden vocab the builder must never produce — mirrors
// nowStatusBuilder + notableMomentsBuilder guards. Tested via
// regex sweep across multiple fixture states.
const FORBIDDEN = /\byou've\b|\byou are\b|\byou're\b|\byour\b|\bgreat\b|\bgood job\b|\bwonderful\b|\bamazing\b|\bawesome\b|\bperfect\b|\bsuccess\b|\bnice\b/i;

// Fixture helpers — make instances with the four itemTypes Section 2
// already renders rows for.
function inst(
  itemType: 'medication' | 'vitals' | 'wellness' | 'nutrition',
  status: 'pending' | 'completed' | 'missed' | 'skipped',
  itemName?: string,
  scheduledTime?: string,
) {
  return {
    id: `${itemType}-${itemName ?? status}-${scheduledTime ?? '00:00'}`,
    itemType,
    status,
    itemName: itemName ?? `${itemType} item`,
    scheduledTime: scheduledTime ?? '08:00',
    carePlanItemId: 'cpid',
  };
}

describe('Phase 27.5b F3 — buildShapeOfDay', () => {
  it('contract 1: hasData=false + empty summary when there are no instances', async () => {
    mockListDailyInstances.mockResolvedValue([]);
    const result = await buildShapeOfDay('2026-05-15');
    expect(result.hasData).toBe(false);
    expect(result.summary.trim()).toBe('');
  });

  it('contract 2: fresh state — instances scheduled, nothing completed — surfaces what is scheduled', async () => {
    mockListDailyInstances.mockResolvedValue([
      inst('medication', 'pending', 'Lisinopril', '08:00'),
      inst('medication', 'pending', 'Aspirin',    '08:00'),
      inst('vitals',     'pending', 'BP',         '08:00'),
      inst('wellness',   'pending', 'Morning',    '08:00'),
    ]);
    const result = await buildShapeOfDay('2026-05-15');
    expect(result.hasData).toBe(true);
    expect(result.summary.length).toBeGreaterThan(0);
    // Fresh state must communicate "scheduled / not yet logged" without
    // count-lead phrasing. The presence of meds + vitals + wellness
    // in the input means each category should appear in the output OR
    // be aggregated as "still scheduled" / "still pending".
    expect(result.summary.toLowerCase()).toMatch(/scheduled|pending|not yet/);
    // No completion language since nothing is done.
    expect(result.summary.toLowerCase()).not.toMatch(/all\s+(meds|medications)\s+(logged|taken)/);
    expect(result.summary).not.toMatch(FORBIDDEN);
  });

  it('contract 3: mid-day state — partial completion — surfaces both done and pending', async () => {
    mockListDailyInstances.mockResolvedValue([
      inst('medication', 'completed', 'Lisinopril', '08:00'),
      inst('medication', 'completed', 'Aspirin',    '08:00'),
      inst('medication', 'pending',   'Evening',    '20:00'),
      inst('vitals',     'completed', 'BP',         '08:00'),
      inst('wellness',   'pending',   'Evening',    '20:00'),
      inst('nutrition',  'completed', 'Breakfast',  '08:00'),
      inst('nutrition',  'pending',   'Dinner',     '18:00'),
    ]);
    const result = await buildShapeOfDay('2026-05-15');
    expect(result.hasData).toBe(true);
    // The line must mention at least one completed category AND at
    // least one pending category (mid-day = mix).
    const lc = result.summary.toLowerCase();
    expect(lc).toMatch(/logged|taken|recorded|done/);
    expect(lc).toMatch(/pending|scheduled|not yet/);
    expect(result.summary).not.toMatch(FORBIDDEN);
  });

  it('contract 4: end-of-day state — all categories complete — surfaces completion without celebratory language', async () => {
    mockListDailyInstances.mockResolvedValue([
      inst('medication', 'completed', 'Lisinopril', '08:00'),
      inst('medication', 'completed', 'Aspirin',    '08:00'),
      inst('medication', 'completed', 'Evening',    '20:00'),
      inst('vitals',     'completed', 'BP',         '08:00'),
      inst('wellness',   'completed', 'Morning',    '08:00'),
      inst('wellness',   'completed', 'Evening',    '20:00'),
      inst('nutrition',  'completed', 'Breakfast',  '08:00'),
      inst('nutrition',  'completed', 'Lunch',      '12:00'),
      inst('nutrition',  'completed', 'Dinner',     '18:00'),
    ]);
    const result = await buildShapeOfDay('2026-05-15');
    expect(result.hasData).toBe(true);
    const lc = result.summary.toLowerCase();
    // Communicates completion factually
    expect(lc).toMatch(/logged|taken|recorded/);
    // No celebratory tone, no second-person
    expect(result.summary).not.toMatch(FORBIDDEN);
    // No pending/scheduled mentions when nothing is pending
    expect(lc).not.toMatch(/still pending|not yet/);
  });

  it('contract 5: mostly-missed state — significant missed count — surfaces missed factually', async () => {
    mockListDailyInstances.mockResolvedValue([
      inst('medication', 'missed',  'Lisinopril', '08:00'),
      inst('medication', 'missed',  'Aspirin',    '08:00'),
      inst('vitals',     'missed',  'BP',         '08:00'),
      inst('wellness',   'missed',  'Morning',    '08:00'),
      inst('nutrition',  'pending', 'Dinner',     '18:00'),
    ]);
    const result = await buildShapeOfDay('2026-05-15');
    expect(result.hasData).toBe(true);
    const lc = result.summary.toLowerCase();
    // Missed signal present
    expect(lc).toMatch(/missed|not logged/);
    // No shaming tone — forbidden vocab still empty
    expect(result.summary).not.toMatch(FORBIDDEN);
    // No completion language
    expect(lc).not.toMatch(/all\s+(meds|medications)\s+(logged|taken)/);
  });

  it('contract 6: forbidden-vocab sweep across all state shapes', async () => {
    const fixtures = [
      [], // empty
      [inst('medication', 'pending')], // sparse
      [inst('medication', 'completed'), inst('vitals', 'pending')], // mid
      [inst('medication', 'completed'), inst('vitals', 'completed'), inst('wellness', 'completed')], // mostly done
      [inst('medication', 'missed'), inst('vitals', 'missed')], // mostly missed
    ];
    for (const f of fixtures) {
      mockListDailyInstances.mockResolvedValue(f);
      const result = await buildShapeOfDay('2026-05-15');
      expect(result.summary).not.toMatch(FORBIDDEN);
    }
  });

  it('contract 7: no second-person constructions across any state shape', async () => {
    const fixtures = [
      [inst('medication', 'completed')],
      [inst('medication', 'pending'), inst('vitals', 'pending')],
      [inst('medication', 'completed'), inst('vitals', 'completed'), inst('wellness', 'missed')],
    ];
    const secondPersonRe = /\byou(?:'ve|'re| are| have| can| might| should| could| will)?\b|\byour\b/i;
    for (const f of fixtures) {
      mockListDailyInstances.mockResolvedValue(f);
      const result = await buildShapeOfDay('2026-05-15');
      expect(result.summary).not.toMatch(secondPersonRe);
    }
  });

  it('contract 8: summary is bounded — never more than 3 sentences', async () => {
    // Heavy fixture covering every category so the builder is tempted
    // to enumerate everything. The bound forces it to compress.
    mockListDailyInstances.mockResolvedValue([
      inst('medication', 'completed', 'Lisinopril', '08:00'),
      inst('medication', 'completed', 'Aspirin',    '08:00'),
      inst('medication', 'missed',    'Evening',    '20:00'),
      inst('vitals',     'completed', 'BP morning', '08:00'),
      inst('vitals',     'pending',   'BP evening', '20:00'),
      inst('wellness',   'completed', 'Morning',    '08:00'),
      inst('wellness',   'pending',   'Evening',    '20:00'),
      inst('nutrition',  'completed', 'Breakfast',  '08:00'),
      inst('nutrition',  'completed', 'Lunch',      '12:00'),
      inst('nutrition',  'pending',   'Dinner',     '18:00'),
    ]);
    const result = await buildShapeOfDay('2026-05-15');
    expect(result.hasData).toBe(true);
    // Count terminal punctuation as a sentence-count proxy. The
    // builder uses periods to separate clauses; em-dashes don't
    // terminate sentences. Up to 3.
    const sentenceCount = (result.summary.match(/\./g) ?? []).length;
    expect(sentenceCount).toBeLessThanOrEqual(3);
  });

  it('contract 9: error path returns empty + hasData=false (no throw on storage failure)', async () => {
    mockListDailyInstances.mockRejectedValue(new Error('storage failure'));
    const result = await buildShapeOfDay('2026-05-15');
    expect(result.hasData).toBe(false);
    expect(result.summary).toBe('');
  });
});
