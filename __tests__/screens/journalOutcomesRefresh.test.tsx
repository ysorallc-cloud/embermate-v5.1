// ============================================================================
// Phase 11.7.1 — Journal outcomes refresh listener.
//
// Bug repro: device check after 11.6 surfaced that Journal "Today"
// rendered "0/5 medications logged" + the JournalEmptyDay fallback
// while Now-tab correctly showed 3/5 meds completed. The instance
// pipeline was populated; only Journal's view was stale.
//
// Root cause: `outcomes` state was loaded by a useEffect with deps
// `[selectedDate]` only. The existing useDataListener (line 316)
// called `loadReport()` on relevant events but `loadReport` doesn't
// touch `outcomes`. After sample-data init's MEDICATION/PATIENT
// events fired, outcomes stayed at its initial empty state.
//
// Fix: add a useDataListener that re-calls getDailyOutcomes on the
// witness builder's read pipelines (DAILY_INSTANCES / LOGS /
// MEDICATION / WELLNESS / SAMPLE_DATA_CLEARED). Same multi-pipeline
// filter pattern as Phase 11.3's support.tsx witness refresh.
//
// Source-level audits — Journal mounts a heavy dependency graph
// (PatientContext, hooks, etc.); existing journal*.test.tsx files
// are all source-level. This file follows that established pattern.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const SRC = readFileSync(
  join(__dirname, '../..', 'app/(tabs)/journal.tsx'),
  'utf8',
);

// Strip line + block comments so audits don't false-match documentation.
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

const CODE = codeOnly(SRC);

describe('Phase 11.7.1 — Journal outcomes refresh listener', () => {
  it('contract 1: a refreshOutcomes callback is wired and re-invocable', () => {
    // The fix names the refresh function `refreshOutcomes` so future
    // edits can find the call site. The function exists and is
    // referenced from at least the mount-time effect.
    expect(CODE).toMatch(/const\s+refreshOutcomes\s*=\s*useCallback/);
  });

  it('contract 2: refreshOutcomes calls getDailyOutcomes(selectedDate)', () => {
    // Pin the body shape — the function reads the same source the
    // counter line and empty-day check read from. Drift here would
    // re-introduce the stale-state bug. Match a generous window
    // after the declaration since the body contains nested parens
    // (`.catch(() => {})`) that defeat lazy matching.
    const declStart = CODE.indexOf('const refreshOutcomes');
    expect(declStart).toBeGreaterThan(-1);
    const window = CODE.slice(declStart, declStart + 400);
    expect(window).toMatch(/getDailyOutcomes\s*\(\s*selectedDate\s*\)/);
    expect(window).toMatch(/setOutcomes\b/);
    // useCallback wrapper is the closure shape; pin it so a future
    // edit doesn't accidentally drop the dep-array stability.
    expect(window).toMatch(/useCallback/);
    expect(window).toMatch(/\[\s*selectedDate\s*\]/);
  });

  it('contract 3: a useDataListener calls refreshOutcomes on witness-builder pipelines', () => {
    // Mirror Phase 11.3's support.tsx pattern: a Set of relevant
    // event categories acts as the listener filter. Pin that the
    // five event categories are listened for.
    const RELEVANT_EVENTS = [
      'DAILY_INSTANCES',
      'LOGS',
      'MEDICATION',
      'WELLNESS',
      'SAMPLE_DATA_CLEARED',
    ];
    // Find the listener block that calls refreshOutcomes.
    const listenerBlock = CODE.match(
      /useDataListener\([\s\S]*?refreshOutcomes\s*\(\s*\)[\s\S]*?\)\s*;?/,
    );
    expect(listenerBlock).not.toBeNull();
    for (const ev of RELEVANT_EVENTS) {
      expect(listenerBlock![0]).toMatch(new RegExp(`EVENT\\.${ev}\\b`));
    }
  });

  it('contract 4: the existing loadReport useDataListener still exists (regression-pin)', () => {
    // The fix ADDS a listener; it must not remove the existing one
    // that drives loadReport. Two listeners coexist with different
    // refresh targets — outcomes vs. brief/notes/patientCard.
    expect(CODE).toMatch(/useDataListener\([\s\S]*?loadReport\s*\(\s*\)/);
  });

  it('contract 5: outcomes state still loads on mount (selectedDate change)', () => {
    // Mount-time + selectedDate-change refresh path stays. The new
    // listener handles event-driven refresh; the existing useEffect
    // handles selectedDate-change refresh. Both stay.
    expect(CODE).toMatch(
      /useEffect\(\s*\(\s*\)\s*=>\s*\{[\s\S]*?refreshOutcomes\s*\(\s*\)[\s\S]*?\}\s*,\s*\[[^\]]*selectedDate[^\]]*\]/,
    );
  });
});
