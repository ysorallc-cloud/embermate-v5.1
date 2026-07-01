// ============================================================================
// JournalNotesCard — destination hint + four save-button states + last-edited.
// Phase 3 of the Journal tone + behaviour pass.
// ============================================================================

import React from 'react';

jest.mock('react', () => {
  const actual = jest.requireActual('react');
  return {
    ...actual,
    useMemo: (fn: any) => fn(),
    useState: (init: any) => [typeof init === 'function' ? init() : init, () => {}],
    useEffect: () => {},
    useCallback: (fn: any) => fn,
    useRef: (initial: any) => ({ current: initial }),
  };
});

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      glass: '#363830',
      glassBorder: 'rgba(255,255,255,0.06)',
      accent: '#5fb88a',
      accentMuted: 'rgba(95, 184, 138, 0.5)',
      caregiverAccent: '#aa8adc',
      caregiverAccentBorder: 'rgba(143, 168, 200, 0.20)',
      surfaceAlt: 'rgba(255,255,255,0.03)',
      hairlineInset: 'rgba(255,255,255,0.06)',
      glassDim: '#19211b',
      textPrimary: '#fff',
      textSecondary: '#9aa0a6',
      textTertiary: '#6b7280',
    },
  }),
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

import { JournalNotesCard } from '../../components/journal/JournalNotesCard';

function flattenChildren(kids: any): any[] {
  if (kids == null) return [];
  if (Array.isArray(kids)) {
    const out: any[] = [];
    for (const k of kids) out.push(...flattenChildren(k));
    return out;
  }
  return [kids];
}

function findAll(node: any, predicate: (n: any) => boolean): any[] {
  if (!node || typeof node !== 'object') return [];
  const out: any[] = [];
  if (predicate(node)) out.push(node);
  for (const k of flattenChildren(node.props?.children)) {
    out.push(...findAll(k, predicate));
  }
  return out;
}

function flattenText(children: any): string {
  if (children == null) return '';
  if (typeof children === 'string' || typeof children === 'number') return String(children);
  if (Array.isArray(children)) return children.map(flattenText).join('');
  if (children?.props?.children !== undefined) return flattenText(children.props.children);
  return '';
}

function saveButton(tree: any) {
  return findAll(tree, (n) =>
    n.type === 'TouchableOpacity' &&
    typeof n.props?.accessibilityLabel === 'string' &&
    /save/i.test(n.props.accessibilityLabel),
  )[0];
}

function flatStyle(node: any): any {
  if (!node) return {};
  const s = node.props?.style;
  if (!s) return {};
  return Object.assign({}, ...(Array.isArray(s) ? s : [s]));
}

describe('JournalNotesCard — destination hint', () => {
  it('renders "→ Used in handoff and visit prep" below the privacy line', () => {
    const tree = JournalNotesCard({
      date: '2026-04-29',
      onSave: async () => {},
    });
    expect(flattenText(tree)).toContain('Used in handoff and visit prep');
  });

  it('the destination hint is rendered as separate text below the privacy line', () => {
    const tree = JournalNotesCard({
      date: '2026-04-29',
      onSave: async () => {},
    });
    const text = flattenText(tree);
    const privacyIdx = text.indexOf('Private');
    const hintIdx = text.indexOf('Used in handoff');
    expect(privacyIdx).toBeGreaterThan(-1);
    expect(hintIdx).toBeGreaterThan(privacyIdx);
  });

  it('a11y label on the hint reads naturally to VoiceOver', () => {
    const tree = JournalNotesCard({
      date: '2026-04-29',
      onSave: async () => {},
    });
    const hintNode = findAll(tree, (n) =>
      typeof n.props?.accessibilityLabel === 'string' &&
      /handoff and visit prep/i.test(n.props.accessibilityLabel),
    )[0];
    expect(hintNode).toBeDefined();
  });

  it('readOnly past-date view still shows the destination hint', () => {
    const tree = JournalNotesCard({
      date: '2026-04-25',
      readOnly: true,
      savedText: 'something already saved',
      onSave: async () => {},
    });
    expect(flattenText(tree)).toContain('Used in handoff and visit prep');
  });
});

describe('JournalNotesCard — Save button: four states', () => {
  it('STATE 1 — fresh, no saved text → outlined "Save" (no dirty fill yet)', () => {
    const tree = JournalNotesCard({ date: '2026-04-29', onSave: async () => {} });
    const button = saveButton(tree);
    expect(button).toBeDefined();
    expect(flattenText(button)).toBe('Save');
    expect(flatStyle(button).backgroundColor).not.toBe('#5fb88a');
    expect(button.props.disabled).toBe(true);
  });

  it('STATE 2 — saved, no edits → outlined "✓ Saved" with mint text + border', () => {
    // Simulate the "savedText present, current text matches saved text" branch.
    // Component derives isDirty from text vs savedText; with savedText=...
    // and the current text initialised to savedText, isDirty is false and the
    // pill should read "✓ Saved".
    const tree = JournalNotesCard({
      date: '2026-04-29',
      savedText: 'a note',
      savedAt: '2026-04-29T15:14:00',
      onSave: async () => {},
    });
    const button = saveButton(tree);
    expect(button).toBeDefined();
    expect(flattenText(button)).toMatch(/✓\s*Saved/);
    expect(button.props.disabled).toBe(true);
    const style = flatStyle(button);
    // Outlined treatment — border carries the colour, no fill.
    expect(style.backgroundColor).not.toBe('#5fb88a');
    expect(style.borderColor).toMatch(/#5fb88a|rgba\(95,\s*184,\s*138/);
  });
});

describe('JournalNotesCard — last edited timestamp', () => {
  it('renders "last edited HH:MM" in the eyebrow row when a savedAt exists', () => {
    const tree = JournalNotesCard({
      date: '2026-04-29',
      savedText: 'hello',
      savedAt: '2026-04-29T15:14:00',
      onSave: async () => {},
    });
    const text = flattenText(tree);
    expect(text).toMatch(/last edited /i);
    // 12h default → "3:14 PM"
    expect(text).toMatch(/3:14 PM|15:14/);
  });

  it('hides the timestamp when no saved reflection exists', () => {
    const tree = JournalNotesCard({
      date: '2026-04-29',
      onSave: async () => {},
    });
    expect(flattenText(tree)).not.toMatch(/last edited /i);
  });

  it('the timestamp lives inside the eyebrow row (right-aligned via marginLeft auto)', () => {
    const tree = JournalNotesCard({
      date: '2026-04-29',
      savedText: 'hello',
      savedAt: '2026-04-29T08:05:00',
      onSave: async () => {},
    });
    const node = findAll(tree, (n) =>
      n.type === 'Text' &&
      typeof flattenText(n) === 'string' &&
      /last edited/i.test(flattenText(n)),
    )[0];
    expect(node).toBeDefined();
    expect(flatStyle(node).marginLeft).toBe('auto');
  });
});

describe('JournalNotesCard — accessibility', () => {
  it('Save pill exposes accessibilityState selected / disabled correctly across states', () => {
    // STATE 1: empty input, no saved text — disabled
    let tree = JournalNotesCard({ date: '2026-04-29', onSave: async () => {} });
    let button = saveButton(tree);
    expect(button.props.accessibilityState).toEqual({ selected: false, disabled: true });

    // STATE 2: saved text, no edit — disabled, "saved"
    tree = JournalNotesCard({
      date: '2026-04-29',
      savedText: 'note',
      savedAt: '2026-04-29T15:14:00',
      onSave: async () => {},
    });
    button = saveButton(tree);
    expect(button.props.accessibilityState).toEqual({ selected: false, disabled: true });
  });
});
