// ============================================================================
// Phase 34 F5.3 — WellnessCheckInDrawer adoption BEHAVIOR pin (single
// component, two periods).
//
// Third per-category adoption of the F5 What → Reminder editor
// skeleton. Wellness is the F5 SPLIT exception per Q-34.F5.A Option C:
// the legacy combined WellnessDrawer is replaced by TWO sibling
// editor cards (Morning Check-in + Evening Check-in), each its own
// What → Reminder editor. There is NO When section in either editor
// — the editor IS the window (Q-34.F5.A locked exception, parallel
// to Meals' "meal names encode time" exception).
//
// Q-34.F5.B Option (b) lock: backing storage stays one bucket
// (carePlanConfig.wellness). Each editor toggle is ON iff its window
// is in carePlanConfig.wellness.timesOfDay. F3.1's single-source-
// of-truth lock stays closed.
//
// The component is a SINGLE shared file with a `period` prop
// ('morning' | 'evening'). Both rows mount the same component with
// different periods; the period-specific field schemas and copy
// are derived internally.
//
// CONTRACTS PINNED HERE (mirrored across both periods via describe.each):
//
//   1. ADOPTION — EditorDisableRow at the top with "Turn off
//      {Period} check-in" label; TWO EditorSection blocks in order
//      (What to track, Reminder). NO When section (the locked
//      exception).
//   2. NARRATION — each EditorSection has a one-sentence period-
//      aware caregiver-facing line.
//   3. WHAT CHIPS — period-specific CORE field labels render
//      (morning: Sleep quality / Mood / Energy; evening: Mood /
//      Meals tracked / Day rating / Highlights & concerns). The
//      OPTIONAL fields remain v1-hidden per the Phase 33 F7 lock.
//   4. WHAT WRITE PATH — tapping a chip writes to the P5 store
//      (wellnessSettings.{period}.checks via updateSettings).
//      Q-34.F5.B (b) lock: P5 store stays canonical for the WHAT
//      layer; carePlanConfig stays canonical for the WHEN layer.
//   5. REMINDER PRESERVED — the Switch writes
//      wellnessSettings.{period}.reminderEnabled. The
//      write-without-consequence gap that F5.3 banked has been
//      CLOSED: B1 (00fbbec1) wired the scheduler to live-read the
//      flag at schedule time; B2 (b087b469) wired this drawer's
//      toggleReminder to call rescheduleAllNotifications so the
//      change takes effect immediately. The reschedule trigger is
//      pinned by __tests__/components/wellnessCheckInDrawerResched
//      NotB2.test.tsx contract a.
//   6. TURN-OFF-INSIDE — flipping the in-drawer Switch fires
//      onToggleEnabled (caller routes to wellness.timesOfDay
//      membership write).
//   7. DISABLED STATE — when enabled=false the body is dimmed +
//      non-interactive via EditorDisableRow (Q-34.F5.1.B (b)).
//   8. NO WHEN SECTION (EXPLICIT FORWARD-GUARD) — exactly two
//      EditorSection blocks; no "when" in any title.
// ============================================================================

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      textPrimary: '#f4ddb8',
      textSecondary: '#c4c1b3',
      textTertiary: '#9e9885',
      accent: '#5fb88a',
      accentChipFill: 'rgba(95,184,138,0.16)',
      accentMuted: '#3a6850',
      glassFaint: 'rgba(255,255,255,0.04)',
      glassBorder: 'rgba(255,255,255,0.06)',
      glassStrong: '#363830',
      switchThumbOff: '#666',
    },
  }),
}));

jest.mock('react-native', () => {
  const React = require('react');
  const make = (name: string) =>
    React.forwardRef((props: any, ref: any) =>
      React.createElement(name, { ...props, ref }, props.children),
    );
  return {
    View: make('View'),
    Text: make('Text'),
    TouchableOpacity: make('TouchableOpacity'),
    Switch: make('Switch'),
    StyleSheet: { create: (s: any) => s, flatten: (s: any) => s },
    Platform: { OS: 'ios', select: (o: any) => o.ios || o.default },
  };
});

