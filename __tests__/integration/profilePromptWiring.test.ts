// ============================================================================
// Phase 5.8.c — wiring contract: HandoffSheet + Visit Prep call
// requireProfileFields and surface ProfilePromptSheet when missing[] is
// non-empty. Settings → Profile route exists and links from settings/index.
// ============================================================================

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');

describe('Phase 5.8.c — HandoffSheet wiring', () => {
  const src = readFileSync(join(ROOT, 'components/journal/HandoffSheet.tsx'), 'utf8');

  it('imports requireProfileFields', () => {
    expect(src).toMatch(/from\s+['"][^'"]+requireProfileFields['"]/);
  });

  it('imports ProfilePromptSheet', () => {
    expect(src).toMatch(/from\s+['"][^'"]+ProfilePromptSheet['"]/);
  });

  it('renders ProfilePromptSheet conditionally on missing-fields state', () => {
    expect(src).toMatch(/<ProfilePromptSheet\b/);
  });
});

describe('Phase 5.8.c — Visit Prep wiring', () => {
  const src = readFileSync(join(ROOT, 'app/visit-prep.tsx'), 'utf8');

  it('imports requireProfileFields', () => {
    expect(src).toMatch(/from\s+['"][^'"]+requireProfileFields['"]/);
  });

  it('imports ProfilePromptSheet', () => {
    expect(src).toMatch(/from\s+['"][^'"]+ProfilePromptSheet['"]/);
  });

  it('renders ProfilePromptSheet', () => {
    expect(src).toMatch(/<ProfilePromptSheet\b/);
  });

  it('Generate handler routes through profile check before navigating to preview', () => {
    // Phase 5.9.d lifted PDF generation to the preview screen. The
    // config screen's handler now calls requireProfileFields(), then
    // navigate('/visit-prep-preview') — never generateAndShareVisitPrep
    // directly. The profile gate must still come BEFORE navigation
    // so an incomplete profile surfaces the prompt sheet here.
    const start = src.indexOf('handleGenerate');
    const tail = src.slice(start);
    const requireIdx = tail.indexOf('requireProfileFields');
    const navIdx = tail.indexOf("navigate('/visit-prep-preview')");
    expect(requireIdx).toBeGreaterThan(0);
    expect(navIdx).toBeGreaterThan(0);
    expect(requireIdx).toBeLessThan(navIdx);
  });

  it('threads caregiverName from the profile into VisitPrepConfig', () => {
    // The handler resolves caregiverName from requireProfileFields() and
    // passes it into the config. Two valid shapes accepted:
    //   const caregiverName = profileCheck.caregiverName ?? '';
    //   ...
    //   const config = { ..., caregiverName };
    // OR an inline ternary in the config object itself.
    expect(src).toMatch(/caregiverName(\s*=|,\s*$)/m);
    expect(src).toMatch(/profileCheck\.caregiverName|res\.caregiverName/);
  });
});

describe('Phase 5.8.c — Settings → Profile entry', () => {
  it('app/settings/profile.tsx exists', () => {
    const path = join(ROOT, 'app/settings/profile.tsx');
    expect(existsSync(path)).toBe(true);
  });

  it('settings/index.tsx links to /settings/profile', () => {
    const src = readFileSync(join(ROOT, 'app/settings/index.tsx'), 'utf8');
    expect(src).toMatch(/['"]\/settings\/profile['"]/);
  });

  it('profile.tsx imports both repos for read + write', () => {
    const src = readFileSync(join(ROOT, 'app/settings/profile.tsx'), 'utf8');
    expect(src).toMatch(/from\s+['"][^'"]+caregiverProfileRepo['"]/);
    expect(src).toMatch(/from\s+['"][^'"]+patientRegistry['"]/);
    expect(src).toMatch(/saveCaregiverProfile/);
    expect(src).toMatch(/updatePatient/);
  });
});
