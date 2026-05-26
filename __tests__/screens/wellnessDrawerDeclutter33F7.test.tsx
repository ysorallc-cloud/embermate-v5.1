// ============================================================================
// Phase 33 F7 — Wellness drawer declutter.
//
// USER-LOCKED (2026-05-26):
//   1. Chip restyle (style A): selected = soft sage fill
//      (rgba(127,184,138,0.16)), no border, light text. Unselected =
//      text only, no fill, no border, muted text.
//   2. v1 trim — HIDE clinical-tier options, keep everyday wellness.
//      Hide is RENDER-LAYER (filter what renders), NOT data deletion.
//      The FieldDef constants stay declared; the JSX `*_OPTIONAL.map(...)`
//      render lines go. Stored selections for hidden keys persist in
//      optionalChecks (Record<string, boolean>) untouched — a future
//      v1.1 unhide is a JSX-only restore.
//      Morning HIDDEN: Orientation, Decision making.
//      Evening HIDDEN: Pain level, Alertness, Bowel movement, Bathing,
//                      Mobility.
//   3. In-drawer reminder Switches go muted (F3 consistency):
//      trackColor.true: colors.accent → colors.accentMuted.
//      Both morning + evening reminder toggles.
//
// FLAGGED FOR USER: spec gave rgba(127, 184, 138, 0.16) for the chip
// fill. Canonical sage is rgba(95, 184, 138, _) in theme-tokens.ts —
// 127 is +32 on R, a distinctly different (warmer) green. Implemented
// VERBATIM per the lock; the device walk catches the diff if it was
// a typo for 95.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const DRAWER_SRC = readFileSync(
  join(ROOT, 'components/careplan/drawers/WellnessDrawer.tsx'),
  'utf8',
);

function stripComments(s: string): string {
  return s
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '');
}

const STRIPPED = stripComments(DRAWER_SRC);

