/**
 * ErrorBoundary — catches child render errors and prevents white-screening.
 *
 * Uses real React rendering via react-test-renderer (provided by RTL).
 * Mocks the theme + reportError so the boundary can render in isolation.
 *
 * Note: the global jest.setup.js mocks `react-native` with a tiny surface that
 * lacks View/Text/Touchable/ScrollView. We override that mock here with simple
 * forwarding host components so RTL can actually render and query the tree.
 */

jest.mock('react-native', () => {
  const React = require('react');
  // Each "component" is a simple wrapper that React renders as a host node.
  // Including the React Native-style props (accessibilityLabel, etc.) lets
  // RTL queries like getByLabelText work as expected.
  const make = (name: string) =>
    React.forwardRef((props: any, ref: any) =>
      React.createElement(name, { ...props, ref }, props.children),
    );
  return {
    View: make('View'),
    Text: make('Text'),
    ScrollView: make('ScrollView'),
    TouchableOpacity: make('TouchableOpacity'),
    Pressable: make('Pressable'),
    StyleSheet: {
      create: (styles: any) => styles,
      flatten: (style: any) => style,
    },
    Platform: { OS: 'ios', select: (obj: any) => obj.ios || obj.default },
    Alert: { alert: jest.fn() },
    Dimensions: { get: () => ({ width: 375, height: 812 }) },
  };
});

jest.mock('../../utils/errorReporting', () => ({
  reportError: jest.fn(),
}));

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      background: '#000',
      textPrimary: '#fff',
      textSecondary: '#aaa',
      textMuted: '#888',
      accent: '#aa8adc',
      surfaceElevated: '#222',
      error: '#ff5555',
    },
  }),
}));

// theme-tokens is imported only for its `Colors` type; provide a minimal stub.
jest.mock('../../theme/theme-tokens', () => ({ Colors: {} as any }));

import React from 'react';
import { Text, View } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import ErrorBoundary from '../../components/ErrorBoundary';
import { reportError } from '../../utils/errorReporting';

const mockReportError = reportError as jest.MockedFunction<typeof reportError>;

// Suppress React's componentDidCatch console.error noise — we expect the throw.
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: any[]) => {
    const first = String(args[0] ?? '');
    if (
      first.includes('The above error occurred') ||
      first.includes('Consider adding an error boundary') ||
      first.includes('boom')
    ) {
      return;
    }
    originalError(...args);
  };
});
afterAll(() => {
  console.error = originalError;
});

beforeEach(() => {
  mockReportError.mockClear();
});

function Boom(): JSX.Element {
  throw new Error('boom: test failure');
}

function Healthy(): JSX.Element {
  return (
    <View>
      <Text>healthy child</Text>
    </View>
  );
}

describe('ErrorBoundary', () => {
  it('renders children unchanged when no error is thrown', () => {
    const { getByText } = render(
      <ErrorBoundary>
        <Healthy />
      </ErrorBoundary>,
    );
    expect(getByText('healthy child')).toBeTruthy();
  });

  it('renders the default fallback UI when a child throws', () => {
    const { getByText } = render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    expect(getByText('Something went wrong')).toBeTruthy();
    expect(getByText('Try Again')).toBeTruthy();
  });

  it('calls reportError with the screenName when a child throws', () => {
    render(
      <ErrorBoundary screenName="now-tab">
        <Boom />
      </ErrorBoundary>,
    );
    expect(mockReportError).toHaveBeenCalled();
    const [errArg, ctxArg] = mockReportError.mock.calls[0];
    expect(errArg).toBeInstanceOf(Error);
    expect((errArg as Error).message).toContain('boom');
    expect(ctxArg).toMatchObject({ component: 'ErrorBoundary', screenName: 'now-tab' });
  });

  it('falls back to "unknown" screenName when none is provided', () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    expect(mockReportError).toHaveBeenCalled();
    const ctxArg = mockReportError.mock.calls[0][1];
    expect(ctxArg).toMatchObject({ screenName: 'unknown' });
  });

  it('renders a custom fallback when provided', () => {
    const fallback = (
      <View>
        <Text>custom fallback shown</Text>
      </View>
    );
    const { getByText, queryByText } = render(
      <ErrorBoundary fallback={fallback}>
        <Boom />
      </ErrorBoundary>,
    );
    expect(getByText('custom fallback shown')).toBeTruthy();
    // Default UI is NOT shown when custom fallback exists
    expect(queryByText('Something went wrong')).toBeNull();
  });

  it('"Try Again" tap resets boundary state (children re-render)', () => {
    // First render: throws → fallback shown
    let shouldThrow = true;
    function Toggleable() {
      if (shouldThrow) throw new Error('boom: toggleable');
      return <Text>recovered child</Text>;
    }

    const { getByText, queryByText, rerender } = render(
      <ErrorBoundary>
        <Toggleable />
      </ErrorBoundary>,
    );
    expect(getByText('Something went wrong')).toBeTruthy();

    // Flip the flag so the next render of Toggleable doesn't throw,
    // then trigger the retry.
    shouldThrow = false;
    fireEvent.press(getByText('Try Again'));

    // After retry, the boundary clears its error state and re-renders children.
    rerender(
      <ErrorBoundary>
        <Toggleable />
      </ErrorBoundary>,
    );
    expect(queryByText('Something went wrong')).toBeNull();
    expect(getByText('recovered child')).toBeTruthy();
  });

  it('default fallback Try Again button has accessibilityLabel + accessibilityRole', () => {
    const { getByLabelText } = render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    const btn = getByLabelText('Try again');
    expect(btn.props.accessibilityRole).toBe('button');
  });
});
