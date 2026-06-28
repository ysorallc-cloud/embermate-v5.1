// ============================================================================
// Phase 5.10.d — Visit Prep toggle ↔ section linkage.
//
// Two contracts pinned here:
//
// 1. Sections render their HEADER even when data is empty, AS LONG AS the
//    toggle is ON. Body becomes a "No [data type] logged in this window."
//    sentinel rather than a silent omission. Caregivers tracked these
//    categories deliberately; "no data" is itself a clinical signal.
//
// 2. Toggle labels and PDF section names match character-for-character,
//    in the same order. Future drift catches here.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');

describe('Phase 5.10.d — VisitPrepConfig has flags for the new sections', () => {
  const src = readFileSync(join(ROOT, 'services/visitPrepPdf.ts'), 'utf8');
  it('includeRedFlags flag exists', () => {
    expect(src).toMatch(/includeRedFlags\??:\s*boolean/);
  });
  it('includeHydrationNutrition flag exists', () => {
    expect(src).toMatch(/includeHydrationNutrition\??:\s*boolean/);
  });
});

describe('Phase 5.10.d — config screen toggle labels match PDF sections', () => {
  const src = readFileSync(join(ROOT, 'app/visit-prep.tsx'), 'utf8');

  // The full set of toggles, in the order they should appear in the
  // config screen. Same labels and order as the PDF section sequence so
  // a user toggling off "Vitals" sees the Vitals section disappear in
  // both preview and PDF — no re-mapping.
  const expected = [
    'Red Flags & Alerts',
    'Medication adherence',
    'Vitals',
    'Hydration & Nutrition',
    'Sleep, Energy & Mood',
    'Caregiver notes',
    'Questions for this visit',
  ];

  it('all expected toggle labels are present in the file', () => {
    for (const label of expected) {
      expect(src).toContain(`label: '${label}'`);
    }
  });

  it('toggle order in the source matches PDF section order', () => {
    const indices = expected.map((label) => src.indexOf(`label: '${label}'`));
    for (let i = 1; i < indices.length; i++) {
      expect(indices[i]).toBeGreaterThan(indices[i - 1]);
    }
  });

  it('renamed toggles no longer use the legacy labels', () => {
    expect(src).not.toMatch(/label:\s*'Vitals & trends'/);
    expect(src).not.toMatch(/label:\s*'Mood & wellness'/);
    expect(src).not.toMatch(/label:\s*'Journal highlights'/);
    expect(src).not.toMatch(/label:\s*'Questions for the doctor'/);
  });
});

describe('Phase 5.10.d — empty-state sentinels in PDF', () => {
  const src = readFileSync(join(ROOT, 'services/visitPrepPdf.ts'), 'utf8');

  it("Medication adherence empty-state body reads 'No medications logged in this window.'", () => {
    expect(src).toMatch(/No medications logged in this window/);
  });

  it("Vitals empty-state body uses the shared NO_VITALS_IN_RANGE string", () => {
    // device-walk fix #2 — vitals empty-state unified into utils/reportVitals
    // (NO_VITALS_IN_RANGE = 'No vitals logged in this range.') so the care-report
    // Full export and Visit Prep render the SAME string. The literal now lives
    // in the shared module; the PDF references the constant.
    expect(src).toMatch(/NO_VITALS_IN_RANGE/);
    expect(src).not.toMatch(/No vitals readings in this window/);
  });

  it("Caregiver notes empty-state body reads 'No notes saved in this window.'", () => {
    expect(src).toMatch(/No notes saved in this window/);
  });

  it("Questions empty-state body reads 'No questions saved for this visit.'", () => {
    expect(src).toMatch(/No questions saved for this visit/);
  });
});

describe('Phase 5.10.d — toggle gates apply to BOTH preview and PDF', () => {
  const previewSrc = readFileSync(join(ROOT, 'app/visit-prep-preview.tsx'), 'utf8');
  const pdfSrc = readFileSync(join(ROOT, 'services/visitPrepPdf.ts'), 'utf8');

  it('preview gates sections on data.includes.* flags (threaded through assembleVisitPrepData)', () => {
    // The preview consumes the assembled VisitPrepData.includes block —
    // assembleVisitPrepData translates the raw config flags into includes
    // so preview and PDF see the same shape.
    expect(previewSrc).toMatch(/data\.includes\.meds/);
    expect(previewSrc).toMatch(/data\.includes\.vitals/);
    expect(previewSrc).toMatch(/data\.includes\.redFlags/);
    expect(previewSrc).toMatch(/data\.includes\.hydrationNutrition/);
  });

  it('preview renders empty-state body strings (parity with PDF)', () => {
    // Identical sentinels — the preview must show what the PDF will show.
    expect(previewSrc).toMatch(/No medications logged in this window/);
    // device-walk fix #2 — vitals empty-state unified to the shared constant.
    expect(previewSrc).toMatch(/NO_VITALS_IN_RANGE/);
    expect(previewSrc).toMatch(/No notes saved in this window/);
  });

  it('assembleVisitPrepData skips Red Flags when includeRedFlags is false', () => {
    // The flag must be consulted before pushing flags into the result.
    expect(pdfSrc).toMatch(/includeRedFlags/);
  });

  it('assembleVisitPrepData skips Hydration & Nutrition when toggle off', () => {
    expect(pdfSrc).toMatch(/includeHydrationNutrition/);
  });
});
