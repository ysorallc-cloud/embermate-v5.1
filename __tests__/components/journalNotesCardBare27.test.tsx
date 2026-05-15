// ============================================================================
// Phase 27 F6 — JournalNotesCard accepts a `bare` prop + forwards a
// focus-ref.
//
// Pre-27 the component rendered:
//   <View>
//     <View style={sectionDivider} />
//     <SectionEyebrow text="NOTES FROM …" />
//     <View style={card}>...textarea + footer...</View>
//   </View>
// Phase 27 moves the eyebrow + chrome up to Section 4 (a JournalSection
// caregiverAccent card with an inner "NOTES" sub-eyebrow). The
// component's own chrome would duplicate Section 4's, so `bare={true}`
// strips:
//   • The hairline section-divider above the card.
//   • The internal SectionEyebrow line.
//   • The outer card wrapper's background + border + radius.
// The textarea + footer Save pill stay — they're the meaningful inner
// content, not chrome.
//
// Audit D7 — single JournalNotesCard mount. Section 1's empty-state
// prompt focuses this card's textarea via a forwardRef-exposed
// imperative handle `{ focus(): void }`.
//
// Pinned contracts:
//   1. Default (`bare` omitted / false) — internal SectionEyebrow
//      renders ("NOTES FROM ..." / "NOTES" string visible).
//   2. `bare={true}` — internal SectionEyebrow gone (no "NOTES FROM" /
//      "NOTES" line at this component level; Section 4 owns the
//      sub-eyebrow).
//   3. `bare={true}` — outer-most node has no card chrome
//      (backgroundColor / borderWidth at chrome intensity).
//   4. Text content of the prompt + textarea is identical between
//      modes (no copy drift).
//   5. The component exposes an imperative focus() handle through
//      forwardRef.
// ============================================================================

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

const themeColors = {
  glass: 'rgba(255, 245, 220, 0.04)',
  glassBorder: 'rgba(255, 240, 215, 0.10)',
  glassFaint: 'rgba(255, 245, 220, 0.03)',
  textPrimary: '#fff',
  textSecondary: '#c4c1b3',
  textTertiary: '#9aa0a6',
  caregiverAccent: '#aa8adc',
  amber: '#e5b04a',
  green: '#5fb88a',
  greenTint: 'rgba(95, 184, 138, 0.10)',
};

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({ resolvedTheme: 'dark', colors: themeColors }),
}));

jest.mock('react-native', () => {
  const PT = (n: string) => n;
  return {
    View: PT('View'),
    Text: PT('Text'),
    TextInput: PT('TextInput'),
    TouchableOpacity: PT('TouchableOpacity'),
    StyleSheet: { create: (s: any) => s, flatten: (s: any) => s },
  };
});

jest.mock('../../utils/text/primitives', () => ({
  formatTime: () => '8:00 AM',
}));

import { JournalNotesCard } from '../../components/journal/JournalNotesCard';

function findAll(
  root: TestRenderer.ReactTestInstance,
  predicate: (n: TestRenderer.ReactTestInstance) => boolean,
): TestRenderer.ReactTestInstance[] {
  return root.findAll((n: any) => {
    try { return predicate(n); } catch { return false; }
  });
}

function flattenText(n: TestRenderer.ReactTestInstance): string {
  const out: string[] = [];
  function walk(node: any) {
    if (node == null) return;
    if (typeof node === 'string' || typeof node === 'number') { out.push(String(node)); return; }
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (node?.props?.children !== undefined) walk(node.props.children);
  }
  walk(n);
  return out.join('');
}

function render(props: any): TestRenderer.ReactTestRenderer {
  let root: TestRenderer.ReactTestRenderer | null = null;
  act(() => {
    root = TestRenderer.create(
      React.createElement(JournalNotesCard as any, props),
    );
  });
  return root!;
}

const baseProps = {
  date: '2026-05-14',
  onSave: jest.fn().mockResolvedValue(undefined),
  caregiverName: 'Amber',
  providerName: 'Dr. Torres',
};

