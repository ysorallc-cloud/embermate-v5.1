// ============================================================================
// CATEGORY_CONFIG — Single source of truth tests
// Verifies label + color mappings used by both progress and timeline
// ============================================================================

import { CATEGORY_CONFIG } from '../../constants/categoryLabels';

describe('CATEGORY_CONFIG', () => {
  const expectedEntries: [string, string, string, string][] = [
    // [itemType, label, chipLabel, color]
    ['medication',  'CARE',      'Meds',      '#5fb88a'],
    ['vitals',      'VITALS',    'Vitals',    '#A78BFA'],
    ['wellness',    'WELLNESS',  'Check-ins', '#5fb88a'],
    ['nutrition',   'MEAL',     'Meals',     '#e5b04a'],
    ['errand',      'ERRAND',   'Errands',   '#e5b04a'],
    ['self_care',   'YOU',      'Self-care', '#F472B6'],
    ['shift',       'HANDOFF',  'Handoff',   '#7DD3FC'],
    ['appointment', 'APPT',     'Appts',     '#EF4444'],
  ];

  it.each(expectedEntries)(
    '%s has correct label %s',
    (itemType, label) => {
      expect(CATEGORY_CONFIG[itemType]?.label).toBe(label);
    }
  );

  it.each(expectedEntries)(
    '%s has correct chipLabel %s',
    (itemType, _label, chipLabel) => {
      expect(CATEGORY_CONFIG[itemType]?.chipLabel).toBe(chipLabel);
    }
  );

  it.each(expectedEntries)(
    '%s has correct color',
    (itemType, _label, _chipLabel, color) => {
      expect(CATEGORY_CONFIG[itemType]?.color).toBe(color);
    }
  );

  it('every entry has label, chipLabel, and color', () => {
    for (const [key, config] of Object.entries(CATEGORY_CONFIG)) {
      expect(config.label).toBeDefined();
      expect(config.chipLabel).toBeDefined();
      expect(config.color).toBeDefined();
      expect(config.label.length).toBeGreaterThan(0);
      expect(config.chipLabel.length).toBeGreaterThan(0);
      expect(config.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it('covers all core timeline item types', () => {
    const required = ['medication', 'vitals', 'wellness', 'nutrition', 'errand', 'self_care', 'shift', 'appointment'];
    for (const type of required) {
      expect(CATEGORY_CONFIG[type]).toBeDefined();
    }
  });

  it('labels use final naming: CARE for meds, WELLNESS for check-ins', () => {
    expect(CATEGORY_CONFIG.medication.label).toBe('CARE');
    expect(CATEGORY_CONFIG.wellness.label).toBe('WELLNESS');
  });
});
