/**
 * Tests for Care Plan index page redesign (CP-1 through CP-8).
 * Three zones: Tracking, Daily Schedule, Available.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

const src = readFileSync(join(__dirname, '../../app/care-plan/index.tsx'), 'utf8');
const render = src.slice(src.indexOf('return ('));

// ============================================================================
// CP-1: "How your Care Plan works" explainer removed
// ============================================================================
describe('CP-1: Explainer removed', () => {
  test('howItWorksCard is not rendered', () => {
    expect(render).not.toContain('howItWorksCard');
    expect(render).not.toContain('How your Care Plan works');
  });
});

// ============================================================================
// CP-2: Quick Start templates gated behind !hasCarePlan
// ============================================================================
describe('CP-2: Templates gated', () => {
  test('templates only show when !hasCarePlan', () => {
    // The template section should be wrapped in !hasCarePlan conditional
    expect(src).toMatch(/!hasCarePlan[\s\S]*?TemplateCard/);
  });
});

// ============================================================================
// CP-3: ROUTINES + YOUR CATEGORIES replaced with Tracking zone
// ============================================================================
describe('CP-3: Tracking zone', () => {
  test('ROUTINES section is removed', () => {
    expect(render).not.toContain("'ROUTINES'");
    expect(render).not.toContain('"ROUTINES"');
  });

  test('YOUR CATEGORIES section is removed', () => {
    expect(render).not.toContain('YOUR CATEGORIES');
  });

  test('Tracking section header exists', () => {
    expect(render).toContain('"Tracking"');
  });

  test('CategoryRow is used for enabled buckets', () => {
    expect(src).toMatch(/CategoryRow/);
    expect(render).toContain('CategoryRow');
  });

  test('+ Add category link exists', () => {
    expect(render).toMatch(/Add category/);
  });
});

// ============================================================================
// CP-4: CategoryRow component
// ============================================================================
describe('CP-4: CategoryRow component', () => {
  test('CategoryRow function exists', () => {
    expect(src).toMatch(/function CategoryRow/);
  });

  test('CategoryRow has Switch toggle', () => {
    const categoryRowBlock = src.match(/function CategoryRow[\s\S]*?^}/m);
    expect(categoryRowBlock).not.toBeNull();
    expect(categoryRowBlock![0]).toContain('Switch');
  });

  test('CategoryRow has chevron', () => {
    const categoryRowBlock = src.match(/function CategoryRow[\s\S]*?^}/m);
    expect(categoryRowBlock).not.toBeNull();
    expect(categoryRowBlock![0]).toMatch(/›|\\u203A/);
  });
});

// ============================================================================
// CP-5: Daily Schedule zone
// ============================================================================
describe('CP-5: Daily Schedule zone', () => {
  test('Daily Schedule section header exists', () => {
    expect(render).toContain('"Daily Schedule"');
  });

  test('schedule items are built from config', () => {
    expect(src).toContain('scheduleItems');
  });

  test('schedule row styles exist', () => {
    expect(src).toContain('schedRow');
    expect(src).toContain('schedTime');
    expect(src).toContain('schedChip');
  });

  test('formatTimeLabel helper exists', () => {
    expect(src).toContain('formatTimeLabel');
  });
});

// ============================================================================
// CP-6: Available zone
// ============================================================================
describe('CP-6: Available zone', () => {
  test('Available section header exists', () => {
    expect(render).toContain('"Available"');
  });

  test('Enable button exists for disabled buckets', () => {
    expect(render).toContain('Enable');
    expect(src).toContain('enableBtn');
  });

  test('collapsible "Add more categories" is removed', () => {
    expect(render).not.toContain('Add more categories');
    expect(render).not.toContain('addMoreHeader');
  });
});

// ============================================================================
// CP-7: SectionHeaderRow
// ============================================================================
describe('CP-7: SectionHeaderRow', () => {
  test('SectionHeaderRow component exists', () => {
    expect(src).toMatch(/function SectionHeaderRow|SectionHeaderRow/);
  });
});

// ============================================================================
// CP-8: Simplified header
// ============================================================================
describe('CP-8: Simplified header', () => {
  test('duplicate title section is removed', () => {
    expect(render).not.toContain('titleSection');
    expect(render).not.toContain('Build what happens at each part of the day');
  });

  test('centered CARE PLAN header remains', () => {
    expect(render).toContain('CARE PLAN');
  });
});

// ============================================================================
// Structural integrity
// ============================================================================
describe('Structural integrity', () => {
  test('BucketCard component is removed', () => {
    expect(src).not.toMatch(/function BucketCard/);
    expect(render).not.toContain('<BucketCard');
  });

  test('InfoModal still exists', () => {
    expect(render).toContain('InfoModal');
  });

  test('AddItemSheet still exists', () => {
    expect(render).toContain('AddItemSheet');
  });
});
