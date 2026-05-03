// ============================================================================
// LogScreen — Phase 9.1 layout primitive contract.
//
// Pins the rhythm + CTA hierarchy contract every app/log-*.tsx sub-page
// will inherit:
//   1. Header row contains exactly one BackButton, a title, and an
//      optional subtitle (the count line) on a single row.
//   2. Primary CTA is a filled sage button — backgroundColor c.accent
//      (#5fb88a), text color #0a1510. The canonical save affordance.
//   3. Cancel renders as a ghost text link — color c.textSecondary, no
//      backgroundColor, no borderColor. Tap area cleared by hitSlop.
//   4. No element uses an off-budget color (orange family, electric red,
//      etc.) per Phase 7 3-accent budget (sage / lavender / criticalAlert).
// ============================================================================

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

// Theme + react-native primitives stubbed at module-level so the
// LogScreen renders into a synchronous tree we can introspect.
const themeColors = {
  background: '#1f201c',
  glass: '#363830',
  glassBorder: 'rgba(255, 240, 215, 0.08)',
  glassHover: 'rgba(255, 245, 220, 0.06)',
  accent: '#5fb88a',
  caregiverAccent: '#aa8adc',
  criticalAlert: '#e6776e',
  textPrimary: '#fff',
  textSecondary: '#c4c1b3',
  textTertiary: '#8a8a82',
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
    ScrollView: PT('ScrollView'),
    StyleSheet: { create: (s: any) => s, flatten: (s: any) => s },
  };
});

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children, style }: any) =>
    require('react').createElement('SafeAreaView', { style }, children),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), canGoBack: () => true }),
  usePathname: () => '/log-x',
}));

jest.mock('../../../lib/navigate', () => ({
  navigateReplace: jest.fn(),
}));

import { LogScreen } from '../../../components/logging/LogScreen';

// Use the test renderer's built-in `.findAll(predicate)` on the root
// TestInstance — that walks the actual rendered tree (props + children
// already resolved). A hand-rolled walk over `props.children` misses
// nested arrays and forwarded refs.
function findAll(root: TestRenderer.ReactTestInstance, predicate: (n: TestRenderer.ReactTestInstance) => boolean): TestRenderer.ReactTestInstance[] {
  return root.findAll((n: any) => {
    try {
      return predicate(n);
    } catch {
      return false;
    }
  });
}

function styleOf(node: TestRenderer.ReactTestInstance): Record<string, any> {
  const s = (node.props as any)?.style;
  const arr = Array.isArray(s) ? s : [s];
  return Object.assign({}, ...arr.filter(Boolean));
}

function renderLogScreen(extra: Partial<React.ComponentProps<typeof LogScreen>> = {}) {
  const defaults = {
    title: 'Log meal',
    onBack: jest.fn(),
    primaryAction: { label: 'Save', onPress: jest.fn() },
    children: React.createElement('Text', { testID: 'child' }, 'child content'),
  };
  let root: TestRenderer.ReactTestRenderer | null = null;
  act(() => {
    root = TestRenderer.create(React.createElement(LogScreen as any, { ...defaults, ...extra }));
  });
  return root!;
}

