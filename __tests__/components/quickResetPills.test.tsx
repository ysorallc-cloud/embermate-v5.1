// ============================================================================
// QuickResetPills — three circular pill row (Breathe / Helpline / Community).
// Locks in v6.7 You-tab Phase 3: each pill renders its label + colored icon,
// each pill's tap fires the right handler, every pill has a non-empty
// accessibilityLabel.
// ============================================================================

jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  StyleSheet: { create: (s: any) => s },
}));

jest.mock('react', () => {
  const actualReact = jest.requireActual('react');
  return {
    ...actualReact,
    useMemo: (fn: () => any) => fn(),
    useCallback: (fn: any) => fn,
  };
});

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      glass: '#2a2c25',
      glassBorder: 'rgba(255,255,255,0.08)',
      accent: '#5fb88a',
      error: '#e6776e',
      caregiverAccent: '#aa8adc',
      textPrimary: '#FFFFFF',
    },
  }),
}));

import { QuickResetPills } from '../../components/support/QuickResetPills';

// Walk a React element tree, collect every node where `predicate` matches.
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

function makeProps() {
  return {
    onBreathe: jest.fn(),
    onHelpline: jest.fn(),
    onCommunity: jest.fn(),
  };
}

describe('QuickResetPills — three pills render with the right labels and icons', () => {
  const props = makeProps();
  const tree: any = (QuickResetPills as any)(props);

  it('renders exactly three pill TouchableOpacity buttons', () => {
    const buttons = findAll(tree, (el) => el.type === 'TouchableOpacity');
    expect(buttons).toHaveLength(3);
  });

  it('the three labels are "Breathe", "Helpline", "Community"', () => {
    const text = flattenText(tree);
    expect(text).toContain('Breathe');
    expect(text).toContain('Helpline');
    expect(text).toContain('Community');
  });

  it('Breathe pill icon is a play glyph in mint accent', () => {
    const text = flattenText(tree);
    expect(text).toContain('▶');
    // The play glyph's parent <Text> should style with the accent color.
    const allText = findAll(tree, (el) => el.type === 'Text');
    const playNode = allText.find((t) => flattenText(t).includes('▶'));
    expect(playNode).toBeTruthy();
    const styleVal = JSON.stringify(playNode.props.style);
    expect(styleVal).toMatch(/#5fb88a|accent/i);
  });

  it('Helpline pill icon is a phone glyph in red', () => {
    const allText = findAll(tree, (el) => el.type === 'Text');
    const phoneNode = allText.find((t) => /[☎📞]/u.test(flattenText(t)));
    expect(phoneNode).toBeTruthy();
    const styleVal = JSON.stringify(phoneNode.props.style);
    expect(styleVal).toMatch(/#e6776e|error|red/i);
  });

  it('Community pill icon is a heart glyph in caregiverAccent purple', () => {
    const allText = findAll(tree, (el) => el.type === 'Text');
    const heartNode = allText.find((t) => /[♡♥❤]/u.test(flattenText(t)));
    expect(heartNode).toBeTruthy();
    const styleVal = JSON.stringify(heartNode.props.style);
    expect(styleVal).toMatch(/#aa8adc|caregiverAccent/i);
  });
});

describe('QuickResetPills — taps fire the correct handler', () => {
  it('tapping the Breathe pill calls onBreathe (and no other handler)', () => {
    const props = makeProps();
    const tree: any = (QuickResetPills as any)(props);
    const buttons = findAll(tree, (el) => el.type === 'TouchableOpacity');
    const breathe = buttons.find((b) => /breathe/i.test(b.props.accessibilityLabel || ''));
    expect(breathe).toBeTruthy();
    breathe.props.onPress();
    expect(props.onBreathe).toHaveBeenCalledTimes(1);
    expect(props.onHelpline).not.toHaveBeenCalled();
    expect(props.onCommunity).not.toHaveBeenCalled();
  });

  it('tapping the Helpline pill calls onHelpline (and no other handler)', () => {
    const props = makeProps();
    const tree: any = (QuickResetPills as any)(props);
    const buttons = findAll(tree, (el) => el.type === 'TouchableOpacity');
    const helpline = buttons.find((b) => /helpline/i.test(b.props.accessibilityLabel || ''));
    expect(helpline).toBeTruthy();
    helpline.props.onPress();
    expect(props.onHelpline).toHaveBeenCalledTimes(1);
    expect(props.onBreathe).not.toHaveBeenCalled();
    expect(props.onCommunity).not.toHaveBeenCalled();
  });

  it('tapping the Community pill calls onCommunity (and no other handler)', () => {
    const props = makeProps();
    const tree: any = (QuickResetPills as any)(props);
    const buttons = findAll(tree, (el) => el.type === 'TouchableOpacity');
    const community = buttons.find((b) => /community/i.test(b.props.accessibilityLabel || ''));
    expect(community).toBeTruthy();
    community.props.onPress();
    expect(props.onCommunity).toHaveBeenCalledTimes(1);
    expect(props.onBreathe).not.toHaveBeenCalled();
    expect(props.onHelpline).not.toHaveBeenCalled();
  });
});

describe('QuickResetPills — accessibility', () => {
  const props = makeProps();
  const tree: any = (QuickResetPills as any)(props);
  const buttons = findAll(tree, (el) => el.type === 'TouchableOpacity');

  it('every pill has a non-empty accessibilityLabel', () => {
    expect(buttons).toHaveLength(3);
    for (const b of buttons) {
      const label = b.props.accessibilityLabel;
      expect(typeof label).toBe('string');
      expect(label.trim().length).toBeGreaterThan(0);
    }
  });

  it('every pill has accessibilityRole="button"', () => {
    for (const b of buttons) {
      expect(b.props.accessibilityRole).toBe('button');
    }
  });

  it('every pill has an accessibilityHint matching its destination', () => {
    for (const b of buttons) {
      const hint = b.props.accessibilityHint;
      expect(typeof hint).toBe('string');
      expect(hint.trim().length).toBeGreaterThan(0);
    }
  });
});
