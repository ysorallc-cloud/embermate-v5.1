/**
 * Record<BucketType> and Record<CarePlanItemType> completeness.
 *
 * When BucketType gained errands/shifts/self_care and CarePlanItemType
 * gained errand/shift/self_care, several Record literals weren't updated.
 * TypeScript catches this at `tsc --noEmit` but ts-jest's loose config
 * lets it slip through at runtime — producing `undefined` lookups for
 * any user who enables those bucket types.
 *
 * This test reads each source file and asserts the Record literal
 * contains an entry for every required key.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');

/** Extract a Record literal's keys from source text. */
function extractRecordKeys(src: string, varName: string): string[] {
  const start = src.indexOf(`${varName}`);
  if (start === -1) throw new Error(`${varName} not found`);
  // Find the `= {` that opens the Record literal value (not a `{` inside
  // a generic type annotation like `Record<K, { route: string }>`).
  const eqIdx = src.indexOf('= {', start);
  if (eqIdx === -1) throw new Error(`${varName}: could not find "= {"`);
  const braceStart = eqIdx + 2;
  let depth = 0;
  let i = braceStart;
  for (; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') { depth--; if (depth === 0) break; }
  }
  const body = src.slice(braceStart + 1, i);
  // Match top-level keys: `keyName:` at 2–6 indent, or `'keyName':`.
  const keys: string[] = [];
  const re = /^\s{2,6}(?:'([^']+)'|(\w+))\s*:/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    keys.push(m[1] || m[2]);
  }
  return keys;
}

// ── BucketType Records ──

const REQUIRED_BUCKET_KEYS = [
  'meds', 'vitals', 'meals', 'water', 'sleep', 'activity',
  'wellness', 'appointments', 'errands', 'shifts', 'self_care',
];

describe('Record<BucketType> completeness', () => {
  describe('today-scope.tsx — quickAddRoutes', () => {
    const src = read('app/today-scope.tsx');
    const keys = extractRecordKeys(src, 'quickAddRoutes');

    for (const k of REQUIRED_BUCKET_KEYS) {
      it(`has entry for "${k}"`, () => {
        expect(keys).toContain(k);
      });
    }
  });

  // BucketCarePlanPanel.tsx — BUCKET_CONFIG_ROUTES completeness block removed
  // when that orphaned (zero-caller) panel was deleted in the today/-family
  // dead-code sweep. today-scope.tsx above is the live BUCKET route surface.
});

// ── CarePlanItemType Records ──
// NOTE: there are TWO CarePlanItemType unions in the codebase:
//   types/carePlan.ts  → 'medication', 'nutrition', 'activity', ...
//   types/dayState.ts  → 'meds', 'meals', ...  (legacy names)
// Each Record uses the variant matching its import source.

// types/carePlan.ts vocabulary (UpcomingNotifications, taskTransform)
const REQUIRED_ITEM_KEYS_CAREPLAN = [
  'medication', 'activity', 'vitals', 'nutrition', 'appointment',
  'hydration', 'mood', 'sleep', 'wellness', 'errand', 'shift',
  'self_care', 'custom',
];

// types/dayState.ts vocabulary (taskAction, carePlanRouting)
const REQUIRED_ITEM_KEYS_DAYSTATE = [
  'meds', 'vitals', 'meals', 'mood', 'sleep', 'hydration',
  'wellness', 'appointment', 'errand', 'shift', 'self_care', 'custom',
];

describe('Record<CarePlanItemType> completeness', () => {
  // UpcomingNotifications.tsx (and its ITEM_EMOJIS Record) was retired in
  // the v6.7 You-tab redesign. The completeness contract for the carePlan.ts
  // vocabulary now lives wherever a future consumer reintroduces an emoji
  // map; for now only the dayState.ts routing maps below carry it.

  describe('taskAction.ts — ITEM_TYPE_ROUTES (dayState.ts vocabulary)', () => {
    const src = read('utils/careplan/taskAction.ts');
    const keys = extractRecordKeys(src, 'ITEM_TYPE_ROUTES');

    for (const k of REQUIRED_ITEM_KEYS_DAYSTATE) {
      it(`has entry for "${k}"`, () => {
        expect(keys).toContain(k);
      });
    }
  });

  describe('carePlanRouting.ts — ITEM_TYPE_ROUTES (dayState.ts vocabulary)', () => {
    const src = read('utils/carePlanRouting.ts');
    const keys = extractRecordKeys(src, 'ITEM_TYPE_ROUTES');

    for (const k of REQUIRED_ITEM_KEYS_DAYSTATE) {
      it(`has entry for "${k}"`, () => {
        expect(keys).toContain(k);
      });
    }
  });

  describe('taskTransform.ts — TYPE_EMOJIS (carePlan.ts vocabulary)', () => {
    const src = read('utils/taskTransform.ts');
    const keys = extractRecordKeys(src, 'TYPE_EMOJIS');

    for (const k of REQUIRED_ITEM_KEYS_CAREPLAN) {
      it(`has entry for "${k}"`, () => {
        expect(keys).toContain(k);
      });
    }
  });

  describe('taskTransform.ts — ACTION_LABELS (carePlan.ts vocabulary)', () => {
    const src = read('utils/taskTransform.ts');
    const keys = extractRecordKeys(src, 'ACTION_LABELS');

    for (const k of REQUIRED_ITEM_KEYS_CAREPLAN) {
      it(`has entry for "${k}"`, () => {
        expect(keys).toContain(k);
      });
    }
  });
});