describe('Phase 27 F6 — JournalNotesCard bare prop + focus ref', () => {
  it('contract 1: default — internal SectionEyebrow "NOTES FROM …" renders', () => {
    const tree = render({ ...baseProps });
    const allText = findAll(tree.root, (n) => n.type === 'Text')
      .map(flattenText)
      .join(' | ');
    expect(allText.toUpperCase()).toContain('NOTES FROM AMBER');
  });

  it('contract 2: bare={true} — internal "NOTES FROM ..." line does NOT render', () => {
    const tree = render({ ...baseProps, bare: true });
    const allText = findAll(tree.root, (n) => n.type === 'Text')
      .map(flattenText)
      .join(' | ');
    expect(allText.toUpperCase()).not.toContain('NOTES FROM AMBER');
    // Plain "NOTES" without the "FROM …" suffix is also absent at this
    // component level when bare — Section 4 owns the sub-eyebrow now.
    expect(allText).not.toMatch(/\bNOTES\b(?!\s+FROM)/);
  });

  it('contract 3: bare={true} — no chrome on the outer-most rendered node', () => {
    const tree = render({ ...baseProps, bare: true });
    const json = tree.toJSON();
    const node = Array.isArray(json) ? json[0] : json;
    const style = (node as any)?.props?.style;
    const flat = !style ? {} : (Array.isArray(style) ? Object.assign({}, ...style) : style);
    // The pre-27 card carried backgroundColor (c.glass) + borderWidth (0.5).
    // In bare mode neither should appear on the outer-most node.
    expect(flat.borderWidth).toBeUndefined();
    expect(flat.backgroundColor).toBeUndefined();
  });

  it('contract 4 (reframed Phase 27.5b F5): the chrome-mode question prompt renders in non-bare; bare uses a placeholder statement instead', () => {
    // Phase 27.5b F5 — bare mode retires the italic question prompt
    // above the textarea. The non-bare (chrome / standalone) mode
    // keeps the original Phase 22.1 prompt. The two modes now
    // intentionally render DIFFERENT prompt cues:
    //   • Non-bare: the italic question Text above the textarea
    //   • Bare:     a statement-form placeholder INSIDE the textarea
    //               (see journalNotesCleanup27_5b.test.tsx contract 1)
    // Pin both directions of the divergence.
    const populated = render({ ...baseProps });
    const bare = render({ ...baseProps, bare: true });
    const questionPromptRe = /Anything to pass to the next caregiver/;
    const allPop = findAll(populated.root, (n) => n.type === 'Text')
      .map(flattenText).join(' | ');
    const allBare = findAll(bare.root, (n) => n.type === 'Text')
      .map(flattenText).join(' | ');
    // Non-bare keeps the question prompt.
    expect(allPop).toMatch(questionPromptRe);
    // Bare retires the question prompt — placeholder copy lives on
    // the TextInput's placeholder prop, not in a separate Text node.
    expect(allBare).not.toMatch(questionPromptRe);
  });

  it('contract 5: accepts an inputRef prop and forwards it to the inner TextInput', () => {
    // Source-level pin — TestRenderer with mocked string-type components
    // (View/Text/TextInput) doesn't populate refs the way a real React
    // Native renderer does, so we can't assert ref.current is populated
    // at runtime. Instead we pin the component source: the prop is
    // declared, and the TextInput receives the inner ref that the
    // useEffect mirrors into the parent prop. The cross-check that
    // journal.tsx actually passes inputRef into Section 4 is owned by
    // journalSection4Wiring27.test.ts.
    const src = require('fs').readFileSync(
      require('path').join(__dirname, '../../components/journal/JournalNotesCard.tsx'),
      'utf8',
    );
    // Prop declared in the props interface.
    expect(src).toMatch(/inputRef\?:\s*React\.MutableRefObject<TextInput\s*\|\s*null>/);
    // useEffect wires the prop ref to the inner textInputRef.
    expect(src).toMatch(/inputRef\.current\s*=\s*textInputRef\.current/);
    // TextInput receives the inner ref.
    expect(src).toMatch(/<TextInput[\s\S]*?\bref=\{textInputRef\}/);
    // Calling the component with the prop must not throw (smoke).
    const ref = { current: null as any };
    expect(() => render({ ...baseProps, bare: true, inputRef: ref })).not.toThrow();
  });
});
