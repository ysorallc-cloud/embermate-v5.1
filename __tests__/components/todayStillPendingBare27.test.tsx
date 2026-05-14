// ============================================================================
// Phase 27 F6 — TodayStillPending accepts a `bare` prop.
//
// Pre-27 the component rendered its own SectionEyebrow ("Still pending"
// / coral) and a glassFaint card chrome around the rows. Phase 27 moves
// the eyebrow up to Section 4's inner "STILL PENDING" sub-eyebrow
// (rendered by journal.tsx), and the card chrome is replaced by Section
// 4's caregiverAccent card. `bare={true}` strips:
//   • The hairline section-divider above.
//   • The internal SectionEyebrow line.
//   • The card chrome (backgroundColor / borderWidth / borderRadius).
// The bullet/name/time row layout stays — that's the meaningful inner
// content, not chrome.
//
// Empty-gate still applies: when no items are pending, the component
// returns null. Section 4 itself stays rendered (it owns JournalNotesCard),
// so the gating logic in journal.tsx handles whether to render the
// "STILL PENDING" sub-eyebrow at all — TodayStillPending in bare mode
// simply renders nothing for an empty day.
//
// Pinned contracts:
//   1. Default (`bare` omitted / false) — internal "Still pending"
//      eyebrow renders.
//   2. `bare={true}` — internal "Still pending" eyebrow does NOT
//      render.
//   3. `bare={true}` — no chrome on the outer-most rendered node.
//   4. `bare={true}` empty list — returns null (existing behavior;
//      pin to defend against drift).
//   5. Bullet-row content renders identically in both modes.
// ============================================================================

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

const themeColors = {
  glassFaint: 'rgba(255, 245, 220, 0.03)',
  glassBorder: 'rgba(255, 240, 215, 0.10)',
  textPrimary: '#fff',
  textSecondary: '#c4c1b3',
  textTertiary: '#9aa0a6',
  coral: '#e89a7a',
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
    SAMPLE_DATA_CLEARED: 'sampleDataCleared',
  },
}));

const mockListDailyInstances = jest.fn();
jest.mock('../../storage/carePlanRepo', () => ({
  listDailyInstances: (...a: any[]) => mockListDailyInstances(...a),
  DEFAULT_PATIENT_ID: 'default',
}));

const mockFormatStillPendingTonight = jest.fn();
jest.mock('../../utils/stillPendingFormat', () => ({
  formatStillPendingTonight: (...a: any[]) => mockFormatStillPendingTonight(...a),
}));

import { TodayStillPending } from '../../components/journal/TodayStillPending';

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

async function renderAndSettle(props: any): Promise<TestRenderer.ReactTestRenderer> {
  let root: TestRenderer.ReactTestRenderer | null = null;
  await act(async () => {
    root = TestRenderer.create(React.createElement(TodayStillPending as any, props));
  });
  await act(async () => { await Promise.resolve(); });
  await act(async () => { await Promise.resolve(); });
  return root!;
}

beforeEach(() => {
  mockListDailyInstances.mockReset();
  mockFormatStillPendingTonight.mockReset();
});

const fixtureItems = [
  { id: 'a', name: 'Evening meds', time: '8:00 PM', itemType: 'medication' },
  { id: 'b', name: 'BP check',     time: '9:00 PM', itemType: 'vitals' },
];

describe('Phase 27 F6 — TodayStillPending bare prop', () => {
  it('contract 1: default — internal "Still pending" eyebrow renders', async () => {
    mockListDailyInstances.mockResolvedValue([]);
    mockFormatStillPendingTonight.mockReturnValue(fixtureItems);
    const tree = await renderAndSettle({ dateKey: '2026-05-14' });
    const allText = findAll(tree.root, (n) => n.type === 'Text')
      .map(flattenText)
      .join(' | ');
    expect(allText.toUpperCase()).toContain('STILL PENDING');
  });

  it('contract 2: bare={true} — internal "Still pending" eyebrow does NOT render', async () => {
    mockListDailyInstances.mockResolvedValue([]);
    mockFormatStillPendingTonight.mockReturnValue(fixtureItems);
    const tree = await renderAndSettle({ dateKey: '2026-05-14', bare: true });
    const allText = findAll(tree.root, (n) => n.type === 'Text')
      .map(flattenText)
      .join(' | ');
    expect(allText.toUpperCase()).not.toContain('STILL PENDING');
  });

  it('contract 3: bare={true} — no chrome on outer-most rendered node', async () => {
    mockListDailyInstances.mockResolvedValue([]);
    mockFormatStillPendingTonight.mockReturnValue(fixtureItems);
    const tree = await renderAndSettle({ dateKey: '2026-05-14', bare: true });
    const json = tree.toJSON();
    const node = Array.isArray(json) ? json[0] : json;
    const style = (node as any)?.props?.style;
    const flat = !style ? {} : (Array.isArray(style) ? Object.assign({}, ...style) : style);
    expect(flat.borderWidth).toBeUndefined();
    expect(flat.borderRadius).toBeUndefined();
    expect(flat.backgroundColor).toBeUndefined();
  });

  it('contract 4: bare={true} + empty list — returns null', async () => {
    mockListDailyInstances.mockResolvedValue([]);
    mockFormatStillPendingTonight.mockReturnValue([]);
    const tree = await renderAndSettle({ dateKey: '2026-05-14', bare: true });
    expect(tree.toJSON()).toBeNull();
  });

  it('contract 5: bullet-row content renders identically in both modes', async () => {
    mockListDailyInstances.mockResolvedValue([]);
    mockFormatStillPendingTonight.mockReturnValue(fixtureItems);
    const populated = await renderAndSettle({ dateKey: '2026-05-14' });
    mockListDailyInstances.mockResolvedValue([]);
    mockFormatStillPendingTonight.mockReturnValue(fixtureItems);
    const bare = await renderAndSettle({ dateKey: '2026-05-14', bare: true });
    for (const tree of [populated, bare]) {
      const allText = findAll(tree.root, (n) => n.type === 'Text')
        .map(flattenText).join(' | ');
      expect(allText).toContain('Evening meds');
      expect(allText).toContain('8:00 PM');
      expect(allText).toContain('BP check');
    }
  });
});
