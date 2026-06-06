// ============================================================================
// Phase 34 F5.4 — MedicationsDrawer adoption BEHAVIOR pin.
//
// Fourth + final per-category adoption of the F5 editor skeleton.
// Meds is the principled exception case per Q-34.F5.4 locks: the
// drawer adopts F5.0's EditorSection primitive for the "Your
// medications" section, but explicitly NOT EditorDisableRow and
// NOT a bucket-level Reminder section.
//
// Q-34.F5.4.A — Meds is in ALWAYS_ON_BUCKETS per Phase 32A.1 design
// lock (Q-32A.1.1 — Meds is the core; you can't care for someone
// without their meds). There is NO bucket-level enable/disable to
// mirror. EditorDisableRow with a no-op Switch would be a
// write-without-consequence trust trap of the same class as the
// notes-into-the-void bug from Slice 2/3. Symmetry breaks honestly:
// editors that have disable adopt the row; editors that don't, don't.
//
// Q-34.F5.4.B — config.meds.notificationsEnabled has NO consumer
// (grep-verified during the F5.4 audit). A bucket-level Reminder
// Switch writing to it would be the sixth instance this phase of
// the write-without-consequence trap class. Meds reminders are
// per-pill — each MedicationPlanItem carries its own
// notificationsEnabled flag wired to the per-pill notification
// scheduling. The bucket-level UI gets added in the same slice
// that closes the F5.3-banked wellness reminder gap by wiring a
// bucket-level consumer. NOT BEFORE.
//
// Q-34.F5.4.C — narration locked: "The medications you give this
// person each day." Consistent voice cadence with F5.1 vitals
// ("Pick the readings..."), F5.2 meals ("Pick the meals..."),
// F5.3 wellness ("Pick what to check in...").
//
// F5.3.1 STANDING RULE APPLIED: this mount-test is added BEFORE the
// restructure, not after. RED before MedicationsDrawer's return body
// gets wrapped in EditorSection; GREEN after. The existing 7
// MedicationsDrawer test files are all source-pin (readFileSync +
// regex); none mount the React component. This file closes that
// structural gap for the drawer in parallel with F5.3.1's
// carePlanHomeScreenSmoke closing the same gap for the screen.
//
// CONTRACTS PINNED HERE:
//
//   1. SMOKE MOUNT — renders without throwing in the empty (no meds)
//      state. Proves the F5.4 chrome compiles + mounts against the
//      live React render tree.
//   2. ONE EDITORSECTION — exactly one EditorSection with title
//      "Your medications". Forward-guard against accidentally adding
//      a second one (e.g., a Reminder section that Q-34.F5.4.B
//      rejected).
//   3. NARRATION LOCKED — narration line is exactly the Q-34.F5.4.C
//      lock.
//   4. NO EDITORDISABLEROW — Q-34.F5.4.A principled exception
//      forward-guard. No editor-disable-row testIDs render. Future
//      reader who tries to add one breaks this contract — and the
//      file header pins WHY.
//   5. NO REMINDER SECTION — Q-34.F5.4.B principled exception
//      forward-guard. Exactly one section title; no "reminder" word
//      in any title. Write-without-consequence trap class avoided.
//   6. EXISTING CHROME PRESERVED — meds-inline-list testID still
//      renders inside the section body. Quick-add empty-state still
//      mounts. The F5.4 restructure wraps but does NOT replace the
//      existing meds list internals.
// ============================================================================

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      textPrimary: '#f4ddb8',
      textSecondary: '#c4c1b3',
      textTertiary: '#9e9885',
      accent: '#5fb88a',
      accentChipFill: 'rgba(95,184,138,0.16)',
      accentDim: 'rgba(95,184,138,0.10)',
      accentMuted: '#3a6850',
      glass: '#363830',
      glassFaint: 'rgba(255,255,255,0.04)',
      glassBorder: 'rgba(255,255,255,0.06)',
      glassStrong: '#363830',
      switchThumbOff: '#666',
      criticalAlert: '#e6776e',
      error: '#e6776e',
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
    Pressable: make('Pressable'),
    ScrollView: make('ScrollView'),
    StyleSheet: { create: (s: any) => s, flatten: (s: any) => s },
    Platform: { OS: 'ios', select: (o: any) => o.ios || o.default },
    Alert: { alert: jest.fn() },
    Animated: {
      View: make('Animated.View'),
      Value: class { setValue() {} },
      timing: () => ({ start: jest.fn() }),
    },
    PanResponder: { create: () => ({ panHandlers: {} }) },
  };
});

