import { readFileSync } from 'fs';
import { join } from 'path';

const src = readFileSync(join(__dirname, '../../app/(tabs)/support.tsx'), 'utf8');

// Extract a numeric value from a named style block.
// e.g. extractNum('primaryCard', 'padding') → 14
function extractNum(styleName: string, prop: string): number {
  const blockRe = new RegExp(`${styleName}:\\s*\\{([^}]*(?:\\{[^}]*\\}[^}]*)*)\\}`, 's');
  const block = src.match(blockRe);
  if (!block) throw new Error(`Style block "${styleName}" not found`);
  const propRe = new RegExp(`${prop}:\\s*(\\d+)`);
  const m = block[1].match(propRe);
  if (!m) throw new Error(`Property "${prop}" not found in "${styleName}"`);
  return Number(m[1]);
}

// iPhone SE screen width — the smallest supported device
const IPHONE_SE_WIDTH = 375;
const SCROLL_PAD_H = 16;
const PRIMARY_ROW_GAP = 10;

describe('Mood emoji row fits inside the primary card on iPhone SE', () => {
  it('emojiRow uses space-between layout (not fixed gap)', () => {
    const block = src.match(/emojiRow:\s*\{[^}]*\}/s);
    expect(block).toBeTruthy();
    expect(block![0]).toMatch(/justifyContent:\s*['"]space-between['"]/);
    expect(block![0]).toMatch(/width:\s*['"]100%['"]/);
  });

  it('5 emoji circles fit within the inner card width on iPhone SE', () => {
    const padding = extractNum('primaryCard', 'padding');
    const circleW = extractNum('emojiCircle', 'width');

    const cardWidth = (IPHONE_SE_WIDTH - 2 * SCROLL_PAD_H - PRIMARY_ROW_GAP) / 2;
    const innerCardWidth = cardWidth - 2 * padding;
    const fiveCirclesWidth = 5 * circleW;

    // Guards against the overflow regression from the April 19 2026
    // screenshot where 5 × 36pt circles (180pt) exceeded the ~138.5pt
    // inner card width, clipping the leftmost and rightmost emoji faces.
    expect(fiveCirclesWidth).toBeLessThanOrEqual(innerCardWidth);
  });

  it('selected emoji fontSize fits within the circle diameter', () => {
    const circleW = extractNum('emojiCircle', 'width');
    const selectedFontSize = extractNum('emojiTextSelected', 'fontSize');

    // The selected emoji must not visually overflow its circle.
    expect(selectedFontSize).toBeLessThanOrEqual(circleW);
  });
});
