/**
 * insightEngine.ts — context string quality assertions.
 *
 * Each insight's `context` field must follow the three-sentence pattern:
 * <observation>. <interpretation>. <next step>.
 *
 * Tests read the source file and check every `context:` string literal.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const src = readFileSync(
  join(__dirname, '../../utils/insightEngine.ts'),
  'utf8',
);

/** Extract all context template-literal and string values from source.
 *  Handles same-line context: `...` and ternary branches across lines.
 *  Skips the type declaration `context: string;`. */
function extractContextStrings(): { line: number; value: string }[] {
  const results: { line: number; value: string }[] = [];
  // Global regex matches every `...` that follows `context:` (possibly
  // with a ternary condition or whitespace in between).
  const re = /`([^`]{20,})`/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    // Only keep strings that are inside a `context:` assignment —
    // walk back up to 200 chars to find a `context` keyword.
    const before = src.slice(Math.max(0, m.index - 200), m.index);
    if (!/context\s*[:=]/i.test(before) && !/^\s*[?:]/.test(src.slice(m.index - 10, m.index))) {
      // Not near a context assignment — check if it's on a ternary branch
      // (the line starts with `?` or `:` after whitespace)
      const lineStart = src.lastIndexOf('\n', m.index) + 1;
      const prefix = src.slice(lineStart, m.index).trim();
      if (prefix !== '?' && prefix !== ':') continue;
    }
    const resolved = m[1].replace(/\$\{[^}]+\}/g, '42');
    const lineNum = src.slice(0, m.index).split('\n').length;
    results.push({ line: lineNum, value: resolved });
  }
  return results;
}

const contexts = extractContextStrings();

describe('insightEngine.ts — context string language quality', () => {
  it('finds at least 6 context strings (one per insight type)', () => {
    expect(contexts.length).toBeGreaterThanOrEqual(6);
  });

  for (const { line, value } of contexts) {
    describe(`context at line ${line}: "${value.slice(0, 50)}..."`, () => {
      it('contains at least one ". " (multi-sentence)', () => {
        expect(value).toMatch(/\.\s/);
      });

      it('does not start with a metric label pattern', () => {
        expect(value).not.toMatch(/^[A-Z][a-z]+ [A-Z][a-z]+ Pattern:/);
      });

      it('length is between 60 and 220 characters', () => {
        expect(value.length).toBeGreaterThanOrEqual(60);
        expect(value.length).toBeLessThanOrEqual(220);
      });
    });
  }
});
