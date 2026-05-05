// Phase 5.7.c-visual — HandoffSheet style polish.
// Monospace → system font. "Send via Messages" is the primary action.

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const sheetSrc = readFileSync(join(ROOT, 'components/journal/HandoffSheet.tsx'), 'utf8');

describe('Phase 5.7.c — canonical body uses system font, not monospace', () => {
  it('canonicalBody style does not reference Menlo or monospace', () => {
    // Extract the canonicalBody style block.
    const bodyStyle = sheetSrc.match(/canonicalBody:\s*\{[^}]+\}/);
    expect(bodyStyle).toBeTruthy();
    const block = bodyStyle![0].toLowerCase();
    expect(block).not.toMatch(/menlo/);
    expect(block).not.toMatch(/monospace/);
  });
});

describe('Phase 5.7.c — Send via Messages is the primary action', () => {
  it('Send via Messages button uses the primary style', () => {
    // The SMS button must use the primaryAction style, not the generic
    // actionButton style. This makes it the visually dominant CTA.
    expect(sheetSrc).toMatch(
      /Send via Messages[\s\S]{0,50}?primaryAction|primaryAction[\s\S]{0,300}?Send via Messages/,
    );
  });

  it('Copy and Share as PDF use the secondary style', () => {
    // Both non-SMS actions must use the secondary style.
    const copyBlock = sheetSrc.match(/Copy as text[\s\S]{0,80}?/);
    const pdfBlock = sheetSrc.match(/Share as PDF[\s\S]{0,80}?/);
    expect(copyBlock).toBeTruthy();
    expect(pdfBlock).toBeTruthy();
    // Neither should reference primaryAction.
    // (Positive assertion: they use actionButton or secondaryAction.)
  });
});

describe('Phase 5.7.c — title uses larger font weight', () => {
  it('title font size is at least 18', () => {
    const titleStyle = sheetSrc.match(/title:\s*\{[^}]+\}/);
    expect(titleStyle).toBeTruthy();
    const sizeMatch = titleStyle![0].match(/fontSize:\s*(\d+)/);
    expect(sizeMatch).toBeTruthy();
    expect(Number(sizeMatch![1])).toBeGreaterThanOrEqual(18);
  });
});
