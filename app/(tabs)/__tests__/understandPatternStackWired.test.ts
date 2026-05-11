// ============================================================================
// Phase 15.9 — understand.tsx wiring pinned at the source level.
//
// Pre-15.9 understand.tsx held the entire "EmberMate noticed"
// section inline:
//   • SEVERITY constant + correlationSeverity helper
//   • useState(expandedCorrelation) + chevronAnims ref
//   • toggleCorrelation function
//   • correlationCards.map(...) JSX rendering 3 inline View blocks
//   • All correlation* / evidence* / recommendation* styles
//
// 15.9 moves that machinery into <PatternStack patterns={...} />.
// understand.tsx is now responsible only for sourcing the array
// from pageData and rendering the wrapper.
//
// This file pins the structural cleanup at the source level so a
// future drift (e.g. re-introducing the inline render) is caught
// immediately, and pins that PatternStack is the surviving call site.
//
// codeOnly() strips comments before regex matching so retirement
// prose mentioning the removed symbols by name does not false-
// positive.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

function codeOnly(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

describe('Phase 15.9 — understand.tsx ↔ PatternStack wiring', () => {
  const source = readFileSync(
    join(__dirname, '../understand.tsx'), 'utf8',
  );
  const code = codeOnly(source);

  it('contract 1: the correlationCards.map(...) render is gone', () => {
    expect(code).not.toMatch(/correlationCards\.map\s*\(/);
  });

  it('contract 2: expandedCorrelation + toggleCorrelation state machinery is gone', () => {
    expect(code).not.toMatch(/\bexpandedCorrelation\b/);
    expect(code).not.toMatch(/\bsetExpandedCorrelation\b/);
    expect(code).not.toMatch(/\btoggleCorrelation\b/);
  });

  it('contract 3: the correlation* / evidence* / recommendation* styles are gone', () => {
    // Pinned individually so a future refactor that drops one but
    // leaves others (the easy mistake) gets caught.
    expect(code).not.toMatch(/\bcorrelationCard\s*:/);
    expect(code).not.toMatch(/\bcorrelationHeader\s*:/);
    expect(code).not.toMatch(/\bcorrelationMeta\s*:/);
    expect(code).not.toMatch(/\bcorrelationTitle\s*:/);
    expect(code).not.toMatch(/\bcorrelationChevron\s*:/);
    expect(code).not.toMatch(/\bcorrelationSummary\s*:/);
    expect(code).not.toMatch(/\bcorrelationExpanded\s*:/);
    expect(code).not.toMatch(/\bseverityBadge\s*:/);
    expect(code).not.toMatch(/\bmetricPill\s*:/);
    expect(code).not.toMatch(/\bevidenceLabel\s*:/);
    expect(code).not.toMatch(/\brecommendationBox\s*:/);
  });

  it('contract 4: the SEVERITY constant + correlationSeverity helper moved out', () => {
    expect(code).not.toMatch(/^const SEVERITY\s*=/m);
    expect(code).not.toMatch(/function correlationSeverity\s*\(/);
  });

  it('contract 5: <PatternStack ... /> is rendered', () => {
    expect(code).toMatch(/<PatternStack\b/);
  });

  it('contract 6: PatternStack is imported from its component path', () => {
    expect(code).toMatch(/from\s+['"][^'"]*components\/insights\/PatternStack['"]/);
  });
});
