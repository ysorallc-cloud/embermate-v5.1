// ============================================================================
// Phase 5.7.a — Header pill copy: "Report" → "Share".
//
// The lavender header pill on Journal is renamed from "Report" to "Share"
// to match the user's mental model. Wiring stays unchanged in this commit;
// 5.7.b will route the new Share button to a chooser sheet.
//
// Visual contract held:
//   • Same lavender style family (purpleFaint / purpleBorder)
//   • Same position (top-right of the header)
//   • Same Pill geometry (paddingHorizontal/Vertical, radius)
//
// What flipped:
//   • Visible text "Report" → "Share"
//   • a11y label moves off "Clinical report" — points at the new entry-point
//     intent ("Share").
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const journalSrc = readFileSync(join(ROOT, 'app/(tabs)/journal.tsx'), 'utf8');

describe('Phase 5.7.a — header pill copy rename', () => {
  it('the header pill renders text "Share" (not "Report")', () => {
    expect(journalSrc).toMatch(/<Text style=\{s\.headerPillReportText\}>Share<\/Text>/);
    expect(journalSrc).not.toMatch(/<Text style=\{s\.headerPillReportText\}>Report<\/Text>/);
  });

  it('the pill keeps its lavender style family (style key headerPillReport unchanged)', () => {
    // The style key stays put — only the visible label changes. Renaming
    // the style itself is Phase 8 audit territory.
    expect(journalSrc).toMatch(/headerPillReport:\s*\{/);
    expect(journalSrc).toMatch(/style=\{\[s\.headerPillReport,/);
  });

  it('a11y label uses "Share" wording, not "Clinical report"', () => {
    // Locate the lavender pill's TouchableOpacity block and inspect its
    // accessibilityLabel prop in isolation.
    const pillIdx = journalSrc.indexOf('s.headerPillReport,');
    expect(pillIdx).toBeGreaterThan(0);
    // Walk back to the opening <TouchableOpacity for this pill.
    const openIdx = journalSrc.lastIndexOf('<TouchableOpacity', pillIdx);
    const closeIdx = journalSrc.indexOf('</TouchableOpacity>', pillIdx);
    const block = journalSrc.slice(openIdx, closeIdx);
    expect(block).toMatch(/accessibilityLabel=\{[^}]*Share[^}]*\}/);
    expect(block).not.toMatch(/Clinical report/);
  });
});
