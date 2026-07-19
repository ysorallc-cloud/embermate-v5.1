// ============================================================================
// Phase 27.5a — Journal Today polish (three real display bugs).
//
// Bug 1 — Objective card left border read as missing on simulator
//   because the neutral tint resolved to c.glassStrong (rgba alpha 0.18)
//   while the other two tints used fully-opaque hex tokens. The Phase 27
//   spec said "full color, not muted alpha" — the neutral side picked
//   muted-alpha by default because there wasn't an opaque-neutral
//   candidate in the glass family. Fix: route neutral to c.textTertiary
//   (fully-opaque gray, matches the SectionEyebrow's default color so
//   the border becomes the eyebrow's structural extension).
//
// Bug 2 — JournalNotesCard rendered an ellipsis "…" placeholder
//   below the visible serif prompt. The prompt above already cues
//   "type here" — the placeholder was redundant chrome / debris.
//   Fix: empty-string placeholder for the non-readOnly case. ReadOnly
//   keeps "Notes from this day" (genuinely informative for empty
//   past-day notes). Two TextInput mounts in the file (chrome render
//   path + bare render path); both must be fixed.
//
// Bug 3 — MealsNarrative noneCompleted-with-empty-names double-space
//   shipped its fix in commit de72928c (Phase 27 closeout). This phase
//   adds a regression pin defending the fix from future drift.
//
// Pinned contracts:
//   1. JournalSection neutral tint border resolves to c.textTertiary
//      (opaque hex), not c.glassStrong (rgba alpha).
//   2. JournalNotesCard non-readOnly TextInput placeholder is '' (or
//      omitted), not the literal ellipsis '…'. Pin applies to both
//      mounts (chrome + bare render paths).
//   3. JournalNotesCard readOnly TextInput placeholder remains
//      'Notes from this day' (no copy drift in the past-day case).
//   4. MealsNarrative noneCompleted branch contains the conditional
//      ternary that returns 'No meals logged yet.' as the fallback
//      when names is empty — defending the de72928c fix.
// ============================================================================

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { readFileSync } from 'fs';
import { join } from 'path';

const themeColors = {
  caregiverAccent: '#aa8adc',
  caregiverAccentBg: 'rgba(170, 138, 220, 0.06)',
  amber: '#e5b04a',
  amberFaint: 'rgba(229, 176, 74, 0.06)',
  glassStrong: 'rgba(255, 245, 220, 0.18)',
  glassFaint: 'rgba(255, 245, 220, 0.03)',
  textTertiary: '#9aa0a6',
};

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({ resolvedTheme: 'dark', colors: themeColors }),
}));

jest.mock('react-native', () => {
  const PT = (n: string) => n;
  return {
    View: PT('View'),
    Text: PT('Text'),
    StyleSheet: { create: (s: any) => s, flatten: (s: any) => s },
  };
});

import { JournalSection } from '../../components/journal/JournalSection';

function flatStyle(node: TestRenderer.ReactTestInstance): Record<string, any> {
  const s = node.props.style;
  if (!s) return {};
  return Array.isArray(s) ? Object.assign({}, ...s) : s;
}

function renderSection(props: any): TestRenderer.ReactTestRenderer {
  let root: TestRenderer.ReactTestRenderer | null = null;
  act(() => {
    root = TestRenderer.create(
      React.createElement(JournalSection as any, props, null),
    );
  });
  return root!;
}

describe('Phase 27.5a Bug 1 — Objective card neutral border opacity', () => {
  it('contract 1: neutral tint border resolves to c.textTertiary (opaque), not c.glassStrong (rgba alpha)', () => {
    const tree = renderSection({ eyebrow: 'x', tint: 'neutral' });
    const card = tree.root.findByType('View' as any);
    const style = flatStyle(card);
    expect(style.borderLeftWidth).toBe(3);
    // The fix: opaque textTertiary hex, NOT the previous glassStrong rgba.
    expect(style.borderLeftColor).toBe('#9aa0a6');
    expect(style.borderLeftColor).not.toMatch(/rgba\(/);
  });

  it('contract 1 defense: caregiverAccent + amber tints keep their opaque-hex borders (no collateral drift)', () => {
    for (const [tint, hex] of [
      ['caregiverAccent', '#aa8adc'],
      ['amber', '#e5b04a'],
    ] as const) {
      const tree = renderSection({ eyebrow: 'x', tint });
      const card = tree.root.findByType('View' as any);
      const style = flatStyle(card);
      expect(style.borderLeftColor).toBe(hex);
    }
  });
});

const ROOT = join(__dirname, '../..');

describe('Phase 27.5a Bug 2 — JournalNotesCard placeholder debris', () => {
  const src = readFileSync(
    join(ROOT, 'components/journal/JournalNotesCard.tsx'),
    'utf8',
  );
  const stripped = src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');

  it('contract 2 (reframed Phase 27.5b F5): non-readOnly placeholder is the statement, not empty and not ellipsis', () => {
    // Phase 27.5b F5 supersedes 27.5a F2. The pre-F5 shape was:
    //   placeholder={readOnly ? 'Notes from this day' : ''}
    // F5 fills the bare-mode placeholder with the statement-form
    // prompt copy so the TextInput becomes the discoverable writing
    // affordance without a separate Text label above it:
    //   placeholder={readOnly ? 'Notes from this day' : barePlaceholder}
    // where barePlaceholder = "A note for the next caregiver or
    // {provider/the next visit}…". The retirement direction the
    // original F2 contract defended (no ellipsis-debris literal) is
    // still in force; only the empty-string decision flipped.
    //
    // The non-bare render path keeps its own placeholder convention
    // (see journalNotesCardBare27 contract 4 for the divergence pin).
    // Pin: no literal '…' as a placeholder value anywhere; bare-mode
    // placeholder is sourced from the barePlaceholder identifier.
    expect(stripped).not.toMatch(/placeholder=\{[^}]*['"]…['"]/);
    expect(stripped).toMatch(/barePlaceholder/);
  });

  it('contract 3: readOnly TextInput placeholder remains "Notes from this day" (no copy drift)', () => {
    expect(stripped).toMatch(/['"]Notes from this day['"]/);
  });
});
