// ============================================================================
// PatientSwitcherModal — sample-mode treatment (Phase 11)
// Locks in: EXAMPLE tag pill on sample-mode patient rows + bottom action
// section that opens ManageSampleDataSheet (set up vs. remove).
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const src = readFileSync(
  join(ROOT, 'components/now/PatientSwitcherModal.tsx'),
  'utf8',
);

function styleBlock(name: string): string {
  const re = new RegExp(`\\b${name}:\\s*\\{([^}]*)\\}`, 's');
  const m = src.match(re);
  return m ? m[1] : '';
}

describe('PatientSwitcherModal — picks up sample-mode state from useSampleMode', () => {
  it('imports useSampleMode hook', () => {
    expect(src).toMatch(/import\s+\{\s*useSampleMode\s*\}\s+from\s+['"][^'"]+useSampleMode['"]/);
  });

  it('reads isSampleMode from the hook (not local state or prop)', () => {
    expect(src).toMatch(/useSampleMode\(\)/);
    expect(src).toMatch(/isSampleMode/);
  });
});

describe('PatientSwitcherModal — EXAMPLE pill on sample-mode patient row', () => {
  it('renders an EXAMPLE label string', () => {
    // The pill copy must literally read "EXAMPLE" so VoiceOver users get the
    // same signal sighted users do.
    expect(src).toMatch(/['"]EXAMPLE['"]/);
  });

  it('the pill is gated by isSampleMode (only the sample patient row shows it)', () => {
    // EXAMPLE shouldn't be hardcoded on every row — must be conditional on
    // isSampleMode (and typically also on the active/default patient).
    expect(src).toMatch(/isSampleMode\s*&&[\s\S]{0,300}?EXAMPLE/);
  });

  it('the EXAMPLE pill style uses caregiverAccent surface tokens', () => {
    const block = styleBlock('exampleBadge');
    expect(block).not.toBe('');
    expect(block).toMatch(/backgroundColor:\s*c\.caregiverAccentBg/);
    expect(block).toMatch(/borderColor:\s*c\.caregiverAccentBorder/);
  });

  it('the EXAMPLE pill text uses caregiverAccentText (readable on the tint)', () => {
    const block = styleBlock('exampleBadgeText');
    expect(block).not.toBe('');
    expect(block).toMatch(/color:\s*c\.caregiverAccent(?:Text)?\b/);
  });
});

describe('PatientSwitcherModal — sample-mode bottom action section', () => {
  it('renders a "Set up my loved one" action only when isSampleMode is true', () => {
    expect(src).toMatch(/isSampleMode\s*&&[\s\S]{0,800}?Set up my loved one/);
  });

  it('renders a "Remove example data" action in the same gated section', () => {
    expect(src).toMatch(/Remove example data/);
  });

  it('exposes an onManageSample callback prop typed with the focus parameter', () => {
    // Parent (now.tsx) owns the ManageSampleDataSheet and passes a callback
    // that takes a 'setup' | 'remove' focus argument.
    expect(src).toMatch(/onManageSample\??:\s*\(\s*focus\s*:\s*['"]setup['"]\s*\|\s*['"]remove['"]\s*\)\s*=>\s*void/);
  });

  it('the Set up action calls onManageSample("setup")', () => {
    expect(src).toMatch(/onManageSample(?:\?\.)?\s*\(\s*['"]setup['"]\s*\)/);
  });

  it('the Remove action calls onManageSample("remove")', () => {
    expect(src).toMatch(/onManageSample(?:\?\.)?\s*\(\s*['"]remove['"]\s*\)/);
  });

  it('the Remove action uses error-color treatment (red outline, not solid mint)', () => {
    const block = styleBlock('removeSampleButton');
    expect(block).not.toBe('');
    expect(block).toMatch(/borderColor:\s*c\.(error|red)/);
  });
});
