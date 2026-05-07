/**
 * Prop-contract sampler — proves the pattern for verifying that components
 * with declared Props interfaces render with their minimal required props.
 *
 * This file covers a sampling (4 components) to demonstrate the pattern.
 * The full crawl (108 components with Props) is intentionally NOT done here
 * because most are already covered by their feature tests, and a blanket
 * pass-on-render assertion adds noise more than signal.
 *
 * If you want full coverage, ask and I'll script the rest using this pattern.
 */

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
    ActivityIndicator: make('ActivityIndicator'),
    StyleSheet: { create: (s: any) => s, flatten: (s: any) => s },
    Platform: { OS: 'ios', select: (o: any) => o.ios || o.default },
  };
});

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      accent: '#aa8adc',
      background: '#000',
      backgroundSecondary: '#111',
      surface: '#222',
      surfaceElevated: '#222',
      textPrimary: '#fff',
      textSecondary: '#aaa',
      textMuted: '#888',
      textOnAccent: '#000',
      border: '#333',
      separator: '#222',
      error: '#ff5555',
      success: '#5fb88a',
      warning: '#e5b04a',
      caregiverAccent: '#aa8adc',
      caregiverAccentBg: 'rgba(139,92,246,0.06)',
      caregiverAccentStrong: 'rgba(139,92,246,0.25)',
      caregiverAccentText: '#d4baff',
    },
  }),
}));

jest.mock('../../theme/theme-tokens', () => ({
  Colors: {} as any,
  Spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 },
  BorderRadius: { sm: 4, md: 8, lg: 12, xl: 16, full: 9999 },
}));

// react-native-svg is needed for CareCircleIcon
jest.mock('react-native-svg', () => {
  const React = require('react');
  const make = (name: string) => (props: any) =>
    React.createElement(name, props, props.children);
  return {
    __esModule: true,
    default: make('Svg'),
    Svg: make('Svg'),
    Defs: make('Defs'),
    LinearGradient: make('LinearGradient'),
    RadialGradient: make('RadialGradient'),
    Stop: make('Stop'),
    Circle: make('Circle'),
    Path: make('Path'),
    Rect: make('Rect'),
    G: make('G'),
  };
});

jest.mock('expo-router', () => ({
  useRouter: () => ({
    back: jest.fn(),
    push: jest.fn(),
    replace: jest.fn(),
    canGoBack: () => true,
  }),
  usePathname: () => '/some-route',
}));

jest.mock('../../lib/navigate', () => ({
  navigate: jest.fn(),
  navigateReplace: jest.fn(),
}));

import React from 'react';
import { render } from '@testing-library/react-native';

import { Button } from '../../components/common/Button';
import { BackButton } from '../../components/common/BackButton';
import { BriefTimestamp } from '../../components/journal/BriefTimestamp';
import { CareCircleIcon } from '../../components/CareCircleIcon';

describe('Prop-contract sampler', () => {
  describe('Button', () => {
    it('renders with the minimum required props (title, onPress)', () => {
      const { getByText } = render(<Button title="Save" onPress={() => {}} />);
      expect(getByText('Save')).toBeTruthy();
    });

    it('renders an accessibilityLabel that defaults to the title', () => {
      const { getByLabelText } = render(<Button title="Continue" onPress={() => {}} />);
      // Button forwards title as accessibilityLabel by default; if not, the
      // visible text is itself the accessible name.
      const node = getByLabelText('Continue');
      expect(node).toBeTruthy();
    });

    it('shows a spinner instead of the title when loading', () => {
      const { queryByText, UNSAFE_getByType } = render(
        <Button title="Save" onPress={() => {}} loading />,
      );
      expect(queryByText('Save')).toBeNull();
      // ActivityIndicator must be present
      expect(UNSAFE_getByType('ActivityIndicator' as any)).toBeTruthy();
    });
  });

  describe('BackButton', () => {
    it('renders with no props (all are optional with defaults)', () => {
      const { getByLabelText } = render(<BackButton />);
      // Default a11y label is "Go back" for icon variant
      expect(getByLabelText('Go back')).toBeTruthy();
    });

    it('renders with text variant and shows "← Back" label', () => {
      const { getByText, getByLabelText } = render(<BackButton variant="text" />);
      expect(getByText('← Back')).toBeTruthy();
      expect(getByLabelText('Back')).toBeTruthy();
    });

    it('honors a custom accessibilityLabel', () => {
      const { getByLabelText } = render(<BackButton accessibilityLabel="Return to home" />);
      expect(getByLabelText('Return to home')).toBeTruthy();
    });
  });

  describe('BriefTimestamp', () => {
    it('renders the formatted date and time for a given Date', () => {
      const date = new Date('2026-04-25T14:30:00');
      const { getByText } = render(<BriefTimestamp generatedAt={date} />);
      // Format: "Generated Saturday, Apr 25 at 2:30 PM"
      const node = getByText(/Generated/);
      expect(node).toBeTruthy();
      const text: string = node.props.children.join
        ? node.props.children.join('')
        : String(node.props.children);
      expect(text).toContain('Apr 25');
      expect(text).toContain('2:30');
    });
  });

  describe('CareCircleIcon', () => {
    it('renders with no props (uses default size)', () => {
      const { UNSAFE_getByType } = render(<CareCircleIcon />);
      const svg = UNSAFE_getByType('Svg' as any);
      expect(svg.props.width).toBe(120);
      expect(svg.props.height).toBe(120);
    });

    it('honors the size prop', () => {
      const { UNSAFE_getByType } = render(<CareCircleIcon size={48} />);
      const svg = UNSAFE_getByType('Svg' as any);
      expect(svg.props.width).toBe(48);
      expect(svg.props.height).toBe(48);
    });
  });
});
