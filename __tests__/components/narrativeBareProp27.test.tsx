// ============================================================================
// Phase 27 F4 — `bare` prop on the four narrative components.
//
// MedicationsNarrative / VitalsNarrative / MoodWellnessNarrative /
// MealsNarrative each render their own outer card chrome
// (`backgroundColor: c.glassHover`, `borderWidth: 1`, `borderColor:
// c.border`, `borderRadius: BorderRadius.lg`, `padding: Spacing.md`).
// Pre-27 the components were orphaned — never mounted in any visible
// surface. Phase 27 F4 wires them into Section 2 (Objective) inside a
// neutral JournalSection card.
//
// When nested inside JournalSection's card chrome, the narratives'
// own chrome would render as a card-inside-a-card. The DESIGN_SYSTEM
// explicitly forbids that pattern. Phase 27 adds a `bare` prop to
// each narrative so it can skip its own chrome and render its inner
// prose directly inside Section 2's body.
//
// The prop defaults to false on every component for backward
// compatibility — any future standalone consumer keeps the existing
// card. Phase 27's only consumer (Section 2 in journal.tsx) passes
// `bare={true}` to all four.
//
// Pinned contracts (per component, x4):
//   1. Default (no `bare` / `bare={false}`) — the outer card chrome
//      renders: backgroundColor + borderWidth on the root View.
//   2. `bare={true}` — no chrome on the outer-most node: no
//      borderWidth, no backgroundColor at chrome-level intensity.
//   3. Text content is identical between modes (no copy drift).
// ============================================================================

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

const themeColors = {
  glassHover: 'rgba(255, 245, 220, 0.06)',
  border: 'rgba(255, 245, 220, 0.12)',
  textPrimary: '#fff',
  textSecondary: '#c4c1b3',
  textTertiary: '#9aa0a6',
  textMuted: '#6a7a8a',
  caregiverAccent: '#aa8adc',
  accent: '#5fb88a',
  amber: '#e5b04a',
  amberBright: '#e5b04a',
  green: '#5fb88a',
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

import { MedicationsNarrative } from '../../components/journal/MedicationsNarrative';
import { VitalsNarrative } from '../../components/journal/VitalsNarrative';
import { MoodWellnessNarrative } from '../../components/journal/MoodWellnessNarrative';
import { MealsNarrative } from '../../components/journal/MealsNarrative';

function renderComponent(Comp: any, props: any): TestRenderer.ReactTestRenderer {
  let root: TestRenderer.ReactTestRenderer | null = null;
  act(() => {
    root = TestRenderer.create(React.createElement(Comp as any, props));
  });
  return root!;
}

function rootStyle(tree: TestRenderer.ReactTestRenderer): Record<string, any> {
  const j = tree.toJSON();
  const node = Array.isArray(j) ? j[0] : j;
  const s = (node as any)?.props?.style;
  if (!s) return {};
  return Array.isArray(s) ? Object.assign({}, ...s) : s;
}

// Representative fixtures — minimal but enough for each component to
// render past its empty-state gates (if any).
const medFixture = [
  { name: 'Lisinopril', dosage: '10mg', status: 'completed' as const,
    scheduledTime: '08:00', takenAt: new Date().toISOString() },
];
const vitalsFixture = {
  scheduled: true, recorded: true,
  scheduledTime: '08:00', recordedAt: new Date().toISOString(),
  readings: { systolic: 130, diastolic: 80 },
};
const moodFixture = {
  entries: [{ source: 'morning-wellness', label: 'OK' }],
  morningWellness: { sleepQuality: 4, mood: 'OK' },
};
const mealsFixture = {
  total: 1,
  meals: [{ name: 'Breakfast', status: 'completed' as const, scheduledTime: '08:00' }],
};

describe('Phase 27 F4 — narrative bare prop (per-component contracts)', () => {
  describe('MedicationsNarrative', () => {
    it('contract 1: default — outer card chrome (borderWidth + backgroundColor) renders', () => {
      const tree = renderComponent(MedicationsNarrative, { medications: medFixture });
      const style = rootStyle(tree);
      expect(style.borderWidth).toBe(1);
      expect(style.backgroundColor).toBeDefined();
    });

    it('contract 2: bare={true} — no chrome on outer-most node', () => {
      const tree = renderComponent(MedicationsNarrative, { medications: medFixture, bare: true });
      const style = rootStyle(tree);
      expect(style.borderWidth).toBeUndefined();
      expect(style.backgroundColor).toBeUndefined();
    });
  });

  describe('VitalsNarrative', () => {
    it('contract 1: default — outer card chrome renders', () => {
      const tree = renderComponent(VitalsNarrative, { vitals: vitalsFixture });
      const style = rootStyle(tree);
      expect(style.borderWidth).toBe(1);
      expect(style.backgroundColor).toBeDefined();
    });

    it('contract 2: bare={true} — no chrome on outer-most node', () => {
      const tree = renderComponent(VitalsNarrative, { vitals: vitalsFixture, bare: true });
      const style = rootStyle(tree);
      expect(style.borderWidth).toBeUndefined();
      expect(style.backgroundColor).toBeUndefined();
    });
  });

  describe('MoodWellnessNarrative', () => {
    it('contract 1: default — outer card chrome renders', () => {
      const tree = renderComponent(MoodWellnessNarrative, { mood: moodFixture });
      const style = rootStyle(tree);
      expect(style.borderWidth).toBe(1);
      expect(style.backgroundColor).toBeDefined();
    });

    it('contract 2: bare={true} — no chrome on outer-most node', () => {
      const tree = renderComponent(MoodWellnessNarrative, { mood: moodFixture, bare: true });
      const style = rootStyle(tree);
      expect(style.borderWidth).toBeUndefined();
      expect(style.backgroundColor).toBeUndefined();
    });
  });

  describe('MealsNarrative', () => {
    it('contract 1: default — outer card chrome renders', () => {
      const tree = renderComponent(MealsNarrative, { meals: mealsFixture });
      const style = rootStyle(tree);
      expect(style.borderWidth).toBe(1);
      expect(style.backgroundColor).toBeDefined();
    });

    it('contract 2: bare={true} — no chrome on outer-most node', () => {
      const tree = renderComponent(MealsNarrative, { meals: mealsFixture, bare: true });
      const style = rootStyle(tree);
      expect(style.borderWidth).toBeUndefined();
      expect(style.backgroundColor).toBeUndefined();
    });
  });
});
