// ============================================================================
// TodayOutcomes hairline edge-to-edge — Phase 5a.
//
// Phase 2's card-padding contract set TodayOutcomes.card.padding: 0
// (cards holding row lists let the rows handle their own padding).
// The body inside the card carries paddingHorizontal: 12. The hairline
// between rows (rowDivider) currently sits inside that body padding,
// rendering INSET — not edge-to-edge.
//
// 5a fix: rowDivider gets marginHorizontal: -12 so the 0.5px line
// spans back into the card's body padding and runs card-edge to
// card-edge. The math: body padding 12 + negative margin 12 = 0pt
// from card edge.
//
// This is a rare edge-hairline case justified by separating two
// semantically distinct rows (missed vs pending), not list items.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const src = readFileSync(join(ROOT, 'components/journal/TodayOutcomes.tsx'), 'utf8');

function extractStyleBody(name: string): string {
  const open = src.indexOf(`${name}: {`);
  if (open < 0) return '';
  const start = open + `${name}: {`.length;
  let depth = 1;
  let i = start;
  while (i < src.length && depth > 0) {
    if (src[i] === '{') depth += 1;
    else if (src[i] === '}') depth -= 1;
    i += 1;
  }
  return src
    .slice(start, i - 1)
    .split('\n')
    .map((line) => line.replace(/^\s*\/\/.*$/, ''))
    .join('\n');
}

function num(body: string, prop: string): number | null {
  const m = body.match(new RegExp(`\\b${prop}:\\s*(-?\\d+(?:\\.\\d+)?)`));
  return m ? Number(m[1]) : null;
}

describe('Phase 5a — Outcomes hairline edge-to-edge', () => {
  it('rowDivider has marginHorizontal: -12 to span the body padding', () => {
    const body = extractStyleBody('rowDivider');
    expect(num(body, 'marginHorizontal')).toBe(-12);
  });

  it('the negative margin matches body.paddingHorizontal exactly', () => {
    // The contract is: |rowDivider.marginHorizontal| === body.paddingHorizontal.
    // If body padding ever changes, the divider must follow in lockstep.
    const dividerBody = extractStyleBody('rowDivider');
    const containerBody = extractStyleBody('body');
    const dividerMH = num(dividerBody, 'marginHorizontal');
    const bodyPH = num(containerBody, 'paddingHorizontal');
    expect(dividerMH).not.toBeNull();
    expect(bodyPH).not.toBeNull();
    expect(Math.abs(dividerMH as number)).toBe(bodyPH);
  });

  it('rowDivider keeps the 0.5px hairline weight (no escalation to a heavier rule)', () => {
    const body = extractStyleBody('rowDivider');
    expect(body).toMatch(/borderBottomWidth:\s*0\.5\b/);
  });
});
