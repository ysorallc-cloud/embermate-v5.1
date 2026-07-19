// ============================================================================
// Card padding contract — May 1 spacing-rhythm Phase 2.
//
// Every card across the four tabs (Now, Journal, Understand, You) follows
// a single padding shape:
//
//   • padding: 12 (or the equivalent token Sizing.cardInternalPadding /
//     Spacing.sm) — symmetric all-sides, no axis or per-edge overrides.
//   • OR padding: 0 — for cards that hold a list of rows where the rows
//     handle their own padding (the Plan Ahead grouped card on You).
//
// Disallowed inside card-surface style blocks:
//   • paddingVertical or paddingHorizontal (axis overrides — even at 12 —
//     defeat the "always symmetric" contract by making the contract
//     ambiguous; some cards would set padding, others pV/pH, drift creeps in)
//   • paddingTop / paddingBottom / paddingLeft / paddingRight (per-edge
//     overrides — same argument, more specific)
//
// Source-level audit: parses every named style block in each card-component
// file, finds the ones with a card-surface backgroundColor, validates the
// padding shape. Mount-based tab walking would require stubbing dozens of
// transitive imports per tab; the source test pins the same contract.
// ============================================================================

import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '..');

// Card surface tokens — backgroundColor values that mean "this View is a
// card". Includes the tinted warm variants used as semantic-status cards
// (alert / quiet / green / purple) which still need the same padding shape.
const CARD_TOKENS = [
  'glass',
  'youCardSurface',
  'warmSurface',
  'warmSurfaceAlert',
  'warmSurfacePurple',
  'warmSurfaceQuiet',
  'warmSurfaceGreen',
];

const TARGET_DIRS = [
  'components/now',
  'components/journal',
  'components/understand',
  'components/support',
  'app/(tabs)',
];

const ALLOWED_PADDING_VALUES = new Set([
  '12',
  '0',
  'Sizing.cardInternalPadding',
  'Spacing.sm',
]);

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      walk(full).forEach((f) => out.push(f));
    } else if (name.endsWith('.tsx')) {
      out.push(full);
    }
  }
  return out;
}

interface CardStyleBlock {
  file: string;
  styleName: string;
  body: string;
}

// Find every named style block whose body contains a card-surface
// backgroundColor reference. Style blocks preceded by a `// allow: ...`
// comment within ~200 chars (or carrying one inline) are skipped — per
// the May 1 spacing-pass convention for legitimate exceptions (icon
// buttons, hero proportions, intentionally axis-padded surfaces).
function extractCardStyles(file: string): CardStyleBlock[] {
  const src = readFileSync(file, 'utf8');
  const blocks: CardStyleBlock[] = [];
  const styleNamePattern = /(\w+):\s*\{/g;
  let m: RegExpExecArray | null;
  while ((m = styleNamePattern.exec(src)) !== null) {
    const name = m[1];
    let i = m.index + m[0].length;
    let depth = 1;
    while (i < src.length && depth > 0) {
      const ch = src[i];
      if (ch === '{') depth += 1;
      else if (ch === '}') depth -= 1;
      i += 1;
    }
    const body = src.slice(m.index + m[0].length, i - 1);
    const bgMatch = body.match(/backgroundColor:\s*c\.(\w+)/);
    if (!bgMatch || !CARD_TOKENS.includes(bgMatch[1])) continue;
    const preWindow = src.slice(Math.max(0, m.index - 200), m.index);
    if (/\/\/\s*allow:/i.test(preWindow)) continue;
    if (/\/\/\s*allow:/i.test(body)) continue;
    blocks.push({ file, styleName: name, body });
  }
  return blocks;
}

function findAllCardStyles(): CardStyleBlock[] {
  const out: CardStyleBlock[] = [];
  for (const dir of TARGET_DIRS) {
    const full = join(ROOT, dir);
    for (const file of walk(full)) {
      out.push(...extractCardStyles(file));
    }
  }
  return out;
}

function describeBlock(b: CardStyleBlock): string {
  return `${b.file.replace(ROOT, '')} :: ${b.styleName}`;
}

describe('Phase 2 — card padding contract', () => {
  const cards = findAllCardStyles();

  it('discovers card style blocks across the four tabs', () => {
    // Sanity check — there should be a meaningful number of card blocks
    // across the tab tree. If the regex breaks and finds zero, fail loud.
    // (Floor lowered from 15 after the dead journal-narrative components — which
    // carried card-surface blocks — were deleted in the S2-rebuild cleanup.)
    expect(cards.length).toBeGreaterThan(10);
  });

  it('every card style sets padding (no missing padding allowed)', () => {
    const offenders: string[] = [];
    for (const c of cards) {
      const hasPadding = /\bpadding:\s*[^,}]+/.test(c.body);
      const hasAxis =
        /\bpaddingVertical:/.test(c.body) || /\bpaddingHorizontal:/.test(c.body);
      const hasPerEdge =
        /\bpaddingTop:/.test(c.body) ||
        /\bpaddingBottom:/.test(c.body) ||
        /\bpaddingLeft:/.test(c.body) ||
        /\bpaddingRight:/.test(c.body);
      if (!hasPadding && !hasAxis && !hasPerEdge) {
        offenders.push(`${describeBlock(c)} — no padding declared at all`);
      }
    }
    if (offenders.length > 0) {
      throw new Error(`Cards without padding:\n  ${offenders.join('\n  ')}`);
    }
  });

  it('every card uses symmetric `padding: 12` (or token-equivalent / 0)', () => {
    const offenders: string[] = [];
    for (const c of cards) {
      const m = c.body.match(/\bpadding:\s*([^,\n}]+)/);
      if (!m) {
        // Without padding: ..., the next test catches it. Skip here.
        continue;
      }
      const value = m[1].trim();
      if (!ALLOWED_PADDING_VALUES.has(value)) {
        offenders.push(`${describeBlock(c)} — padding: ${value} (must be 12 / Sizing.cardInternalPadding / Spacing.sm / 0)`);
      }
    }
    if (offenders.length > 0) {
      throw new Error(`Card padding violations:\n  ${offenders.join('\n  ')}`);
    }
  });

  it('cards do NOT use paddingVertical / paddingHorizontal (axis overrides)', () => {
    const offenders: string[] = [];
    for (const c of cards) {
      if (/\bpaddingVertical:/.test(c.body)) {
        offenders.push(`${describeBlock(c)} — has paddingVertical`);
      }
      if (/\bpaddingHorizontal:/.test(c.body)) {
        offenders.push(`${describeBlock(c)} — has paddingHorizontal`);
      }
    }
    if (offenders.length > 0) {
      throw new Error(`Card axis-padding violations:\n  ${offenders.join('\n  ')}`);
    }
  });

  it('cards do NOT use paddingTop / Bottom / Left / Right (per-edge overrides)', () => {
    const offenders: string[] = [];
    const edge = /\bpadding(Top|Bottom|Left|Right):/g;
    for (const c of cards) {
      if (edge.test(c.body)) {
        offenders.push(`${describeBlock(c)} — has per-edge padding override`);
      }
      edge.lastIndex = 0;
    }
    if (offenders.length > 0) {
      throw new Error(`Card per-edge padding violations:\n  ${offenders.join('\n  ')}`);
    }
  });
});
