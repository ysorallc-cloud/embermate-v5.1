// ============================================================================
// Phase 34 F5.1 — VitalsDrawer adoption BEHAVIOR pin.
//
// The four v1 editors restructure onto a single shared What → When →
// Reminder skeleton with a narration line under each section and a
// turn-off-inside affordance at the top. F5.1 is the first per-
// category adoption — Vitals adopts EditorSection (F5.0) +
// EditorDisableRow (this commit) AND adds the When chip set that
// closes the F2.1-banked When-surface gap.
//
// CONTRACTS PINNED HERE:
//
//   1. ADOPTION — EditorDisableRow at the top with "Turn off Vitals"
//      label; three EditorSection blocks in order (What to track,
//      When, Reminder).
//   2. NARRATION — each EditorSection has a one-sentence narration
//      prop set to a caregiver-facing copy line (not empty / not
//      whitespace).
//   3. WHEN CHIP SET — the new control surfaced by F5.1 (closes the
//      F2.1 banked gap). Four-window canonical set (Morning,
//      Afternoon, Evening, Night) per Q-34.F5.1 audit decision
//      (Vitals is a measurement, not a check-in — no v1-filter).
//   4. WHEN WRITE PATH — tapping a When chip fires onUpdate with the
//      updated timesOfDay (membership-toggle semantics). Validates
//      the F3.1 single-source-of-truth lock stays closed for the
//      new control.
//   5. WHAT CHIPS PRESERVED — the existing six vital-type chips
//      still render + write vitalTypes through onUpdate.
//   6. REMINDER PRESERVED — the existing Switch still writes
//      notificationsEnabled through onUpdate.
//   7. TURN-OFF-INSIDE — flipping the in-drawer Switch fires
//      onToggleEnabled with false; flipping back on fires with true.
//   8. DISABLED STATE — when enabled=false (the in-drawer turn-off
//      lock), the body is dimmed + non-interactive via
//      EditorDisableRow (chip taps are no-op; pointerEvents='none').
// ============================================================================

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      textPrimary: '#f4ddb8',
      textSecondary: '#c4c1b3',
      textTertiary: '#9e9885',
      accent: '#5fb88a',
      accentDim: 'rgba(95,184,138,0.10)',
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

import React from 'react';
import { render, fireEvent, within } from '@testing-library/react-native';
import { VitalsDrawer } from '../../components/careplan/drawers/VitalsDrawer';
import type { VitalsBucketConfig } from '../../types/carePlanConfig';

function baseConfig(overrides: Partial<VitalsBucketConfig> = {}): VitalsBucketConfig {
  return {
    enabled: true,
    priority: 'recommended',
    timesOfDay: ['morning'],
    notificationsEnabled: true,
    vitalTypes: ['bp', 'hr', 'weight'],
    frequency: 'daily',
    ...overrides,
  } as VitalsBucketConfig;
}

