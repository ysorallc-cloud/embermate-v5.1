// ============================================================================
// Phase 11.8.5 — Journal Today four-tier audit.
// PARTIALLY RETIRED in Phase 27 F8.
//
// Pre-Phase-27 this file pinned the four-tier today layout (recap →
// notable → pending → notes) shipped across 11.8.1 → 11.8.4. Phase 27
// replaced that linear layout with the four SOAP-shaped section cards
// (Subjective / Objective / Assessment / Plan); the old "<NarrativeSnapshot
// before TodayNotableMoments" ordering no longer holds, and the
// NarrativeSnapshot mount itself was retired from the today path
// (component file is intentional orphan post-27 per audit D6).
//
// Per the repo's retirement convention (see journalDisclaimer.test.tsx
// / sampleIndicatorTap.test.tsx / Phase 26 footer pattern), the
// pre-27 contracts flip to absence pins / are deleted; contracts that
// still hold (builder constraints — no patient-name interpolation,
// no interpretive vocabulary) stay green unchanged.
//
// Surviving contracts:
//   4. The three retired legacy surfaces (WhatChangedToday /
//      EventsTimeline / ForNextCaregiver) stay absent from the today
//      path. Unchanged.
//   5. Each builder's source carries no patient-name interpolation.
//      Unchanged.
//   6. Each builder's source carries no interpretive vocabulary.
//      Unchanged.
//
// Retired (flipped to absence / deleted, see below):
//   1. The today-populated body imports all four tiers' components —
//      Phase 27 retired the NarrativeSnapshot mount; only three of the
//      four are still imported by journal.tsx as render-site components.
//   2. Render order recap → notable → pending → notes — Phase 27's
//      four SOAP cards subsume this ordering; new contracts live in
//      journalSection2Wiring27 / journalSection4Wiring27 etc.
//   3. NarrativeSnapshot isToday wiring — no longer mounted on today.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const journalSrc = readFileSync(join(ROOT, 'app/(tabs)/journal.tsx'), 'utf8');

function readUtilSrc(rel: string): string {
  return readFileSync(join(ROOT, rel), 'utf8');
}

// Strip line + block comments so audits don't false-match against
// historical-context comment blocks.
function codeOnly(src: string): string {
  const lines = src.split('\n');
  let inBlock = false;
  const out: string[] = [];
  for (const line of lines) {
    let l = line;
    if (inBlock) {
      const e = l.indexOf('*/');
      if (e >= 0) { inBlock = false; l = l.slice(e + 2); } else continue;
    }
    const bs = l.indexOf('/*');
    if (bs >= 0) {
      const be = l.indexOf('*/', bs + 2);
      if (be >= 0) l = l.slice(0, bs) + l.slice(be + 2);
      else { inBlock = true; l = l.slice(0, bs); }
    }
    const lc = l.indexOf('//');
    if (lc >= 0) l = l.slice(0, lc);
    out.push(l);
  }
  return out.join('\n');
}

// ----------------------------------------------------------------------------
// Contracts 1-3 retired in Phase 27 F8 (see file header). The four-tier
// linear layout was replaced with the four SOAP-shaped section cards;
// new structural contracts live in:
//   __tests__/screens/journalSection1Wiring27.test.ts (Subjective)
//   __tests__/screens/journalSection2Wiring27.test.ts (Objective)
//   __tests__/components/todayNotableMomentsWrapInSection27.test.tsx (Assessment wrap)
//   __tests__/screens/journalSection4Wiring27.test.ts (Plan)
// The retired contracts flip to a single absence pin defending the
// retirement direction: the today path no longer renders a standalone
// <NarrativeSnapshot mount (it's the canonical signal the Phase 27
// SOAP restructure landed correctly).
// ----------------------------------------------------------------------------

describe('Phase 11.8.5 — retired today-tier contracts (Phase 27 F8)', () => {
  it('contract 1-3 retirement: today path no longer renders a standalone <NarrativeSnapshot mount', () => {
    // Phase 27 F7 retired NarrativeSnapshot from the today path. The
    // import may still exist in journal.tsx (defensive — past-day path
    // could revive it via NarrativeView in the future), but the JSX
    // mount is gone. Pin the absence.
    expect(journalSrc).not.toMatch(/<NarrativeSnapshot/);
  });
});

// ----------------------------------------------------------------------------
// Contract 4 — retired legacy surfaces are gone from the today path
// ----------------------------------------------------------------------------

describe('Phase 11.8.5 — retired legacy surfaces stay retired', () => {
  const retired = ['WhatChangedToday', 'EventsTimeline', 'ForNextCaregiver'] as const;

  for (const name of retired) {
    it(`contract 4: journal.tsx does NOT import ${name}`, () => {
      const re = new RegExp(`^\\s*import\\s+\\{\\s*${name}\\s*\\}\\s+from\\s+['"][^'"]+${name}['"]`, 'm');
      expect(journalSrc).not.toMatch(re);
    });

    it(`contract 4: journal.tsx does NOT render <${name} />`, () => {
      expect(journalSrc).not.toMatch(new RegExp(`<${name}\\b`));
    });
  }
});

// ----------------------------------------------------------------------------
// Contract 5 + 6 — builder source-level constraints
// ----------------------------------------------------------------------------

describe('Phase 11.8.5 — Today builders are patient-agnostic + observation-only', () => {
  const builders = [
    { rel: 'utils/todayRecapBuilder.ts',     name: 'todayRecapBuilder' },
    { rel: 'utils/notableMomentsBuilder.ts', name: 'notableMomentsBuilder' },
    { rel: 'utils/stillPendingFormat.ts',    name: 'stillPendingFormat' },
  ];

  for (const b of builders) {
    describe(b.name, () => {
      const src = codeOnly(readUtilSrc(b.rel));

      it('contract 5: no patient-name interpolation in source', () => {
        expect(src).not.toMatch(/\$\{[a-zA-Z_]*[Pp]atient[A-Za-z]*\}/);
        expect(src).not.toMatch(/\bpatientName\b/);
        expect(src).not.toMatch(/\bactivePatient\b/);
        expect(src).not.toMatch(/\busePatient\b/);
      });

      it('contract 6: no interpretive vocabulary in source strings', () => {
        // Strings the builder might emit. Forbidden vocab list mirrors
        // narrativeSummaryBuilder factualOnly + the 11.8.1/.2
        // builder contracts.
        const FORBIDDEN = /\b(concerning|alarming|stable|abnormal|unwell|good sign|worrying)\b/i;
        // Walk only string literals in the source. Regex extracts
        // both single-quoted and double-quoted strings; backtick
        // template literals (which are larger blocks) are scanned as
        // their full body. False positives on identifiers like
        // "stable" inside variable names won't fire because we limit
        // to quoted contexts.
        const stringMatches = src.match(/(['"`])(?:(?!\1)[^\\]|\\.)*\1/g) ?? [];
        for (const lit of stringMatches) {
          expect(lit).not.toMatch(FORBIDDEN);
        }
      });
    });
  }
});
