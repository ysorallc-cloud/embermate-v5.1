// ============================================================================
// Phase 5.12.j — Journal read-only contract (audit guard).
//
// After Phase 5.12 commits Journal to its narrative-memory role, the page
// must never accept event-creation input. Allowed exceptions, all of which
// edit narrative or open share surfaces — none create events:
//
//   • NarrativeSnapshot's "Edit →" affordance (opens HandoffSheet's TONE
//     input via setHandoffSheetVisible).
//   • JournalNotesCard (saves a reflection via reflectionStorage; not a
//     CareEvent).
//   • The sticky "Share handoff" CTA (opens HandoffSheet for export).
//   • JournalEmptyDay's "+ Add a note" affordance (toggles addNoteMode
//     which mounts JournalNotesCard).
//
// The audit scans:
//   • app/(tabs)/journal.tsx
//   • components/journal/*.tsx (rendered subtree)
//
// Forbidden symbols are event-creation entry points anywhere in those
// files: saveEvent, emitCareEvent, completeInstance, markComplete,
// saveMedicationLog, recordVital, logVitals, logMeal, logMood,
// logSymptom, logSleep, logHydration. Any future edit that re-introduces
// one fails this test and surfaces the regression at PR time.
// ============================================================================

import { execSync } from 'child_process';
import { join } from 'path';

const ROOT = join(__dirname, '../..');

const FORBIDDEN_CALLS = [
  'saveEvent',
  'emitCareEvent',
  'completeInstance',
  'markComplete',
  'saveMedicationLog',
  'recordVital',
  'logVitals',
  'logMeal',
  'logMood',
  'logSymptom',
  'logSleep',
  'logHydration',
];

interface Hit {
  file: string;
  line: number;
  text: string;
}

function grepHits(pattern: string): Hit[] {
  let out = '';
  try {
    out = execSync(
      // Restrict scan to Journal-owned source. NarrativeView is a
      // past-day component used by Journal but renders the same kind
      // of read-only narrative — include it in the scan.
      `grep -rEn '${pattern}' 'app/(tabs)/journal.tsx' components/journal --include='*.tsx' --include='*.ts' || true`,
      { cwd: ROOT, encoding: 'utf8' },
    );
  } catch {
    out = '';
  }
  const hits: Hit[] = [];
  for (const line of out.split('\n').filter(Boolean)) {
    const m = line.match(/^([^:]+):(\d+):(.*)$/);
    if (m) hits.push({ file: m[1], line: Number(m[2]), text: m[3] });
  }
  return hits;
}

describe('Phase 5.12.j — Journal read-only contract', () => {
  it.each(FORBIDDEN_CALLS)(
    'no Journal source calls "%s"',
    (symbol) => {
      // Match symbol followed by `(` to catch real call sites without
      // false-positive matches on identifiers in unrelated comments.
      const hits = grepHits(`\\b${symbol}\\s*\\(`);
      if (hits.length > 0) {
        throw new Error(
          `${symbol}() must not be called from Journal source. Found:\n  ` +
            hits.map((h) => `${h.file}:${h.line}  ${h.text.trim()}`).join('\n  '),
        );
      }
    },
  );

  it('no <InlineCheckbox /> wraps any Journal row (logging affordance from Now)', () => {
    const hits = grepHits('<InlineCheckbox\\b');
    if (hits.length > 0) {
      throw new Error(
        'InlineCheckbox is a logging affordance. Journal must stay read-only:\n  ' +
          hits.map((h) => `${h.file}:${h.line}`).join('\n  '),
      );
    }
  });
});
