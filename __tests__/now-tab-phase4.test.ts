// ============================================================================
// Now tab — Phase 4 spacing-pass corrections.
//
// Three discrete contracts on Now-tab surfaces, applied in this commit:
//
//   4a. StatRings container — marginTop: 16 (below the hero header),
//       marginBottom: 16 (above the schedule card), paddingHorizontal: 14
//       (matches the page-edge contract from Phase 3 so the four tiles'
//       outer gutters equal the page gutters). Tiles continue at flex: 1.
//
//   4b. ScheduleCard rows — paddingVertical: 8 (was 6). Active and
//       inactive rows share the same paddingVertical so the card height
//       stays uniform — only colour differs. Hairlines between rows are
//       inset (positive `borderTopWidth`, NO negative marginHorizontal).
//
//   4c. NowFooter journal-preview card — Phase 2's `padding: 12`
//       contract is unchanged. The "View journal →" link gets
//       `marginTop: 8` from the meds-logged line above. Previously the
//       8pt gap lived on `journalPreviewText.marginBottom`; flipping it
//       onto the link's marginTop matches the spec's "child carries the
//       gap" rhythm and lets the text above stack without a tail margin.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '..');

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), 'utf8');
}

function extractStyleBody(src: string, name: string): string {
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
  return src.slice(start, i - 1);
}

function num(body: string, prop: string): number | null {
  const m = body.match(new RegExp(`\\b${prop}:\\s*(-?\\d+(?:\\.\\d+)?)`));
  return m ? Number(m[1]) : null;
}

describe('Phase 4a — StatRings container rhythm', () => {
  const src = read('components/now/StatRings.tsx');
  const container = extractStyleBody(src, 'container');
  const column = extractStyleBody(src, 'column');

  it('container has marginTop: Spacing.md (below the hero header)', () => {
    // Phase 3.5 migrated this from literal 16 → Spacing.md so the
    // recalibrated scale (md = 20) cascades to the cascade.
    expect(container).toMatch(/marginTop:\s*Spacing\.md\b/);
  });

  it('container has marginBottom: Spacing.md (above the schedule card)', () => {
    expect(container).toMatch(/marginBottom:\s*Spacing\.md\b/);
  });

  it('container has paddingHorizontal: 14 (page-edge gutter parity)', () => {
    expect(num(container, 'paddingHorizontal')).toBe(14);
  });

  it('tiles use flex: 1 (equal-width columns)', () => {
    expect(num(column, 'flex')).toBe(1);
  });
});

describe('Phase 4b — ScheduleCard row geometry', () => {
  const src = read('components/now/ScheduleCard.tsx');
  const windowRow = extractStyleBody(src, 'windowRow');
  const windowRowDivider = extractStyleBody(src, 'windowRowDivider');

  it('windowRow has paddingVertical: 8', () => {
    expect(num(windowRow, 'paddingVertical')).toBe(8);
  });

  it('hairline divider uses positive borderTopWidth (inset, NOT negative margin)', () => {
    // borderTopWidth must be positive; marginHorizontal must NOT be a
    // negative value cutting through the card padding.
    const btw = num(windowRowDivider, 'borderTopWidth');
    expect(btw).not.toBeNull();
    expect(btw as number).toBeGreaterThan(0);
    const mh = num(windowRowDivider, 'marginHorizontal');
    if (mh !== null) {
      expect(mh).toBeGreaterThanOrEqual(0);
    }
  });

  it('active and inactive rows share the same paddingVertical (uniform heights)', () => {
    // The contract: there is exactly ONE paddingVertical declaration in
    // the windowRow style block, applied to both states. No
    // windowRowActive override of paddingVertical exists.
    const activeBlock = extractStyleBody(src, 'windowRowActive');
    if (activeBlock.length > 0) {
      expect(activeBlock).not.toMatch(/\bpaddingVertical:/);
    }
  });
});

describe('Phase 4c — Journal preview card link', () => {
  const src = read('components/now/NowFooter.tsx');
  const card = extractStyleBody(src, 'journalPreviewCard');
  const text = extractStyleBody(src, 'journalPreviewText');
  const link = extractStyleBody(src, 'journalPreviewLink');

  it('card retains the Phase 2 `padding: 12` contract', () => {
    expect(num(card, 'padding')).toBe(12);
  });

  it('"View journal →" link has marginTop: 8 from the line above', () => {
    expect(num(link, 'marginTop')).toBe(8);
  });

  it('the text line above the link does NOT carry a tail marginBottom (gap moved onto the link)', () => {
    // Either no marginBottom at all, or marginBottom: 0. The 8pt gap
    // belongs on the link below, not the text above.
    const mb = num(text, 'marginBottom');
    if (mb !== null) {
      expect(mb).toBe(0);
    }
  });
});