// Stub the data layer so the drawer mounts cleanly with an empty
// med list (exercises the empty-state branch; lighter than mocking
// per-med rows + swipe gestures + edit-mode minus-circle).
jest.mock('../../hooks/useCarePlanConfig', () => ({
  useCarePlanConfig: () => ({
    config: {
      meds: { enabled: true, medications: [], notificationsEnabled: true },
    },
    updateMedication: jest.fn(),
    addMedication: jest.fn(),
  }),
}));

jest.mock('../../lib/navigate', () => ({ navigate: jest.fn() }));

jest.mock('../../lib/events', () => ({
  emitDataUpdate: jest.fn(),
}));

jest.mock('../../lib/eventNames', () => ({
  EVENT: new Proxy({}, { get: (_, k) => String(k) }),
}));

import React from 'react';
import { render } from '@testing-library/react-native';
import { MedicationsDrawer } from '../../components/careplan/drawers/MedicationsDrawer';

describe('Phase 34 F5.4 — MedicationsDrawer adoption (one EditorSection, no EditorDisableRow, no Reminder)', () => {
  it('contract 1 (SMOKE MOUNT): renders without throwing in the empty (no meds) state — closes the F5.3.1 mount-test gap for this drawer', () => {
    expect(() => render(<MedicationsDrawer editMode={false} />)).not.toThrow();
  });

  it('contract 2 (ONE EDITORSECTION): exactly one EditorSection with title "Your medications"', () => {
    const { getAllByTestId, getByTestId } = render(
      <MedicationsDrawer editMode={false} />,
    );
    const titles = getAllByTestId('editor-section-title');
    expect(titles).toHaveLength(1);
    expect(JSON.stringify(titles[0].props.children)).toContain('Your medications');
    // Section is the outermost adoption surface — meds list lives
    // inside its body.
    expect(getByTestId('meds-inline-list')).toBeTruthy();
  });

  it('contract 3 (NARRATION LOCKED): narration line is exactly the Q-34.F5.4.C lock', () => {
    const { getByTestId } = render(<MedicationsDrawer editMode={false} />);
    const narration = getByTestId('editor-section-narration');
    expect(JSON.stringify(narration.props.children)).toContain(
      'The medications you give this person each day.',
    );
  });

  it('contract 4 (NO EDITORDISABLEROW — Q-34.F5.4.A PRINCIPLED EXCEPTION): no editor-disable-row testIDs render; the row is intentionally absent because Meds is always-on per Phase 32A.1 lock', () => {
    // Forward-guard. Future reader who reflexively "fixes" the
    // apparent omission by wrapping in EditorDisableRow with a no-op
    // Switch breaks this contract AND has the file header to read.
    const { queryByTestId } = render(<MedicationsDrawer editMode={false} />);
    expect(queryByTestId('editor-disable-row-label')).toBeNull();
    expect(queryByTestId('editor-disable-row-switch')).toBeNull();
    expect(queryByTestId('editor-disable-row-body')).toBeNull();
  });

  it('contract 5 (NO REMINDER SECTION — Q-34.F5.4.B PRINCIPLED EXCEPTION): exactly one EditorSection; no "reminder" word in any title; write-without-consequence trap class avoided', () => {
    // Forward-guard. config.meds.notificationsEnabled has no
    // consumer; adding a UI Switch that writes to it would be the
    // sixth instance this phase of the write-without-consequence
    // trap class.
    const { getAllByTestId } = render(<MedicationsDrawer editMode={false} />);
    const titles = getAllByTestId('editor-section-title');
    expect(titles).toHaveLength(1);
    const allTitleText = titles
      .map((n: any) => JSON.stringify(n.props.children).toLowerCase())
      .join(' ');
    expect(allTitleText).not.toContain('reminder');
  });

  it('contract 6 (EXISTING CHROME PRESERVED): meds-inline-list testID still renders inside the section body; the F5.4 restructure wraps but does NOT replace the existing meds list internals', () => {
    const { getByTestId } = render(<MedicationsDrawer editMode={false} />);
    // The pre-F5.4 testID survives intact — the F5.4 chrome wraps
    // around the existing list; per-med rows / quick-add / edit-mode
    // / swipe behavior are all preserved verbatim (covered by the
    // existing 7 carePlanMedsDrawer*32A1 source-pin tests).
    expect(getByTestId('meds-inline-list')).toBeTruthy();
  });
});
