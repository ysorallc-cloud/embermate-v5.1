// ============================================================================
// LIGHT PDF TEMPLATE — Phase 31 (Option A extraction).
//
// Shared light-theme CSS for the two PDF emitters in this codebase:
//   • services/visitPrepPdf.ts          — multi-day visit-prep aggregate
//   • services/handoffPdf.ts            — single-day Journal Share handoff
//
// Lifted verbatim from services/visitPrepPdf.ts. Byte-for-byte identical
// to the pre-extraction block so VP's existing PDF tests (structure,
// tone, content-parity, caregiver-fillable, clinical-order, provenance,
// preview-parity) keep passing. The new single-day handoff inherits the
// exact same look so the two artifacts read as one family.
//
// Only the CSS leaves visitPrepPdf in this lift; section assembly, table
// rows, callout chrome, footer copy, and the body HTML all stay where
// they were. The single-day builder writes its own body markup using
// the same primitives (h1/h2/table/.callout/.footer) so consumers can't
// drift the look.
//
// Pinned indirectly: any VP test that round-trips through buildHtml()
// implicitly covers the LIGHT_PDF_CSS contents (since it ends up inline
// in the emitted HTML).
// ============================================================================

export const LIGHT_PDF_CSS = `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, 'Helvetica Neue', sans-serif; color: #1a1a2e; padding: 32px; font-size: 11px; line-height: 1.5; }
    h1 { font-family: Georgia, 'Times New Roman', serif; font-size: 20px; font-weight: 400; color: #1a1a2e; margin-bottom: 4px; }
    .subtitle { font-size: 11px; color: #7a7a8a; margin-bottom: 20px; }
    /* Phase 23.3 — cover provenance line. Renders flush under .subtitle
       so the two cover rows read as a unit; one step quieter (10px,
       #9a9aa8, italic) so it doesn't compete with the dateRange line. */
    .provenance { font-size: 10px; color: #9a9aa8; font-style: italic; margin-top: -16px; margin-bottom: 20px; }
    h2 { font-size: 13px; font-weight: 600; color: #4a6b5d; margin: 16px 0 6px; border-bottom: 1px solid #e2e4e8; padding-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
    th { text-align: left; font-size: 10px; font-weight: 600; color: #7a7a8a; letter-spacing: 0.5px; padding: 4px 8px; border-bottom: 1px solid #e2e4e8; }
    td { padding: 4px 8px; font-size: 11px; border-bottom: 1px solid #f0f2f4; }
    ul { padding-left: 16px; margin-bottom: 12px; }
    li { margin-bottom: 4px; }
    .footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid #e2e4e8; font-size: 9px; color: #9a9aa8; text-align: center; }
    .callout { padding: 10px 14px; margin: 12px 0; border-left: 3px solid #4a6b5d; }
    .callout-redflag { background: #fef3f0; border-left-color: #c14848; }
    .callout-hydration { background: #f5f0e8; border-left-color: #4a6b5d; }
    .callout-wellness { background: #f0f3f0; border-left-color: #4a6b5d; }
    .callout h2 { border-bottom: none; padding-bottom: 0; margin: 0 0 6px; color: #1a1a2e; }
    .callout-redflag h2 { color: #8b3030; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; }
    .callout p { margin: 4px 0; line-height: 1.5; }
  `;

/** Standard HTML-escape for any user-supplied text rendered into the
 *  light-theme PDF. Mirrors the helper that already exists in
 *  handoffPdf.ts; lifted here so both emitters share one definition. */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