function styleBlock(src: string, name: string): string {
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

describe('Phase 33 F7 — Wellness drawer declutter (chip restyle + v1 trim + muted reminders)', () => {
  // --------------------------------------------------------------------------
  // GROUP A — v1 trim (hide clinical, keep everyday)
  //
  // The data model is preserved (consts stay, storage untouched); only
  // the JSX render lines for the OPTIONAL sets are dropped.
  // --------------------------------------------------------------------------

  it('contract 1: MORNING_OPTIONAL.map(...) JSX render line is GONE (Orientation + Decision making hidden)', () => {
    expect(STRIPPED).not.toMatch(/\{\s*MORNING_OPTIONAL\.map\s*\(/);
  });

  it('contract 2: EVENING_OPTIONAL.map(...) JSX render line is GONE (Pain/Alertness/Bowel/Bathing/Mobility hidden)', () => {
    expect(STRIPPED).not.toMatch(/\{\s*EVENING_OPTIONAL\.map\s*\(/);
  });

  it('contract 3: NO hidden option labels appear anywhere in the drawer source (render absence pin)', () => {
    // Pin the exact label strings — catches a future maintainer who
    // re-renders a hidden option via a different code path (e.g. an
    // inline literal instead of FieldDef.label).
    for (const label of [
      'Orientation',
      'Decision making',
      'Pain level',
      'Alertness',
      'Bowel movement',
      'Bathing',
      'Mobility',
    ]) {
      // Reject the label as a JSX string literal. The label strings
      // can still appear inside the FieldDef const definitions
      // (label: 'Orientation') — pin scoped to "not in a JSX text
      // position" by rejecting only as quoted children of a Text-like
      // pattern. Simpler: require absence in the WHOLE stripped
      // source — but the consts get caught too.
      // Compromise: strip the FieldDef const blocks before scanning,
      // so the labels CAN live in the consts (data preserved) but
      // CAN'T live anywhere else.
      const noConsts = STRIPPED
        .replace(/MORNING_OPTIONAL\s*:\s*FieldDef\[\]\s*=\s*\[[\s\S]*?\];/, '')
        .replace(/EVENING_OPTIONAL\s*:\s*FieldDef\[\]\s*=\s*\[[\s\S]*?\];/, '');
      expect(noConsts).not.toContain(label);
    }
  });

  it('contract 4 (DATA PRESERVATION): MORNING_OPTIONAL + EVENING_OPTIONAL CONSTS still exist in source', () => {
    // Hide is presentation-layer. The const declarations stay so the
    // storage-key → label mapping is preserved and a future v1.1
    // unhide is a JSX-only restore. Same pattern as 32A's MVP_
    // SUPPRESSED_BUCKETS (data preserved, render filtered).
    expect(STRIPPED).toMatch(/const\s+MORNING_OPTIONAL\s*:\s*FieldDef\[\]/);
    expect(STRIPPED).toMatch(/const\s+EVENING_OPTIONAL\s*:\s*FieldDef\[\]/);
    // And the storage keys for hidden options are still declared so a
    // pre-F7 caregiver's selections survive in optionalChecks.
    expect(STRIPPED).toMatch(/key:\s*['"]orientation['"]/);
    expect(STRIPPED).toMatch(/key:\s*['"]painLevel['"]/);
  });

  it('contract 5 (KEEP path unchanged): MORNING_CORE + EVENING_CORE still render (everyday wellness stays)', () => {
    expect(STRIPPED).toMatch(/\{\s*MORNING_CORE\.map\s*\(/);
    expect(STRIPPED).toMatch(/\{\s*EVENING_CORE\.map\s*\(/);
  });

  // --------------------------------------------------------------------------
  // GROUP B — chip restyle (style A: filled selected, text-only unselected)
  // --------------------------------------------------------------------------

  it('contract 6: chip base style drops border + fill (text-only unselected, no outlined-card look)', () => {
    const chip = styleBlock(STRIPPED, 'chip');
    expect(chip).not.toBe('');
    // No border on the unselected chip — text recedes.
    expect(chip).not.toMatch(/borderWidth\s*:\s*[1-9]/);
    // No fill on the unselected chip. The previous c.glassFaint
    // background goes; pin its absence.
    expect(chip).not.toMatch(/backgroundColor\s*:\s*c\.glassFaint/);
  });

  it('contract 7: chipSelected uses soft-sage fill rgba(127, 184, 138, 0.16), no border', () => {
    const chipSelected = styleBlock(STRIPPED, 'chipSelected');
    expect(chipSelected).not.toBe('');
    // The user-locked literal value. Accept any whitespace between
    // tokens inside the rgba(...) call so the formatter doesn't break
    // this pin.
    expect(chipSelected).toMatch(/backgroundColor\s*:\s*['"]rgba\s*\(\s*127\s*,\s*184\s*,\s*138\s*,\s*0?\.16\s*\)['"]/);
    // No border on the selected chip either — clean fill, no outline.
    expect(chipSelected).not.toMatch(/borderColor\s*:\s*c\.accent/);
  });

  it('contract 8: chipLabelSelected uses light text (c.textPrimary), not c.accent', () => {
    // Soft-sage fill + cream text holds the on-state signal without
    // shouting. Pre-F7 used c.accent (saturated sage) as the label
    // color which fought against the filled background.
    const labelSelected = styleBlock(STRIPPED, 'chipLabelSelected');
    expect(labelSelected).not.toBe('');
    expect(labelSelected).toMatch(/color\s*:\s*c\.textPrimary\b/);
    expect(labelSelected).not.toMatch(/color\s*:\s*c\.accent\b/);
  });

  // --------------------------------------------------------------------------
  // GROUP C — reminder toggles muted to match category-row toggles (F3 parity)
  // --------------------------------------------------------------------------

  it('contract 9: BOTH reminder Switches use trackColor.true: colors.accentMuted (F3 consistency)', () => {
    // Both morning and evening reminder Switches must use the muted
    // sage track. Count the muted-track occurrences; expect EXACTLY 2.
    const mutedTrackHits = STRIPPED.match(
      /trackColor=\{\s*\{\s*false\s*:\s*colors\.glassStrong\s*,\s*true\s*:\s*colors\.accentMuted\s*\}\s*\}/g,
    ) ?? [];
    expect(mutedTrackHits.length).toBe(2);
  });

  it('contract 10: NO bright-accent track remains in the drawer (hard reject of pre-F7 shape)', () => {
    expect(STRIPPED).not.toMatch(/trackColor=\{\s*\{\s*[^}]*true\s*:\s*colors\.accent\s*[,}]/);
  });

  // --------------------------------------------------------------------------
  // GROUP D — behavior locks (visual + option-list scope only, per spec)
  // --------------------------------------------------------------------------

  it('contract 11: useWellnessSettings hook still wires the storage bridge (no data-layer change)', () => {
    expect(STRIPPED).toMatch(/useWellnessSettings\s*\(\)/);
    expect(STRIPPED).toMatch(/updateSettings\s*\(/);
  });

  it('contract 12: toggleField + togglePeriodEnabled + toggleReminder handlers unchanged in signature (visual-only contract)', () => {
    expect(STRIPPED).toMatch(/const\s+toggleField\s*=\s*useCallback/);
    expect(STRIPPED).toMatch(/const\s+togglePeriodEnabled\s*=\s*useCallback/);
    expect(STRIPPED).toMatch(/const\s+toggleReminder\s*=\s*useCallback/);
  });
});
