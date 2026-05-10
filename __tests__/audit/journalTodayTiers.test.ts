// ============================================================================
// Phase 11.8.5 — Journal Today four-tier audit.
//
// Programmatic regression-pin for the four-tier today layout shipped
// across 11.8.1 → 11.8.4. Catches drift in three forms:
//
//   • A tier renders out of order (Notable Moments above Recap, etc.).
//   • A retired legacy surface drifts back into the today path
//     (WhatChangedToday / EventsTimeline / ForNextCaregiver).
//   • The value-based recap drifts back to the count-based path
//     (e.g. NarrativeSnapshot's isToday prop drops).
//
// Source-level audit because mounting Journal is impractical given
// its dependency graph; the same pattern other journal*.test.tsx
// files use.
//
// Pinned contracts:
//   1. The today-populated body imports all four tiers' components /
//      hooks: NarrativeSnapshot, TodayNotableMoments,
//      TodayStillPending, JournalNotesCard.
//   2. Render order is recap → notable → pending → notes.
//   3. NarrativeSnapshot is wired with isToday set from !isViewingPast.
//   4. The three retired legacy surfaces are absent from imports +
//      JSX render sites.
//   5. Each builder's source carries no patient-name interpolation.
//   6. Each builder's source carries no interpretive vocabulary.
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
// Contract 1 — all four tier components are imported
// ----------------------------------------------------------------------------

describe('Phase 11.8.5 — Today four-tier imports', () => {
  it('contract 1: imports NarrativeSnapshot (Tier 1)', () => {
    expect(journalSrc).toMatch(
      /import\s*\{[^}]*\bNarrativeSnapshot\b[^}]*\}\s*from\s*['"][^'"]+\/journal\/NarrativeSnapshot['"]/,
    );
  });

  it('contract 1: imports TodayNotableMoments (Tier 2)', () => {
    expect(journalSrc).toMatch(
      /import\s*\{[^}]*\bTodayNotableMoments\b[^}]*\}\s*from\s*['"][^'"]+\/journal\/TodayNotableMoments['"]/,
    );
  });

  it('contract 1: imports TodayStillPending (Tier 3)', () => {
    expect(journalSrc).toMatch(
      /import\s*\{[^}]*\bTodayStillPending\b[^}]*\}\s*from\s*['"][^'"]+\/journal\/TodayStillPending['"]/,
    );
  });

  it('contract 1: imports JournalNotesCard (Tier 4)', () => {
    expect(journalSrc).toMatch(
      /import\s*\{[^}]*\bJournalNotesCard\b[^}]*\}\s*from\s*['"][^'"]+\/journal\/JournalNotesCard['"]/,
    );
  });
});

// ----------------------------------------------------------------------------
// Contract 2 — render order is recap → notable → pending → notes
// ----------------------------------------------------------------------------

describe('Phase 11.8.5 — Today four-tier render order', () => {
  // Use the lastIndexOf so import-line matches don't pollute the
  // ordering check (imports declare the components before the JSX
  // render sites). lastIndexOf points at the JSX site since imports
  // come first.
  const recap = journalSrc.lastIndexOf('<NarrativeSnapshot');
  const notable = journalSrc.lastIndexOf('<TodayNotableMoments');
  const pending = journalSrc.lastIndexOf('<TodayStillPending');
  const notes = journalSrc.lastIndexOf('<JournalNotesCard');

  it('all four render sites exist', () => {
    expect(recap).toBeGreaterThan(-1);
    expect(notable).toBeGreaterThan(-1);
    expect(pending).toBeGreaterThan(-1);
    expect(notes).toBeGreaterThan(-1);
  });

  it('contract 2: NarrativeSnapshot renders before TodayNotableMoments', () => {
    expect(recap).toBeLessThan(notable);
  });

  it('contract 2: TodayNotableMoments renders before TodayStillPending', () => {
    expect(notable).toBeLessThan(pending);
  });

  it('contract 2: TodayStillPending renders before JournalNotesCard', () => {
    expect(pending).toBeLessThan(notes);
  });
});

// ----------------------------------------------------------------------------
// Contract 3 — NarrativeSnapshot wired with isToday
// ----------------------------------------------------------------------------

describe('Phase 11.8.5 — NarrativeSnapshot isToday wiring', () => {
  it('contract 3: NarrativeSnapshot is invoked with isToday derived from !isViewingPast', () => {
    // The today path uses the value-based recap; past days fall back
    // to buildDayNarrative. Pin the wiring so the prop doesn't drift
    // back to a hardcoded constant.
    expect(journalSrc).toMatch(
      /<NarrativeSnapshot[\s\S]{0,400}isToday=\{\s*!isViewingPast\s*\}/,
    );
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
