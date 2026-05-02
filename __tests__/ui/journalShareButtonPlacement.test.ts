import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const journalPath = join(__dirname, '../../app/(tabs)/journal.tsx');
const journalSrc = existsSync(journalPath) ? readFileSync(journalPath, 'utf8') : '';

function block(src: string, styleName: string): string | null {
  const m = src.match(new RegExp(`${styleName}:\\s*\\{[^}]*\\}`, 's'));
  return m ? m[0] : null;
}

describe('Journal header — Share button placement (no clipping at right edge)', () => {
  it('journal.tsx exists and has a headerRow', () => {
    expect(existsSync(journalPath)).toBe(true);
    expect(journalSrc).toMatch(/headerRow:\s*\{/);
  });

  it('Share button container does NOT use position: absolute with right: 0', () => {
    // Capture the styles defined in the file; none of the header pill / actions
    // styles should pin themselves to the right edge with absolute positioning.
    const headerPill = block(journalSrc, 'headerPill');
    const headerPillReport = block(journalSrc, 'headerPillReport');
    const headerActions = block(journalSrc, 'headerActions');
    const headerRow = block(journalSrc, 'headerRow');
    for (const b of [headerPill, headerPillReport, headerActions, headerRow]) {
      if (!b) continue;
      const hasAbsolute = /position:\s*['"]absolute['"]/.test(b);
      const hasZeroRight = /right:\s*0\b/.test(b);
      expect(hasAbsolute && hasZeroRight).toBe(false);
    }
  });

  it('Share button has horizontal padding/margin that respects the screen edge', () => {
    // The pill itself must have non-zero horizontal padding (so the word "Share"
    // does not abut the touch target edge), and the chain of ancestors that hold
    // it must contribute >= 16pt of horizontal padding from the screen edge.
    const headerPill = block(journalSrc, 'headerPill');
    expect(headerPill).toBeTruthy();
    const padMatch = headerPill!.match(/paddingHorizontal:\s*(\d+)/);
    expect(padMatch).toBeTruthy();
    expect(Number(padMatch![1])).toBeGreaterThanOrEqual(8);

    // The scroll content (which wraps headerRow) supplies right-edge padding.
    const scrollContent = block(journalSrc, 'scrollContent');
    expect(scrollContent).toBeTruthy();
    const scrollPad = scrollContent!.match(/paddingHorizontal:\s*(\d+)/);
    const headerRow = block(journalSrc, 'headerRow');
    const rowPad = headerRow?.match(/paddingHorizontal:\s*(\d+)|paddingRight:\s*(\d+)/);
    const headerActions = block(journalSrc, 'headerActions');
    const actionsMargin = headerActions?.match(/marginRight:\s*(\d+)/);
    const ancestorPad =
      (scrollPad ? Number(scrollPad[1]) : 0) +
      (rowPad ? Number(rowPad[1] ?? rowPad[2] ?? 0) : 0) +
      (actionsMargin ? Number(actionsMargin[1]) : 0);
    // May 1 spacing-rhythm Phase 3 dropped scrollContent.paddingHorizontal
    // from 16 to 14 (canonical page-edge contract). The Share pill's
    // right-edge breathing room still adds via headerActions / headerRow
    // ancestor padding; threshold lowered in lockstep with the contract.
    expect(ancestorPad).toBeGreaterThanOrEqual(14);
  });

  it('"Share" pill text sits in a container sized to fit the word (no clipping)', () => {
    // Static guarantee: pill has padding around the text and no fixed maxWidth
    // that could clip "Share". (numberOfLines/ellipsis is not used on this label.)
    const headerPill = block(journalSrc, 'headerPill');
    const headerPillText = block(journalSrc, 'headerPillText');
    expect(headerPill).toBeTruthy();
    expect(headerPillText).toBeTruthy();
    expect(headerPill!).not.toMatch(/maxWidth:\s*[0-3]?\d\b/); // no maxWidth < 40
    expect(headerPillText!).not.toMatch(/maxWidth:\s*[0-3]?\d\b/);
    // Pill must not constrain text rendering with numberOfLines={1} + flexShrink
    // that could ellipsize "Share" before the word fits.
    expect(journalSrc).not.toMatch(/<Text[^>]*numberOfLines=\{1\}[^>]*>\s*Share\s*</);
  });

  it('header row layout prevents the long purpose text from pushing the Share pill off-screen', () => {
    // Root cause of the clipping bug: headerRow uses justifyContent: 'space-between'
    // with two children. The left child (title / date / purpose) must be
    // width-constrained — either via flex: 1 / flexShrink, or numberOfLines on
    // the long purpose Text — otherwise it expands to its intrinsic width and
    // pushes headerActions past the right edge of the screen.
    const headerRow = block(journalSrc, 'headerRow');
    expect(headerRow).toBeTruthy();
    expect(headerRow!).toMatch(/flexDirection:\s*['"]row['"]/);

    // Locate the JSX of the header row's left child container.
    const headerJsx = journalSrc.match(/<View style=\{s\.headerRow\}>[\s\S]*?<\/View>\s*<\/View>/);
    expect(headerJsx).toBeTruthy();
    const jsx = headerJsx![0];

    // At least one of these must hold for the pills to stay on-screen:
    //   (a) the title/purpose container declares flex: 1 or flexShrink: 1
    //   (b) the headerPurpose Text uses numberOfLines to cap its width
    //   (c) headerActions uses marginLeft: 'auto' alongside flexShrink: 0
    const leftHasFlex = /<View style=\{[^}]*(?:flex:\s*1|flexShrink:\s*1)[^}]*\}>\s*<Text style=\{s\.headerTitle\}/.test(jsx)
      || /<View style=\{s\.headerLeft\}>/.test(jsx) // sibling style key form
      || /headerLeft:\s*\{[^}]*flex:\s*1/.test(journalSrc);
    const purposeHasNumberOfLines = /<Text\s+style=\{s\.headerPurpose\}[^>]*numberOfLines=\{\d+\}/.test(jsx);
    const actionsAutoLeft = /headerActions:\s*\{[^}]*marginLeft:\s*['"]auto['"]/.test(journalSrc);
    expect(leftHasFlex || purposeHasNumberOfLines || actionsAutoLeft).toBe(true);
  });
});
