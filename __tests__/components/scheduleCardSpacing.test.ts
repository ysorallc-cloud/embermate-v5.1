// ============================================================================
// ScheduleCard — row spacing + Start button tap target.
// Locks in the 14pt vertical padding floor and verifies the Start button
// has at least a 44pt tap target (Apple HIG / Material Design minimum).
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const src = readFileSync(
  join(__dirname, '../../components/now/ScheduleCard.tsx'),
  'utf8',
);

function styleBlock(name: string): string {
  const re = new RegExp(`\\b${name}:\\s*\\{([^}]*)\\}`, 's');
  const m = src.match(re);
  return m ? m[1] : '';
}

function num(block: string, prop: string): number | null {
  const m = block.match(new RegExp(`\\b${prop}:\\s*(-?\\d+(?:\\.\\d+)?)`));
  return m ? Number(m[1]) : null;
}

describe('ScheduleCard — equal row geometry (May 1 sizing pass — Phase 3b)', () => {
  it('windowRow paddingVertical is 6pt (matches active and inactive rows)', () => {
    const block = styleBlock('windowRow');
    expect(block).not.toBe('');
    const pv = num(block, 'paddingVertical');
    expect(pv).toBe(6);
  });

  it('row dividers stay 0.5px (lift comes from typography, not heavier lines)', () => {
    const block = styleBlock('windowRowDivider');
    expect(num(block, 'borderTopWidth')).toBe(0.5);
  });
});

describe('ScheduleCard — Start text-link tap target', () => {
  it('Start text-link uses hitSlop to clear the 44pt minimum tap target', () => {
    // Phase 3b replaced the filled windowStartBtn with a text-link
    // (windowStartLink). The link's tappable area comes from hitSlop +
    // visual font height. Apple HIG / Material Design require >= 44pt.
    const btn = styleBlock('windowStartLink');
    expect(btn).not.toBe('');
    const padV = num(btn, 'paddingVertical') ?? 0;
    const fontMatch = src.match(/windowStartLinkText:\s*\{[^}]*fontSize:\s*(\d+)/s);
    const font = fontMatch ? Number(fontMatch[1]) : 13;
    const visualHeight = font + padV * 2;

    if (visualHeight >= 44) return;

    // The Start TouchableOpacity declares hitSlop. Walk the JSX from the
    // style anchor to the closing Text to capture the full opening tag.
    const styleAnchor = src.indexOf('style={s.windowStartLink}');
    const textCloser = src.indexOf('<Text style={s.windowStartLinkText}', styleAnchor);
    expect(styleAnchor).toBeGreaterThan(-1);
    expect(textCloser).toBeGreaterThan(styleAnchor);
    const startBtnOpen = src.slice(styleAnchor, textCloser);
    const hitSlopMatch = startBtnOpen.match(/hitSlop=\{\{([\s\S]*?)\}\s*\}/);
    expect(hitSlopMatch).toBeTruthy();
    const hitSlop = hitSlopMatch![1];
    const top = Number((hitSlop.match(/top:\s*(\d+)/) || [])[1] || 0);
    const bottom = Number((hitSlop.match(/bottom:\s*(\d+)/) || [])[1] || 0);
    expect(visualHeight + top + bottom).toBeGreaterThanOrEqual(44);
  });
});
