// ============================================================================
// Phase 15.7 — UpcomingAppointmentCard consolidation.
//
// Pre-15.7 the Now tab rendered TWO upcoming-appointment surfaces:
//   1. An inline block in now.tsx (state: upcomingPrepAppointment,
//      window: 14 days, route: /provider-prep, header: "Upcoming This
//      Week").
//   2. <UpcomingAppointmentCard /> (window: 7 days, route: /visit-prep,
//      eyebrow: "COMING UP").
//
// 15.7 consolidates onto the card. The window-alignment audit found
// three divergences — resolved as:
//   • Window: card lookahead bumped 7 → 14 (the more inclusive value;
//     deleting the inline block would otherwise silently shrink the
//     surface).
//   • Route: /visit-prep is canonical (matches insights + appointments
//     surfaces). /provider-prep retired here; care-report.tsx still
//     points there — filed for a separate audit.
//   • Eyebrow: "COMING UP" → dynamic "UPCOMING · N DAYS" (N derived
//     from days-until-appointment). The SectionEyebrow component swap
//     is deferred to 15.12.
//
// Pinned contracts (the card surface):
//   1. UPCOMING_LOOKAHEAD_DAYS exported as 14.
//   2. An appointment within the new window (e.g. 12 days out) renders.
//   3. Eyebrow text matches /^UPCOMING · \d+ DAYS?$/ — the literal
//      "COMING UP" copy is gone.
//   4. N in the eyebrow is the dynamic days-until-appointment (not a
//      hardcoded value). Two fixtures at different distances produce
//      different N values.
//   5. The /visit-prep route is the navigation target on tap.
// ============================================================================

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

const themeColors = {
  background: '#1f201c',
  glass: '#363830',
  glassBorder: 'rgba(255, 240, 215, 0.08)',
  caregiverAccent: '#aa8adc',
  caregiverAccentBg: 'rgba(170, 138, 220, 0.08)',
  caregiverAccentStrong: 'rgba(170, 138, 220, 0.4)',
  textPrimary: '#fff',
  textSecondary: '#c4c1b3',
};

jest.mock('../../../contexts/ThemeContext', () => ({
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

const navigateMock = jest.fn();
jest.mock('../../../lib/navigate', () => ({
  navigate: (...args: any[]) => navigateMock(...args),
}));

const getUpcomingAppointmentsMock = jest.fn();
jest.mock('../../../utils/appointmentStorage', () => ({
  getUpcomingAppointments: (...args: any[]) => getUpcomingAppointmentsMock(...args),
}));

import {
  UpcomingAppointmentCard,
  UPCOMING_LOOKAHEAD_DAYS,
} from '../UpcomingAppointmentCard';

function daysFromNowISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function flattenText(node: any): string {
  if (node == null || node === false) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(flattenText).join(' ');
  if (typeof node === 'object') {
    if (node.children) return flattenText(node.children);
    if (node.props?.children !== undefined) return flattenText(node.props.children);
  }
  return '';
}

function findAll(
  root: TestRenderer.ReactTestInstance,
  predicate: (n: TestRenderer.ReactTestInstance) => boolean,
): TestRenderer.ReactTestInstance[] {
  return root.findAll((n: any) => {
    try { return predicate(n); } catch { return false; }
  });
}

async function renderWith(appts: any[]): Promise<TestRenderer.ReactTestRenderer> {
  getUpcomingAppointmentsMock.mockResolvedValueOnce(appts);
  let renderer: TestRenderer.ReactTestRenderer | null = null;
  await act(async () => {
    renderer = TestRenderer.create(React.createElement(UpcomingAppointmentCard));
  });
  return renderer!;
}

describe('Phase 15.7 — UpcomingAppointmentCard consolidation', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    getUpcomingAppointmentsMock.mockReset();
  });

  it('contract 1: UPCOMING_LOOKAHEAD_DAYS is 14 (was 7 pre-15.7)', () => {
    expect(UPCOMING_LOOKAHEAD_DAYS).toBe(14);
  });

  it('contract 2: an appointment 12 days out renders (was filtered out under the 7-day window)', async () => {
    const appt = {
      id: 'a-12d',
      provider: 'Dr. Lin',
      specialty: 'Cardiology',
      date: daysFromNowISO(12),
    };
    const tree = await renderWith([appt]);
    const text = flattenText(tree.toJSON());
    expect(text).toMatch(/Dr\. Lin/);
    expect(text).toMatch(/Cardiology/);
  });

  it('contract 3: eyebrow text matches /^UPCOMING · \\d+ DAYS?$/ — no "COMING UP"', async () => {
    const appt = {
      id: 'a-5d',
      provider: 'Dr. Patel',
      specialty: 'Primary Care',
      date: daysFromNowISO(5),
    };
    const tree = await renderWith([appt]);
    const text = flattenText(tree.toJSON());
    expect(text).not.toMatch(/COMING UP/);
    expect(text).toMatch(/UPCOMING\s+·\s+\d+\s+DAYS?/);
  });

  it('contract 4: N in the eyebrow is the dynamic days-until value', async () => {
    const treeA = await renderWith([{
      id: 'a-3d',
      provider: 'Dr. A',
      specialty: 'Spec A',
      date: daysFromNowISO(3),
    }]);
    const textA = flattenText(treeA.toJSON());
    const matchA = textA.match(/UPCOMING\s+·\s+(\d+)\s+DAYS?/);
    expect(matchA).not.toBeNull();
    const nA = Number(matchA![1]);
    expect(nA).toBeGreaterThanOrEqual(2);
    expect(nA).toBeLessThanOrEqual(4);

    const treeB = await renderWith([{
      id: 'a-11d',
      provider: 'Dr. B',
      specialty: 'Spec B',
      date: daysFromNowISO(11),
    }]);
    const textB = flattenText(treeB.toJSON());
    const matchB = textB.match(/UPCOMING\s+·\s+(\d+)\s+DAYS?/);
    expect(matchB).not.toBeNull();
    const nB = Number(matchB![1]);
    expect(nB).toBeGreaterThanOrEqual(10);
    expect(nB).toBeLessThanOrEqual(12);

    expect(nA).not.toBe(nB);
  });

  it('contract 5: tapping the prepare CTA routes to /visit-prep (not /provider-prep)', async () => {
    const appt = {
      id: 'appt-42',
      provider: 'Dr. C',
      specialty: 'Spec C',
      date: daysFromNowISO(6),
    };
    const tree = await renderWith([appt]);
    const link = findAll(tree.root, (n: any) =>
      typeof n.props?.accessibilityLabel === 'string' &&
      /Prepare visit prep/.test(n.props.accessibilityLabel),
    )[0];
    expect(link).toBeDefined();
    await act(async () => {
      link.props.onPress();
    });
    expect(navigateMock).toHaveBeenCalledTimes(1);
    const target = navigateMock.mock.calls[0][0] as string;
    expect(target).toMatch(/^\/visit-prep\?/);
    expect(target).toContain('apptId=appt-42');
    expect(target).not.toMatch(/provider-prep/);
  });
});
