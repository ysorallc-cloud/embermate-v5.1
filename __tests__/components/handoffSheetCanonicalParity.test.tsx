// ============================================================================
// Phase 5.8.d — HandoffSheet renders canonical builder output and shares
// the same text via Copy / SMS / PDF.
//
// Source-level contract: the sheet imports buildHandoffReport, calls it
// when visible, holds the result in state, and uses the SAME state value
// for the preview surface + the Copy / SMS / PDF actions. No more
// prop-driven buildPreviewText / outcomesLines re-derivation paths.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const sheetSrc = readFileSync(join(ROOT, 'components/journal/HandoffSheet.tsx'), 'utf8');

describe('Phase 5.8.d — HandoffSheet uses the canonical builder', () => {
  it('imports buildHandoffReport from utils/handoffReportBuilder', () => {
    expect(sheetSrc).toMatch(
      /import\s+\{[^}]*\bbuildHandoffReport\b[^}]*\}\s+from\s+['"][^'"]+handoffReportBuilder['"]/,
    );
  });

  it('holds the canonical text in component state (not derived per-render)', () => {
    expect(sheetSrc).toMatch(/useState[\s\S]{0,80}canonical|\[canonicalText/);
  });

  it('rebuilds the canonical text when the sheet opens', () => {
    // useEffect that calls buildHandoffReport when visible flips to true.
    // Window bumped after Phase 5.9.b grew the effect body with the
    // canonicalState machine.
    expect(sheetSrc).toMatch(/buildHandoffReport\s*\(/);
    expect(sheetSrc).toMatch(/useEffect[\s\S]{0,800}?buildHandoffReport/);
  });

  it('Copy uses the canonical text, not buildPreviewText', () => {
    // handleCopy must call setStringAsync with the canonical state value;
    // it must not call buildPreviewText.
    const handleCopy = sheetSrc.match(/handleCopy[\s\S]{0,400}?\}\,/);
    expect(handleCopy).toBeTruthy();
    expect(handleCopy?.[0]).toMatch(/canonicalText|canonical/);
    expect(handleCopy?.[0]).not.toMatch(/buildPreviewText/);
  });

  it('SMS uses the canonical text', () => {
    const handleSms = sheetSrc.match(/handleSms[\s\S]{0,400}?\}\,/);
    expect(handleSms).toBeTruthy();
    expect(handleSms?.[0]).toMatch(/canonicalText|canonical/);
    expect(handleSms?.[0]).not.toMatch(/buildPreviewText/);
  });

  it('Share-as-PDF uses the canonical text', () => {
    // generateAndShareHandoff is called with the canonical body — it may
    // be passed under a `bodyText` field or as the only payload, but the
    // canonical state must reach it.
    const handleShare = sheetSrc.match(/handleSharePdf[\s\S]{0,500}?\}\,/);
    expect(handleShare).toBeTruthy();
    expect(handleShare?.[0]).toMatch(/canonicalText|canonical/);
  });
});

describe('Phase 5.8.d — preview surface renders the same text the user shares', () => {
  it('the ScrollView preview body shows the canonical state value', () => {
    // Single <Text> block inside the preview ScrollView that renders
    // canonicalText. Section-by-section re-derivation is gone.
    expect(sheetSrc).toMatch(/<Text[^>]*style=\{styles\.canonicalBody\}[^>]*>\s*\{canonicalText\}/);
  });

  it('canonicalBody style exists in the StyleSheet', () => {
    expect(sheetSrc).toMatch(/canonicalBody:\s*\{/);
  });
});

describe('Phase 5.8.d — handoffPdf accepts canonical body text', () => {
  const pdfSrc = readFileSync(join(ROOT, 'services/handoffPdf.ts'), 'utf8');
  it('HandoffPdfData has a bodyText field for canonical output', () => {
    expect(pdfSrc).toMatch(/bodyText\??:\s*string/);
  });
  it('the HTML template renders the bodyText (preserving whitespace)', () => {
    // Either via <pre> or white-space: pre-wrap CSS — both preserve the
    // line breaks the canonical builder produces.
    const lower = pdfSrc.toLowerCase();
    expect(
      lower.includes('<pre') || lower.includes('white-space: pre'),
    ).toBe(true);
  });
});
