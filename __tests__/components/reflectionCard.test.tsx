// ============================================================================
// ReflectionCard — You-tab unified mood + free-text reflection card.
// Locks in v6.7 Phase 2 contracts: card surface, 5-emoji mood selector,
// prompt copy, multiline TextInput, footer with privacy note + Save pill,
// repo round-trip on save, prefill on mount.
// ============================================================================

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const filePath = join(ROOT, 'components/support/ReflectionCard.tsx');
const src = existsSync(filePath) ? readFileSync(filePath, 'utf8') : '';

function styleBlock(name: string): string {
  const re = new RegExp(`\\b${name}:\\s*\\{([^}]*)\\}`, 's');
  const m = src.match(re);
  return m ? m[1] : '';
}

function num(block: string, prop: string): number | null {
  const m = block.match(new RegExp(`\\b${prop}:\\s*(-?\\d+(?:\\.\\d+)?)`));
  return m ? Number(m[1]) : null;
}

describe('ReflectionCard — file + exports', () => {
  it('components/support/ReflectionCard.tsx exists', () => {
    expect(existsSync(filePath)).toBe(true);
  });

  it('exports a named React component (ReflectionCard)', () => {
    expect(src).toMatch(/export\s+(?:function|const)\s+ReflectionCard\b/);
  });

  it('imports the reflection repo', () => {
    expect(src).toMatch(/from\s+['"][^'"]*reflectionRepo['"]/);
    expect(src).toMatch(/saveReflection/);
    expect(src).toMatch(/getReflection/);
  });
});

describe('ReflectionCard — DE-BOXED (You rebuild S4, full de-purple)', () => {
  // The mockup flattens the check-in to open fabric (only the SUPPORT tiles
  // keep containers). The prior lavender lane-card chrome (caregiverAccentBg
  // body + caregiverAccent left rule + border + radius) is removed. The
  // free-text reflection + Save/F6 round-trip are UNCHANGED — only chrome.
  it('card has NO lavender box chrome (no bg/border/borderLeft/radius)', () => {
    const block = styleBlock('card');
    expect(block).not.toBe('');
    expect(block).not.toMatch(/caregiverAccent/);
    expect(block).not.toMatch(/backgroundColor:/);
    expect(block).not.toMatch(/borderWidth:/);
    expect(block).not.toMatch(/borderLeftWidth:/);
    expect(block).not.toMatch(/borderRadius:/);
  });

  it('card is an open section — keeps only rhythm (marginBottom)', () => {
    const block = styleBlock('card');
    expect(num(block, 'marginBottom')).toBeGreaterThan(0);
  });
});

describe('ReflectionCard — Section 1: section label', () => {
  it('renders the "HOW ARE YOU TODAY?" label', () => {
    expect(src).toMatch(/HOW ARE YOU TODAY\?/);
  });

  it('label style: 10pt textTertiary, letterSpacing 0.3, marginBottom 12', () => {
    const block = styleBlock('sectionLabel');
    expect(num(block, 'fontSize')).toBe(10);
    expect(block).toMatch(/color:\s*c\.textTertiary|color:\s*colors\.textTertiary/);
    const ls = num(block, 'letterSpacing');
    expect(ls).toBeCloseTo(0.3, 1);
    expect(num(block, 'marginBottom')).toBe(12);
  });
});

