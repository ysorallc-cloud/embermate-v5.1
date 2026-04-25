import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const read = (rel: string) => {
  const p = join(ROOT, rel);
  return existsSync(p) ? readFileSync(p, 'utf8') : '';
};

const nowSrc = read('app/(tabs)/now.tsx');
const statRingsSrc = read('components/now/StatRings.tsx');
const timelineSrc = read('components/now/NowTimeline.tsx');
const footerSrc = read('components/now/NowFooter.tsx');
const greetingSrc = read('components/now/NowGreeting.tsx');

function extractStyleValue(src: string, styleName: string, prop: string): number | null {
  const re = new RegExp(`${styleName}:\\s*\\{[^}]*${prop}:\\s*(\\d+)`, 's');
  const m = src.match(re);
  return m ? Number(m[1]) : null;
}

describe('Now tab spacing pass', () => {
  it('root content container has paddingHorizontal: 22', () => {
    // The content/scrollContent style in now.tsx
    const val = extractStyleValue(nowSrc, 'content', 'paddingHorizontal')
      ?? extractStyleValue(nowSrc, 'scrollContent', 'paddingHorizontal');
    expect(val).toBe(22);
  });

  it('greeting container has marginBottom: 22', () => {
    const val = extractStyleValue(greetingSrc, 'container', 'marginBottom')
      ?? extractStyleValue(greetingSrc, 'subtitle', 'marginBottom');
    expect(val).toBe(22);
  });

  it('StatRings container has marginBottom: 18', () => {
    const val = extractStyleValue(statRingsSrc, 'container', 'marginBottom');
    expect(val).toBe(18);
  });

  it('schedule card has marginBottom: 16', () => {
    const val = extractStyleValue(timelineSrc, 'sectionCard', 'marginBottom');
    expect(val).toBe(16);
  });

  it('End of Shift card has marginTop: 0 (gap from schedule card margin)', () => {
    const block = footerSrc.match(/endOfShiftCard:\s*\{[^}]*\}/s);
    expect(block).toBeTruthy();
    // marginTop should be 0 or absent (defaults to 0)
    const mt = block![0].match(/marginTop:\s*(\d+)/);
    if (mt) {
      expect(Number(mt[1])).toBe(0);
    }
    // If marginTop is absent, that's 0 by default — pass
  });
});
