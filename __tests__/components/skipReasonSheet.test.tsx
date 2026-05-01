// ============================================================================
// SkipReasonSheet — long-press menu for the trailing-edge checkbox.
// Options: refused / too soon / other / + Add details instead.
// ============================================================================

import React from 'react';

jest.mock('react', () => {
  const actual = jest.requireActual('react');
  return { ...actual, useMemo: (fn: any) => fn() };
});

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      glass: '#363830',
      glassBorder: 'rgba(255,255,255,0.07)',
      accent: '#5fb88a',
      textPrimary: '#fff',
      textSecondary: '#9aa0a6',
      textTertiary: '#6b7280',
      menuSurface: '#1a1f2b',
      overlay: 'rgba(0,0,0,0.6)',
    },
  }),
}));

jest.mock('react-native', () => {
  const PT = (n: string) => n;
  return {
    View: PT('View'),
    Text: PT('Text'),
    TouchableOpacity: PT('TouchableOpacity'),
    Modal: PT('Modal'),
    StyleSheet: { create: (s: any) => s, flatten: (s: any) => s },
  };
});

import { SkipReasonSheet } from '../../components/now/SkipReasonSheet';

function flattenChildren(kids: any): any[] {
  if (kids == null) return [];
  if (Array.isArray(kids)) {
    const out: any[] = [];
    for (const k of kids) out.push(...flattenChildren(k));
    return out;
  }
  return [kids];
}

function findAll(node: any, predicate: (n: any) => boolean): any[] {
  if (!node || typeof node !== 'object') return [];
  const out: any[] = [];
  if (predicate(node)) out.push(node);
  for (const k of flattenChildren(node.props?.children)) {
    out.push(...findAll(k, predicate));
  }
  return out;
}

function flattenText(children: any): string {
  if (children == null) return '';
  if (typeof children === 'string' || typeof children === 'number') return String(children);
  if (Array.isArray(children)) return children.map(flattenText).join('');
  if (children?.props?.children !== undefined) return flattenText(children.props.children);
  return '';
}

const baseProps = {
  visible: true,
  itemName: 'Acetaminophen',
  onSelectReason: jest.fn(),
  onAddDetails: jest.fn(),
  onClose: jest.fn(),
};

beforeEach(() => {
  baseProps.onSelectReason = jest.fn();
  baseProps.onAddDetails = jest.fn();
  baseProps.onClose = jest.fn();
});

describe('SkipReasonSheet — visibility + content', () => {
  it('renders nothing when not visible', () => {
    const tree = SkipReasonSheet({ ...baseProps, visible: false });
    if (tree) {
      const modal = findAll(tree, (n) => n.type === 'Modal')[0];
      if (modal) expect(modal.props.visible).toBe(false);
    }
  });

  it('shows the item name in the header', () => {
    const tree = SkipReasonSheet(baseProps);
    expect(flattenText(tree)).toContain('Acetaminophen');
  });

  it('renders all four options: Refused, Too soon, Other, + Add details instead', () => {
    const tree = SkipReasonSheet(baseProps);
    const text = flattenText(tree);
    expect(text).toContain('Refused');
    expect(text).toContain('Too soon');
    expect(text).toContain('Other');
    expect(text).toContain('Add details instead');
  });
});

describe('SkipReasonSheet — selection', () => {
  it('tapping Refused fires onSelectReason("refused")', () => {
    const tree = SkipReasonSheet(baseProps);
    const button = findAll(tree, (n) =>
      n.type === 'TouchableOpacity' && n.props?.testID === 'skip-reason-refused',
    )[0];
    button.props.onPress();
    expect(baseProps.onSelectReason).toHaveBeenCalledWith('refused');
  });

  it('tapping Too soon fires onSelectReason("too-soon")', () => {
    const tree = SkipReasonSheet(baseProps);
    const button = findAll(tree, (n) =>
      n.type === 'TouchableOpacity' && n.props?.testID === 'skip-reason-too-soon',
    )[0];
    button.props.onPress();
    expect(baseProps.onSelectReason).toHaveBeenCalledWith('too-soon');
  });

  it('tapping Other fires onSelectReason("other")', () => {
    const tree = SkipReasonSheet(baseProps);
    const button = findAll(tree, (n) =>
      n.type === 'TouchableOpacity' && n.props?.testID === 'skip-reason-other',
    )[0];
    button.props.onPress();
    expect(baseProps.onSelectReason).toHaveBeenCalledWith('other');
  });

  it('tapping "Add details instead" fires onAddDetails (not a reason)', () => {
    const tree = SkipReasonSheet(baseProps);
    const button = findAll(tree, (n) =>
      n.type === 'TouchableOpacity' && n.props?.testID === 'skip-add-details',
    )[0];
    button.props.onPress();
    expect(baseProps.onAddDetails).toHaveBeenCalledTimes(1);
    expect(baseProps.onSelectReason).not.toHaveBeenCalled();
  });
});

describe('SkipReasonSheet — accessibility', () => {
  it('each reason row is a button with a descriptive label', () => {
    const tree = SkipReasonSheet(baseProps);
    const buttons = findAll(tree, (n) =>
      n.type === 'TouchableOpacity' &&
      typeof n.props?.testID === 'string' &&
      n.props.testID.startsWith('skip-reason-'),
    );
    expect(buttons.length).toBe(3);
    for (const b of buttons) {
      expect(b.props.accessibilityRole).toBe('button');
      expect(typeof b.props.accessibilityLabel).toBe('string');
    }
  });
});