describe('Phase 9.1 — LogScreen layout primitive', () => {
  describe('header row', () => {
    it('renders the title in a Text node next to the back button', () => {
      const tree = renderLogScreen({ title: 'Log meal' });
      const titleNode = findAll(tree.root, (n) => n.props?.testID === 'log-screen-title')[0];
      expect(titleNode).toBeDefined();
      const text = titleNode.props.children;
      expect(text).toBe('Log meal');
    });

    it('renders the optional countSubtitle directly below the title', () => {
      const tree = renderLogScreen({ countSubtitle: '0 of 3 today' });
      const sub = findAll(tree.root, (n) => n.props?.testID === 'log-screen-subtitle')[0];
      expect(sub).toBeDefined();
      expect(sub.props.children).toBe('0 of 3 today');
    });

    it('omits the subtitle node when countSubtitle is not provided', () => {
      const tree = renderLogScreen();
      const sub = findAll(tree.root, (n) => n.props?.testID === 'log-screen-subtitle');
      expect(sub.length).toBe(0);
    });

    it('header has exactly one BackButton (TouchableOpacity with go-back a11y)', () => {
      const tree = renderLogScreen();
      const back = findAll(
        tree.root,
        (n) =>
          n.type === 'TouchableOpacity' &&
          /go back|back/i.test(n.props?.accessibilityLabel || ''),
      );
      expect(back.length).toBe(1);
    });
  });

  describe('primary CTA', () => {
    it('is a filled sage button (backgroundColor c.accent #5fb88a)', () => {
      const tree = renderLogScreen({
        primaryAction: { label: 'Save reading', onPress: jest.fn() },
      });
      const cta = findAll(
        tree.root,
        (n) => n.props?.testID === 'log-screen-primary-cta',
      )[0];
      expect(cta).toBeDefined();
      expect(styleOf(cta).backgroundColor).toBe('#5fb88a');
    });

    it('text is dark (#0a1510) for high contrast on sage', () => {
      const tree = renderLogScreen();
      const ctaText = findAll(
        tree.root,
        (n) => n.props?.testID === 'log-screen-primary-cta-text',
      )[0];
      expect(ctaText).toBeDefined();
      expect(styleOf(ctaText).color).toBe('#0a1510');
    });

    it('label is rendered as the primaryAction.label prop', () => {
      const tree = renderLogScreen({
        primaryAction: { label: 'Save check-in', onPress: jest.fn() },
      });
      const ctaText = findAll(
        tree.root,
        (n) => n.props?.testID === 'log-screen-primary-cta-text',
      )[0];
      expect(ctaText.props.children).toBe('Save check-in');
    });

    it('disabled state lowers opacity and disables the touchable', () => {
      const onPress = jest.fn();
      const tree = renderLogScreen({
        primaryAction: { label: 'Save', onPress, disabled: true },
      });
      const cta = findAll(
        tree.root,
        (n) => n.props?.testID === 'log-screen-primary-cta',
      )[0];
      expect(cta.props.disabled).toBe(true);
      expect(styleOf(cta).opacity).toBe(0.5);
    });
  });

  describe('cancel link', () => {
    it('renders by default as a ghost text link in c.textSecondary', () => {
      const tree = renderLogScreen();
      const cancelText = findAll(
        tree.root,
        (n) => n.props?.testID === 'log-screen-cancel-text',
      )[0];
      expect(cancelText).toBeDefined();
      expect(styleOf(cancelText).color).toBe(themeColors.textSecondary);
    });

    it('cancel container has NO backgroundColor and NO borderColor', () => {
      const tree = renderLogScreen();
      const cancel = findAll(
        tree.root,
        (n) => n.props?.testID === 'log-screen-cancel',
      )[0];
      const s = styleOf(cancel);
      expect(s.backgroundColor).toBeUndefined();
      expect(s.borderColor).toBeUndefined();
      expect(s.borderWidth).toBeUndefined();
    });

    it('cancel carries hitSlop for tap-target sizing', () => {
      const tree = renderLogScreen();
      const cancel = findAll(
        tree.root,
        (n) => n.props?.testID === 'log-screen-cancel',
      )[0];
      expect(cancel.props.hitSlop).toBeDefined();
    });

    it('falls back to onBack when onCancel is not provided', () => {
      const onBack = jest.fn();
      const tree = renderLogScreen({ onBack });
      const cancel = findAll(
        tree.root,
        (n) => n.props?.testID === 'log-screen-cancel',
      )[0];
      cancel.props.onPress();
      expect(onBack).toHaveBeenCalledTimes(1);
    });

    it('uses onCancel when provided', () => {
      const onCancel = jest.fn();
      const onBack = jest.fn();
      const tree = renderLogScreen({ onBack, onCancel });
      const cancel = findAll(
        tree.root,
        (n) => n.props?.testID === 'log-screen-cancel',
      )[0];
      cancel.props.onPress();
      expect(onCancel).toHaveBeenCalledTimes(1);
      expect(onBack).not.toHaveBeenCalled();
    });

    it('omits the cancel link when showCancel={false}', () => {
      const tree = renderLogScreen({ showCancel: false });
      const cancel = findAll(
        tree.root,
        (n) => n.props?.testID === 'log-screen-cancel',
      );
      expect(cancel.length).toBe(0);
    });
  });

  describe('children slot', () => {
    it('renders children inside the scrollable input zone', () => {
      const child = React.createElement('Text', { testID: 'child-payload' }, 'hello');
      const tree = renderLogScreen({ children: child });
      const found = findAll(tree.root, (n) => n.props?.testID === 'child-payload');
      expect(found.length).toBe(1);
    });
  });

  describe('palette compliance', () => {
    it('no element uses orange-family hex anywhere in the tree', () => {
      const tree = renderLogScreen();
      const ORANGE_RE = /#FF8C42|#F97316|#EA580C|#FB7185|#FFA500/i;
      const all = findAll(tree.root, () => true);
      for (const node of all) {
        const s = styleOf(node);
        for (const v of Object.values(s)) {
          if (typeof v === 'string') {
            expect(v).not.toMatch(ORANGE_RE);
          }
        }
      }
    });

    it('no element uses an off-budget electric red (#f87171, #ef4444)', () => {
      const tree = renderLogScreen();
      const ELECTRIC_RED_RE = /#f87171|#ef4444|#dc2626/i;
      const all = findAll(tree.root, () => true);
      for (const node of all) {
        const s = styleOf(node);
        for (const v of Object.values(s)) {
          if (typeof v === 'string') {
            expect(v).not.toMatch(ELECTRIC_RED_RE);
          }
        }
      }
    });
  });
});
