// ============================================================================
// Phase 34 F5.2 — MealsDrawer adoption BEHAVIOR pin.
//
// Second per-category adoption of the F5 What → Reminder editor
// skeleton. Meals is the F5 "no When" exception — meal names encode
// time (Breakfast=morning, Lunch=midday, Dinner=evening, Evening
// snack=night). The What chip set IS the When equivalent.
//
// CONTRACTS PINNED HERE:
//
//   1. ADOPTION — EditorDisableRow at the top with "Turn off Meals"
//      label; TWO EditorSection blocks in order (What to track,
//      Reminder). NO When section (the locked exception).
//   2. NARRATION — each EditorSection has the locked F5.2 copy:
//      What:     "Pick the meals you'd like to track for this person."
//      Reminder: "Nudge at mealtimes."
//      Same voice cadence as the F5.1 vitals adoption.
//   3. WHAT CHIP SET — four canonical meal chips, aligned to the
//      user-facing item names (Breakfast / Lunch / Dinner / Evening
//      snack). Q-34.F5.2.B lock: chip labels align to the
//      generator's mealNames (carePlanGenerator.ts:466-471) so the
//      caregiver sees ONE label across the editor + Now + Journal +
//      handoff PDF.
//   4. CHIP WRITE PATH — tapping an inactive meal chip fires
//      onUpdate with the meal's TimeOfDay added to timesOfDay
//      (membership-toggle).
//   5. REMINDER PRESERVED — the existing Switch still writes
//      notificationsEnabled through onUpdate.
//   6. TURN-OFF-INSIDE — flipping the in-drawer EditorDisableRow
//      Switch fires onToggleEnabled (matches F5.1 vitals pattern).
//   7. DISABLED STATE — when enabled=false the body is dimmed +
//      non-interactive via EditorDisableRow (Q-34.F5.1.B option (b)
//      lock).
//   8. NO WHEN SECTION — explicit forward-guard. Future readers
//      finding "no When" must NOT add one; meal names encode time.
//      Confirms exactly TWO EditorSection blocks render, NOT three.
// ============================================================================

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      textPrimary: '#f4ddb8',
      textSecondary: '#c4c1b3',
      textTertiary: '#9e9885',
      accent: '#5fb88a',
      accentDim: 'rgba(95,184,138,0.10)',
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

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { MealsDrawer } from '../../components/careplan/drawers/MealsDrawer';
import type { MealsBucketConfig } from '../../types/carePlanConfig';

function baseConfig(overrides: Partial<MealsBucketConfig> = {}): MealsBucketConfig {
  return {
    enabled: true,
    priority: 'recommended',
    timesOfDay: ['morning', 'midday', 'evening'],
    notificationsEnabled: false,
    trackingStyle: 'quick',
    ...overrides,
  } as MealsBucketConfig;
}

