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
const nowHeaderSrc = read('components/now/NowHeader.tsx');

function extractStyleValue(src: string, styleName: string, prop: string): number | null {
  const re = new RegExp(`${styleName}:\\s*\\{[^}]*${prop}:\\s*(\\d+)`, 's');
  const m = src.match(re);
  return m ? Number(m[1]) : null;
}

describe('Now tab spacing pass', () => {
  it('root content container has paddingHorizontal: 14 (Phase 3 page-rhythm)', () => {
    // May 1 spacing-rhythm Phase 3 dropped the content/scrollContent
    // paddingHorizontal from 22 to the canonical 14pt page-edge contract.
    // The inner `content` view's padding folded into 0; the scrollContent
    // carries the 14pt itself.
    const val = extractStyleValue(nowSrc, 'scrollContent', 'paddingHorizontal');
    expect(val).toBe(14);
  });

  it('header container provides bottom rhythm before content', () => {
    // Option A moved the bottom spacing from the greeting subtitle (was 22)
    // up to the NowHeader headerRow container, which now declares
    // paddingBottom per the headerStructureContract test.
    const val = extractStyleValue(nowHeaderSrc, 'headerRow', 'paddingBottom');
    expect(val).toBeGreaterThanOrEqual(20);
  });

  it('StatRings container has marginBottom on Spacing.md (Phase 3.5 token-routed)', () => {
    // History: Phase 4 set literal 16 → Phase 3.5 migrated to Spacing.md
    // (now 20pt) so the recalibrated scale cascades. Source-level
    // assertion via regex since the value lives behind a token.
    expect(statRingsSrc).toMatch(/container:\s*\{[\s\S]*?marginBottom:\s*Spacing\.md\b/);
  });

  it('schedule card has marginBottom on Spacing.md (Phase 3.5 token-routed)', () => {
    expect(timelineSrc).toMatch(/sectionCard:\s*\{[\s\S]*?marginBottom:\s*Spacing\.md\b/);
  });

  // End of Shift spacing now lives in components/now/EndOfShiftCard.tsx —
  // covered by __tests__/components/endOfShiftCard.test.tsx.
});
