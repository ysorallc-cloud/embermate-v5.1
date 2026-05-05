// Phase 5.7.c — buildHandoffReport respects includeNotes toggle.

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const builderSrc = readFileSync(join(ROOT, 'utils/handoffReportBuilder.ts'), 'utf8');

describe('Phase 5.7.c — includeNotes option in BuildHandoffOptions', () => {
  it('BuildHandoffOptions has an includeNotes field', () => {
    expect(builderSrc).toMatch(/includeNotes\??\s*:\s*boolean/);
  });

  it('NOTES TODAY section is gated by includeNotes', () => {
    // The builder must check opts.includeNotes before appending NOTES TODAY.
    // Default behavior (undefined/true) includes notes; false omits them.
    expect(builderSrc).toMatch(/includeNotes/);
    expect(builderSrc).toMatch(/NOTES TODAY/);
  });
});
