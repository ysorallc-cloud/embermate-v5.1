// ============================================================================
// Phase 29 Batch B F2 — ActionCardsRow component contracts.
//
// Three cards in a single equal-width row replacing the pre-B QuickResetPills
// surface on the You tab. Helpline + Community + Wellness, each with a
// caregiverAccent-tinted Ionicons accent and a 2-line label/subtitle stack.
//
// Per Path A (Phase 29 Batch B F2 chrome decision, 2026-05-16): the cards
// carry NEUTRAL whisper chrome (rgba(255,255,255,0.035) bg, rgba(255,255,255,
// 0.08) border) with lavender only on the icon accent. Across-surfaces
// lane-coherence rule applied — the orb above is the visual lead, action
// cards step back as auxiliary surfaces. The icons carry the caregiver
// lane identity; the chrome stays quiet.
//
// Component is purely presentational — three required handler props from
// the parent (support.tsx in F4) drive the Linking / navigate side effects.
// ============================================================================

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

const themeColors = {
  caregiverAccent: '#aa8adc',
  textPrimary: '#fff',
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
    TouchableOpacity: PT('TouchableOpacity'),
    StyleSheet: { create: (s: any) => s, flatten: (s: any) => s },
  };
});

// Global @expo/vector-icons mock (jest.setup.js) makes Ionicons resolve
// to the string-type 'Ionicons' — discoverable by type + props.

import { ActionCardsRow } from '../../components/support/ActionCardsRow';

function findAll(
  root: TestRenderer.ReactTestInstance,
  predicate: (n: any) => boolean,
): TestRenderer.ReactTestInstance[] {
  return root.findAll((n: any) => {
    try { return predicate(n); } catch { return false; }
  });
}

function flatText(n: TestRenderer.ReactTestInstance): string {
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

function render(handlers: Partial<{
  onHelpline: () => void;
  onCommunity: () => void;
  onWellness: () => void;
}> = {}): TestRenderer.ReactTestRenderer {
  const props = {
    onHelpline: handlers.onHelpline ?? jest.fn(),
    onCommunity: handlers.onCommunity ?? jest.fn(),
    onWellness: handlers.onWellness ?? jest.fn(),
  };
  let tree: TestRenderer.ReactTestRenderer | null = null;
  act(() => {
    tree = TestRenderer.create(React.createElement(ActionCardsRow as any, props));
  });
  return tree!;
}

describe('Phase 29 Batch B F2 — ActionCardsRow', () => {
  it('contract 1: renders 3 cards in order [Helpline, Community, Wellness]', () => {
    const tree = render();
    // Each card's testID encodes its identity. Find all card-level taps
    // and assert the rendered order matches the spec.
    const cards = findAll(tree.root, (n) =>
      typeof n.props?.testID === 'string' &&
      /^action-card-(helpline|community|wellness)$/.test(n.props.testID),
    );
    expect(cards).toHaveLength(3);
    expect(cards[0].props.testID).toBe('action-card-helpline');
    expect(cards[1].props.testID).toBe('action-card-community');
    expect(cards[2].props.testID).toBe('action-card-wellness');
  });

  it('contract 2: each card carries the correct Ionicons name', () => {
    const tree = render();
    const ionicons = findAll(tree.root, (n) => n.type === 'Ionicons');
    expect(ionicons).toHaveLength(3);
    expect(ionicons[0].props.name).toBe('call-outline');
    expect(ionicons[1].props.name).toBe('heart-outline');
    expect(ionicons[2].props.name).toBe('pulse-outline');
    // Per spec: size 13, color caregiverAccent.
    for (const icon of ionicons) {
      expect(icon.props.size).toBe(13);
      expect(icon.props.color).toBe('#aa8adc'); // caregiverAccent from mock
    }
  });

  it('contract 3: card labels render — "Helpline", "Community", "Wellness"', () => {
    const tree = render();
    const allText = findAll(tree.root, (n) => n.type === 'Text').map(flatText).join(' | ');
    expect(allText).toContain('Helpline');
    expect(allText).toContain('Community');
    expect(allText).toContain('Wellness');
  });

  it('contract 4: card subtitles render — "24/7", "Read", "Over time"', () => {
    const tree = render();
    const allText = findAll(tree.root, (n) => n.type === 'Text').map(flatText).join(' | ');
    expect(allText).toContain('24/7');
    expect(allText).toContain('Read');
    expect(allText).toContain('Over time');
  });

  it('contract 5: each card tap invokes the correct handler prop (no internal nav/Linking)', () => {
    const onHelpline = jest.fn();
    const onCommunity = jest.fn();
    const onWellness = jest.fn();
    const tree = render({ onHelpline, onCommunity, onWellness });

    const helpline = findAll(tree.root, (n) => n.props?.testID === 'action-card-helpline')[0];
    const community = findAll(tree.root, (n) => n.props?.testID === 'action-card-community')[0];
    const wellness = findAll(tree.root, (n) => n.props?.testID === 'action-card-wellness')[0];

    act(() => { helpline.props.onPress(); });
    expect(onHelpline).toHaveBeenCalledTimes(1);
    expect(onCommunity).not.toHaveBeenCalled();
    expect(onWellness).not.toHaveBeenCalled();

    act(() => { community.props.onPress(); });
    expect(onCommunity).toHaveBeenCalledTimes(1);

    act(() => { wellness.props.onPress(); });
    expect(onWellness).toHaveBeenCalledTimes(1);
  });

  it('contract 6: Wellness card carries accessibilityHint="View your wellness history"', () => {
    const tree = render();
    const wellness = findAll(tree.root, (n) => n.props?.testID === 'action-card-wellness')[0];
    expect(wellness).toBeDefined();
    expect(wellness.props.accessibilityHint).toBe('View your wellness history');
  });

  it('contract 7: row structure — 3 tappable cards in a single row, equal-width via flex:1', () => {
    const tree = render();
    // Outer View wraps the 3 cards.
    const json = tree.toJSON() as any;
    const root = Array.isArray(json) ? json[0] : json;
    const rootStyle = !root?.props?.style ? {} : (Array.isArray(root.props.style)
      ? Object.assign({}, ...root.props.style)
      : root.props.style);
    expect(rootStyle.flexDirection).toBe('row');
    // gap 8 (matches QuickResetPills row spacing for F4 drop-in compatibility)
    expect(rootStyle.gap).toBe(8);
    // marginVertical 14 (preserves support.tsx vertical rhythm in F4 swap)
    expect(rootStyle.marginVertical).toBe(14);

    // Each card has flex:1 — equal-width distribution.
    const cards = findAll(tree.root, (n) =>
      typeof n.props?.testID === 'string' &&
      /^action-card-(helpline|community|wellness)$/.test(n.props.testID),
    );
    for (const card of cards) {
      const style = card.props.style;
      const flat = Array.isArray(style) ? Object.assign({}, ...style) : style;
      expect(flat.flex).toBe(1);
    }
  });
});
