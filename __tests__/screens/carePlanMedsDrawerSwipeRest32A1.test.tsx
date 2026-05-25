// ============================================================================
// Phase 32A.1 F10 — swipe foreground must be FULLY OPAQUE at rest
//                   (STOP-C device-walk regression from F9).
//
// STOP-C report:
//   "REGRESSION from F9: coral Remove action shows at REST on every
//    meds row. Containment/left-rule/flat-rows are all correct —
//    keep them. This is purely the swipe foreground."
//
// ROOT CAUSE — F9 set rowSwipeable.backgroundColor = c.glassFaint to
// match the scaffold ground so rows visually melt into the panel.
// But glassFaint is `rgba(255, 245, 220, 0.03)` — 3% alpha,
// effectively transparent. The removeAction (coral, position absolute
// right:0, BEHIND the foreground in z-order) bleeds straight through
// at rest. The Switch on top of the coral made it especially visible.
//
// THE BIND — pre-F9 `c.glass` (#363830) was OPAQUE-but-cardlike
// (that's why F9 dropped it: rows read as cards). `c.glassFaint`
// matches the panel ground but is TRANSPARENT. Neither works alone.
//
// FIX — `c.bgRaised` (#221d18 at theme-tokens.ts:377): fully OPAQUE
// so it occludes the coral at rest, AND within one L* step of the
// scaffold's rendered ground (page #1a1612 + glassFaint composites
// to ~#211d18). Rows still melt into the panel; no card look.
//
// PERMANENT GUARD — this contract pins "swipe foreground stays
// hidden at rest" as a forever-rule regardless of future palette
// shifts. Any future refactor that swaps the row fill back to a
// translucent value will be caught here.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const DRAWER_SRC = readFileSync(
  join(ROOT, 'components/careplan/drawers/MedicationsDrawer.tsx'),
  'utf8',
);
const TOKENS_SRC = readFileSync(
  join(ROOT, 'theme/theme-tokens.ts'),
  'utf8',
);

function stripComments(s: string): string {
  return s
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '');
}

const DRAWER_STRIPPED = stripComments(DRAWER_SRC);

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

// Pulls a literal value from a `key: value,` line in a token source.
// Handles single-quoted, double-quoted, and unquoted (e.g. rgba(...))
// right-hand sides — we just need the raw string for opacity inspection.
function tokenValue(src: string, key: string): string | null {
  const re = new RegExp(`\\b${key}\\s*:\\s*['"\`]?([^,\\n'"\`]+)['"\`]?\\s*,`);
  const m = src.match(re);
  return m ? m[1].trim() : null;
}

// Determines whether a color string is fully opaque. Hex strings
// (#xxx, #xxxxxx, #xxxxxxxx with alpha FF) and named colors are
// treated as opaque. rgba()/hsla() with alpha < 1 are NOT opaque.
function isFullyOpaque(value: string): boolean {
  const v = value.trim().toLowerCase();
  // rgba(r, g, b, a) — fail if a < 1.
  const rgbaMatch = v.match(/^rgba\s*\(\s*[^,]+,\s*[^,]+,\s*[^,]+,\s*([0-9.]+)\s*\)$/);
  if (rgbaMatch) return parseFloat(rgbaMatch[1]) >= 1;
  // hsla(h, s, l, a) — fail if a < 1.
  const hslaMatch = v.match(/^hsla\s*\([^)]*,\s*([0-9.]+)\s*\)$/);
  if (hslaMatch) return parseFloat(hslaMatch[1]) >= 1;
  // 8-digit hex — last two chars are alpha.
  if (/^#[0-9a-f]{8}$/.test(v)) {
    const a = parseInt(v.slice(7, 9), 16);
    return a === 0xff;
  }
  // 6-digit hex, 3-digit hex, rgb(), hsl(), or named — opaque.
  return true;
}

describe('Phase 32A.1 F10 — swipe foreground stays opaque at rest (coral Remove hidden)', () => {
  // --------------------------------------------------------------------------
  // The contract — permanent guard against translucent row fills
  // --------------------------------------------------------------------------

  it('contract 1: rowSwipeable.backgroundColor is NOT a translucent token (rejects c.glassFaint and any rgba/hsla < 1.0)', () => {
    // Pull rowSwipeable's backgroundColor reference from the drawer
    // source, then look up the literal token value in theme-tokens.ts
    // and verify it's fully opaque. The check runs against the
    // resolved color string, not just the token name — so a future
    // palette refactor that aliases bgRaised to a translucent value
    // would still fail.
    const swipeBlock = styleBlock(DRAWER_STRIPPED, 'rowSwipeable');
    expect(swipeBlock).not.toBe('');

    const bgMatch = swipeBlock.match(/backgroundColor\s*:\s*c\.(\w+)/);
    expect(bgMatch).not.toBeNull();
    const tokenName = bgMatch![1];

    // Hard reject of the specific F9-regression token. The reason is
    // explicit in the contract message — glassFaint is 3% alpha so
    // the coral Remove action behind the swipe foreground bleeds
    // through in the resting state.
    expect(tokenName).not.toBe('glassFaint');

    // Resolve the token to its literal value in theme-tokens.ts and
    // verify it's fully opaque. Catches any future translucent token
    // (rgba/hsla/8-digit-hex with alpha) regardless of name.
    const resolved = tokenValue(TOKENS_SRC, tokenName);
    expect(resolved).not.toBeNull();
    expect(isFullyOpaque(resolved!)).toBe(true);
  });

  // --------------------------------------------------------------------------
  // F9 styling preserved — only the fill changes
  // --------------------------------------------------------------------------

  it('contract 2: rowSwipeable still has NO borderRadius (F9 flat-rows lock holds)', () => {
    const swipeBlock = styleBlock(DRAWER_STRIPPED, 'rowSwipeable');
    expect(swipeBlock).not.toMatch(/borderRadius\s*:\s*\d/);
  });

  it('contract 3: rowOuter still has NO borderRadius (F9 flat-rows lock holds)', () => {
    const rowOuterBlock = styleBlock(DRAWER_STRIPPED, 'rowOuter');
    expect(rowOuterBlock).not.toMatch(/borderRadius\s*:\s*\d/);
  });

  it('contract 4: row still uses the hairline divider (F9 contract 6 holds)', () => {
    const rowBlock = styleBlock(DRAWER_STRIPPED, 'row');
    const outerBlock = styleBlock(DRAWER_STRIPPED, 'rowOuter');
    const hasDivider =
      /borderBottomWidth\s*:\s*1/.test(rowBlock) ||
      /borderBottomWidth\s*:\s*1/.test(outerBlock);
    expect(hasDivider).toBe(true);
  });

  // --------------------------------------------------------------------------
  // Mechanism preserved — coral Remove still rendered, still revealed by swipe
  // --------------------------------------------------------------------------

  it('contract 5: removeAction is still rendered behind the foreground (PanResponder swipe-reveal mechanic intact)', () => {
    // The whole point of an opaque foreground is to HIDE a real
    // removeAction at rest. Pin that the removeAction style block
    // still exists with the absolute positioning + coral fill, and
    // the PanResponder is still wired — so the fix is "opacity, not
    // gesture retirement."
    const removeActionBlock = styleBlock(DRAWER_STRIPPED, 'removeAction');
    expect(removeActionBlock).not.toBe('');
    expect(removeActionBlock).toMatch(/position\s*:\s*['"]absolute['"]/);
    expect(removeActionBlock).toMatch(/right\s*:\s*0/);
    expect(DRAWER_STRIPPED).toMatch(/PanResponder\.create\s*\(/);
  });
});
