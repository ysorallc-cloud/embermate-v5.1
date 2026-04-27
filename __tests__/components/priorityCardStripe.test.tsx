// ============================================================================
// Priority cards — left-edge severity stripe.
// Locks in the v6.7 differentiation: each Required / Recommended / Optional
// row carries a colored left stripe so users can scan severity at a glance.
// The stripe is independent of selection — selecting a priority still flips
// the surrounding border to mint, but the stripe stays at its severity color.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');

const targets = [
  'app/care-plan/vitals.tsx',
  'app/care-plan/meals.tsx',
  'app/care-plan/sleep.tsx',
  'app/care-plan/activity.tsx',
  'app/care-plan/water.tsx',
];

describe.each(targets)('Priority card stripe — %s', (rel) => {
  const src = read(rel);

  it('renders a borderLeftWidth >= 3 stripe on each priority option', () => {
    expect(src).toMatch(/borderLeftWidth:\s*[3-9]/);
  });

  it('Required gets a red/error stripe', () => {
    // Either via colors.error / c.error / colors.red / c.red.
    expect(src).toMatch(/['"]required['"][\s\S]{0,200}?(?:colors\.error|c\.error|colors\.red|c\.red)/);
  });

  it('Recommended gets the mint accent stripe', () => {
    expect(src).toMatch(/['"]recommended['"][\s\S]{0,200}?(?:colors\.accent|c\.accent)/);
  });

  it('Optional gets the textTertiary (gray) stripe', () => {
    expect(src).toMatch(/['"]optional['"][\s\S]{0,200}?(?:colors\.textTertiary|c\.textTertiary)/);
  });

  it('selected priority still applies the mint border treatment', () => {
    // The borderColor: c.accent rule on priorityOptionSelected stays intact —
    // the stripe is independent of selection.
    expect(src).toMatch(/priorityOptionSelected:\s*\{[^}]*borderColor:\s*c\.accent/s);
  });
});
