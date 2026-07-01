// ============================================================================
// FlatTimelineFeed spine nodes — stamped node-state contract (Now rebuild F2).
//
// The spine node is STAMPED from getCareItemStatus once (rowStatusOf →
// FlatItem.status) and mapped to a visual VM via stampNode (pure), then
// rendered by the presentational TimelineNode which receives ONLY {shape,
// color} — never the instance. This pins the mockup's node states through the
// real render:
//   done    → sage FILL   (no gold node)
//   overdue → coral RING
//   pending → neutral RING (hollow)
// and the panel-color "cut" (ring bg = zonePanel).
// ============================================================================

import React from 'react';

const ACCENT = '#9ccfa6';   // sage
const CORAL = '#e3a684';
const NEUTRAL = '#5e685f';  // textTertiary (neutral register)
const GOLD = '#d6ab5e';
const ZONE = '#19211b';

jest.mock('react', () => {
  const actual = jest.requireActual('react');
  return { ...actual, useMemo: (fn: any) => fn() };
});

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      accent: ACCENT, coral: CORAL, textTertiary: NEUTRAL, gold: GOLD,
      zonePanel: ZONE, background: '#141a16', textPrimary: '#edf0ea',
      textMuted: '#8b958c', hairlineInset: 'rgba(255,255,255,0.06)',
      coralFaint: 'rgba(227,166,132,0.06)', coralBorder: 'rgba(227,166,132,0.20)',
    },
  }),
}));

jest.mock('react-native', () => {
  const PT = (n: string) => n;
  return { View: PT('View'), Text: PT('Text'), TouchableOpacity: PT('TouchableOpacity'), StyleSheet: { create: (s: any) => s, flatten: (s: any) => s } };
});

import { FlatTimelineFeed, stampNode, TimelineNode } from '../../components/now/FlatTimelineFeed';

function flatten(kids: any): any[] {
  if (kids == null) return [];
  if (Array.isArray(kids)) return kids.flatMap(flatten);
  return [kids];
}
function findAll(node: any, pred: (n: any) => boolean): any[] {
  if (!node || typeof node !== 'object') return [];
  const out: any[] = [];
  if (pred(node)) out.push(node);
  for (const k of flatten(node.props?.children)) out.push(...findAll(k, pred));
  return out;
}
function styleOf(n: any): Record<string, any> {
  const s = n?.props?.style;
  if (!s) return {};
  return Array.isArray(s) ? Object.assign({}, ...s.filter(Boolean)) : s;
}
// The spine node is a <TimelineNode> element inside the row. Calling the
// component as a function does NOT expand child components, so we assert on
// the STAMPED PROPS handed to TimelineNode — which IS the PART-B contract
// (the node receives {shape,color,panelColor}, never the instance).
function nodePropsInRow(tree: any, rowId: string): Record<string, any> {
  const row = findAll(tree, (n) => n?.props?.testID === `flat-row-${rowId}`)[0];
  const node = findAll(row, (n) => n?.type === TimelineNode)[0];
  return node?.props ?? {};
}

const twoDaysAgo8 = new Date(Date.now() - 2 * 86400000); twoDaysAgo8.setHours(8, 0, 0, 0);
const todayNoon = new Date(); todayNoon.setHours(12, 0, 0, 0);
const future = new Date(Date.now() + 6 * 3600000);

describe('stampNode — pure status→VM (no re-derivation)', () => {
  const c: any = { accent: ACCENT, coral: CORAL, textTertiary: NEUTRAL };
  it('done → sage fill', () => expect(stampNode('done', c)).toEqual({ shape: 'fill', color: ACCENT }));
  it('overdue → coral ring', () => expect(stampNode('overdue', c)).toEqual({ shape: 'ring', color: CORAL }));
  it('pending → neutral ring (no gold)', () => {
    const vm = stampNode('pending', c);
    expect(vm).toEqual({ shape: 'ring', color: NEUTRAL });
    expect(vm.color).not.toBe(GOLD);
  });
});

describe('TimelineNode — presentational, receives only {shape,color}', () => {
  it('fill → solid color, no border', () => {
    const s = styleOf(TimelineNode({ shape: 'fill', color: ACCENT, panelColor: ZONE } as any));
    expect(s.backgroundColor).toBe(ACCENT);
    expect(s.borderWidth).toBeUndefined();
  });
  it('ring → border color + panel-cut background', () => {
    const s = styleOf(TimelineNode({ shape: 'ring', color: CORAL, panelColor: ZONE } as any));
    expect(s.borderWidth).toBe(2);
    expect(s.borderColor).toBe(CORAL);
    expect(s.backgroundColor).toBe(ZONE);
  });
});

describe('FlatTimelineFeed — spine node states through the real render', () => {
  const tree = FlatTimelineFeed({
    completed: [{ id: 'd', itemName: 'Lunch', itemType: 'nutrition', status: 'completed', scheduledTime: todayNoon.toISOString() }],
    allPending: [
      { id: 'o', itemName: 'Breakfast', itemType: 'nutrition', windowLabel: 'morning', status: 'pending', scheduledTime: twoDaysAgo8.toISOString() },
      { id: 'p', itemName: 'Dinner', itemType: 'nutrition', windowLabel: 'evening', status: 'pending', scheduledTime: future.toISOString() },
    ],
    onItemPress: () => {},
  } as any) as any;

  it('done row → sage FILL node', () => {
    expect(nodePropsInRow(tree, 'd')).toMatchObject({ shape: 'fill', color: ACCENT, panelColor: ZONE });
  });
  it('overdue row → coral RING node (cuts spine on the panel color)', () => {
    expect(nodePropsInRow(tree, 'o')).toMatchObject({ shape: 'ring', color: CORAL, panelColor: ZONE });
  });
  it('pending row → neutral RING node (no gold)', () => {
    const p = nodePropsInRow(tree, 'p');
    expect(p).toMatchObject({ shape: 'ring', color: NEUTRAL });
    expect(p.color).not.toBe(GOLD);
  });
});
