import { readFileSync } from 'fs';
import { join } from 'path';

const src = readFileSync(join(__dirname, '../../app/settings/index.tsx'), 'utf8');

describe('Settings — categories collapsed by default', () => {
  it('collapsedCategories initial state sets ALL categories to true (collapsed)', () => {
    // The useState initializer must default every category to collapsed.
    // Pattern: either every category ID has `true`, or the render logic
    // treats missing keys as collapsed (inverted: `!collapsedCategories[id]`
    // renders items only when explicitly false).
    //
    // Current render logic at ~line 640:
    //   {!isCollapsed && (<View>{items}</View>)}
    // where isCollapsed = collapsedCategories[category.id]
    //
    // So for all categories to be collapsed on mount, the initial state
    // must either list every ID with `true`, or the logic must be inverted
    // to treat absent keys as collapsed.

    // Check: the render uses `collapsedCategories[category.id]` — absent
    // keys are `undefined` which is falsy, meaning !isCollapsed is true
    // and items SHOW. So the fix must explicitly set each category to true.
    // Assert at least 5 categories are set to true in the initializer.
    const initBlock = src.match(/useState<Record<string, boolean>>\(\{([^}]*)\}\)/s);
    expect(initBlock).toBeTruthy();
    const trueCount = (initBlock![1].match(/:\s*true/g) || []).length;
    expect(trueCount).toBeGreaterThanOrEqual(5);
  });
});
