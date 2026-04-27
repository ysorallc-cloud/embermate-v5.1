// ============================================================================
// Header structure contract — all four tabs must share the same shell.
// Title font + weight, subtitle metrics, paddings, and rhythm are unified.
// Content (title text, subtitle copy) varies; structure does not.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');

// Now tab uses a different header component (NowHeader → NowGreeting) because
// it carries a contextual greeting + metadata line. Its structural numbers
// still need to match the others — only the layout shape differs.
const headers: Array<{ tab: string; src: string }> = [
  { tab: 'now',        src: read('components/now/NowHeader.tsx') },
  { tab: 'now-greet',  src: read('components/now/NowGreeting.tsx') },
  { tab: 'journal',    src: read('app/(tabs)/journal.tsx') },
  { tab: 'understand', src: read('components/ScreenHeader.tsx') },
  { tab: 'support',    src: read('app/(tabs)/support.tsx') },
];

function styleBlock(src: string, name: string): string {
  const re = new RegExp(`\\b${name}:\\s*\\{([^}]*)\\}`, 's');
  const m = src.match(re);
  return m ? m[1] : '';
}

function num(block: string, prop: string): number | null {
  const m = block.match(new RegExp(`\\b${prop}:\\s*(-?\\d+(?:\\.\\d+)?)`));
  return m ? Number(m[1]) : null;
}

describe('Header structure contract — paddingTop: 56 across all tabs', () => {
  it('Now tab header container: paddingTop 56', () => {
    const block = styleBlock(read('components/now/NowHeader.tsx'), 'headerRow');
    expect(num(block, 'paddingTop')).toBe(56);
  });

  it('Journal tab header container: paddingTop 56', () => {
    const block = styleBlock(read('app/(tabs)/journal.tsx'), 'headerRow');
    expect(num(block, 'paddingTop')).toBe(56);
  });

  it('Understand tab uses ScreenHeader; container paddingTop 56', () => {
    const block = styleBlock(read('components/ScreenHeader.tsx'), 'container');
    expect(num(block, 'paddingTop')).toBe(56);
  });

  it('Support tab header container: paddingTop 56', () => {
    const block = styleBlock(read('app/(tabs)/support.tsx'), 'headerWrap');
    expect(num(block, 'paddingTop')).toBe(56);
  });
});

describe('Header structure contract — title metrics', () => {
  // Title style names vary per file: title / headerTitle.
  function titleBlock(src: string): string {
    return styleBlock(src, 'title') || styleBlock(src, 'headerTitle');
  }

  it('Now greeting title: 32pt, weight 300', () => {
    const block = titleBlock(read('components/now/NowGreeting.tsx'));
    expect(num(block, 'fontSize')).toBe(32);
    expect(block).toMatch(/fontWeight:\s*['"]300['"]/);
  });

  it('Journal title: 32pt, weight 300', () => {
    const block = titleBlock(read('app/(tabs)/journal.tsx'));
    expect(num(block, 'fontSize')).toBe(32);
    expect(block).toMatch(/fontWeight:\s*['"]300['"]/);
  });

  it('ScreenHeader title (Understand): 32pt, weight 300', () => {
    const block = titleBlock(read('components/ScreenHeader.tsx'));
    expect(num(block, 'fontSize')).toBe(32);
    expect(block).toMatch(/fontWeight:\s*['"]300['"]/);
  });

  it('Support title: 32pt, weight 300', () => {
    const block = titleBlock(read('app/(tabs)/support.tsx'));
    expect(num(block, 'fontSize')).toBe(32);
    expect(block).toMatch(/fontWeight:\s*['"]300['"]/);
  });
});

describe('Header structure contract — subtitle metrics', () => {
  // Subtitle/purpose style names: subtitle / headerPurpose / headerMessage /
  // headerContext / metadataSubtitle. Each tab uses its own naming; the
  // contract is on metrics, not names.
  type Metrics = { fontSize: number | null; lineHeight: number | null; marginTop: number | null; color: string | null };

  function metricsOf(src: string, name: string): Metrics {
    const block = styleBlock(src, name);
    const colorMatch = block.match(/color:\s*c\.(\w+)/) || block.match(/color:\s*colors\.(\w+)/);
    return {
      fontSize: num(block, 'fontSize'),
      lineHeight: num(block, 'lineHeight'),
      marginTop: num(block, 'marginTop'),
      color: colorMatch ? colorMatch[1] : null,
    };
  }

  it('Now greeting metadataSubtitle: 13pt / lineHeight 20 / textSecondary', () => {
    const m = metricsOf(read('components/now/NowGreeting.tsx'), 'metadataSubtitle');
    expect(m.fontSize).toBe(13);
    expect(m.lineHeight).toBe(20);
    expect(m.color).toBe('textSecondary');
  });

  it('Journal headerPurpose: 13pt / lineHeight 20 / textSecondary', () => {
    const m = metricsOf(read('app/(tabs)/journal.tsx'), 'headerPurpose');
    expect(m.fontSize).toBe(13);
    expect(m.lineHeight).toBe(20);
    expect(m.color).toBe('textSecondary');
  });

  it('ScreenHeader purpose: 13pt / lineHeight 20 / textSecondary', () => {
    const m = metricsOf(read('components/ScreenHeader.tsx'), 'purpose');
    expect(m.fontSize).toBe(13);
    expect(m.lineHeight).toBe(20);
    expect(m.color).toBe('textSecondary');
  });

  it('Support headerMessage: 13pt / lineHeight 20 / textSecondary', () => {
    const m = metricsOf(read('app/(tabs)/support.tsx'), 'headerMessage');
    expect(m.fontSize).toBe(13);
    expect(m.lineHeight).toBe(20);
    expect(m.color).toBe('textSecondary');
  });
});

describe('Header structure contract — subtitle marginTop 8', () => {
  it('Now metadata row sits 8pt below the title', () => {
    const block = styleBlock(read('components/now/NowGreeting.tsx'), 'metadataRow');
    expect(num(block, 'marginTop')).toBe(8);
  });

  it('ScreenHeader subtitle: marginTop 8', () => {
    // ScreenHeader stacks subtitle then purpose; subtitle is the first below title.
    const block = styleBlock(read('components/ScreenHeader.tsx'), 'subtitle');
    expect(num(block, 'marginTop')).toBe(8);
  });
});

describe('Header structure contract — paddingBottom 24 before content', () => {
  it('Now header bottom padding: 24', () => {
    const block = styleBlock(read('components/now/NowHeader.tsx'), 'headerRow');
    expect(num(block, 'paddingBottom')).toBe(24);
  });

  it('Journal header bottom padding: 24', () => {
    const block = styleBlock(read('app/(tabs)/journal.tsx'), 'headerRow');
    expect(num(block, 'paddingBottom')).toBe(24);
  });

  it('ScreenHeader (Understand) bottom padding: 24', () => {
    const block = styleBlock(read('components/ScreenHeader.tsx'), 'container');
    expect(num(block, 'paddingBottom')).toBe(24);
  });

  it('Support header bottom padding: 24', () => {
    const block = styleBlock(read('app/(tabs)/support.tsx'), 'headerWrap');
    expect(num(block, 'paddingBottom')).toBe(24);
  });
});
