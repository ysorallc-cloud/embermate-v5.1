// ============================================================================
// Phase 27 F5 — TodayNotableMoments wraps itself in Section 3 chrome.
//
// Pre-27 the component rendered its own internal SectionEyebrow ("Worth
// mentioning" / amber) + a hairline divider above the rows. Phase 27
// nests the rows inside a JournalSection amber card whose eyebrow is
// "Worth flagging" (Section 3 — Assessment), and the inner divider /
// internal eyebrow would duplicate the JournalSection's own chrome.
//
// The component gains a `wrapInSection` prop:
//   • Default (omitted / false) — pre-27 chrome stays (internal eyebrow
//     + divider). Standalone consumers unchanged.
//   • `wrapInSection={true}` — the component renders inside a
//     <JournalSection eyebrow="Worth flagging" tint="amber"> wrapper,
//     with its internal eyebrow + divider stripped so chrome doesn't
//     double-up.
// In both modes, the existing empty-gate holds: when buildNotableMoments
// returns 0 moments, the component returns null. With wrapInSection,
// that null collapses Section 3 entirely — no empty assessment card on
// the page, per the spec.
//
// Pinned contracts:
//   1. Default mode — internal "WORTH MENTIONING" eyebrow renders.
//   2. `wrapInSection={true}` — internal "WORTH MENTIONING" eyebrow
//      does NOT render; the wrapping JournalSection eyebrow "WORTH
//      FLAGGING" renders instead.
//   3. `wrapInSection={true}` with 0 moments — entire component renders
//      null (no Section 3 chrome, no eyebrow, no empty card).
//   4. `wrapInSection={true}` with moments — the moment rows render
//      INSIDE a JournalSection (carries the amber chrome it's known to
//      render — caught via the eyebrow text).
//   5. The internal hairline divider does not render in wrapInSection
//      mode (chrome is the JournalSection's responsibility).
// ============================================================================

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

const themeColors = {
  caregiverAccent: '#aa8adc',
  caregiverAccentBg: 'rgba(170, 138, 220, 0.06)',
  amber: '#e5b04a',
  amberFaint: 'rgba(229, 176, 74, 0.06)',
  glassStrong: 'rgba(255, 245, 220, 0.18)',
  glassFaint: 'rgba(255, 245, 220, 0.03)',
  textPrimary: '#fff',
  textSecondary: '#c4c1b3',
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

jest.mock('../../lib/events', () => ({
  useDataListener: jest.fn(),
}));

jest.mock('../../lib/eventNames', () => ({
  EVENT: {
    DAILY_INSTANCES: 'dailyInstances',
    LOGS: 'logs',
    MEDICATION: 'medication',
    WELLNESS: 'wellness',
    VITALS: 'vitals',
    SAMPLE_DATA_CLEARED: 'sampleDataCleared',
  },
}));

// Mock buildNotableMoments so we can control moments returned per-test.
const mockBuildNotableMoments = jest.fn();
jest.mock('../../utils/notableMomentsBuilder', () => ({
  buildNotableMoments: (...a: any[]) => mockBuildNotableMoments(...a),
}));

import { TodayNotableMoments } from '../../components/journal/TodayNotableMoments';

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

async function renderAndSettle(props: any): Promise<TestRenderer.ReactTestRenderer> {
  let root: TestRenderer.ReactTestRenderer | null = null;
  await act(async () => {
    root = TestRenderer.create(React.createElement(TodayNotableMoments as any, props));
  });
  // Allow the mount-effect's async fetch to resolve.
  await act(async () => { await Promise.resolve(); });
  await act(async () => { await Promise.resolve(); });
  return root!;
}

beforeEach(() => {
  mockBuildNotableMoments.mockReset();
});

describe('Phase 27 F5 — TodayNotableMoments wrapInSection prop', () => {
  it('contract 1: default mode — internal "WORTH MENTIONING" eyebrow renders', async () => {
    mockBuildNotableMoments.mockResolvedValue({
      moments: [{ category: 'bp', text: 'BP higher than the recent baseline.' }],
    });
    const tree = await renderAndSettle({ dateKey: '2026-05-14' });
    const allText = findAll(tree.root, (n) => n.type === 'Text')
      .map(flattenText)
      .join(' | ');
    expect(allText.toUpperCase()).toContain('WORTH MENTIONING');
  });

  it('contract 2: wrapInSection — internal eyebrow gone; wrapping "WORTH FLAGGING" eyebrow renders', async () => {
    mockBuildNotableMoments.mockResolvedValue({
      moments: [{ category: 'bp', text: 'BP higher than the recent baseline.' }],
    });
    const tree = await renderAndSettle({ dateKey: '2026-05-14', wrapInSection: true });
    const allText = findAll(tree.root, (n) => n.type === 'Text')
      .map(flattenText)
      .join(' | ');
    expect(allText.toUpperCase()).not.toContain('WORTH MENTIONING');
    expect(allText.toUpperCase()).toContain('WORTH FLAGGING');
  });

  it('contract 3: wrapInSection + 0 moments — entire component returns null', async () => {
    mockBuildNotableMoments.mockResolvedValue({ moments: [] });
    const tree = await renderAndSettle({ dateKey: '2026-05-14', wrapInSection: true });
    expect(tree.toJSON()).toBeNull();
  });

  it('contract 4: wrapInSection — rows render inside a JournalSection (amber chrome)', async () => {
    mockBuildNotableMoments.mockResolvedValue({
      moments: [
        { category: 'bp', text: 'BP higher than the recent baseline.' },
        { category: 'meal', text: 'Lunch refused.' },
      ],
    });
    const tree = await renderAndSettle({ dateKey: '2026-05-14', wrapInSection: true });
    const allText = findAll(tree.root, (n) => n.type === 'Text')
      .map(flattenText)
      .join(' | ');
    // Both moment texts present.
    expect(allText).toContain('BP higher than the recent baseline.');
    expect(allText).toContain('Lunch refused.');
    // The amber wrapping eyebrow is present.
    expect(allText.toUpperCase()).toContain('WORTH FLAGGING');
  });

  it('contract 5: wrapInSection mode does not render the legacy hairline divider above the rows', async () => {
    mockBuildNotableMoments.mockResolvedValue({
      moments: [{ category: 'bp', text: 'BP higher than the recent baseline.' }],
    });
    const tree = await renderAndSettle({ dateKey: '2026-05-14', wrapInSection: true });
    // The legacy divider was a View with backgroundColor
    // 'rgba(255,255,255,0.04)' + height 1 — pin its absence.
    const dividers = findAll(tree.root, (n) => {
      if (n.type !== 'View') return false;
      const s = n.props?.style;
      const flat = Array.isArray(s) ? Object.assign({}, ...s) : (s ?? {});
      return flat.height === 1 && typeof flat.backgroundColor === 'string'
        && /rgba\(255,\s*255,\s*255,\s*0\.04\)/.test(flat.backgroundColor);
    });
    expect(dividers.length).toBe(0);
  });
});
