// ============================================================================
// Phase 27 F2 — JournalSection wrapper.
//
// Generic outer card used to anchor each of the four SOAP-shaped Journal
// sections (Subjective / Objective / Assessment / Plan). The card carries
// the section's color encoding (3px left border + 0.06-alpha background
// tint) and an eyebrow at the top of the card body.
//
// Per Phase 27 D1-D3 (audit confirmed) the supported tints are:
//   • 'caregiverAccent' — lavender — used by Section 1 (Subjective) and
//                                    Section 4 (Plan). Lane bookends.
//   • 'amber'           — amber  — used by Section 3 (Assessment).
//   • 'neutral'         — quiet  — used by Section 2 (Objective). Border
//                                  routes through glassStrong (rgba 0.18)
//                                  and the bg tint through glassFaint
//                                  (rgba 0.03) — both already in the
//                                  glass alpha ladder.
//
// Pinned contracts:
//   1. Renders the eyebrow text via SectionEyebrow (uppercased by that
//      component) with the per-tint colour mapping.
//   2. Renders children inside a body region positioned after the eyebrow
//      in source order (eyebrow at top, body below with 7pt gap).
//   3. The card chrome:
//        • borderLeftWidth: 3
//        • borderLeftColor: tint-specific (caregiverAccent / amber / glassStrong)
//        • backgroundColor:  tint-specific (caregiverAccentBg / amberFaint / glassFaint)
//        • borderRadius:     BorderRadius.md (12pt — middle of the 10-12pt spec)
//        • paddingVertical:  11
//        • paddingHorizontal: 12
//        • marginBottom:     10 (gap between sibling cards)
// ============================================================================

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

const themeColors = {
  // tokens consumed by JournalSection
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

function render(props: any, children?: any): TestRenderer.ReactTestRenderer {
  let root: TestRenderer.ReactTestRenderer | null = null;
  act(() => {
    root = TestRenderer.create(
      React.createElement(JournalSection as any, props, children),
    );
  });
  return root!;
}

function flatStyle(node: TestRenderer.ReactTestInstance): Record<string, any> {
  const s = node.props.style;
  if (!s) return {};
  return Array.isArray(s) ? Object.assign({}, ...s) : s;
}

describe('Phase 27 F2 — JournalSection wrapper', () => {
  it('contract 1: renders the eyebrow text passed in props', () => {
    const tree = render({ eyebrow: 'How today went', tint: 'caregiverAccent' });
    const allText = findAll(tree.root, (n) => n.type === 'Text')
      .map(flattenText)
      .join(' | ');
    // SectionEyebrow uppercases — assert the uppercased version is present.
    expect(allText.toUpperCase()).toContain('HOW TODAY WENT');
  });

  it('contract 2: renders children inside a body region positioned after the eyebrow', () => {
    const child = React.createElement('Text', { testID: 'child-content' }, 'gestalt content');
    const tree = render({ eyebrow: 'How today went', tint: 'caregiverAccent' }, child);
    // The child must appear in the rendered tree somewhere.
    const childNode = findAll(tree.root, (n) => n.props?.testID === 'child-content')[0];
    expect(childNode).toBeDefined();
    // Phase 33b extension pre-Lock-3 Item B reframed the gap pin: the
    // 7pt `body.marginTop` retired when SectionEyebrow gained a
    // primitive `marginBottom: Spacing.sm` (= 12pt). Keeping the body
    // top-margin would compound to 19pt+ inside JournalSection
    // consumers; the eyebrow→body gap now lives entirely in the
    // primitive. The body wrapper is preserved (empty styles block)
    // for future surface-level layout overrides — pin its presence,
    // not its margin.
    const childParent = findAll(tree.root, (n) => {
      if (n.type !== 'View') return false;
      const kids = n.props?.children;
      if (Array.isArray(kids)) return kids.some((k: any) => k?.props?.testID === 'child-content');
      return kids?.props?.testID === 'child-content';
    })[0];
    expect(childParent).toBeDefined();
    // body wrapper exists; gap is contributed by SectionEyebrow's
    // marginBottom, not by body.marginTop.
    const style = flatStyle(childParent);
    expect(style.marginTop).toBeUndefined();
  });

  it('contract 3a: caregiverAccent tint — border-left = #aa8adc, bg = caregiverAccentBg', () => {
    const tree = render({ eyebrow: 'x', tint: 'caregiverAccent' }, null);
    const card = tree.root.findByType('View' as any);
    const style = flatStyle(card);
    expect(style.borderLeftWidth).toBe(3);
    expect(style.borderLeftColor).toBe('#aa8adc');
    expect(style.backgroundColor).toBe('rgba(170, 138, 220, 0.06)');
  });

  it('contract 3b: amber tint — border-left = #e5b04a, bg = amberFaint', () => {
    const tree = render({ eyebrow: 'x', tint: 'amber' }, null);
    const card = tree.root.findByType('View' as any);
    const style = flatStyle(card);
    expect(style.borderLeftWidth).toBe(3);
    expect(style.borderLeftColor).toBe('#e5b04a');
    expect(style.backgroundColor).toBe('rgba(229, 176, 74, 0.06)');
  });

  it('contract 3c: neutral tint — border-left = textTertiary (opaque, Phase 27.5a), bg = glassFaint', () => {
    // Phase 27.5a Bug 1 — neutral border was c.glassStrong (rgba alpha
    // 0.18). The 3px stripe was barely perceptible at that alpha
    // compared to the full-opacity hex borders on the other tints.
    // The fix routes the neutral border through c.textTertiary
    // (opaque #9aa0a6, matches the SectionEyebrow's default color so
    // the border becomes the eyebrow's structural extension). bg
    // stays glassFaint — the body wash should remain quiet.
    const tree = render({ eyebrow: 'x', tint: 'neutral' }, null);
    const card = tree.root.findByType('View' as any);
    const style = flatStyle(card);
    expect(style.borderLeftWidth).toBe(3);
    expect(style.borderLeftColor).toBe('#9aa0a6');
    expect(style.backgroundColor).toBe('rgba(255, 245, 220, 0.03)');
  });

  it('contract 3d: chrome dimensions match spec (radius 12, padding 11/12, marginBottom 10)', () => {
    const tree = render({ eyebrow: 'x', tint: 'amber' }, null);
    const card = tree.root.findByType('View' as any);
    const style = flatStyle(card);
    expect(style.borderRadius).toBe(12);
    expect(style.paddingVertical).toBe(11);
    expect(style.paddingHorizontal).toBe(12);
    expect(style.marginBottom).toBe(10);
  });
});
