// ============================================================================
// Header structure contract — all four tabs must share the same shell.
// Title font + weight, subtitle metrics, paddings, and rhythm are unified.
// Content (title text, subtitle copy) varies; structure does not.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');

// Now tab uses a different header component (NowHeader → NowGreeting) because
// it carries a contextual greeting + metadata line. Its structural numbers
// still need to match the others — only the layout shape differs.
const headers: Array<{ tab: string; src: string }> = [
  { tab: 'now',        src: read('components/now/NowHeader.tsx') },
  { tab: 'now-greet',  src: read('components/now/NowGreeting.tsx') },
  { tab: 'journal',    src: read('app/(tabs)/journal.tsx') },
  { tab: 'understand', src: read('components/ScreenHeader.tsx') },
  { tab: 'support',    src: read('app/(tabs)/support.tsx') },
];

function styleBlock(src: string, name: string): string {
  const re = new RegExp(`\\b${name}:\\s*\\{([^}]*)\\}`, 's');
  const m = src.match(re);
  return m ? m[1] : '';
}

function num(block: string, prop: string): number | null {
  const m = block.match(new RegExp(`\\b${prop}:\\s*(-?\\d+(?:\\.\\d+)?)`));
  return m ? Number(m[1]) : null;
}

describe('Header structure contract — paddingTop: 32 across all tabs', () => {
  // Phase 5.13.4 — dropped 56 → 32. Combined with safe-area insets, 56
  // produced ~103pt of dead space above the H1 on notched iPhones (~12%
  // of screen height). 32 still gives breathing room above the 22pt H1
  // but pulls content up to where the eye expects it.
  it('Now tab header container: paddingTop 32', () => {
    const block = styleBlock(read('components/now/NowHeader.tsx'), 'headerRow');
    expect(num(block, 'paddingTop')).toBe(32);
  });

  it('Journal tab header container: paddingTop 32', () => {
    const block = styleBlock(read('app/(tabs)/journal.tsx'), 'headerRow');
    expect(num(block, 'paddingTop')).toBe(32);
  });

  it('Understand tab uses ScreenHeader; container paddingTop 32', () => {
    const block = styleBlock(read('components/ScreenHeader.tsx'), 'container');
    expect(num(block, 'paddingTop')).toBe(32);
  });

  it('Support tab header container: paddingTop 32', () => {
    const block = styleBlock(read('app/(tabs)/support.tsx'), 'headerWrap');
    expect(num(block, 'paddingTop')).toBe(32);
  });
});

