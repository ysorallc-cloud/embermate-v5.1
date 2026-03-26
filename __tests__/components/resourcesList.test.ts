// ============================================================================
// ResourcesList — Category and link data tests
// ============================================================================

import { RESOURCE_CATEGORIES } from '../../components/support/ResourcesList';

describe('ResourcesList', () => {
  it('renders all 5 categories', () => {
    expect(RESOURCE_CATEGORIES).toHaveLength(5);
    const ids = RESOURCE_CATEGORIES.map(c => c.id);
    expect(ids).toContain('financial');
    expect(ids).toContain('respite');
    expect(ids).toContain('legal');
    expect(ids).toContain('condition');
    expect(ids).toContain('community');
  });

  it('each category has title, emoji, description, and links', () => {
    for (const cat of RESOURCE_CATEGORIES) {
      expect(cat.title).toBeDefined();
      expect(cat.emoji).toBeDefined();
      expect(cat.description).toBeDefined();
      expect(Array.isArray(cat.links)).toBe(true);
      expect(cat.links.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('expanding a category shows links with title and description', () => {
    for (const cat of RESOURCE_CATEGORIES) {
      for (const link of cat.links) {
        expect(typeof link.title).toBe('string');
        expect(link.title.length).toBeGreaterThan(0);
        expect(typeof link.description).toBe('string');
        expect(link.description.length).toBeGreaterThan(0);
      }
    }
  });
});
