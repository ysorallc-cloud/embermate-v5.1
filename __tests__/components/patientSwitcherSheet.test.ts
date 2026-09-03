// ============================================================================
// PatientSwitcherModal — sheet labels + avatar + profile link contracts.
// Locks in v6.7 changes: "self" relationship surfaces as "You", self-patient
// avatar uses an outline indicator, View Profile link interpolates the
// active patient's name, and selected-row styling matches the broader
// Fix 5 selection-contrast contract.
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

describe('PatientSwitcherModal — relationship label', () => {
  it('relationship "self" surfaces as "You" (not the raw value)', () => {
    expect(src).toMatch(/relationship\s*===?\s*['"]self['"][\s\S]{0,200}?['"]You['"]/);
  });

  it('non-self relationships still render the raw value', () => {
    // Some branch must still pass through patient.relationship for non-self
    // labels (Mom, Dad, Spouse, etc.).
    expect(src).toMatch(/patient\.relationship/);
  });
});

describe('PatientSwitcherModal — self-avatar distinguishing indicator', () => {
  it('renders a self-specific avatar style (outline / different shading)', () => {
    // Either via a dedicated avatarSelf style or via a conditional that
    // applies an outline (transparent bg + accent border).
    expect(src).toMatch(/avatarSelf|relationship\s*===?\s*['"]self['"][\s\S]{0,200}?(?:borderColor|backgroundColor)/);
  });

  it('self avatar uses a transparent or distinct background (not solid mint)', () => {
    // The dedicated style block should NOT be a filled c.accent — that
    // collides with the "active patient" mint fill.
    const block = styleBlock('avatarSelf');
    if (block) {
      // If a dedicated style exists, it must declare borderWidth / borderColor
      // (outline) and either a transparent bg or a non-accent bg.
      expect(block).toMatch(/borderWidth:|borderColor:/);
      expect(block).not.toMatch(/backgroundColor:\s*c\.accent\b/);
    } else {
      // Inline conditional shape — at minimum, a self check that toggles
      // the borderColor / borderWidth alongside the avatar background.
      expect(src).toMatch(/['"]self['"][\s\S]{0,300}?border(?:Color|Width)/);
    }
  });
});

describe('PatientSwitcherModal — "View Profile" link interpolates the active patient name', () => {
  it('does NOT use the static "View Profile" string', () => {
    expect(src).not.toMatch(/<Text[^>]*>View Profile<\/Text>/);
  });

  it('renders "View {possessive(activeName)} profile" template', () => {
    // Either a literal "'s profile" phrasing, or (post possessive-name fix)
    // routed through the shared possessive() helper so "James'" renders
    // correctly instead of "James's".
    expect(src).toMatch(/View \$\{[^}]+\}'s profile|View [^<]*'s profile|View \$\{possessive\([^)]+\)\} profile/);
  });

  it('uses the resolved active patient name (matches the Now-tab fallback)', () => {
    // The link should source the name from activePatient/patients (the
    // PatientContext) rather than a hardcoded literal.
    expect(src).toMatch(/activePatient|patients\.find\(/);
  });
});

describe('PatientSwitcherModal — selected-row contrast (Fix 5 alignment)', () => {
  it('patientRowActive sets a mint border + accent-tinted background', () => {
    const block = styleBlock('patientRowActive');
    expect(block).toMatch(/borderColor:\s*c\.accent/);
    expect(block).toMatch(/backgroundColor:\s*c\./);
  });

  it('patient name color does NOT change between active and inactive (Fix 5)', () => {
    // Migrated from the prior `color: c.accent` tint per the global selection
    // contrast contract — see __tests__/components/selectionListContrast.test.tsx.
    const block = styleBlock('patientNameActive');
    if (block) {
      expect(block).not.toMatch(/color:\s*c\.accent\b/);
    }
  });

  it('active row still shows the right-side check', () => {
    expect(src).toMatch(/activeCheck|isActive\s*&&[\s\S]{0,200}?(?:✓|\\u2713)/);
  });
});