// Mock useWellnessSettings so tests can seed period-specific state
// and observe writes. Using a mutable closure variable so each test
// can install its own seed via beforeEach.
const wellnessSettingsStore: { current: any } = { current: null };
const updateSettingsMock = jest.fn();
jest.mock('../../hooks/useWellnessSettings', () => ({
  useWellnessSettings: () => ({
    settings: wellnessSettingsStore.current,
    updateSettings: updateSettingsMock,
  }),
}));

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { WellnessCheckInDrawer } from '../../components/careplan/drawers/WellnessCheckInDrawer';

function seedSettings(overrides: any = {}) {
  return {
    morning: {
      enabled: true,
      time: '07:00',
      checks: ['sleep', 'mood', 'energy'],
      reminderEnabled: true,
      optionalChecks: {},
      ...(overrides.morning ?? {}),
    },
    evening: {
      enabled: true,
      time: '20:00',
      checks: ['mood', 'meals', 'dayRating', 'notes'],
      reminderEnabled: true,
      optionalChecks: {},
      ...(overrides.evening ?? {}),
    },
    afternoon: { enabled: true, time: '13:00', checks: [], reminderEnabled: false, optionalChecks: {} },
    vitals: { enabled: false, time: '08:30', types: [], reminderEnabled: false },
  };
}

beforeEach(() => {
  wellnessSettingsStore.current = seedSettings();
  updateSettingsMock.mockReset();
});

const PERIODS = ['morning', 'evening'] as const;

