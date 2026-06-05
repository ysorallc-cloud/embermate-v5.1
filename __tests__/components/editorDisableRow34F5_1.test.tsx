// ============================================================================
// Phase 34 F5.1 — EditorDisableRow primitive BEHAVIOR pin.
//
// Sibling to EditorSection (F5.0). Wraps the body of an editor drawer
// with a "Turn off {category}" row at the top and a dimmable body
// slot below. Q-34.F5.1.B locked option (b): when the in-drawer
// Switch flips OFF, the drawer STAYS OPEN with the body dimmed +
// non-interactive (opacity reduced, pointerEvents 'none'). Caregiver
// confirms the disable visibly and closes via Done when ready;
// instant-collapse would erase context of what just happened.
//
// CONTRACT (pinned here, consumed by every F5.x editor adoption):
//
//   1. LABEL renders with the "Turn off {category}" copy passed via
//      the `label` prop.
//   2. SWITCH reflects the `enabled` prop (visible value = true →
//      switch on, false → off). The Switch is ALWAYS visible —
//      after a flip OFF, the caregiver needs the Switch in reach
//      to re-enable.
//   3. SWITCH onChange fires the `onToggle` callback with the
//      caregiver's new value.
//   4. BODY slot renders below the row.
//   5. ENABLED → BODY ACTIVE — when enabled=true, the body
//      container has opacity 1 and pointerEvents 'auto'.
//   6. DISABLED → BODY DIMMED + NON-INTERACTIVE — when
//      enabled=false, the body container has reduced opacity
//      (≤ 0.5) and pointerEvents 'none' (chips inside are visible
//      but non-tappable). Q-34.F5.1.B option (b) lock.
// ============================================================================

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      textPrimary: '#f4ddb8',
      textSecondary: '#c4c1b3',
      textTertiary: '#9e9885',
      accent: '#5fb88a',
      accentMuted: '#3a6850',
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
    Switch: make('Switch'),
    StyleSheet: { create: (s: any) => s, flatten: (s: any) => s },
    Platform: { OS: 'ios', select: (o: any) => o.ios || o.default },
  };
});

import React from 'react';
import { Text } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { EditorDisableRow } from '../../components/careplan/editor/EditorDisableRow';

const BodyChildren = () => <Text testID="body-content">body</Text>;

describe('Phase 34 F5.1 — EditorDisableRow primitive behavior pin', () => {
  it('contract 1 (LABEL): renders the supplied "Turn off {category}" copy', () => {
    const { getByTestId } = render(
      <EditorDisableRow label="Turn off Vitals" enabled={true} onToggle={() => {}}>
        <BodyChildren />
      </EditorDisableRow>,
    );
    const labelNode = getByTestId('editor-disable-row-label');
    expect(labelNode).toBeTruthy();
    expect(JSON.stringify(labelNode.props.children)).toContain('Turn off Vitals');
  });

  it('contract 2 (SWITCH REFLECTS ENABLED): the Switch value mirrors the enabled prop', () => {
    const { getByTestId, rerender } = render(
      <EditorDisableRow label="Turn off Vitals" enabled={true} onToggle={() => {}}>
        <BodyChildren />
      </EditorDisableRow>,
    );
    let sw = getByTestId('editor-disable-row-switch');
    expect(sw.props.value).toBe(true);

    rerender(
      <EditorDisableRow label="Turn off Vitals" enabled={false} onToggle={() => {}}>
        <BodyChildren />
      </EditorDisableRow>,
    );
    sw = getByTestId('editor-disable-row-switch');
    expect(sw.props.value).toBe(false);
  });

  it('contract 3 (SWITCH ONCHANGE): tapping the Switch fires onToggle with the new value', () => {
    const onToggle = jest.fn();
    const { getByTestId } = render(
      <EditorDisableRow label="Turn off Vitals" enabled={true} onToggle={onToggle}>
        <BodyChildren />
      </EditorDisableRow>,
    );
    const sw = getByTestId('editor-disable-row-switch');
    // RN Switch fires onValueChange — invoke it directly with the
    // simulated new value.
    sw.props.onValueChange(false);
    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(onToggle).toHaveBeenCalledWith(false);
  });

  it('contract 4 (BODY SLOT): children render below the row', () => {
    const { getByTestId } = render(
      <EditorDisableRow label="Turn off Vitals" enabled={true} onToggle={() => {}}>
        <BodyChildren />
      </EditorDisableRow>,
    );
    expect(getByTestId('body-content')).toBeTruthy();
  });

  it('contract 5 (ENABLED → BODY ACTIVE): when enabled=true, the body container has opacity 1 and pointerEvents "auto"', () => {
    const { getByTestId } = render(
      <EditorDisableRow label="Turn off Vitals" enabled={true} onToggle={() => {}}>
        <BodyChildren />
      </EditorDisableRow>,
    );
    const bodyContainer = getByTestId('editor-disable-row-body');
    const flat = Array.isArray(bodyContainer.props.style)
      ? Object.assign({}, ...bodyContainer.props.style)
      : bodyContainer.props.style;
    expect(flat.opacity).toBe(1);
    expect(bodyContainer.props.pointerEvents).toBe('auto');
  });

  it('contract 6 (DISABLED → BODY DIMMED + NON-INTERACTIVE): when enabled=false, the body container has opacity ≤ 0.5 AND pointerEvents "none" (Q-34.F5.1.B option (b) lock)', () => {
    // The load-bearing UX call. Confirms the drawer stays open with
    // a visibly disabled body — caregiver sees what they just turned
    // off; can re-enable via the same Switch without backing out.
    // Instant-collapse (option a) was rejected because it erases
    // context of what just happened.
    const { getByTestId } = render(
      <EditorDisableRow label="Turn off Vitals" enabled={false} onToggle={() => {}}>
        <BodyChildren />
      </EditorDisableRow>,
    );
    const bodyContainer = getByTestId('editor-disable-row-body');
    const flat = Array.isArray(bodyContainer.props.style)
      ? Object.assign({}, ...bodyContainer.props.style)
      : bodyContainer.props.style;
    expect(flat.opacity).toBeLessThanOrEqual(0.5);
    expect(bodyContainer.props.pointerEvents).toBe('none');
    // Body content is still mounted — caregiver sees what they
    // disabled, doesn't lose context.
    expect(getByTestId('body-content')).toBeTruthy();
  });
});
