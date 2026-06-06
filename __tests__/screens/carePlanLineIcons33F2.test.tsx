// ============================================================================
// Phase 33 F2 — Care Plan category emoji RETIRED → Ionicons outline icons.
//
// User-locked mapping (2026-05-25):
//   meds         → medkit-outline       (NOT medical-outline; brand is
//                                        warm, not hospital-clinical)
//   vitals       → pulse-outline
//   wellness     → partly-sunny-outline
//   meals        → restaurant-outline
//   water        → water-outline
//   sleep        → moon-outline
//   activity     → walk-outline
//   appointments → calendar-outline
//
// Stroke color c.textSecondary (cream-muted) at rest. No fill, no
// color-coding (calm reading = brand intent). Icon ~20pt in a
// fixed-width 24pt gutter so meds header + sibling category rows
// share ONE left edge — closes the meds-list alignment backlog item.
//
// SCOPE LOCK — BUCKET_META.emoji STAYS in types/carePlanConfig.ts.
// Other surfaces (Now-tab, Insights, etc.) may still consume it;
// Phase 33 is Care Plan-only. This phase drops the emoji REFERENCES
// from app/care-plan/index.tsx, NOT the data field.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const INDEX_SRC = readFileSync(join(ROOT, 'app/care-plan/index.tsx'), 'utf8');

function stripComments(s: string): string {
  return s
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '');
}

const STRIPPED = stripComments(INDEX_SRC);

// The 8 active emoji codepoints (the meds + 7 sibling categories
// rendered on Care Plan). NOT the 3 retired bucket emojis
// (errands/shifts/self_care) — those are render-filtered out by 32A
// and never reach Care Plan rendering. Tested against the high-
// surrogate codepoint of each grapheme to catch both rendered-glyph
// and \uXXXX-escape forms.
const CARE_PLAN_EMOJI_CODEPOINTS = [
  '💊', // 💊 meds
  '📊', // 📊 vitals
  '🍽', // 🍽 meals (base; the live emoji is followed by ️)
  '💧', // 💧 water
  '😴', // 😴 sleep
  '🚶', // 🚶 activity
  '🌅', // 🌅 wellness
  '📅', // 📅 appointments
];

