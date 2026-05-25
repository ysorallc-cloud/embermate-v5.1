// ============================================================================
// Phase 32A.1 F9 — meds-drawer containment (STOP-C device-walk fix).
//
// STOP-C report:
//   "list reads as floating cards, not a contained drawer. Sibling
//    drawers render inside styles.drawerScaffold (glassFaint ground +
//    2px sage left-rule via c.accentMuted, marginTop:-4,
//    testID='drawer-{bucket}'). The Medications drawer is mounted
//    bare and its MedRows each carry their own glassFaint fill +
//    borderRadius:8 + marginBottom:4 — so they paint as separate
//    cards with gaps instead of rows in one contained drawer."
//
// FIX SHAPE:
//   1. Wrap the Medications drawer mount in the SAME drawerScaffold
//      siblings use: <View testID="drawer-meds" style={styles.drawerScaffold}>.
//   2. Drop the per-row card look so rows sit flat on the scaffold:
//      - row / rowOuter / rowSwipeable no longer set borderRadius
//      - row drops its standalone background fill (rowSwipeable keeps
//        an OPAQUE fill matched to the scaffold ground — c.glassFaint
//        — so the coral Remove action behind it stays hidden until
//        swiped; only the rounded-card appearance goes away)
//      - marginBottom:4 between rows replaced with a hairline bottom
//        divider (none on the last row, achieved by giving rows the
//        divider then letting the scaffold's bottom edge swallow it).
//   3. Drop the list style's marginHorizontal + paddingHorizontal so
//      it doesn't double up with the scaffold's own padding.
//
// AUDIT NOTE (Phase 33 backlog): the meds HEADER row is a rounded
// coreCard while sibling category rows are flat with hairline
// dividers. The scaffold→header seam reads as a deliberate "card
// opens onto its panel" stack and isn't broken — but flattening
// the meds header to match siblings (or harmonizing always-on
// fills) is a Phase 33 brand-coherence call. Not pulled into F9.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const INDEX_SRC = readFileSync(join(ROOT, 'app/care-plan/index.tsx'), 'utf8');
const DRAWER_SRC = readFileSync(
  join(ROOT, 'components/careplan/drawers/MedicationsDrawer.tsx'),
  'utf8',
);

function stripComments(s: string): string {
  return s
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '');
}

const INDEX_STRIPPED = stripComments(INDEX_SRC);
const DRAWER_STRIPPED = stripComments(DRAWER_SRC);

function styleBlock(src: string, name: string): string {
  // Captures a single style block body — `name: { ... }`. Uses a
  // balanced-brace scan (StyleSheet objects only nest one deep in
  // this codebase; a naive `[^}]*` would stop at the first nested
  // closing brace if there were one).
  const start = src.search(new RegExp(`\\b${name}\\s*:\\s*\\{`));
  if (start < 0) return '';
  const open = src.indexOf('{', start);
  if (open < 0) return '';
  let depth = 1;
  let i = open + 1;
  while (i < src.length && depth > 0) {
    const c = src[i];
    if (c === '{') depth++;
    else if (c === '}') depth--;
    i++;
  }
  return src.slice(open + 1, i - 1);
}

