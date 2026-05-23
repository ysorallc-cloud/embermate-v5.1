// ============================================================================
// Phase 32A — Care Plan inline-expand reframe (structural contract).
//
// Source-level audit for the F2 page restructure. Pins:
//
//   1. Three section bucket-allocation constants exist with the locked
//      membership: ALWAYS_ON_BUCKETS=['meds'],
//      DAILY_TRACKING_BUCKETS=['vitals','wellness','meals'],
//      ADD_WHEN_READY_BUCKETS=['water','sleep','activity','appointments'].
//   2. None of the three MVP-suppressed buckets (errands, shifts,
//      self_care) appear in any section list. (The "MVP render filter"
//      from the brief is expressed structurally — they're absent from
//      every section, not filtered at render time.)
//   3. The dead `allBuckets` const at the pre-32A care-plan/index.tsx:232
//      is retired.
//   4. The three section eyebrows render via the SectionEyebrow primitive
//      with the canonical labels ("Always on", "Daily tracking", "Add
//      when ready") — letterSpacing/uppercase canon is owned by
//      SectionEyebrow itself.
//   5. The render scaffold tracks ONE expanded bucket at a time (single
//      `expandedBucket` state — accordion behavior). Toggle-on opens the
//      drawer for that bucket and closes any other open drawer; toggle-
//      off clears the state.
//
// Render-level pins (full mount + interaction) get added by F4 (meds
// inline list) and F6+ (drawer chip/dropdown internals) when those Fs
// land. F2's job is the structural skeleton — sections, row allocation,
// accordion state, dead-code retirement.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const SRC = readFileSync(join(ROOT, 'app/care-plan/index.tsx'), 'utf8');

// Strip line + block comments so structural assertions don't false-
// positive on commentary that mentions retired symbols by name.
function stripComments(s: string): string {
  return s
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '');
}

const STRIPPED = stripComments(SRC);

