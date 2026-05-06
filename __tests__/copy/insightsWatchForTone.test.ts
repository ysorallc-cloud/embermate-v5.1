// ============================================================================
// Phase 6.3 — Soften watch-for copy to caregiver voice.
//
// The PATTERN_PREVIEWS list previously read slightly clinical and used
// "her" as a default pronoun. Replace with neutral, caregiver-friendly
// phrasing while keeping the four observation themes intact.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const previewSrc = readFileSync(
  join(ROOT, 'components/understand/InsightsEmptyStatePreview.tsx'),
  'utf8',
);

function extractPatternDescriptions(): string[] {
  // Find the PATTERN_PREVIEWS array and pull each description string.
  const arrayMatch = previewSrc.match(/PATTERN_PREVIEWS[^=]*=\s*\[([\s\S]*?)\];/);
  if (!arrayMatch) {
    throw new Error('PATTERN_PREVIEWS array not found');
  }
  const body = arrayMatch[1];
  const out: string[] = [];
  const re = /description:\s*['"]([^'"]+)['"]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) out.push(m[1]);
  return out;
}

describe('Phase 6.3 — caregiver-voice watch-for copy', () => {
  const descriptions = extractPatternDescriptions();

  it('still surfaces all four pattern previews', () => {
    expect(descriptions).toHaveLength(4);
  });

  it('avoids the gendered "her" default pronoun', () => {
    for (const d of descriptions) {
      expect(d).not.toMatch(/\bher\b/i);
      expect(d).not.toMatch(/\bhis\b/i);
    }
  });

  it('avoids research-paper voice (correlates / indicates / suggests / demonstrates)', () => {
    const clinical = /\b(correlates?|correlations?|indicates?|suggests?|demonstrates?|impacts?|associated with)\b/i;
    for (const d of descriptions) {
      expect(d).not.toMatch(clinical);
    }
  });

  it('keeps each entry under 14 words for scannability', () => {
    for (const d of descriptions) {
      const words = d.split(/\s+/).filter(Boolean);
      expect(words.length).toBeLessThanOrEqual(14);
    }
  });
});