describe.each(PERIODS)(
  'Phase 34 F5.3 — WellnessCheckInDrawer adoption (period=%s)',
  (period) => {
    const PeriodCap = period === 'morning' ? 'Morning' : 'Evening';
    const coreLabels =
      period === 'morning'
        ? ['Sleep quality', 'Mood', 'Energy']
        : ['Mood', 'Meals tracked', 'Day rating', 'Highlights & concerns'];

    it('contract 1 (ADOPTION): EditorDisableRow at top with "Turn off {Period} check-in" label; exactly two EditorSection blocks in order (What to track / Reminder)', () => {
      const { getByTestId, getAllByTestId } = render(
        <WellnessCheckInDrawer period={period} enabled={true} onToggleEnabled={() => {}} />,
      );
      const labelNode = getByTestId('editor-disable-row-label');
      expect(JSON.stringify(labelNode.props.children)).toMatch(
        new RegExp(`Turn off ${PeriodCap} check-in`, 'i'),
      );

      const titleNodes = getAllByTestId('editor-section-title');
      expect(titleNodes).toHaveLength(2);
      const texts = titleNodes.map((n: any) =>
        JSON.stringify(n.props.children).toLowerCase(),
      );
      expect(texts[0]).toContain('what');
      expect(texts[1]).toContain('reminder');
    });

    it('contract 2 (NARRATION): each EditorSection has a non-blank period-aware caregiver-facing line', () => {
      const { getAllByTestId } = render(
        <WellnessCheckInDrawer period={period} enabled={true} onToggleEnabled={() => {}} />,
      );
      const narrationNodes = getAllByTestId('editor-section-narration');
      expect(narrationNodes).toHaveLength(2);
      for (const node of narrationNodes) {
        const inner = JSON.stringify(node.props.children).replace(/^"|"$/g, '').trim();
        expect(inner.length).toBeGreaterThan(5);
      }
    });

    it('contract 3 (WHAT CORE CHIPS): period-specific CORE field labels render; OPTIONAL fields remain v1-hidden', () => {
      const { getByText, queryByText } = render(
        <WellnessCheckInDrawer period={period} enabled={true} onToggleEnabled={() => {}} />,
      );
      for (const label of coreLabels) {
        expect(getByText(label)).toBeTruthy();
      }
      // V1-hidden optional fields stay out of the rendered tree
      // (data preserved in source consts; render line gone — Phase
      // 33 F7 lock carried forward).
      if (period === 'morning') {
        expect(queryByText('Orientation')).toBeNull();
        expect(queryByText('Decision making')).toBeNull();
      } else {
        expect(queryByText('Pain level')).toBeNull();
        expect(queryByText('Alertness')).toBeNull();
        expect(queryByText('Bowel movement')).toBeNull();
        expect(queryByText('Bathing')).toBeNull();
        expect(queryByText('Mobility')).toBeNull();
      }
    });

    it('contract 4 (WHAT WRITE PATH — P5 STORE): tapping a CORE chip writes to wellnessSettings.{period}.checks via updateSettings (Q-34.F5.B (b) — P5 store canonical for WHAT)', () => {
      const { getByText } = render(
        <WellnessCheckInDrawer period={period} enabled={true} onToggleEnabled={() => {}} />,
      );
      // Tap the first CORE chip to remove it (already in seeded checks).
      fireEvent.press(getByText(coreLabels[0]));
      expect(updateSettingsMock).toHaveBeenCalledTimes(1);
      const arg = updateSettingsMock.mock.calls[0][0];
      // The write targets the right period.
      expect(arg[period]).toBeDefined();
      expect(Array.isArray(arg[period].checks)).toBe(true);
    });

    it('contract 5 (REMINDER WRITE PATH): the Reminder Switch writes wellnessSettings.{period}.reminderEnabled via updateSettings', () => {
      const { getByTestId } = render(
        <WellnessCheckInDrawer period={period} enabled={true} onToggleEnabled={() => {}} />,
      );
      const reminderSwitch = getByTestId(`wellness-${period}-reminder-switch`);
      reminderSwitch.props.onValueChange(false);
      expect(updateSettingsMock).toHaveBeenCalledTimes(1);
      const arg = updateSettingsMock.mock.calls[0][0];
      expect(arg[period].reminderEnabled).toBe(false);
    });

    it('contract 6 (TURN-OFF-INSIDE): flipping the in-drawer EditorDisableRow Switch fires onToggleEnabled with the new value', () => {
      const onToggleEnabled = jest.fn();
      const { getByTestId } = render(
        <WellnessCheckInDrawer
          period={period}
          enabled={true}
          onToggleEnabled={onToggleEnabled}
        />,
      );
      const inDrawerSwitch = getByTestId('editor-disable-row-switch');
      inDrawerSwitch.props.onValueChange(false);
      expect(onToggleEnabled).toHaveBeenCalledTimes(1);
      expect(onToggleEnabled).toHaveBeenCalledWith(false);
    });

    it('contract 7 (DISABLED STATE): when enabled=false, the body is dimmed + non-interactive via EditorDisableRow', () => {
      const { getByTestId } = render(
        <WellnessCheckInDrawer period={period} enabled={false} onToggleEnabled={() => {}} />,
      );
      const body = getByTestId('editor-disable-row-body');
      expect(body.props.pointerEvents).toBe('none');
      const flat = Array.isArray(body.props.style)
        ? Object.assign({}, ...body.props.style)
        : body.props.style;
      expect(flat.opacity).toBeLessThanOrEqual(0.5);
    });

    it('contract 8 (NO WHEN SECTION — FORWARD-GUARD): exactly two EditorSection blocks; no "when" in any title', () => {
      const { getAllByTestId } = render(
        <WellnessCheckInDrawer period={period} enabled={true} onToggleEnabled={() => {}} />,
      );
      const titles = getAllByTestId('editor-section-title');
      expect(titles).toHaveLength(2);
      const allTitleText = titles
        .map((n: any) => JSON.stringify(n.props.children).toLowerCase())
        .join(' ');
      expect(allTitleText).not.toContain('when');
    });
  },
);