describe('Phase 32A F2 — Care Plan main 3-section restructure', () => {
  // --------------------------------------------------------------------------
  // Section bucket allocation (locked from brief)
  // --------------------------------------------------------------------------

  describe('contract 1: section bucket-allocation constants', () => {
    it('declares ALWAYS_ON_BUCKETS = [meds]', () => {
      // Match `const ALWAYS_ON_BUCKETS ... = [ ... 'meds' ... ]`.
      const m = STRIPPED.match(/const\s+ALWAYS_ON_BUCKETS[^=]*=\s*\[([^\]]*)\]/);
      expect(m).not.toBeNull();
      const body = m![1];
      expect(body).toMatch(/['"]meds['"]/);
      // No other buckets in this list.
      const matches = body.match(/['"][a-z_]+['"]/g) ?? [];
      expect(matches).toEqual(["'meds'"].map((s) => s.replace(/'/g, "'")) /* identity */);
    });

    it('declares DAILY_TRACKING_BUCKETS = [vitals, wellness, meals]', () => {
      const m = STRIPPED.match(/const\s+DAILY_TRACKING_BUCKETS[^=]*=\s*\[([^\]]*)\]/);
      expect(m).not.toBeNull();
      const body = m![1];
      expect(body).toMatch(/['"]vitals['"]/);
      expect(body).toMatch(/['"]wellness['"]/);
      expect(body).toMatch(/['"]meals['"]/);
      // Exactly three entries — nothing extra slipped in.
      const matches = body.match(/['"][a-z_]+['"]/g) ?? [];
      expect(matches.length).toBe(3);
    });

    it('declares ADD_WHEN_READY_BUCKETS = [water, sleep, activity, appointments]', () => {
      const m = STRIPPED.match(/const\s+ADD_WHEN_READY_BUCKETS[^=]*=\s*\[([^\]]*)\]/);
      expect(m).not.toBeNull();
      const body = m![1];
      expect(body).toMatch(/['"]water['"]/);
      expect(body).toMatch(/['"]sleep['"]/);
      expect(body).toMatch(/['"]activity['"]/);
      expect(body).toMatch(/['"]appointments['"]/);
      // Exactly four entries — render-filter integrity via list shape.
      const matches = body.match(/['"][a-z_]+['"]/g) ?? [];
      expect(matches.length).toBe(4);
    });
  });

  // --------------------------------------------------------------------------
  // MVP suppression — none of the three retired-from-UI buckets in any
  // section list. This is the "render filter" expressed structurally.
  // --------------------------------------------------------------------------

  describe('contract 2: MVP-suppressed buckets absent from every section', () => {
    it.each(['errands', 'shifts', 'self_care'] as const)(
      "no section list contains '%s'",
      (bucket) => {
        // Pull each section's array body and assert the bucket is absent
        // from all three.
        for (const sectionName of ['ALWAYS_ON_BUCKETS', 'DAILY_TRACKING_BUCKETS', 'ADD_WHEN_READY_BUCKETS']) {
          const m = STRIPPED.match(new RegExp(`const\\s+${sectionName}[^=]*=\\s*\\[([^\\]]*)\\]`));
          if (!m) continue;
          const body = m[1];
          expect(body).not.toMatch(new RegExp(`['"]${bucket}['"]`));
        }
      },
    );
  });

  // --------------------------------------------------------------------------
  // Dead-code retirement
  // --------------------------------------------------------------------------

  describe('contract 3: dead `allBuckets` const retired', () => {
    it('no `const allBuckets =` declaration remains in the file', () => {
      expect(STRIPPED).not.toMatch(/const\s+allBuckets\s*[:=]/);
    });
  });

  // --------------------------------------------------------------------------
  // Section eyebrows via SectionEyebrow primitive
  // --------------------------------------------------------------------------

  describe('contract 4: section eyebrows render via SectionEyebrow', () => {
    it('imports SectionEyebrow from components/SectionEyebrow', () => {
      expect(STRIPPED).toMatch(/import\s*\{[^}]*\bSectionEyebrow\b[^}]*\}\s*from\s*['"][^'"]*SectionEyebrow['"]/);
    });

    it('renders <SectionEyebrow text="Always on" ... />', () => {
      expect(STRIPPED).toMatch(/<SectionEyebrow[^/]*text=["']Always on["']/i);
    });

    it('renders <SectionEyebrow text="Daily tracking" ... />', () => {
      expect(STRIPPED).toMatch(/<SectionEyebrow[^/]*text=["']Daily tracking["']/i);
    });

    it('renders <SectionEyebrow text="Add when ready" ... />', () => {
      expect(STRIPPED).toMatch(/<SectionEyebrow[^/]*text=["']Add when ready["']/i);
    });
  });

  // --------------------------------------------------------------------------
  // Accordion state — single `expandedBucket` tracks one drawer at a time
  // --------------------------------------------------------------------------

  describe('contract 5: drawer accordion — one expanded at a time', () => {
    it('declares an expandedBucket state hook (single value, not a set)', () => {
      // Match a useState declaration whose name contains expandedBucket
      // (case-insensitive, allows `setExpandedBucket` companion).
      expect(STRIPPED).toMatch(/const\s*\[\s*expandedBucket\s*,\s*setExpandedBucket\s*\]\s*=\s*useState/);
    });

    it('expandedBucket state holds a BucketType | null (single bucket, not an array or set)', () => {
      // The state shape is single-bucket per accordion semantics.
      // BucketType | null is canonical; `string | null` is accepted too
      // (some surfaces use looser typing). Pin that it is NOT typed as
      // an array, a record, or a Set.
      const m = STRIPPED.match(/useState<([^>]+)>\(\s*null\s*\)\s*[\s\S]{0,200}?expandedBucket/);
      // Fallback: locate the declaration directly.
      const decl = STRIPPED.match(/const\s*\[\s*expandedBucket\s*,\s*setExpandedBucket\s*\]\s*=\s*useState<([^>]+)>/);
      const typeAnnotation = decl?.[1] ?? m?.[1] ?? '';
      expect(typeAnnotation).not.toMatch(/\[\s*\]/);     // not an array type like BucketType[]
      expect(typeAnnotation).not.toMatch(/\bSet</);      // not Set<...>
      expect(typeAnnotation).not.toMatch(/\bRecord</);   // not Record<...>
    });
  });
});
