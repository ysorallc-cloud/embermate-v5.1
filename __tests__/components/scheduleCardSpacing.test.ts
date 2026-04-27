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

describe('ScheduleCard — row breathing room', () => {
  it('windowRow paddingVertical is at least 14pt', () => {
    const block = styleBlock('windowRow');
    expect(block).not.toBe('');
    const pv = num(block, 'paddingVertical');
    expect(pv).not.toBeNull();
    expect(pv as number).toBeGreaterThanOrEqual(14);
  });

  it('row dividers stay 0.5px (lift comes from padding, not heavier lines)', () => {
    const block = styleBlock('windowRowDivider');
    expect(num(block, 'borderTopWidth')).toBe(0.5);
  });
});

describe('ScheduleCard — Start button tap target', () => {
  it('Start button paddingVertical or hitSlop produces a >= 44pt tap target', () => {
    const btn = styleBlock('windowStartBtn');
    expect(btn).not.toBe('');
    const padV = num(btn, 'paddingVertical') ?? 0;
    const fontMatch = src.match(/windowStartText:\s*\{[^}]*fontSize:\s*(\d+)/s);
    const font = fontMatch ? Number(fontMatch[1]) : 13;
    const visualHeight = font + padV * 2;

    // Either the button is visually tall enough, or it declares a hitSlop
    // on its TouchableOpacity that extends the tap target to >= 44pt.
    if (visualHeight >= 44) return;

    // Look for hitSlop on the Start TouchableOpacity. Slice the source from
    // `style={s.windowStartBtn}` to the closing JSX `<Text>` of the button —
    // captures the entire opening tag without getting tripped up by the
    // `=>` arrow in onPress.
    const styleAnchor = src.indexOf('style={s.windowStartBtn}');
    const textCloser = src.indexOf('<Text style={s.windowStartText}', styleAnchor);
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