describe('Header structure contract — title metrics', () => {
  // Title style names vary per file: title / headerTitle.
  function titleBlock(src: string): string {
    return styleBlock(src, 'title') || styleBlock(src, 'headerTitle');
  }

  // Phase 3.6.2 + 3.6.3 (May 3) compressed all four tab H1s from
  // fontSize 32 / weight 300 / letterSpacing -0.5 down to 22 / 500 / -0.3.
  // Phase 33 F4+F5+F6 (2026-05-17) re-established the brand serif at
  // headline scale across tab + subscreen headers. The unified-cross-tab
  // 22pt sans invariant retired in favor of a 32pt Source Serif 4
  // regular-weight register for informational tab/subscreen labels +
  // 22pt italic-serif for the You-tab witness-voice greeting.
  it('Now greeting title: 26pt serif weight 400 (Phase 33b Scope 1 — canonical greeting block)', () => {
    // Phase 33b Scope 1 — greeting canonical block per
    // project_brand_alignment_canon.md `.phone-greeting`. Symmetric
    // with You-tab greeting (both tabs render the same canonical
    // block). Italic register moved to the separate Subhead component
    // (ships empty/null in v1.0 per Path A; v1.1 fills via rewritten
    // caregiverWitnessBuilder).
    const block = titleBlock(read('components/now/NowGreeting.tsx'));
    expect(num(block, 'fontSize')).toBe(26);
    expect(block).toMatch(/fontWeight:\s*['"]400['"]/);
    expect(block).toMatch(/fontFamily:\s*Fonts\.serif\b/);
    expect(num(block, 'letterSpacing')).toBe(-0.5);
  });

  it('Journal headerTitle: 32pt serif weight 400 (Phase 33 F4.1 — inline header, Phase 22.1 wrapper preserved)', () => {
    // Phase 33 F4 audit-drift correction (Phase 33 F4.1, 2026-05-18).
    // F4 recorded Journal as "via ScreenHeader" because the consumer
    // grep matched line 558 (error-fallback branch). The main render
    // path (line 654+) bypasses ScreenHeader and renders an inline
    // <View style={s.headerRow}><Text style={s.headerTitle}>Journal</Text>
    // </View></View> — the Phase 22.1 handoff-document framing block.
    // F4.1 aligned the inline `headerTitle` style to the Phase 33 F4
    // spec (32pt Source Serif 4 weight 400 + −0.8 tracking) without
    // restoring ScreenHeader wrapping (preserves Phase 22.1 intent:
    // no subtitle / purpose; date stays in JournalIdentityStrip, mood
    // stays in GestaltSummary). This contract pins the corrected
    // inline source, not ScreenHeader.
    const block = titleBlock(read('app/(tabs)/journal.tsx'));
    expect(num(block, 'fontSize')).toBe(32);
    expect(block).toMatch(/fontWeight:\s*['"]400['"]/);
    expect(block).toMatch(/fontFamily:\s*Fonts\.serif\b/);
    expect(num(block, 'letterSpacing')).toBe(-0.8);
  });

  it('ScreenHeader title (Understand): 32pt serif weight 400 (Phase 33 F4)', () => {
    // Phase 33 F4 — pre-33 22pt/weight 500 sans replaced with 32pt /
    // weight 400 / Source Serif 4 / letter-spacing −0.8. Cascades to
    // Journal + Insights + ~20 sub-screens using ScreenHeader. Q-33.5
    // lock: informational labels use regular-weight serif.
    const block = titleBlock(read('components/ScreenHeader.tsx'));
    expect(num(block, 'fontSize')).toBe(32);
    expect(block).toMatch(/fontWeight:\s*['"]400['"]/);
    expect(block).toMatch(/fontFamily:\s*Fonts\.serif\b/);
    expect(num(block, 'letterSpacing')).toBe(-0.8);
  });

  it('Support greeting: 26pt serif weight 400 (Phase 33b Scope 1 — canonical greeting block, symmetric with Now)', () => {
    // Phase 33b Scope 1 — greeting canonical block per
    // project_brand_alignment_canon.md `.phone-greeting`. Both tabs
    // now render the same canonical block (regular serif, 26pt,
    // weight 400, letterSpacing -0.5). F6's italic-serif greeting
    // retired here — italic moved to the separate Subhead component
    // per the Path 2 lock that superseded Q-33.5's italic-greeting
    // interpretation.
    const block = styleBlock(read('app/(tabs)/support.tsx'), 'greeting');
    expect(block).not.toBe('');
    expect(num(block, 'fontSize')).toBe(26);
    expect(block).toMatch(/fontFamily:\s*Fonts\.serif\b/);
    expect(block).toMatch(/fontWeight:\s*['"]400['"]/);
    expect(num(block, 'letterSpacing')).toBe(-0.5);
  });
});

describe('Header structure contract — subtitle metrics', () => {
  // Subtitle/purpose style names: subtitle / headerPurpose / headerMessage /
  // headerContext / metadataSubtitle. Each tab uses its own naming; the
  // contract is on metrics, not names.
  type Metrics = { fontSize: number | null; lineHeight: number | null; marginTop: number | null; color: string | null };

  function metricsOf(src: string, name: string): Metrics {
    const block = styleBlock(src, name);
    const colorMatch = block.match(/color:\s*c\.(\w+)/) || block.match(/color:\s*colors\.(\w+)/);
    return {
      fontSize: num(block, 'fontSize'),
      lineHeight: num(block, 'lineHeight'),
      marginTop: num(block, 'marginTop'),
      color: colorMatch ? colorMatch[1] : null,
    };
  }

  it('Now greeting subtitle: 12pt / lineHeight 18 / textSecondary (Phase 3.6.2)', () => {
    // 3.6.2 collapsed metadataSubtitle into a tighter inline `subtitle`
    // style at 12pt / 18 lineHeight to match the compressed title.
    const m = metricsOf(read('components/now/NowGreeting.tsx'), 'subtitle');
    expect(m.fontSize).toBe(12);
    expect(m.lineHeight).toBe(18);
    expect(m.color).toBe('textSecondary');
  });

  it('Journal headerPurpose: 13pt / lineHeight 20 / textSecondary', () => {
    const m = metricsOf(read('app/(tabs)/journal.tsx'), 'headerPurpose');
    expect(m.fontSize).toBe(13);
    expect(m.lineHeight).toBe(20);
    expect(m.color).toBe('textSecondary');
  });

  it('ScreenHeader purpose: 13pt / lineHeight 20 / textSecondary', () => {
    const m = metricsOf(read('components/ScreenHeader.tsx'), 'purpose');
    expect(m.fontSize).toBe(13);
    expect(m.lineHeight).toBe(20);
    expect(m.color).toBe('textSecondary');
  });

  it('Support headerMessage subtitle retired (Phase 29 F1 — absence pin)', () => {
    // Phase 29 F1 retired the You-tab subtitle "A space for you, not
    // your loved one." entirely. There is no successor at the subtitle
    // position; the caregiver chip's "This is your space" copy carries
    // identity, not a subtitle. The other three tabs (Now / Journal /
    // ScreenHeader) keep their subtitle metrics — only Support is
    // exempt. Sibling absence pin: see
    // __tests__/copy/headerSubtitlesUpdated.test.ts.
    const block = styleBlock(read('app/(tabs)/support.tsx'), 'headerMessage');
    expect(block).toBe('');
  });
});

describe('Header structure contract — subtitle marginTop 8', () => {
  it('Now subtitle sits 4pt below the title (Phase 3.6.2 — tighter than metadata row)', () => {
    // 3.6.2 dropped the metadata row's 8pt gap to a 4pt subtitle margin
    // since there's no longer a multi-element row to separate from the
    // title — just a single inline subtitle.
    const block = styleBlock(read('components/now/NowGreeting.tsx'), 'subtitle');
    expect(num(block, 'marginTop')).toBe(4);
  });

  it('ScreenHeader subtitle: marginTop 8', () => {
    // ScreenHeader stacks subtitle then purpose; subtitle is the first below title.
    const block = styleBlock(read('components/ScreenHeader.tsx'), 'subtitle');
    expect(num(block, 'marginTop')).toBe(8);
  });
});

describe('Header structure contract — paddingBottom 24 before content', () => {
  it('Now header bottom padding: 24', () => {
    const block = styleBlock(read('components/now/NowHeader.tsx'), 'headerRow');
    expect(num(block, 'paddingBottom')).toBe(24);
  });

  it('Journal header bottom padding: 24', () => {
    const block = styleBlock(read('app/(tabs)/journal.tsx'), 'headerRow');
    expect(num(block, 'paddingBottom')).toBe(24);
  });

  it('ScreenHeader (Understand) bottom padding: 24', () => {
    const block = styleBlock(read('components/ScreenHeader.tsx'), 'container');
    expect(num(block, 'paddingBottom')).toBe(24);
  });

  it('Support header bottom padding: 24', () => {
    const block = styleBlock(read('app/(tabs)/support.tsx'), 'headerWrap');
    expect(num(block, 'paddingBottom')).toBe(24);
  });
});
