// ============================================================================
// Care Plan panels — three uniform grounded panels (restyle S5).
//
// Care Plan rebuild (S5, sage+Poppins) supersedes the F7-C6 ZoneTint approach:
// Medications / Daily Tracking / Add When Ready each wrap in the SAME uniform
// panel (sectionZone). Differentiation is carried by COLOR-CODED EYEBROWS —
// Medications = gold, Daily tracking = sage (§5 register-via-eyebrows, matching
// Now/Journal wayfinding) — NOT by background tints. The meds z1-tint override
// (sectionZoneAlwaysOn) is retired. Eyebrow renders ABOVE each panel; rows +
// expanded drawers live INSIDE.
//
// sectionZone tokens (unchanged): c.bgRaised fill, c.hairlineInset border,
// borderWidth 1, borderRadius 14 — reused tokens, zero-net-color-change.
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

  it('contract 2 [restyle S5]: ALWAYS ON section uses the uniform sectionZone (ZoneTint dropped)', () => {
    // The z1-tint override is retired — the meds panel is uniform with its
    // siblings; the gold eyebrow carries the register instead.
    expect(STRIPPED).toMatch(
      /<View\s+testID=['"]section-zone-always-on['"]\s+style=\{styles\.sectionZone\}\s*>/,
    );
    expect(STRIPPED).not.toMatch(/styles\.sectionZoneAlwaysOn\b/);
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

  it('contract 5 [restyle S5]: eyebrows render above their zones, COLOR-CODED (Meds=gold, Daily=sage)', () => {
    // Medications eyebrow sits in the alwaysOnHeaderRow, tinted GOLD (§5 meds).
    expect(STRIPPED).toMatch(
      /<View\s+style=\{styles\.alwaysOnHeaderRow\}>\s*<SectionEyebrow\s+text=['"]Medications['"]\s+tint=['"]gold['"]/,
    );
    // Daily tracking = SAGE (§5 health/tracking); Add when ready stays neutral
    // (receded). Both above their zones.
    expect(STRIPPED).toMatch(
      /<SectionEyebrow\s+text=['"]Daily tracking['"]\s+tint=['"]accent['"]\s*\/>\s*<View\s+testID=['"]section-zone-daily-tracking['"]/,
    );
    expect(STRIPPED).toMatch(
      /<SectionEyebrow\s+text=['"]Add when ready['"]\s*\/>\s*<View\s+testID=['"]section-zone-add-when-ready['"]/,
    );
  });

  // --------------------------------------------------------------------------
  // Identity lock — all three zones share the SAME style ref
  // --------------------------------------------------------------------------

  it('contract 6 [restyle S5]: all three panels are the SAME uniform sectionZone — differentiation via eyebrows, not bg tints', () => {
    // ③: uniform panels supersede the 32A/F7-C6 ZoneTint approach. All three
    // sections share the plain sectionZone; the meds z1-tint override retired.
    const plain = STRIPPED.match(/style=\{styles\.sectionZone\}/g) ?? [];
    expect(plain.length).toBe(3); // Medications + Daily Tracking + Add When Ready
    expect(STRIPPED).not.toMatch(/styles\.sectionZoneAlwaysOn\b/);
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