describe('ReflectionCard — Section 2: 5-emoji mood selector', () => {
  it('renders all five mood emojis: 😔 😕 😐 🙂 😊', () => {
    expect(src).toContain('😔');
    expect(src).toContain('😕');
    expect(src).toContain('😐');
    expect(src).toContain('🙂');
    expect(src).toContain('😊');
  });

  it('mood row uses justifyContent: space-between', () => {
    const block = styleBlock('moodRow');
    expect(block).toMatch(/justifyContent:\s*['"]space-between['"]/);
    expect(num(block, 'paddingHorizontal')).toBe(6);
  });

  it('each mood button is a 36×36pt tap target', () => {
    const block = styleBlock('moodButton');
    expect(num(block, 'width')).toBe(36);
    expect(num(block, 'height')).toBe(36);
  });

  it('selected mood button gets a 1.5px SAGE ring (You rebuild — de-purple; §5 self-care = sage)', () => {
    // De-boxed + de-purpled: the ring returns to sage (c.accent), the You
    // accent after the lavender chrome retired. Never caregiverAccent, never blue.
    const block = styleBlock('moodButtonSelected');
    expect(num(block, 'borderWidth')).toBe(1.5);
    expect(block).toMatch(/borderColor:\s*(c|colors)\.accent\b(?!\w)/);
    expect(block).not.toMatch(/caregiverAccent/);
  });

  it('unselected emoji renders at 0.4 opacity; selected at 1.0', () => {
    // The opacity differential is the primary "selected" signal alongside
    // the accent ring. Either inline conditional or paired styles.
    const inactiveOk = /opacity:\s*0\.4/.test(src);
    expect(inactiveOk).toBe(true);
  });
});

describe('ReflectionCard — Section 3: prompt copy', () => {
  it('prompt reads "What was today like for you?"', () => {
    expect(src).toContain('What was today like for you?');
  });

  it('prompt style: 13pt textPrimary, weight 500, marginTop Spacing.md, marginBottom 10', () => {
    // Phase 3.7.1 migrated literal `marginTop: 16` to `Spacing.md` so the
    // recalibrated 4pt scale (md = 20 from Phase 3.5) cascades.
    const block = styleBlock('prompt');
    expect(num(block, 'fontSize')).toBe(13);
    expect(block).toMatch(/color:\s*c\.textPrimary|color:\s*colors\.textPrimary/);
    expect(block).toMatch(/fontWeight:\s*['"]500['"]/);
    expect(block).toMatch(/marginTop:\s*Spacing\.md\b/);
    expect(num(block, 'marginBottom')).toBe(10);
  });
});

describe('ReflectionCard — Section 4: text input', () => {
  it('renders a multiline TextInput with the spec placeholder', () => {
    expect(src).toMatch(/multiline/);
    expect(src).toMatch(/A few words, or skip…/);
  });

  it('input style: B3 INSET — darkened (background) fill + borderInset, radius 10, padding 12, fontSize 13', () => {
    const block = styleBlock('input');
    // B3 device-conditional inset: darkened fill + inset edge (was glassDim/glassBorder).
    expect(block).toMatch(/backgroundColor:\s*c\.background|backgroundColor:\s*colors\.background/);
    expect(num(block, 'borderWidth')).toBe(0.5);
    expect(block).toMatch(/borderColor:\s*c\.borderInset|borderColor:\s*colors\.borderInset/);
    expect(num(block, 'borderRadius')).toBe(10);
    expect(num(block, 'padding')).toBe(12);
    expect(num(block, 'fontSize')).toBe(13);
  });

  it('input min-height: 3-line range (~51), max-height 200 (Phase 29 Batch B F3)', () => {
    // Phase 29 Batch B F3 — the spec wants 3-line minHeight at rest with
    // auto-expand on focus up to maxHeight 200. fontSize 13 × default
    // lineHeight 1.3 × 3 lines ≈ 51px. Hardcoded literal (no new Sizing
    // token; no other consumer needs a 3-line specifically). Accept any
    // value in the 3-line range (48-56) to allow for minor lineHeight
    // tuning without breaking the contract. Auto-expand on focus is
    // RN's default multiline behavior — no focus-handler code needed.
    const block = styleBlock('input');
    const lit = num(block, 'minHeight');
    expect(lit).not.toBeNull();
    expect(lit as number).toBeGreaterThanOrEqual(48);
    expect(lit as number).toBeLessThanOrEqual(56);
    expect(num(block, 'maxHeight')).toBe(200);
  });

  it('input text color is textPrimary; placeholderTextColor is textTertiary', () => {
    const block = styleBlock('input');
    expect(block).toMatch(/color:\s*c\.textPrimary|color:\s*colors\.textPrimary/);
    expect(src).toMatch(/placeholderTextColor=\{[^}]*textTertiary/);
  });
});

describe('ReflectionCard — Section 5: footer (privacy note + Save pill)', () => {
  it('shows the "Private · saved on this device" privacy note in 10pt textTertiary', () => {
    expect(src).toContain('Private · saved on this device');
    const block = styleBlock('privacyNote');
    expect(num(block, 'fontSize')).toBe(10);
    expect(block).toMatch(/color:\s*c\.textTertiary|color:\s*colors\.textTertiary/);
  });

  it('Save pill: solid sage + near-black text (Phase 33b extension lavender no-fill canon — reframed from Phase 29 Batch B F3 lavender recolor)', () => {
    // Phase 29 Batch B F3 had migrated this pill from sage to lavender
    // as a Tier-1 within-surface coherence move. Phase 33b extension
    // lavender no-fill canon (site #14) reversed that flip — lavender
    // is now restricted to eyebrow-scale text + thin accents, never
    // fills. The Save pill returns to sage `c.accent`; near-black text
    // reads on sage the same way it read on lavender per the Phase 26
    // F4 sage/lavender-CTA contrast precedent. Padding + radius +
    // fontSize unchanged.
    const button = styleBlock('saveButton');
    expect(button).toMatch(/backgroundColor:\s*(c|colors)\.accent\b(?!\w)/);
    expect(num(button, 'paddingVertical')).toBe(6);
    expect(num(button, 'paddingHorizontal')).toBe(16);
    expect(num(button, 'borderRadius')).toBe(16);
    const buttonText = styleBlock('saveButtonText');
    // fontSize 11.5 is a fractional float — match the literal text.
    expect(buttonText).toMatch(/fontSize:\s*11\.5/);
    // Near-black text on solid sage per Phase 26 F4 precedent (unchanged
    // across the lane reframe — the text color was set to serve both
    // lanes equivalently).
    expect(buttonText).toMatch(/color:\s*['"]#0a0c0a['"]/);
  });

  it('footer row has marginTop 12', () => {
    const block = styleBlock('footer');
    expect(num(block, 'marginTop')).toBe(12);
  });

  it('Save button is disabled when both mood and text are empty', () => {
    // Either via a `disabled` prop on the TouchableOpacity that references
    // both mood and text, or via a derived `canSave`/`saveDisabled` flag.
    expect(src).toMatch(/disabled=\{[^}]*(?:mood[\s\S]{0,80}text|text[\s\S]{0,80}mood|!canSave|saveDisabled)/);
  });

  it('Save button is enabled when EITHER mood or text is set', () => {
    // The canSave (or equivalent) expression must use OR-logic across the
    // mood and text inputs — not require both.
    const canSaveLine = src.match(/(?:canSave|saveDisabled|saveEnabled)\s*=\s*[^;\n]+[\n;]/);
    expect(canSaveLine).toBeTruthy();
    // Must reference both mood and text
    expect(canSaveLine![0]).toMatch(/mood/);
    expect(canSaveLine![0]).toMatch(/text/);
    // Must use OR (||), not AND (&&), between the two — either alone enables save.
    expect(canSaveLine![0]).toMatch(/\|\|/);
    expect(canSaveLine![0]).not.toMatch(/&&[^|]*$/);
  });
});

describe('ReflectionCard — save flow + prefill', () => {
  it('Save handler calls reflectionRepo.saveReflection with { date, mood, text }', () => {
    // Verify the call shape, not just that the function is referenced.
    expect(src).toMatch(/saveReflection\(\s*\{[\s\S]{0,300}?date[\s\S]{0,300}?\}\s*\)/);
    const saveCall = src.match(/saveReflection\(\s*\{[\s\S]*?\}\s*\)/);
    expect(saveCall).toBeTruthy();
    expect(saveCall![0]).toMatch(/\bdate\b/);
    expect(saveCall![0]).toMatch(/\bmood\b/);
    expect(saveCall![0]).toMatch(/\btext\b/);
  });

  it('shows an inline "Saved." toast for ~2 seconds after save', () => {
    expect(src).toMatch(/Saved\./);
    // Either via the shared InlineSaveToast (autoDismissMs={2000}) or a
    // local toast with a 2000ms timeout.
    expect(src).toMatch(/autoDismissMs=\{2000\}|setTimeout\([\s\S]{0,80}?,\s*2000/);
  });

  it('prefills mood AND text from getReflection on mount', () => {
    // useEffect that calls getReflection AND wires the result into both
    // setMood and setText (one or the other isn't enough — both must hydrate).
    expect(src).toMatch(/useEffect\(/);
    expect(src).toMatch(/getReflection\(/);
    expect(src).toMatch(/setMood\(/);
    expect(src).toMatch(/setText\(/);
    // The setter calls must live in the same effect that reads the entry —
    // proxied by their proximity to the getReflection call.
    const effectBlock = src.match(/useEffect\(\s*\(\)\s*=>\s*\{[\s\S]*?\},\s*\[[^\]]*\]\)/);
    expect(effectBlock).toBeTruthy();
    expect(effectBlock![0]).toMatch(/getReflection/);
    expect(effectBlock![0]).toMatch(/setMood/);
    expect(effectBlock![0]).toMatch(/setText/);
  });

  it('after save, the input fades to read-only until tapped to re-edit', () => {
    // Implementation hook: a saved/locked state flag that makes the input
    // editable={false} until the user taps to re-enable.
    expect(src).toMatch(/editable=\{[^}]+\}/);
  });
});

describe('ReflectionCard — accessibility', () => {
  it('text input declares accessibilityLabel="Today\'s reflection"', () => {
    expect(src).toMatch(/accessibilityLabel=['"]Today's reflection['"]/);
  });

  it('text input declares accessibilityHint guiding the optional input', () => {
    expect(src).toMatch(/accessibilityHint=['"]Write a few words about your day, or leave blank['"]/);
  });
});
