// ============================================================================
// StatRings — layout regression guard.
// The earlier audit claimed flex-column was correct, but device screenshots
// showed the value text overlapping the label. This locks in:
// - non-negative margins on label / value
// - real spacing between ring → label and label → value (via marginTop or gap)
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const src = readFileSync(
  join(__dirname, '../../components/now/StatRings.tsx'),
  'utf8',
);

function extractStyleBlock(name: string): string {
  const re = new RegExp(`\\b${name}:\\s*\\{([^}]*)\\}`, 's');
  const m = src.match(re);
  return m ? m[1] : '';
}

function readNumberProp(block: string, prop: string): number | null {
  const m = block.match(new RegExp(`${prop}:\\s*(-?\\d+(?:\\.\\d+)?)`));
  return m ? Number(m[1]) : null;
}

describe('StatRings layout — no value/label overlap', () => {
  const containerBlock = extractStyleBlock('container');
  const columnBlock = extractStyleBlock('column');
  const labelBlock = extractStyleBlock('label');
  const valueBlock = extractStyleBlock('value');

  it('label and value style blocks are present', () => {
    expect(labelBlock).not.toBe('');
    expect(valueBlock).not.toBe('');
  });

  it('label has marginTop >= 4 OR cell has gap >= 4', () => {
    const labelMt = readNumberProp(labelBlock, 'marginTop');
    const cellGap = readNumberProp(columnBlock, 'gap')
      ?? readNumberProp(containerBlock, 'gap');
    const sufficient = (labelMt !== null && labelMt >= 4) || (cellGap !== null && cellGap >= 4);
    expect(sufficient).toBe(true);
  });

  it('value has marginTop >= 2 OR cell has gap >= 2', () => {
    const valueMt = readNumberProp(valueBlock, 'marginTop');
    const cellGap = readNumberProp(columnBlock, 'gap')
      ?? readNumberProp(containerBlock, 'gap');
    const sufficient = (valueMt !== null && valueMt >= 2) || (cellGap !== null && cellGap >= 2);
    expect(sufficient).toBe(true);
  });

  it('label has no negative margins', () => {
    const mt = readNumberProp(labelBlock, 'marginTop');
    const mb = readNumberProp(labelBlock, 'marginBottom');
    const m = readNumberProp(labelBlock, 'margin');
    if (mt !== null) expect(mt).toBeGreaterThanOrEqual(0);
    if (mb !== null) expect(mb).toBeGreaterThanOrEqual(0);
    if (m !== null) expect(m).toBeGreaterThanOrEqual(0);
  });

  it('value has no negative margins', () => {
    const mt = readNumberProp(valueBlock, 'marginTop');
    const mb = readNumberProp(valueBlock, 'marginBottom');
    const m = readNumberProp(valueBlock, 'margin');
    if (mt !== null) expect(mt).toBeGreaterThanOrEqual(0);
    if (mb !== null) expect(mb).toBeGreaterThanOrEqual(0);
    if (m !== null) expect(m).toBeGreaterThanOrEqual(0);
  });

  it('cell container declares gap >= 4 or every child carries an explicit margin', () => {
    const cellGap = readNumberProp(columnBlock, 'gap');
    if (cellGap !== null && cellGap >= 4) {
      expect(cellGap).toBeGreaterThanOrEqual(4);
      return;
    }
    // Otherwise, label AND value must each carry an explicit non-zero positive
    // marginTop so their separation isn't reliant on font baselines.
    const labelMt = readNumberProp(labelBlock, 'marginTop');
    const valueMt = readNumberProp(valueBlock, 'marginTop');
    expect(labelMt !== null && labelMt > 0).toBe(true);
    expect(valueMt !== null && valueMt > 0).toBe(true);
  });
});
