// ============================================================================
// Journal text-input placeholder — Phase 5 of the handoff redesign.
// New copy is handoff-oriented; the old reflection-style prompt is gone.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const reflectionSrc = readFileSync(
  join(ROOT, 'components/journal/ReflectionPrompt.tsx'),
  'utf8',
);

describe('Journal notes prompt — handoff reframe', () => {
  it('placeholder uses the new handoff-oriented copy', () => {
    expect(reflectionSrc).toContain('Anything to pass along to the next caregiver?');
  });

  it('does NOT use the deprecated reflection prompt copy', () => {
    expect(reflectionSrc).not.toContain('What do you need more of this week?');
    expect(reflectionSrc).not.toContain('Write a few words, or skip');
  });

  it('keeps the "Private · saved on this device" privacy line', () => {
    // Privacy line lives where the reflection input renders. The phrase is
    // expected somewhere in the rendered tree.
    expect(reflectionSrc).toMatch(/Private\s*[·.]\s*saved on this device/);
  });
});
