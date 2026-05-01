// ============================================================================
// ManageSampleDataSheet — bottom sheet that owns the "set up vs. remove"
// transitions out of sample mode. Phase 12/13/14 of Part B.
// ============================================================================

import React from 'react';

jest.mock('react', () => {
  const actual = jest.requireActual('react');
  return {
    ...actual,
    useMemo: (fn: any) => fn(),
    useState: (init: any) => [typeof init === 'function' ? init() : init, () => {}],
    useEffect: () => {},
    useCallback: (fn: any) => fn,
  };
});

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      menuSurface: '#1a1f2b',
      glassBorder: 'rgba(255,255,255,0.06)',
      border: 'rgba(255,255,255,0.08)',
      glass: '#363830',
      glassDim: '#161b25',
      accent: '#5fb88a',
      accentBorder: 'rgba(52,211,153,0.35)',
      caregiverAccent: '#aa8adc',
      caregiverAccentBg: 'rgba(139, 92, 246, 0.06)',
      caregiverAccentBorder: 'rgba(139, 92, 246, 0.25)',
      caregiverAccentText: '#d4baff',
      error: '#e6776e',
      textPrimary: '#fff',
      textSecondary: '#9aa0a6',
      textTertiary: '#6b7280',
      textPlaceholder: '#5a606a',
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
    TextInput: PT('TextInput'),
    Modal: PT('Modal'),
    StyleSheet: { create: (s: any) => s, flatten: (s: any) => s },
    KeyboardAvoidingView: PT('KeyboardAvoidingView'),
    Platform: { OS: 'ios', select: (o: any) => o.ios },
  };
});

jest.mock('../../utils/sampleDataManager', () => ({
  clearSampleData: jest.fn().mockResolvedValue({ success: true }),
}));

jest.mock('../../storage/patientRegistry', () => ({
  updatePatient: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../lib/events', () => ({
  emitDataUpdate: jest.fn(),
}));

import { ManageSampleDataSheet } from '../../components/sample/ManageSampleDataSheet';

function findAll(node: any, predicate: (n: any) => boolean): any[] {
  if (!node || typeof node !== 'object') return [];
  const out: any[] = [];
  if (predicate(node)) out.push(node);
  const kids = node.props?.children;
  const arr = Array.isArray(kids) ? kids : kids != null ? [kids] : [];
  for (const k of arr) out.push(...findAll(k, predicate));
  return out;
}

function flattenText(children: any): string {
  if (children == null) return '';
  if (typeof children === 'string' || typeof children === 'number') return String(children);
  if (Array.isArray(children)) return children.map(flattenText).join('');
  if (children?.props?.children !== undefined) return flattenText(children.props.children);
  return '';
}

describe('ManageSampleDataSheet — default content', () => {
  it('renders nothing when not visible', () => {
    const tree = ManageSampleDataSheet({ visible: false, onClose: () => {} });
    // Modal still renders but with visible=false; the modal shell may be present.
    // Either null or a Modal with visible=false is acceptable.
    if (tree) {
      const modal = findAll(tree, (n) => n.type === 'Modal')[0];
      if (modal) expect(modal.props.visible).toBe(false);
    }
  });

  it('renders both primary (set up) and secondary (remove) action cards by default', () => {
    const tree = ManageSampleDataSheet({ visible: true, onClose: () => {} });
    const text = flattenText(tree);
    expect(text).toMatch(/Set up my loved one|Set up my profile/);
    expect(text).toMatch(/Remove example data/);
  });

  it('shows the tertiary "Keep exploring" link', () => {
    const tree = ManageSampleDataSheet({ visible: true, onClose: () => {} });
    expect(flattenText(tree)).toMatch(/Keep exploring/);
  });

  it('exposes a drag handle (decorative bar) at the top of the sheet', () => {
    const tree = ManageSampleDataSheet({ visible: true, onClose: () => {} });
    const handle = findAll(tree, (n) => {
      const style = Array.isArray(n.props?.style) ? Object.assign({}, ...n.props.style) : n.props?.style;
      return n.type === 'View' && style?.height === 4 && style?.borderRadius === 2;
    })[0];
    expect(handle).toBeDefined();
  });
});

describe('ManageSampleDataSheet — focusOn pre-selects a sub-flow', () => {
  it('focusOn="setup" jumps directly into the name-input form', () => {
    const tree = ManageSampleDataSheet({ visible: true, onClose: () => {}, focusOn: 'setup' });
    const inputs = findAll(tree, (n) => n.type === 'TextInput');
    expect(inputs.length).toBeGreaterThan(0);
  });

  it('focusOn="remove" jumps directly into the confirmation copy', () => {
    const tree = ManageSampleDataSheet({ visible: true, onClose: () => {}, focusOn: 'remove' });
    const text = flattenText(tree);
    // RemoveConfirmation should ask the user before destructive action.
    expect(text).toMatch(/Remove example data\?|Are you sure|This will/);
    expect(text).toMatch(/Confirm|Remove/);
    expect(text).toMatch(/Cancel/);
  });
});

describe('ManageSampleDataSheet — Remove confirmation uses destructive treatment', () => {
  it('confirm button uses error color', () => {
    const tree = ManageSampleDataSheet({ visible: true, onClose: () => {}, focusOn: 'remove' });
    // Destructive action must NOT look like a primary positive action.
    // Check that at least one button uses c.error in its style.
    const buttons = findAll(tree, (n) => n.type === 'TouchableOpacity');
    const hasErrorStyled = buttons.some((b) => {
      const flat = Object.assign({}, ...(Array.isArray(b.props.style) ? b.props.style : [b.props.style || {}]));
      return flat.backgroundColor === '#e6776e' || flat.borderColor === '#e6776e';
    });
    expect(hasErrorStyled).toBe(true);
  });
});
