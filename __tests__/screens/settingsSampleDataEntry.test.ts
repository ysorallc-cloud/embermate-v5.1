// ============================================================================
// Settings → Privacy and data → Sample data entry
//
// data-privacy-settings.tsx already exists and ships the reload + delete UI;
// this test pins that the Settings index surfaces a tappable row that
// navigates there. Without the row, the screen is registered but
// unreachable from the UI.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const settingsSrc = readFileSync(join(ROOT, 'app/settings/index.tsx'), 'utf8');

describe('Settings → Sample data entry', () => {
  it('Privacy and data section exposes a "Sample data" row', () => {
    // Locate the privacy category block and search inside it for the
    // "Sample data" title — keeps this assertion local to the privacy
    // category so a stray match elsewhere can't pass it.
    const privacyIdx = settingsSrc.indexOf("id: 'privacy'");
    expect(privacyIdx).toBeGreaterThan(0);
    // Walk forward until the next category-id boundary.
    const nextCategoryIdx = settingsSrc.indexOf('id: \'about\'', privacyIdx);
    const block = settingsSrc.slice(privacyIdx, nextCategoryIdx);
    expect(block).toMatch(/title:\s*['"]Sample data['"]/);
  });

  it('the row carries the demo-friendly subtitle', () => {
    expect(settingsSrc).toMatch(/subtitle:\s*['"]Load demo data to try the app['"]/);
  });

  it('tap navigates to /data-privacy-settings', () => {
    // Slice the privacy block again and assert the route inside the
    // Sample data row's onPress.
    const privacyIdx = settingsSrc.indexOf("id: 'privacy'");
    const aboutIdx = settingsSrc.indexOf("id: 'about'", privacyIdx);
    const block = settingsSrc.slice(privacyIdx, aboutIdx);
    expect(block).toMatch(/['"]\/data-privacy-settings['"]/);
  });

  it('the Sample data row sits before the destructive Delete-all row', () => {
    // Visual pattern: optional / informational rows come first; danger
    // actions land at the bottom of the section.
    const sampleIdx = settingsSrc.indexOf("title: 'Sample data'");
    const deleteIdx = settingsSrc.indexOf("title: 'Delete all data'");
    expect(sampleIdx).toBeGreaterThan(0);
    expect(deleteIdx).toBeGreaterThan(0);
    expect(sampleIdx).toBeLessThan(deleteIdx);
  });
});
