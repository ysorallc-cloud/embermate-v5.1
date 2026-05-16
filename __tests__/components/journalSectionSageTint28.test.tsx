// ============================================================================
// Phase 28 F1 — JournalSection accepts a fourth tint: 'sage'.
//
// Phase 27 shipped JournalSection with three tints:
//   • 'caregiverAccent' — lavender — Journal Subjective + Plan
//   • 'amber'           — Journal Assessment
//   • 'neutral'         — Journal Objective
//
// Phase 28 adds the Insights three-card restructure. THE READ (Section 1)
// is the gestalt observation surface — a separate semantic from any of the
// Journal sections — so it gets its own color encoding.
//
// "Sage" here is GREEN sage (mint, #5fb88a, mapped via c.accent) — NOT the
// existing theme-tokens `sage` family which is misleadingly named lavender
// (rgba(196, 181, 253, *)). Phase 28 D1 picked Option A: re-use the
// already-provisioned c.accentFaint (rgba(95, 184, 138, 0.06)) as the body
// tint and c.accent as the border. No new tokens added — the color
// encoding rides on existing tokens.
//
// Pinned contracts:
//   1. sage tint resolves to border c.accent (#5fb88a) + bg c.accentFaint
//      (rgba green 0.06)
//   2. Border is opaque hex (full color, not muted alpha — same rule as
//      Phase 27.5a Bug 1's neutral-border fix)
//   3. Pre-Phase-28 tints (caregiverAccent / amber / neutral) keep their
//      existing color resolution (defense pin against collateral drift)
// ============================================================================

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

const themeColors = {
  accent: '#5fb88a',
  accentFaint: 'rgba(95, 184, 138, 0.06)',
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

describe('Phase 28 F1 — JournalSection sage tint', () => {
  it('contract 1: sage tint resolves to opaque c.accent border + c.accentFaint bg', () => {
    const tree = renderSection({ eyebrow: 'THE READ · 14 DAYS', tint: 'sage' });
    const card = tree.root.findByType('View' as any);
    const style = flatStyle(card);
    expect(style.borderLeftWidth).toBe(3);
    expect(style.borderLeftColor).toBe('#5fb88a');
    expect(style.backgroundColor).toBe('rgba(95, 184, 138, 0.06)');
  });

  it('contract 2: sage border is opaque hex (not muted alpha)', () => {
    // Mirrors Phase 27.5a Bug 1's neutral-border rule. Section colors carry
    // the visual weight — alpha-muting them defeats the encoding.
    const tree = renderSection({ eyebrow: 'x', tint: 'sage' });
    const card = tree.root.findByType('View' as any);
    const style = flatStyle(card);
    expect(style.borderLeftColor).not.toMatch(/rgba\(/);
  });

  it('contract 3 defense: pre-Phase-28 tints unchanged', () => {
    const cases: Array<[string, string, string]> = [
      ['caregiverAccent', '#aa8adc', 'rgba(170, 138, 220, 0.06)'],
      ['amber',           '#e5b04a', 'rgba(229, 176, 74, 0.06)'],
      ['neutral',         '#9aa0a6', 'rgba(255, 245, 220, 0.03)'],
    ];
    for (const [tint, border, bg] of cases) {
      const tree = renderSection({ eyebrow: 'x', tint });
      const card = tree.root.findByType('View' as any);
      const style = flatStyle(card);
      expect(style.borderLeftColor).toBe(border);
      expect(style.backgroundColor).toBe(bg);
    }
  });
});