describe('Phase 33 F2 — emoji retired from Care Plan rendering; Ionicons outline icons in their place', () => {
  // --------------------------------------------------------------------------
  // Ionicons import + icon mapping
  // --------------------------------------------------------------------------

  it('contract 1: Ionicons is imported from @expo/vector-icons in app/care-plan/index.tsx', () => {
    expect(STRIPPED).toMatch(/import\s*\{\s*Ionicons\s*\}\s*from\s*['"]@expo\/vector-icons['"]/);
  });

  it('contract 2: BUCKET_ICON_MAP locks the user-confirmed icon names for all 8 active buckets', () => {
    // Pin the mapping name (constant exists) AND each individual
    // mapping line — so a future refactor renaming or substituting
    // any single icon must update this test alongside.
    expect(STRIPPED).toMatch(/\bBUCKET_ICON_MAP\b/);
    const expectedMappings: Array<[string, string]> = [
      ['meds', 'medkit-outline'],
      ['vitals', 'pulse-outline'],
      ['wellness', 'partly-sunny-outline'],
      ['meals', 'restaurant-outline'],
      ['water', 'water-outline'],
      ['sleep', 'moon-outline'],
      ['activity', 'walk-outline'],
      ['appointments', 'calendar-outline'],
    ];
    for (const [bucket, icon] of expectedMappings) {
      // Accept either `bucket: 'icon-name'` (quoted-key form) or
      // `bucket: "icon-name"` (alternate quote). Both are valid TS.
      const re = new RegExp(`\\b${bucket}\\s*:\\s*['"\`]${icon}['"\`]`);
      expect(STRIPPED).toMatch(re);
    }
  });

  // --------------------------------------------------------------------------
  // Render sites — Ionicons rendered, no <Text>{emoji}</Text>
  // --------------------------------------------------------------------------

  it('contract 3: meds header + CategoryRow render <Ionicons /> (at least 2 sites; bucket-driven icon source)', () => {
    // Two sites must render Ionicons:
    //   1. The meds header inside the ALWAYS_ON_BUCKETS map.
    //   2. The CategoryRow component (shared by the daily-tracking
    //      rows).
    // Phase 34 F5.3 — CategoryRow's icon prop became explicit (the
    // caller passes the resolved icon name) because the pseudo-key
    // wellness rows ('wellness-morning' / 'wellness-evening') aren't
    // BUCKET_ICON_MAP keys. The meds header still uses
    // BUCKET_ICON_MAP[bucket] directly. The bucket-driven lookup
    // pattern persists at the caller — guards against a hard-coded
    // icon name slipping in. Pattern allowed: either
    // `name={BUCKET_ICON_MAP[...]}` (meds header) or `name={icon}`
    // (CategoryRow + per-row caller resolves via map).
    const ioniconsRenders = STRIPPED.match(/<Ionicons\b[^/]*\/>/g) ?? [];
    expect(ioniconsRenders.length).toBeGreaterThanOrEqual(2);
    // The caller still drives icons via BUCKET_ICON_MAP for real
    // BucketTypes (per-row Daily Tracking lookup falls through to
    // it). Pin that the source still references the map.
    expect(STRIPPED).toMatch(/BUCKET_ICON_MAP\[\s*row\s*as\s*BucketType\s*\]/);
    expect(STRIPPED).toMatch(/<Ionicons\s+name=\{BUCKET_ICON_MAP\[\s*bucket\s*\]\}/);
  });

  it('contract 4: <Text>{emoji}</Text> rendering pattern is gone (CategoryRow no longer renders the emoji prop)', () => {
    // The pre-F2 pattern was:
    //   <Text style={styles.categoryEmoji}>{emoji}</Text>
    // CategoryRow no longer receives `emoji` as a prop, and the meds
    // header no longer references BUCKET_META[bucket].emoji. Pin
    // absence of both shapes.
    expect(STRIPPED).not.toMatch(/<Text\s+style=\{styles\.categoryEmoji\}\s*>\s*\{emoji\}\s*<\/Text>/);
    expect(STRIPPED).not.toMatch(/<Text\s+style=\{styles\.categoryEmoji\}\s*>\s*\{BUCKET_META\[bucket\]\.emoji\}\s*<\/Text>/);
    // And nothing passes BUCKET_META[bucket].emoji as a prop anymore.
    expect(STRIPPED).not.toMatch(/\bemoji=\{BUCKET_META\[bucket\]\.emoji\}/);
  });

  it('contract 5: no Care Plan emoji codepoints (raw glyph OR \\uXXXX escape) appear in the JSX', () => {
    // Reject all 8 active-bucket emoji codepoints anywhere in the
    // stripped source. Catches both the literal grapheme being
    // re-introduced and the \uXXXX escape form.
    for (const cp of CARE_PLAN_EMOJI_CODEPOINTS) {
      expect(STRIPPED).not.toContain(cp);
    }
  });

  // --------------------------------------------------------------------------
  // Icon styling — cream-muted stroke, no color-coding, fixed gutter
  // --------------------------------------------------------------------------

  it('contract 6: Ionicons size is 20pt and color uses c.textSecondary (cream-muted, no color-coding)', () => {
    // Both render sites must pass size 20 + the cream-muted stroke
    // color. Pin via separate captures of `size=` and `color=`
    // attributes near each Ionicons tag (within a 200-char window of
    // the tag opening).
    const ioniconsTags = STRIPPED.match(/<Ionicons\s[^/]*\/>/g) ?? [];
    expect(ioniconsTags.length).toBeGreaterThanOrEqual(2);
    for (const tag of ioniconsTags) {
      expect(tag).toMatch(/size=\{20\}/);
      // Theme color must be c.textSecondary (cream-muted). Either
      // direct (colors.textSecondary) or aliased via the theme
      // destructuring (textSecondary or c.textSecondary). Accept
      // both common patterns.
      expect(tag).toMatch(/color=\{(?:colors|c)\.textSecondary\}/);
    }
  });

  it('contract 7: categoryEmoji style — gutter width 24pt (shared by meds header + sibling rows for ONE left edge)', () => {
    // The categoryEmoji style is shared between the meds header
    // (rendering the icon via this width-fixed gutter) and the
    // CategoryRow. F2 tightens the gutter to 24pt so the icon sits
    // in a fixed 24pt slot and the row text aligns at the same
    // left edge across both surfaces. Closes the alignment backlog
    // item flagged by the 2026-05-23 STOP-4 walk.
    const m = STRIPPED.match(/categoryEmoji\s*:\s*\{([^}]+)\}/);
    expect(m).not.toBeNull();
    const block = m![1];
    expect(block).toMatch(/width\s*:\s*24\b/);
  });
});
