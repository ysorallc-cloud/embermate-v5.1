// ============================================================================
// Pattern engine tone — Phase 5 of the warm-copy pass.
//
// Source-pattern guard. Insights is the analytical surface, so it can carry
// clinical detail — but editorial framing words ("Only", "Just",
// "Unfortunately", "Sadly", "Disappointingly", "Great job", "Way to go",
// "Wonderful", "Impressive") flip it from "thoughtful colleague" into
// "scolding coach". This test scans every InsightData literal and fails if
// any of these words appear inside a context / whyItMatters / pattern /
// title string.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const src = readFileSync(join(ROOT, 'utils/insightEngine.ts'), 'utf8');

// Drop comment lines so explanatory prose doesn't trip the scanner.
function stripComments(s: string): string {
  return s
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((l) => !/^\s*\/\//.test(l))
    .join('\n');
}
const code = stripComments(src);

// Pull the right-hand sides of every output field that ends up in user copy.
// Templates straddle template-literal boundaries, so we just find every
// quoted string that follows one of these field names.
const COPY_FIELDS = ['context', 'whyItMatters', 'pattern', 'title'];

function copyStringsFor(field: string): string[] {
  const re = new RegExp(`\\b${field}:\\s*([\`'\"])([\\s\\S]*?)\\1`, 'g');
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(code)) !== null) {
    out.push(m[2]);
  }
  return out;
}

function allCopy(): { field: string; text: string }[] {
  const out: { field: string; text: string }[] = [];
  for (const f of COPY_FIELDS) {
    for (const text of copyStringsFor(f)) {
      out.push({ field: f, text });
    }
  }
  return out;
}

const FORBIDDEN = [
  // Negative framing
  'Only',
  'Just',
  'Unfortunately',
  'Sadly',
  'Disappointingly',
  // Cheerleader vocabulary
  'Great job',
  'Way to go',
  'Wonderful',
  'Impressive',
];

describe('Pattern engine output — no editorial framing', () => {
  const samples = allCopy();

  it('finds at least one InsightData copy string (sanity check)', () => {
    expect(samples.length).toBeGreaterThan(0);
  });

  for (const word of FORBIDDEN) {
    it(`no insight string starts with or contains "${word}"`, () => {
      // Word-boundary, case-insensitive. "Just" matches "Just keep going"
      // but not "justice" or "adjust".
      const re = new RegExp(`\\b${word}\\b`, 'i');
      const offenders = samples.filter((s) => re.test(s.text));
      if (offenders.length > 0) {
        const detail = offenders
          .map((o) => `  ${o.field}: ${JSON.stringify(o.text.slice(0, 100))}…`)
          .join('\n');
        throw new Error(
          `Found "${word}" in pattern engine output:\n${detail}\n\n` +
            `Insights is allowed to be analytical, but editorial framing ` +
            `words flip the tone into a scolding coach. Restate the data ` +
            `as data ("0 of 8 doses logged" instead of "Only 0 of 8 doses ` +
            `taken"), then add the clinical implication.`,
        );
      }
      expect(offenders).toEqual([]);
    });
  }
});
