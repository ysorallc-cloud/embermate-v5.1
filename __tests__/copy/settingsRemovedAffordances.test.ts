// ============================================================================
// Settings — search bar + last-updated pill removed (Phase 4 of v6.7).
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const rawSrc = readFileSync(join(ROOT, 'app/settings/index.tsx'), 'utf8');

// Strip comment lines + block comments so explanatory prose ("the deprecated
// Care Team / Advanced categories were retired") doesn't trip the literal
// scanners.
function stripComments(s: string): string {
  return s
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((l) => !/^\s*\/\//.test(l))
    .join('\n');
}
const src = stripComments(rawSrc);

describe('Settings — search input removed', () => {
  it('does not render a TextInput for searching', () => {
    expect(src).not.toMatch(/<TextInput/);
  });

  it('does not maintain searchQuery state', () => {
    expect(src).not.toMatch(/searchQuery/);
    expect(src).not.toMatch(/setSearchQuery/);
  });

  it('does not import TextInput from react-native', () => {
    // The settings file imports primitives we use; TextInput should not
    // be in that list since the search bar is gone.
    const importBlock = src.match(/from 'react-native';/);
    expect(importBlock).not.toBeNull();
    const importLine = src.match(/import \{[\s\S]*?\} from 'react-native';/);
    expect(importLine![0]).not.toContain('TextInput');
  });
});

describe('Settings — last-updated pill removed', () => {
  it('does not maintain a lastModified state', () => {
    expect(src).not.toMatch(/lastModified/);
  });

  it('does not render a "Last updated:" copy literal', () => {
    expect(src).not.toMatch(/Last updated:/);
  });
});

describe('Settings — deprecated categories not rendered', () => {
  it('Appearance & Experience is gone (high-contrast / 24h toggles flow through iOS)', () => {
    expect(src).not.toMatch(/Appearance & Experience/);
    expect(src).not.toMatch(/High Contrast/);
    expect(src).not.toMatch(/24-Hour Time Format/);
  });

  it('Care Team category and items are gone (v7+ feature)', () => {
    // Allow ManageSampleDataSheet (component import) but no Care Team
    // category title or sub-row title.
    expect(src).not.toMatch(/title:\s*['"]Care Team['"]/);
    expect(src).not.toMatch(/Manage Caregivers/);
    expect(src).not.toMatch(/Family Sharing/);
  });

  it('Care Plan / Medications / Appointments items removed from Profile', () => {
    expect(src).not.toMatch(/'Care Plan'/);
    expect(src).not.toMatch(/'Medications'/);
    expect(src).not.toMatch(/'Appointments'/);
  });

  it('Advanced category is gone', () => {
    // Old "Advanced" category header (case-insensitive) should not appear
    // as a category title.
    expect(src).not.toMatch(/title:\s*'Advanced'/);
  });
});
