// ============================================================================
// Phase 5.13.g — root layout wires wizard resume into the startup callback.
//
// runStartupSequence() must be followed by getPendingWizardResume() with a
// router.replace() when a path is returned. The check has to be inside the
// startup .then() (not before) so storage migrations can finish first.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const src = readFileSync(join(ROOT, 'app/_layout.tsx'), 'utf8');

describe('Phase 5.13.g — root layout wizard resume wiring', () => {
  it('imports getPendingWizardResume from services/wizardResume', () => {
    expect(src).toMatch(
      /import\s*\{\s*getPendingWizardResume\s*\}\s*from\s*['"]\.\.\/services\/wizardResume['"]/,
    );
  });

  it('imports router from expo-router', () => {
    expect(src).toMatch(/from\s+['"]expo-router['"]/);
    expect(src).toMatch(/\brouter\b/);
  });

  it('calls getPendingWizardResume inside the startup .then() block', () => {
    // We expect the call to live downstream of runStartupSequence so that
    // any pending data migration completes before we navigate.
    const startupBlock = src.match(/runStartupSequence\(\)[\s\S]*?\}\)\s*\.catch/);
    expect(startupBlock).not.toBeNull();
    expect(startupBlock![0]).toMatch(/getPendingWizardResume\(\)/);
  });

  it('redirects via router.replace when a resume path is returned', () => {
    expect(src).toMatch(/router\.replace\([\s\S]{0,80}resumePath/);
  });
});