describe('Phase 34 F5.1 — VitalsDrawer adoption (EditorSection + EditorDisableRow + When chip set)', () => {
  it('contract 1 (ADOPTION): EditorDisableRow at the top with "Turn off Vitals" label; three EditorSection blocks in order (What to track / When / Reminder)', () => {
    const { getByTestId, getAllByTestId } = render(
      <VitalsDrawer
        config={baseConfig()}
        onUpdate={() => {}}
        enabled={true}
        onToggleEnabled={() => {}}
      />,
    );

    const labelNode = getByTestId('editor-disable-row-label');
    expect(JSON.stringify(labelNode.props.children)).toMatch(/Turn off Vitals/i);

    const titleNodes = getAllByTestId('editor-section-title');
    expect(titleNodes).toHaveLength(3);
    const texts = titleNodes.map((n: any) =>
      JSON.stringify(n.props.children).toLowerCase(),
    );
    expect(texts[0]).toContain('what');
    expect(texts[1]).toContain('when');
    expect(texts[2]).toContain('reminder');
  });

  it('contract 2 (NARRATION): every EditorSection has a non-blank caregiver-facing narration line', () => {
    const { getAllByTestId } = render(
      <VitalsDrawer
        config={baseConfig()}
        onUpdate={() => {}}
        enabled={true}
        onToggleEnabled={() => {}}
      />,
    );
    const narrationNodes = getAllByTestId('editor-section-narration');
    expect(narrationNodes).toHaveLength(3);
    for (const node of narrationNodes) {
      const text = JSON.stringify(node.props.children);
      // Caregiver-facing one-sentence copy. Specific copy is editorial,
      // but every section MUST have a non-blank narration.
      const inner = text.replace(/^"|"$/g, '').trim();
      expect(inner.length).toBeGreaterThan(5);
    }
  });

  it('contract 3 (WHEN CHIP SET): four-window canonical set surfaces — Morning, Afternoon, Evening, Night', () => {
    // Closes the F2.1-banked Vitals When-surface gap. Q-34.F5.1
    // audit decision: full four-window set (vitals isn't a check-in;
    // no v1-filter applies). Labels resolve via TIME_OF_DAY_OPTIONS;
    // internal value 'midday' renders as "Afternoon".
    const { getAllByTestId } = render(
      <VitalsDrawer
        config={baseConfig()}
        onUpdate={() => {}}
        enabled={true}
        onToggleEnabled={() => {}}
      />,
    );
    const whenChips = getAllByTestId(/^vitals-when-chip-/);
    expect(whenChips).toHaveLength(4);

    // Use testing-library's within() helper to scope each chip's text
    // query — JSON.stringify on the Fiber node graph hits circular
    // references (same as the Slice 3-A sort contract).
    expect(within(whenChips[0]).getByText('Morning')).toBeTruthy();
    expect(within(whenChips[1]).getByText('Afternoon')).toBeTruthy();
    expect(within(whenChips[2]).getByText('Evening')).toBeTruthy();
    expect(within(whenChips[3]).getByText('Night')).toBeTruthy();
  });

  it('contract 4 (WHEN WRITE PATH): tapping an inactive When chip fires onUpdate with the chip\'s TimeOfDay added to timesOfDay', () => {
    // The F3.1 single-source-of-truth lock applied to the new
    // control. Membership-toggle semantics: tap "Afternoon"
    // ('midday') when not in timesOfDay → onUpdate fires with the
    // value appended.
    const onUpdate = jest.fn();
    const { getByTestId } = render(
      <VitalsDrawer
        config={baseConfig({ timesOfDay: ['morning'] })}
        onUpdate={onUpdate}
        enabled={true}
        onToggleEnabled={() => {}}
      />,
    );
    // testID encoding: vitals-when-chip-<TimeOfDay value>
    fireEvent.press(getByTestId('vitals-when-chip-midday'));
    expect(onUpdate).toHaveBeenCalledTimes(1);
    const arg = onUpdate.mock.calls[0][0];
    expect(arg).toEqual(
      expect.objectContaining({
        timesOfDay: expect.arrayContaining(['morning', 'midday']),
      }),
    );
    expect(arg.timesOfDay).toHaveLength(2);
  });

  it('contract 5 (WHAT CHIPS PRESERVED): the six existing vital-type chips still render + tapping one fires onUpdate with vitalTypes', () => {
    const onUpdate = jest.fn();
    const { getByText } = render(
      <VitalsDrawer
        config={baseConfig({ vitalTypes: ['bp'] })}
        onUpdate={onUpdate}
        enabled={true}
        onToggleEnabled={() => {}}
      />,
    );
    // The chip labels are stable (Blood Pressure / Heart Rate /
    // Weight / Oxygen Level / Blood Sugar / Temperature). Touching
    // "Heart Rate" should add 'hr' to vitalTypes.
    fireEvent.press(getByText('Heart Rate'));
    expect(onUpdate).toHaveBeenCalledTimes(1);
    const arg = onUpdate.mock.calls[0][0];
    expect(arg.vitalTypes).toEqual(expect.arrayContaining(['bp', 'hr']));
  });

  it('contract 6 (REMINDER PRESERVED): the Switch still writes notificationsEnabled through onUpdate', () => {
    const onUpdate = jest.fn();
    const { getByTestId } = render(
      <VitalsDrawer
        config={baseConfig({ notificationsEnabled: true })}
        onUpdate={onUpdate}
        enabled={true}
        onToggleEnabled={() => {}}
      />,
    );
    const reminderSwitch = getByTestId('vitals-reminder-switch');
    reminderSwitch.props.onValueChange(false);
    expect(onUpdate).toHaveBeenCalledTimes(1);
    expect(onUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ notificationsEnabled: false }),
    );
  });

  it('contract 7 (TURN-OFF-INSIDE): flipping the in-drawer EditorDisableRow Switch fires onToggleEnabled with the new value', () => {
    const onToggleEnabled = jest.fn();
    const { getByTestId } = render(
      <VitalsDrawer
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

  it('contract 8 (DISABLED STATE): when enabled=false, the body is dimmed + non-interactive (chip taps no-op via pointerEvents none)', () => {
    // Q-34.F5.1.B option (b) lock: the drawer STAYS OPEN with body
    // dimmed when the in-drawer Switch flips off. The dim contract
    // is verified at the EditorDisableRow primitive level
    // (editorDisableRow34F5_1.test.tsx contract 6); this contract
    // confirms VitalsDrawer routes its body through the primitive.
    const { getByTestId } = render(
      <VitalsDrawer
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
});