describe('Phase 34 F5.2 — MealsDrawer adoption (EditorSection + EditorDisableRow; What + Reminder; NO When)', () => {
  it('contract 1 (ADOPTION): EditorDisableRow at the top with "Turn off Meals" label; exactly two EditorSection blocks in order (What to track / Reminder)', () => {
    const { getByTestId, getAllByTestId } = render(
      <MealsDrawer
        config={baseConfig()}
        onUpdate={() => {}}
        enabled={true}
        onToggleEnabled={() => {}}
      />,
    );

    const labelNode = getByTestId('editor-disable-row-label');
    expect(JSON.stringify(labelNode.props.children)).toMatch(/Turn off Meals/i);

    const titleNodes = getAllByTestId('editor-section-title');
    expect(titleNodes).toHaveLength(2);
    const texts = titleNodes.map((n: any) =>
      JSON.stringify(n.props.children).toLowerCase(),
    );
    expect(texts[0]).toContain('what');
    expect(texts[1]).toContain('reminder');
  });

  it('contract 2 (NARRATION — LOCKED COPY): each EditorSection has the F5.2-locked caregiver-facing line', () => {
    const { getAllByTestId } = render(
      <MealsDrawer
        config={baseConfig()}
        onUpdate={() => {}}
        enabled={true}
        onToggleEnabled={() => {}}
      />,
    );
    const narrationNodes = getAllByTestId('editor-section-narration');
    expect(narrationNodes).toHaveLength(2);
    const texts = narrationNodes.map((n: any) => JSON.stringify(n.props.children));
    expect(texts[0]).toContain(
      "Pick the meals you'd like to track for this person.",
    );
    expect(texts[1]).toContain('Nudge at mealtimes.');
  });

  it('contract 3 (WHAT CHIP SET — ALIGNED TO GENERATOR NAMES): four canonical meal chips render with the user-facing names that match the generator + Now + Journal + handoff PDF (Breakfast / Lunch / Dinner / Evening snack)', () => {
    // Q-34.F5.2.B lock: drawer aligns to generator's mealNames
    // (carePlanGenerator.ts:466-471). Pre-F5.2 the drawer said "Snack"
    // while the generator created an item named "Evening snack" —
    // confusing inconsistency. F5.2 closes the drift in the drawer
    // direction (the canonical name lives in every non-drawer surface).
    const { getByText } = render(
      <MealsDrawer
        config={baseConfig()}
        onUpdate={() => {}}
        enabled={true}
        onToggleEnabled={() => {}}
      />,
    );
    expect(getByText('Breakfast')).toBeTruthy();
    expect(getByText('Lunch')).toBeTruthy();
    expect(getByText('Dinner')).toBeTruthy();
    expect(getByText('Evening snack')).toBeTruthy();
  });

  it('contract 4 (CHIP WRITE PATH): tapping an inactive meal chip fires onUpdate with the chip\'s TimeOfDay added to timesOfDay (membership-toggle)', () => {
    const onUpdate = jest.fn();
    const { getByText } = render(
      <MealsDrawer
        config={baseConfig({ timesOfDay: ['morning', 'midday', 'evening'] })}
        onUpdate={onUpdate}
        enabled={true}
        onToggleEnabled={() => {}}
      />,
    );
    fireEvent.press(getByText('Evening snack'));
    expect(onUpdate).toHaveBeenCalledTimes(1);
    const arg = onUpdate.mock.calls[0][0];
    expect(arg.timesOfDay).toEqual(
      expect.arrayContaining(['morning', 'midday', 'evening', 'night']),
    );
    expect(arg.timesOfDay).toHaveLength(4);
  });

  it('contract 5 (REMINDER PRESERVED): the Switch writes notificationsEnabled through onUpdate', () => {
    const onUpdate = jest.fn();
    const { getByTestId } = render(
      <MealsDrawer
        config={baseConfig({ notificationsEnabled: false })}
        onUpdate={onUpdate}
        enabled={true}
        onToggleEnabled={() => {}}
      />,
    );
    const reminderSwitch = getByTestId('meals-reminder-switch');
    reminderSwitch.props.onValueChange(true);
    expect(onUpdate).toHaveBeenCalledTimes(1);
    expect(onUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ notificationsEnabled: true }),
    );
  });

  it('contract 6 (TURN-OFF-INSIDE): flipping the in-drawer EditorDisableRow Switch fires onToggleEnabled with the new value', () => {
    const onToggleEnabled = jest.fn();
    const { getByTestId } = render(
      <MealsDrawer
        config={baseConfig()}
        onUpdate={() => {}}
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
      <MealsDrawer
        config={baseConfig()}
        onUpdate={() => {}}
        enabled={false}
        onToggleEnabled={() => {}}
      />,
    );
    const body = getByTestId('editor-disable-row-body');
    expect(body.props.pointerEvents).toBe('none');
    const flat = Array.isArray(body.props.style)
      ? Object.assign({}, ...body.props.style)
      : body.props.style;
    expect(flat.opacity).toBeLessThanOrEqual(0.5);
  });

  it('contract 8 (NO WHEN SECTION — FORWARD-GUARD AGAINST FUTURE READERS "FIXING" IT): there are EXACTLY two EditorSection blocks; no "When" section is rendered (meal names encode time)', () => {
    // F5 plan's Meals exception, pinned explicitly. A future reader
    // who finds "no When section" and adds one would break this
    // contract. The exception is documented in MealsDrawer.tsx's
    // file header + a cross-reference comment in this contract.
    const { getAllByTestId } = render(
      <MealsDrawer
        config={baseConfig()}
        onUpdate={() => {}}
        enabled={true}
        onToggleEnabled={() => {}}
      />,
    );
    const titles = getAllByTestId('editor-section-title');
    expect(titles).toHaveLength(2);
    const allTitleText = titles
      .map((n: any) => JSON.stringify(n.props.children).toLowerCase())
      .join(' ');
    expect(allTitleText).not.toContain('when');
  });
});
