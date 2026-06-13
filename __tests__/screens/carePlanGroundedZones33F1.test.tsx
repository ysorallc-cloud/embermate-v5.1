// ============================================================================
// Phase 33 F1 — three identical grounded zones on Care Plan.
//
// User-locked: Always On / Daily Tracking / Add When Ready each wrap
// in the SAME contained ground. NO warmer treatment for the meds /
// always-on zone — all three identical. Eyebrow renders ABOVE each
// zone (outside the container, same as the pre-F1 placement); rows
// and any expanded drawers live INSIDE the zone.
//
// Tokens (F1-approved, already canon — NO new colors introduced):
//   • backgroundColor: c.bgRaised      (theme-tokens.ts:377 = #221d18)
//   • borderColor:     c.hairlineInset (theme-tokens.ts:46  = rgba(255,240,215,0.06))
//   • borderWidth:     1
//   • borderRadius:    14
//
// Both tokens are already in use elsewhere in this codebase
// (bgRaised → F10 swipe foreground; hairlineInset → F9 row dividers),
// so reusing them keeps F1 a zero-net-color-change.
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

describe('Phase 33 F1 — three identical grounded zones on Care Plan', () => {
  // --------------------------------------------------------------------------
  // The shared sectionZone style
  // --------------------------------------------------------------------------

  it('contract 1: sectionZone style exists with the canon-locked tokens', () => {
    const zone = styleBlock(STRIPPED, 'sectionZone');
    expect(zone).not.toBe('');
    // Fill — the dark warm-charcoal ground (already used by F10 swipe
    // foreground). Reused, not a new color.
    expect(zone).toMatch(/backgroundColor\s*:\s*c\.bgRaised\b/);
    // Hairline — exact spec value rgba(255,240,215,0.06) which is the
    // c.hairlineInset token (already used by F9 row dividers).
    expect(zone).toMatch(/borderColor\s*:\s*c\.hairlineInset\b/);
    expect(zone).toMatch(/borderWidth\s*:\s*1\b/);
    expect(zone).toMatch(/borderRadius\s*:\s*14\b/);
  });

  // --------------------------------------------------------------------------
  // Three zones — each section wrapped in its own sectionZone container
  // --------------------------------------------------------------------------

  it('contract 2 [F7 C6]: ALWAYS ON section wrapped in <View testID="section-zone-always-on" style={[styles.sectionZone, styles.sectionZoneAlwaysOn]}>', () => {
    // F7 C6 (2026-06-12) reframed the Phase 33 F1 "three identical
    // zones" decision: the meds zone now carries a z1 tint via the
    // sectionZoneAlwaysOn override (Option C lock). The wrapper now
    // takes an array of [sectionZone, sectionZoneAlwaysOn].
    expect(STRIPPED).toMatch(
      /<View\s+testID=['"]section-zone-always-on['"]\s+style=\{\[styles\.sectionZone,\s*styles\.sectionZoneAlwaysOn\]\}\s*>/,
    );
  });

  it('contract 3: DAILY TRACKING section is wrapped in <View testID="section-zone-daily-tracking" style={styles.sectionZone}>', () => {
    expect(STRIPPED).toMatch(
      /<View\s+testID=['"]section-zone-daily-tracking['"]\s+style=\{styles\.sectionZone\}\s*>/,
    );
  });

  it('contract 4: ADD WHEN READY section is wrapped in <View testID="section-zone-add-when-ready" style={styles.sectionZone}>', () => {
    expect(STRIPPED).toMatch(
      /<View\s+testID=['"]section-zone-add-when-ready['"]\s+style=\{styles\.sectionZone\}\s*>/,
    );
  });

  // --------------------------------------------------------------------------
  // Eyebrow ABOVE the zone, not inside
  // --------------------------------------------------------------------------

  it('contract 5 [F7 C6]: SectionEyebrows render above their zones; meds eyebrow text flipped to "Medications"', () => {
    // F7 C6: "Always on" eyebrow text retires in favor of "Medications"
    // and the eyebrow is wrapped in an alwaysOnHeaderRow flexbox so the
    // count badge can sit on the right. The pre-eyebrow → zone order
    // is preserved (eyebrow row open → zone open).
    expect(STRIPPED).toMatch(
      /<View\s+style=\{styles\.alwaysOnHeaderRow\}>\s*<SectionEyebrow\s+text=['"]Medications['"]/,
    );
    // Daily tracking + Add when ready stay on the original eyebrow →
    // zone pattern.
    for (const [eyebrowText, testId] of [
      ['Daily tracking', 'daily-tracking'],
      ['Add when ready', 'add-when-ready'],
    ] as const) {
      const re = new RegExp(
        `<SectionEyebrow\\s+text=['"]${eyebrowText}['"]\\s*/>\\s*<View\\s+testID=['"]section-zone-${testId}['"]`,
      );
      expect(STRIPPED).toMatch(re);
    }
  });

  // --------------------------------------------------------------------------
  // Identity lock — all three zones share the SAME style ref
  // --------------------------------------------------------------------------

  it('contract 6 [F7 C6 reframe]: meds zone overrides via sectionZoneAlwaysOn z1 tint; Daily + Add stay neutral', () => {
    // F7 C6 (2026-06-12) retired the Phase 33 F1 "all three identical"
    // lock. Per Option C: meds is z1-tinted (warm ember-near-black),
    // Daily Tracking + Add When Ready stay on the neutral sectionZone
    // ground. The forward-guards against sectionZoneWarm /
    // sectionZoneMeds bespoke variants STAY — the only legal override
    // is sectionZoneAlwaysOn for the Option C meds tint.
    const plain = STRIPPED.match(/style=\{styles\.sectionZone\}/g) ?? [];
    expect(plain.length).toBe(2); // Daily Tracking + Add When Ready
    expect(STRIPPED).toMatch(/styles\.sectionZoneAlwaysOn\b/);
    expect(STRIPPED).not.toMatch(/\bsectionZoneWarm\s*:\s*\{/);
    expect(STRIPPED).not.toMatch(/\bsectionZoneMeds\s*:\s*\{/);
  });

  // --------------------------------------------------------------------------
  // No new colors / no token duplication
  // --------------------------------------------------------------------------

  it('contract 7: sectionZone introduces NO new colors (rejects inline hex/rgba — only c.* token refs allowed)', () => {
    const zone = styleBlock(STRIPPED, 'sectionZone');
    expect(zone).not.toBe('');
    // Reject literal hex / rgba / hsla values inside the block — they
    // would be a new color, violating the "reuse existing tokens"
    // lock. Only c.<token> references are allowed.
    expect(zone).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(zone).not.toMatch(/\brgba?\s*\(/);
    expect(zone).not.toMatch(/\bhsla?\s*\(/);
  });
});
