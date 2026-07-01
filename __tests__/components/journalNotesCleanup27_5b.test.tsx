// ============================================================================
// Phase 27.5b F5 — Notes section cleanup.
//
// Section 4 (Plan) in Journal previously rendered:
//   • Inner "NOTES" sub-eyebrow (renders only on today path)
//   • <JournalNotesCard bare /> with:
//       - italic Georgia prompt above the textarea
//         ("Anything to pass to the next caregiver, or to flag for {provider}?")
//       - empty-string placeholder on the TextInput (Phase 27.5a F2)
//
// The pre-27.5b shape stacked an inner sub-eyebrow + an italic prompt
// + an empty textarea field — three visual cues for one writing
// affordance. On simulator the textarea read as "is this where I
// type?" because no input chrome made the field a discoverable
// surface.
//
// Phase 27.5b F5 reshapes Section 4's Notes sub-block:
//   • Remove the inner "NOTES" sub-eyebrow (redundant with the
//     input affordance once chrome is added).
//   • Keep the inner "STILL PENDING" sub-eyebrow on the today path
//     (labels a distinct list above; not chrome-affected).
//   • Replace the italic question prompt with a placeholder
//     statement that fills the TextInput when empty:
//       "A note for the next caregiver or {Dr. Torres / the next visit}…"
//     (No question mark — observational invitation, not interrogation.)
//   • Wrap the textarea in visible input chrome:
//       backgroundColor: rgba(0,0,0,0.18)
//       borderWidth: 0.5
//       borderColor:  rgba(255,255,255,0.10)
//       borderRadius: 8
//       padding:      10 (V) / 11 (H)
//       minHeight:    44 (was 60 from Phase 27 F6; the 44 floor is
//                     enough for the placeholder + first line; the
//                     native multiline auto-expand grows past it)
//   • Voice switch: sans-serif 10.5px rgba(255,255,255,0.35) for
//     the empty placeholder; Georgia italic 11px rgba(255,255,255,0.85)
//     for user-typed content. The two voices distinguish "this is
//     the invitation copy" from "this is what you wrote."
//
// Phase 27.5a F2 retirement: F2 set the non-readOnly placeholder to
// '' (empty string) on the grounds that the italic prompt above the
// textarea already cued "type here" and the empty TextInput
// placeholder was debris. F5 reverses that decision — the prompt
// retires, the placeholder becomes the prompt copy, the textarea
// gets visible chrome. The two decisions are mutually exclusive;
// F5 is a coherent product evolution per Phase 27.5b D6 confirmation.
//
// Pinned contracts:
//   1. Non-readOnly TextInput placeholder is the new statement
//      ("A note for the next caregiver or ..."), NOT empty string,
//      NOT the legacy ellipsis "…".
//   2. The legacy italic-question prompt does NOT render anywhere
//      in the component (the entire <Text testID="notes-prompt">
//      element is retired in bare mode).
//   3. ReadOnly placeholder remains 'Notes from this day' (no copy
//      drift for the past-day case).
//   4. TextInput container styling includes the new chrome —
//      backgroundColor rgba(0,0,0,0.18) + borderWidth 0.5 + border-
//      Color rgba(255,255,255,0.10) + borderRadius 8.
//   5. TextInput minHeight is 44 (lowered from 60).
//   6. TextInput placeholderTextColor is the dim sans-serif rgba
//      (rgba(255,255,255,0.35) or equivalent dim alpha).
//   7. TextInput fontStyle for typed content is italic Georgia.
//   8. journal.tsx Section 4 body does NOT render the inner "NOTES"
//      sub-eyebrow Text element. STILL PENDING sub-eyebrow stays.
// ============================================================================

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { readFileSync } from 'fs';
import { join } from 'path';

