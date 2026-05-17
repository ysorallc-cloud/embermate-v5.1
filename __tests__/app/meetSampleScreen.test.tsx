// ============================================================================
// MeetSampleScreen — v6.7 story moment introducing the sample patient.
// Covers per-careMode rendering: caregiver shows the "Meet Dad" intro with
// avatar + meta line; self mode swaps to the generic "week looks like"
// narrative without the avatar.
// ============================================================================

jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  StyleSheet: { create: (s: any) => s },
  Dimensions: { get: () => ({ width: 375, height: 812 }) },
}));

jest.mock('react-native-reanimated', () => {
  const actualReact = jest.requireActual('react');
  const PassThrough = (props: any) => actualReact.createElement('Animated', props, props.children);
  return {
    __esModule: true,
    default: { View: PassThrough, Text: PassThrough, createAnimatedComponent: () => PassThrough },
    FadeInDown: { delay: () => ({ duration: () => ({}) }) },
  };
});

jest.mock('../../app/(onboarding)/components/AuroraBackground', () => ({
  AuroraBackground: 'AuroraBackground',
}));

jest.mock('react', () => {
  const actualReact = jest.requireActual('react');
  return {
    ...actualReact,
    useMemo: (fn: () => any) => fn(),
  };
});

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      background: '#0a0c0a',
      glass: '#363830',
      glassBorder: 'rgba(255,255,255,0.08)',
      accent: '#5fb88a',
      warning: '#e5b04a',
      error: '#e6776e',
      coral: '#e6776e',
      caregiverAccent: '#aa8adc',
      textPrimary: '#FFFFFF',
      textSecondary: 'rgba(255,255,255,0.72)',
      textTertiary: 'rgba(255,255,255,0.50)',
    },
  }),
}));

import React from 'react';
import { MeetSampleScreen } from '../../app/(onboarding)/screens/MeetSampleScreen';

function findAll(node: any, predicate: (el: any) => boolean, out: any[] = []): any[] {
  if (node == null || node === false) return out;
  if (Array.isArray(node)) {
    for (const c of node) findAll(c, predicate, out);
    return out;
  }
  if (typeof node !== 'object') return out;
  if (node.type !== undefined && predicate(node)) out.push(node);
  if (node.props && node.props.children !== undefined) {
    findAll(node.props.children, predicate, out);
  }
  return out;
}

function flattenText(children: any): string {
  if (children == null || children === false) return '';
  if (typeof children === 'string' || typeof children === 'number') return String(children);
  if (Array.isArray(children)) return children.map(flattenText).join('');
  if (typeof children === 'object' && children.props) return flattenText(children.props.children);
  return '';
}

describe('MeetSampleScreen — caregiver mode', () => {
  const tree: any = (MeetSampleScreen as any)({ careMode: 'caregiver' });
  const text = flattenText(tree);

  it('renders the "Meet Dad." title', () => {
    expect(text).toContain('Meet Dad.');
  });

  it('renders the avatar with the patient initial "D"', () => {
    // The avatar is a 64pt circle View with a Text "D" inside.
    expect(text).toContain('D');
    // Accessibility: "Dad, 72, sample patient"
    const labeled = findAll(tree, (el) => el.props && el.props.accessibilityLabel === 'Dad, 72, sample patient');
    expect(labeled.length).toBeGreaterThan(0);
  });

  it('renders the meta line "72 · takes meds for blood pressure"', () => {
    expect(text).toContain('72');
    expect(text).toContain('takes meds for blood pressure');
  });

  it('renders the caregiver body paragraph', () => {
    expect(text).toContain('Sometimes he forgets a dose');
    expect(text).toContain('bring real data to his next visit');
  });

  it('week preview eyebrow reads "A WEEK WITH DAD"', () => {
    expect(text).toContain('A WEEK WITH DAD');
  });

  it('insight callout body matches the caregiver narrative', () => {
    expect(text).toContain("Thursday's morning dose was missed");
    expect(text).toContain('BP ran high Tuesday');
  });

  it('week preview accessibilityLabel summarizes the data', () => {
    const labeled = findAll(tree, (el) => el.props && /Sample week:/.test(el.props.accessibilityLabel || ''));
    expect(labeled.length).toBeGreaterThan(0);
    expect(labeled[0].props.accessibilityLabel).toContain('5 on-track days');
    expect(labeled[0].props.accessibilityLabel).toContain('1 elevated reading');
    expect(labeled[0].props.accessibilityLabel).toContain('1 missed dose');
  });
});

describe('MeetSampleScreen — self mode', () => {
  const tree: any = (MeetSampleScreen as any)({ careMode: 'self' });
  const text = flattenText(tree);

  it("renders the \"Here's what a week looks like.\" title", () => {
    expect(text).toContain("Here's what a week looks like.");
  });

  it('does NOT render the caregiver avatar (no "Dad" initial)', () => {
    // The avatar accessibility label is the canonical signal.
    const labeled = findAll(tree, (el) => el.props && el.props.accessibilityLabel === 'Dad, 72, sample patient');
    expect(labeled.length).toBe(0);
  });

  it('does NOT render the caregiver meta line', () => {
    expect(text).not.toContain('takes meds for blood pressure');
  });

  it('renders the self-narrative body paragraph', () => {
    expect(text).toContain('Track yourself for a week');
    expect(text).toContain("worth bringing up with your doctor");
  });

  it('week preview eyebrow reads "YOUR WEEK"', () => {
    expect(text).toContain('YOUR WEEK');
  });

  it('insight callout body matches the self narrative', () => {
    expect(text).toContain('Sleep was rough Thursday');
    expect(text).toContain('energy crashed at 3pm');
  });
});

describe('MeetSampleScreen — week strip dot colors', () => {
  const tree: any = (MeetSampleScreen as any)({ careMode: 'caregiver' });

  it('renders 7 day labels (M T W T F S S)', () => {
    const text = flattenText(tree);
    // Week labels appear in order; each letter shows up at least once.
    for (const c of ['M', 'T', 'W', 'F', 'S']) {
      expect(text).toContain(c);
    }
  });

  it('Tuesday dot uses warning (amber) color', () => {
    // Tuesday is index 1 in the strip. Dot accessibility label or testID
    // exposes the day; the style references the warning token.
    const tuesdayDot = findAll(tree, (el) => el.props && el.props.testID === 'meet-week-dot-tue');
    expect(tuesdayDot.length).toBe(1);
    const style = JSON.stringify(tuesdayDot[0].props.style);
    expect(style).toMatch(/#e5b04a|warning/i);
  });

  it('Thursday dot uses red (error/criticalAlert) color', () => {
    const thursdayDot = findAll(tree, (el) => el.props && el.props.testID === 'meet-week-dot-thu');
    expect(thursdayDot.length).toBe(1);
    const style = JSON.stringify(thursdayDot[0].props.style);
    expect(style).toMatch(/#e6776e|error|red|critical/i);
  });

  it('the other five days use accent (mint) color', () => {
    for (const day of ['mon', 'wed', 'fri', 'sat', 'sun']) {
      const dot = findAll(tree, (el) => el.props && el.props.testID === `meet-week-dot-${day}`);
      expect(dot.length).toBe(1);
      const style = JSON.stringify(dot[0].props.style);
      expect(style).toMatch(/#5fb88a|accent/i);
    }
  });
});

describe('MeetSampleScreen — insight callout structural contract', () => {
  const tree: any = (MeetSampleScreen as any)({ careMode: 'caregiver' });

  it('renders a "PATTERN" eyebrow above the insight body', () => {
    expect(flattenText(tree)).toContain('PATTERN');
  });
});
