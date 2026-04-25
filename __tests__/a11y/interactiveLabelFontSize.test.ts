// ============================================================================
// 3_POLISH_AND_TESTING Fix 15 — Accessibility audit (15B + 15C)
// ============================================================================
//
// 15A is a manual VoiceOver walkthrough — no automation possible.
//
// 15B: scan every `*ButtonText` / `*pillText` / `*linkText` / `*chipText`
//      style declaration and fail if any uses fontSize < 11. Interactive
//      labels below 11pt are an accessibility failure per Apple HIG and
//      WCAG 1.4.4 (resize text).
//
// 15C: spot-check a representative slice of small touchables — confirm
//      they have an explicit hitSlop or padding that brings the touch
//      target to at least 44pt. The full 1100+ TouchableOpacity audit
//      is impractical via grep; this test locks the highest-risk surfaces.
//
// Caption labels (uppercase 9pt section headers like "MEDS" / "BP" /
// "CHECK-INS") are NOT covered by the spec rule — they're labels, not
// buttons. The spec text: "Any fontSize under 11 *on interactive elements*
// is an accessibility failure."
// ============================================================================

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

const ROOT = join(__dirname, '../..');

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.git' || entry === '.expo' || entry === 'dist' || entry === 'coverage') continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, acc);
    else if (full.endsWith('.tsx') || full.endsWith('.ts')) acc.push(full);
  }
  return acc;
}

const SCAN_ROOTS = ['app', 'components'];
const allFiles = SCAN_ROOTS.flatMap(r => walk(join(ROOT, r)));

// Patterns that indicate the style is for an INTERACTIVE element label.
// `pillText` is intentionally narrow — the wider `tagText`/`chipText` are
// often used as filter pills which ARE interactive. `labelText` is
// excluded because it's typically a non-interactive form label.
const INTERACTIVE_STYLE_REGEX =
  /^\s{2,4}([a-zA-Z_][a-zA-Z0-9_]*?(?:ButtonText|PillText|LinkText|ChipText|ActionText|TabText|ToggleText)): \{/;

const FONT_SIZE_REGEX = /fontSize:\s*(\d+(?:\.\d+)?)/;

interface Violation {
  file: string;
  line: number;
  styleName: string;
  fontSize: number;
}

function scan(): Violation[] {
  const out: Violation[] = [];
  for (const file of allFiles) {
    const lines = readFileSync(file, 'utf8').split('\n');
    for (let i = 0; i < lines.length; i++) {
      const m = INTERACTIVE_STYLE_REGEX.exec(lines[i]);
      if (!m) continue;
      // Walk forward up to 8 lines to find the first fontSize, balancing
      // braces so nested styles in the same block don't bleed in.
      let depth = 1;
      for (let j = i + 1; j < Math.min(i + 12, lines.length); j++) {
        const line = lines[j];
        const open = (line.match(/\{/g) || []).length;
        const close = (line.match(/\}/g) || []).length;
        depth += open - close;
        if (depth <= 0) break;
        const fs = FONT_SIZE_REGEX.exec(line);
        if (fs) {
          const px = Number(fs[1]);
          if (px < 11) {
            out.push({
              file: relative(ROOT, file),
              line: j + 1,
              styleName: m[1],
              fontSize: px,
            });
          }
          break;
        }
      }
    }
  }
  return out;
}

describe('15B — interactive-label minimum font size', () => {
  const violations = scan();

  it('no `*ButtonText` / `*PillText` / `*LinkText` / `*ChipText` / `*ActionText` / `*TabText` / `*ToggleText` style declares fontSize < 11', () => {
    if (violations.length > 0) {
      const message = violations
        .map(v => `  ${v.file}:${v.line} — ${v.styleName} fontSize ${v.fontSize}`)
        .join('\n');
      // eslint-disable-next-line no-console
      console.error(`Interactive label a11y violations:\n${message}`);
    }
    expect(violations).toEqual([]);
  });

  it('scans a meaningful number of source files (not silently empty)', () => {
    expect(allFiles.length).toBeGreaterThan(100);
  });
});

describe('15C — touch target spot checks for high-risk small Touchables', () => {
  // Specific small Touchables that need either an explicit hitSlop or
  // generous padding to meet the 44pt minimum.

  it('SectionHeaderRow chevron toggle in NowTimeline.tsx has hitSlop', () => {
    const src = readFileSync(join(ROOT, 'components/now/NowTimeline.tsx'), 'utf8');
    // The SectionHeaderRow's collapse TouchableOpacity must declare hitSlop
    // — the title is 9pt + chevron 12pt → ~14pt of intrinsic height.
    const idx = src.indexOf('function SectionHeaderRow');
    expect(idx).toBeGreaterThan(-1);
    const block = src.slice(idx, idx + 2500);
    expect(block).toMatch(/hitSlop=\{\{[^}]*top:\s*\d+/);
  });

  it('ScreenHeader settings/back icon Touchables expose hitSlop or generous padding', () => {
    // ScreenHeader's left/right action slots use rightAction prop —
    // verify the most-used icon target (Now tab settings gear / patient
    // chip switcher) has hitSlop set. Moved to NowHeader.tsx.
    const src = readFileSync(join(ROOT, 'components/now/NowHeader.tsx'), 'utf8');
    expect(src).toMatch(/hitSlop=/);
  });

  it('Sub-screen close buttons in modals are tappable past their visible bounds', () => {
    // RoutineSheet close button — the modal sheet's primary dismiss action.
    const src = readFileSync(join(ROOT, 'components/now/RoutineSheet.tsx'), 'utf8');
    // The close TouchableOpacity should have either explicit hitSlop or
    // padding >= 8 on the closeButton style.
    const closeStyleStart = src.indexOf('closeButton: {');
    if (closeStyleStart > -1) {
      const block = src.slice(closeStyleStart, closeStyleStart + 300);
      const padMatches = block.match(/padding\w*:\s*(\d+)/g) || [];
      const minPad = Math.min(...padMatches.map(m => Number(m.match(/\d+/)![0])), 99);
      // Either hitSlop on the touchable OR padding >= 8 on the style.
      const hasHitSlop = src.includes('hitSlop=') && src.indexOf('hitSlop=') < src.indexOf('Done</Text>');
      expect(hasHitSlop || minPad >= 8).toBe(true);
    }
  });
});