describe('Phase 32A.1 F9 — meds-drawer containment (drawerScaffold wrap + flat rows)', () => {
  // --------------------------------------------------------------------------
  // Scaffold wrap — same testID + same style as the 7 sibling drawers
  // --------------------------------------------------------------------------

  it('contract 1: MedicationsDrawer mount is wrapped in <View testID="drawer-meds" style={styles.drawerScaffold}>', () => {
    // The mount must sit inside the shared scaffold container — the
    // same one Vitals/Wellness/Meals/etc. use — so the meds list
    // reads as one contained drawer instead of floating cards.
    // Pin both the testID (matches the `drawer-{bucket}` convention)
    // and the drawerScaffold style reference.
    expect(INDEX_STRIPPED).toMatch(
      /<View\s+testID=['"]drawer-meds['"]\s+style=\{styles\.drawerScaffold\}\s*>\s*<MedicationsDrawer\b/,
    );
  });

  it('contract 2: drawerScaffold style is REUSED (no meds-specific container introduced)', () => {
    // Consistency lock — the user's prompt: "Reuse the EXISTING
    // drawerScaffold style — do NOT introduce a new color or a
    // meds-specific container (consistency is the whole point)."
    // Confirm no `medsDrawerScaffold` / `medsScaffold` / similar
    // bespoke container style exists.
    expect(INDEX_STRIPPED).not.toMatch(/\bmedsDrawerScaffold\s*:\s*\{/);
    expect(INDEX_STRIPPED).not.toMatch(/\bmedsScaffold\s*:\s*\{/);
    expect(INDEX_STRIPPED).not.toMatch(/\bmedsContainer\s*:\s*\{/);
    // And the existing drawerScaffold still has the canonical shape
    // siblings use: glassFaint ground + 2px sage left-rule.
    const scaffold = styleBlock(INDEX_STRIPPED, 'drawerScaffold');
    expect(scaffold).toMatch(/backgroundColor\s*:\s*c\.glassFaint/);
    expect(scaffold).toMatch(/borderLeftWidth\s*:\s*2/);
    expect(scaffold).toMatch(/borderLeftColor\s*:\s*c\.accentMuted/);
  });

  // --------------------------------------------------------------------------
  // Flat rows — no per-row card chrome
  // --------------------------------------------------------------------------

  it('contract 3: MedRow rowOuter no longer carries borderRadius (drops the rounded-card look)', () => {
    const rowOuter = styleBlock(DRAWER_STRIPPED, 'rowOuter');
    expect(rowOuter).not.toBe('');
    expect(rowOuter).not.toMatch(/borderRadius\s*:\s*\d/);
  });

  it('contract 4: MedRow row no longer carries its own background fill OR borderRadius (rows sit flat on the scaffold ground)', () => {
    const row = styleBlock(DRAWER_STRIPPED, 'row');
    expect(row).not.toBe('');
    expect(row).not.toMatch(/backgroundColor\s*:\s*c\.glassFaint/);
    expect(row).not.toMatch(/borderRadius\s*:\s*\d/);
  });

  it('contract 5: rowSwipeable keeps an OPAQUE fill matched to the scaffold ground so the coral Remove action stays hidden', () => {
    // The swipe foreground MUST stay opaque (else the coral Remove
    // action revealed behind would bleed through the row in its
    // resting state). Matching it to the scaffold ground (c.glassFaint)
    // means rows visually disappear into the panel until swiped —
    // exactly the "contained drawer" read the fix is after.
    const rowSwipeable = styleBlock(DRAWER_STRIPPED, 'rowSwipeable');
    expect(rowSwipeable).not.toBe('');
    expect(rowSwipeable).toMatch(/backgroundColor\s*:\s*c\.glassFaint/);
    // No borderRadius on the swipe foreground either — it would
    // round-clip the row's seam against the scaffold.
    expect(rowSwipeable).not.toMatch(/borderRadius\s*:\s*\d/);
  });

  it('contract 6: marginBottom:4 between rows replaced with a hairline bottom divider', () => {
    // Pre-F9: rowOuter had marginBottom: 4 — the gap that made rows
    // read as separate cards. F9 swaps that for a hairline bottom
    // divider on the row body so rows sit visually adjacent on the
    // scaffold ground with a 1px hairline between them. Pin both
    // absence (no marginBottom gap) and presence (borderBottomWidth: 1).
    const rowOuter = styleBlock(DRAWER_STRIPPED, 'rowOuter');
    expect(rowOuter).not.toMatch(/marginBottom\s*:\s*[1-9]/);
    // The hairline divider lives EITHER on rowOuter or on the inner
    // row block — accept either location.
    const row = styleBlock(DRAWER_STRIPPED, 'row');
    const hasDivider =
      /borderBottomWidth\s*:\s*1/.test(rowOuter) ||
      /borderBottomWidth\s*:\s*1/.test(row);
    expect(hasDivider).toBe(true);
  });

  // --------------------------------------------------------------------------
  // List container — drops double-padding
  // --------------------------------------------------------------------------

  it('contract 7: list style drops marginHorizontal + paddingHorizontal (no double-padding under the scaffold)', () => {
    const list = styleBlock(DRAWER_STRIPPED, 'list');
    expect(list).not.toBe('');
    expect(list).not.toMatch(/marginHorizontal\s*:\s*[1-9]/);
    expect(list).not.toMatch(/paddingHorizontal\s*:\s*[1-9]/);
  });

  // --------------------------------------------------------------------------
  // Behavior preserved — swipe + soft-delete invariants from F3/F6/F8
  // --------------------------------------------------------------------------

  it('contract 8: F3 swipe gesture mechanics untouched (PanResponder + Animated still present)', () => {
    expect(DRAWER_STRIPPED).toMatch(/PanResponder\.create\s*\(/);
    expect(DRAWER_STRIPPED).toMatch(/<Animated\.View\b/);
  });

  it('contract 9: NON-DESTRUCTIVE — no removeMedication anywhere; exactly one soft-delete write site', () => {
    expect(DRAWER_STRIPPED).not.toMatch(/\bremoveMedication\b/);
    const matches = DRAWER_STRIPPED.match(/updateMedication\s*\(\s*[^)]*,\s*\{\s*active\s*:\s*false/g) ?? [];
    expect(matches.length).toBe(1);
  });
});