const themeColors = {
  glass: 'rgba(255, 255, 255, 0.04)',
  glassBorder: 'rgba(255, 255, 255, 0.10)',
  glassFaint: 'rgba(255, 255, 255, 0.03)',
  textPrimary: '#fff',
  textSecondary: '#8b958c',
  textTertiary: '#9aa0a6',
  caregiverAccent: '#aa8adc',
  amber: '#d6ab5e',
  green: '#9ccfa6',
  greenTint: 'rgba(156, 207, 166, 0.10)',
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
  predicate: (n: any) => boolean,
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

function flatStyle(node: TestRenderer.ReactTestInstance): Record<string, any> {
  const s = node.props.style;
  if (!s) return {};
  return Array.isArray(s) ? Object.assign({}, ...s) : s;
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
  date: '2026-05-15',
  onSave: jest.fn().mockResolvedValue(undefined),
  caregiverName: 'Amber',
  providerName: 'Dr. Torres',
};

describe('Phase 27.5b F5 — JournalNotesCard notes cleanup', () => {
  it('contract 1 [device-walk fix 2026-06-13]: bare-mode placeholder is "Anything to pass along?" (Q-31 verbose prompt reframed)', () => {
    // Phase 27.5b F5 originally pinned the bare-mode placeholder as
    // a provider-interpolated observational statement. Phase 31 F2
    // locked it to the verbose Q-31 prompt. The 2026-06-13 device
    // walk reframed THAT to the concise F7 handoff voice — the
    // verbose prompt read as a form header, not a single open
    // question. The structural intent of contract 1 is preserved
    // (placeholder is a meaningful statement, not empty / not
    // ellipsis-only); the literal pin updates to the F7 handoff
    // copy.
    const tree = render({ ...baseProps, bare: true });
    const ti = tree.root.findByType('TextInput' as any);
    expect(ti.props.placeholder).toBe('Anything to pass along?');
    expect(ti.props.placeholder).not.toBe('');
    expect(ti.props.placeholder).not.toMatch(/^…$/);
  });

  it('contract 2: the legacy italic-question prompt does NOT render in bare mode', () => {
    const tree = render({ ...baseProps, bare: true });
    const promptNode = findAll(tree.root, (n) =>
      typeof n.props?.testID === 'string' && n.props.testID === 'notes-prompt',
    );
    expect(promptNode.length).toBe(0);
    // Defensive: the legacy question-mark copy is also absent from
    // any rendered Text in bare mode.
    const allText = findAll(tree.root, (n) => n.type === 'Text')
      .map(flattenText)
      .join(' | ');
    expect(allText).not.toMatch(/Anything to pass to the next caregiver, or to flag for/);
  });

  it('contract 3 (Phase 31 F3 reframe): bare mode renders an EDITABLE TextInput on BOTH today and past days', () => {
    // Pre-F2 the readOnly bare branch had an editable={false} TextInput
    // that LOOKED editable but ignored keystrokes (dead input).
    // F2 (briefly) replaced it with static <Text> (read-only past).
    // F3 (2026-05-21) flipped past days to FULLY EDITABLE — caregivers
    // recall things later ("Dad was off this morning" at night) and
    // need to amend notes on the day they belong to. Bare mode now
    // renders the same writable TextInput for today AND past;
    // saved-at timestamp records when each save happened, no
    // "added later" marker.
    //
    // Pin 1: bare + readOnly=true renders an editable TextInput
    //        (readOnly prop is now structurally ignored in bare mode).
    // Pin 2: bare + readOnly=false also renders the editable TextInput
    //        (today path — unchanged behavior).
    // Pin 3: the input is editable in both cases (editable !== false).
    for (const readOnly of [true, false]) {
      const tree = render({
        ...baseProps,
        bare: true,
        readOnly,
        savedText: 'Some prior content.',
      });
      const ti = tree.root.findByType('TextInput' as any);
      expect(ti).toBeDefined();
      // editable prop is true (or omitted, which defaults to true in RN).
      expect(ti.props.editable).not.toBe(false);
    }
  });

  it('contract 4: TextInput container styling carries the new chrome', () => {
    const tree = render({ ...baseProps, bare: true });
    const ti = tree.root.findByType('TextInput' as any);
    const s = flatStyle(ti);
    expect(s.backgroundColor).toBe('rgba(0,0,0,0.18)');
    expect(s.borderWidth).toBe(0.5);
    expect(s.borderColor).toBe('rgba(255,255,255,0.10)');
    expect(s.borderRadius).toBe(8);
  });

  it('contract 5: TextInput minHeight is 44 (lowered from 60 to match the chrome floor)', () => {
    const tree = render({ ...baseProps, bare: true });
    const ti = tree.root.findByType('TextInput' as any);
    const s = flatStyle(ti);
    expect(s.minHeight).toBe(44);
  });

  it('contract 6: placeholderTextColor is the dim sans-serif token', () => {
    const tree = render({ ...baseProps, bare: true });
    const ti = tree.root.findByType('TextInput' as any);
    // Accept the spec rgba or a project-theme equivalent at similar
    // dim alpha (rgba(255,255,255,0.35) per spec).
    expect(ti.props.placeholderTextColor).toBe('rgba(255,255,255,0.35)');
  });

  it('contract 7: TextInput fontStyle for typed content is italic Source Serif 4 (Phase 33 F7)', () => {
    // Phase 33 F7 — Georgia literal swept to Fonts.serifItalic token,
    // which resolves at runtime to 'Poppins_300Light_Italic'.
    const tree = render({ ...baseProps, bare: true });
    const ti = tree.root.findByType('TextInput' as any);
    const s = flatStyle(ti);
    expect(s.fontStyle).toBe('italic');
    expect(s.fontFamily).toBe('Poppins_300Light_Italic');
  });
});

describe('Phase 27.5b F5 — Section 4 inner sub-eyebrows', () => {
  const journalSrc = readFileSync(
    join(__dirname, '../../app/(tabs)/journal.tsx'),
    'utf8',
  );
  const stripped = journalSrc
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');

  it('contract 8: Section 4 body does NOT render an inner "NOTES" sub-eyebrow', () => {
    // The pre-F5 shape was:
    //   <Text style={[s.section4SubEyebrow, s.section4SubEyebrowNotes]}>NOTES</Text>
    // F5 retires this element entirely — the input chrome below
    // becomes the affordance. STILL PENDING stays as the
    // distinct-list label.
    expect(stripped).not.toMatch(/>\s*NOTES\s*</);
    expect(stripped).not.toMatch(/section4SubEyebrowNotes/);
  });

  it('contract 8 corollary [device-walk fix 2026-06-13]: Section 4 STILL PENDING sub-eyebrow is RETIRED alongside the TodayStillPending list', () => {
    // The 2026-06-13 device walk retired both STILL PENDING + the
    // TodayStillPending list from Section 4 — the section is the
    // caregiver's free-text handoff note, not a task tracker. The
    // sub-eyebrow Text element must NOT render.
    expect(stripped).not.toMatch(/>\s*STILL PENDING\s*</);
  });
});
