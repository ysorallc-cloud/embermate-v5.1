// ============================================================================
// Phase 27 F3 — GestaltSummary accepts a `bare` prop to strip its own
// chrome when nested inside a JournalSection card.
//
// Pre-27 the component rendered:
//   <View style={chromeBlock}><Text style={textStyle}>{text}</Text></View>
// where chromeBlock carries caregiverAccentBg + a 3px left border +
// borderRadius 6 + padding — i.e. its own miniature card. Phase 27
// moves the chrome up to JournalSection so all four SOAP cards share a
// uniform shape; GestaltSummary inside Section 1 needs to skip its own
// chrome so the styles don't double-up.
//
// The `bare` prop defaults to `false` for backward compatibility — any
// future standalone consumer keeps the existing chrome. Phase 27's only
// consumer (Section 1 in journal.tsx) passes `bare={true}`.
//
// Pinned contracts:
//   1. With `bare={false}` (default) — the chrome View renders, the text
//      sits inside it. Standalone behavior unchanged.
//   2. With `bare={true}` — no chrome View; the text renders directly
//      (no backgroundColor / borderLeftWidth / borderRadius on the
//      outer-most node).
//   3. The text content is identical between modes (no copy drift).
//   4. The fallback "No record from this day." behavior is preserved
//      in both modes.
// ============================================================================

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

const themeColors = {
  caregiverAccent: '#aa8adc',
  caregiverAccentBg: 'rgba(170, 138, 220, 0.06)',
  caregiverAccentStrong: 'rgba(170, 138, 220, 0.25)',
  textPrimary: '#fff',
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

import { GestaltSummary } from '../../components/journal/GestaltSummary';

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

function render(props: any): TestRenderer.ReactTestRenderer {
  let root: TestRenderer.ReactTestRenderer | null = null;
  act(() => {
    root = TestRenderer.create(React.createElement(GestaltSummary as any, props));
  });
  return root!;
}

function flatStyle(node: TestRenderer.ReactTestInstance): Record<string, any> {
  const s = node.props.style;
  if (!s) return {};
  return Array.isArray(s) ? Object.assign({}, ...s) : s;
}

describe('Phase 27 F3 — GestaltSummary bare prop', () => {
  it('contract 1: default (bare={false}) — chrome View renders with caregiverAccent tokens', () => {
    const tree = render({ summary: 'A quiet day today.' });
    const views = findAll(tree.root, (n) => n.type === 'View');
    expect(views.length).toBeGreaterThanOrEqual(1);
    // The outer-most View (the chrome) carries backgroundColor +
    // borderLeftWidth — i.e. the standalone-mount card chrome.
    const outerStyle = flatStyle(views[0]);
    expect(outerStyle.borderLeftWidth).toBe(3);
    expect(outerStyle.backgroundColor).toBeDefined();
  });

  it('contract 2: bare={true} — no chrome View; text renders directly with no chrome styles', () => {
    const tree = render({ summary: 'A quiet day today.', bare: true });
    // The Text node must be present at the top level (no wrapping View
    // that carries chrome). It's fine for a non-styled View / Fragment
    // to wrap the Text, but the outer-most rendered node must NOT
    // carry borderLeftWidth or backgroundColor.
    const root = tree.toJSON();
    expect(root).toBeTruthy();
    const rootJson = Array.isArray(root) ? root[0] : root;
    const rootStyle = (rootJson as any)?.props?.style;
    const flat = Array.isArray(rootStyle)
      ? Object.assign({}, ...rootStyle)
      : (rootStyle ?? {});
    expect(flat.borderLeftWidth).toBeUndefined();
    expect(flat.backgroundColor).toBeUndefined();
  });

  it('contract 3: text content is identical between bare and non-bare modes', () => {
    const populated = 'A quiet day today.';
    const withChrome = render({ summary: populated });
    const bare = render({ summary: populated, bare: true });
    const allTextWithChrome = findAll(withChrome.root, (n) => n.type === 'Text')
      .map(flattenText)
      .join(' | ');
    const allTextBare = findAll(bare.root, (n) => n.type === 'Text')
      .map(flattenText)
      .join(' | ');
    expect(allTextWithChrome).toContain(populated);
    expect(allTextBare).toContain(populated);
  });

  it('contract 4: fallback "No record from this day." renders in both modes when summary is empty', () => {
    const FALLBACK = 'No record from this day.';
    for (const props of [
      { summary: null },
      { summary: null, bare: true },
      { summary: '   ' },
      { summary: '   ', bare: true },
    ]) {
      const tree = render(props);
      const all = findAll(tree.root, (n) => n.type === 'Text')
        .map(flattenText)
        .join(' | ');
      expect(all).toContain(FALLBACK);
    }
  });
});
