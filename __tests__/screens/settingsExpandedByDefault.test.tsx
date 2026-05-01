// ============================================================================
// Settings — categories render expanded by default (Phase 3 of v6.7).
// No two-tap drilling to discover sub-items.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const src = readFileSync(join(ROOT, 'app/settings/index.tsx'), 'utf8');

describe('Settings categories render expanded', () => {
  it('does not maintain a collapsedCategories state map', () => {
    expect(src).not.toMatch(/collapsedCategories/);
    expect(src).not.toMatch(/setCollapsedCategories/);
  });

  it('does not define a toggleCategory handler', () => {
    expect(src).not.toMatch(/toggleCategory/);
  });

  it('category headers carry no onPress (sub-rows are the only interactive elements)', () => {
    // The category header is a plain View with the icon + title; only the
    // item rows are TouchableOpacity.
    const headerSection = src.match(/categoryHeader[\s\S]{0,800}?categoryCard/);
    expect(headerSection).not.toBeNull();
    expect(headerSection![0]).not.toMatch(/onPress=/);
  });

  it('all items are rendered at the top level of the categoryCard (no conditional gate)', () => {
    // The map renders unconditionally — no `collapsed && null` short-circuit.
    expect(src).toMatch(/cat\.items\.map\(/);
    // Bumped from 1200 to 2200 chars after Prompt 6 added the unread-dot
    // wrapper (`<View style={styles.itemTitleRow}>...</View>`) to the row.
    // The intent is unchanged — verify the items render inline, with no
    // collapsed-state gate inside the categoryCard block.
    const renderBlock = src.match(/categoryCard[\s\S]{0,2200}?<\/View>/);
    expect(renderBlock).not.toBeNull();
    expect(renderBlock![0]).not.toMatch(/collapsed/);
  });
});
