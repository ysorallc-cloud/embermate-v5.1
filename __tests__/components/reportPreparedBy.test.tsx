// ============================================================================
// ReportPreparedBy — the "Prepared by {caregiverName}" line surfaced in the
// care report (now-rebuild report-completeness card).
//
// The care report loaded the caregiver name but never displayed it. This
// small presentational line surfaces who prepared the report. Behavior:
//   • populated name → renders "Prepared by {name}"
//   • missing/blank  → renders nothing (hidden; the report falls back
//     cleanly — no blank "Prepared by" / "Prepared by undefined")
// ============================================================================

jest.mock('react-native', () => {
  const React = require('react');
  const make = (name: string) =>
    React.forwardRef((props: any, ref: any) =>
      React.createElement(name, { ...props, ref }, props.children),
    );
  return {
    View: make('View'),
    Text: make('Text'),
    StyleSheet: { create: (s: any) => s, flatten: (s: any) => s },
  };
});

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({ colors: new Proxy({}, { get: () => '#000' }) }),
}));

import React from 'react';
import { render } from '@testing-library/react-native';
import { ReportPreparedBy } from '../../components/reports/ReportPreparedBy';

describe('ReportPreparedBy', () => {
  it('contract 1 (POPULATED): renders "Prepared by {name}" when a caregiver name is set', () => {
    const { getByText } = render(<ReportPreparedBy caregiverName="Amber" />);
    expect(getByText('Prepared by Amber')).toBeTruthy();
  });

  it('contract 2 (TRIMS): leading/trailing whitespace is trimmed', () => {
    const { getByText } = render(<ReportPreparedBy caregiverName="  Amber Cook  " />);
    expect(getByText('Prepared by Amber Cook')).toBeTruthy();
  });

  it('contract 3 (MISSING → HIDDEN): renders nothing for empty string', () => {
    const { queryByText } = render(<ReportPreparedBy caregiverName="" />);
    expect(queryByText(/Prepared by/)).toBeNull();
  });

  it('contract 4 (MISSING → HIDDEN): renders nothing for null/undefined (no "Prepared by undefined")', () => {
    const { queryByText: q1 } = render(<ReportPreparedBy caregiverName={null} />);
    expect(q1(/Prepared by/)).toBeNull();
    const { queryByText: q2 } = render(<ReportPreparedBy caregiverName={undefined} />);
    expect(q2(/Prepared by/)).toBeNull();
  });
});
