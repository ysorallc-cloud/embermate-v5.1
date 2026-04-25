/**
 * Now tab — Care Circle teaser placement.
 *
 * The teaser renders at the bottom of the Now tab scroll view, after the
 * journal preview card. It's gated on shouldShowTeaser() via a useEffect +
 * useState pattern so it doesn't block initial render.
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');

// The teaser may be in now.tsx or in the extracted NowFooter.tsx
const nowPath = join(ROOT, 'app/(tabs)/now.tsx');
const footerPath = join(ROOT, 'components/now/NowFooter.tsx');
const nowSrc = readFileSync(nowPath, 'utf8');
const footerSrc = existsSync(footerPath) ? readFileSync(footerPath, 'utf8') : '';
const combined = nowSrc + footerSrc;

describe('Now tab — Care Circle teaser placement', () => {
  it('imports CareCircleTeaser component', () => {
    expect(combined).toMatch(/CareCircleTeaser/);
  });

  it('imports shouldShowTeaser from the visibility utility', () => {
    expect(combined).toMatch(/shouldShowTeaser/);
  });

  it('uses useEffect + useState for async visibility check (non-blocking)', () => {
    // The pattern: useState for a boolean, useEffect that calls
    // shouldShowTeaser and sets the state.
    expect(combined).toMatch(/useState.*false\)/); // initial false
    expect(combined).toMatch(/shouldShowTeaser\(\)\.then|await shouldShowTeaser\(\)/);
  });

  it('conditionally renders the teaser based on the visibility flag', () => {
    // The JSX should gate on the boolean state: {showTeaser && <CareCircleTeaser .../>}
    expect(combined).toMatch(/showTeaser\s*&&\s*[\s\S]*?CareCircleTeaser/);
  });

  it('teaser appears after the journal preview card (bottom of scroll)', () => {
    // CareCircleTeaser must appear AFTER journalPreview / NowFooter content
    const journalIdx = combined.indexOf('journalPreview') || combined.indexOf('NowFooter');
    const teaserIdx = combined.indexOf('<CareCircleTeaser');
    expect(teaserIdx).toBeGreaterThan(-1);
    // If both exist in the same file, teaser should be after the journal card
    if (journalIdx > -1 && teaserIdx > -1) {
      expect(teaserIdx).toBeGreaterThan(journalIdx);
    }
  });
});
