// ============================================================================
// EndOfShiftCard — handoff-note-exists indicator (Jul 2 brief item 6).
//
// When a handoff note ("For the next caregiver") has been saved today, the
// evening End-of-shift card shows a lightweight indicator. Copy reuses the
// EXACT existing §5 eyebrow "For the next caregiver" + a note glyph. The flag
// is prop-driven (owned by now.tsx via getConsolidatedNotes) so the card stays
// presentational. Mirrors endOfShiftCard.test.tsx's function-call + hour-gate.
// ============================================================================

jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  StyleSheet: { create: (styles: any) => styles },
}));

jest.mock('react', () => {
  const actualReact = jest.requireActual('react');
  return {
    ...actualReact,
    useState: (initial: any) => [typeof initial === 'function' ? initial() : initial, jest.fn()],
    useMemo: (fn: () => any) => fn(),
    useEffect: () => {},
    useCallback: (fn: any) => fn,
    useRef: (initial: any) => ({ current: initial }),
  };
});

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      caregiverAccent: '#aa8adc',
      caregiverAccentBg: 'rgba(107, 140, 174, 0.08)',
      caregiverAccentText: '#d4baff',
      textPrimary: '#f4ddb8',
      textSecondary: 'rgba(255, 255, 255, 0.72)',
      borderHandoff: 'rgba(143, 168, 200, 0.28)',
    },
  }),
}));

jest.mock('../../lib/navigate', () => ({ navigate: jest.fn() }));
jest.mock('../../utils/dayComplete', () => ({ isDayComplete: jest.fn().mockResolvedValue(false) }));
jest.mock('../../lib/events', () => ({ useDataListener: jest.fn() }));

function loadCard() {
  jest.resetModules();
  return require('../../components/now/EndOfShiftCard').EndOfShiftCard;
}

function withHour<T>(hour: number, fn: () => T): T {
  const RealDate = Date;
  class FakeDate extends RealDate {
    getHours() { return hour; }
  }
  (global as any).Date = FakeDate as DateConstructor;
  try { return fn(); } finally { (global as any).Date = RealDate; }
}

function findText(node: any): string[] {
  if (!node || typeof node !== 'object') return [];
  const out: string[] = [];
  if (node.type === 'Text') {
    const c = node.props?.children;
    if (typeof c === 'string') out.push(c);
    else if (Array.isArray(c)) out.push(c.filter((x: any) => typeof x === 'string').join(''));
  }
  const kids = node.props?.children;
  const arr = Array.isArray(kids) ? kids : kids != null ? [kids] : [];
  for (const k of arr) out.push(...findText(k));
  return out;
}
function findByTestId(node: any, id: string): any {
  if (!node || typeof node !== 'object') return null;
  if (node.props?.testID === id) return node;
  const kids = node.props?.children;
  const arr = Array.isArray(kids) ? kids : kids != null ? [kids] : [];
  for (const k of arr) {
    const found = findByTestId(k, id);
    if (found) return found;
  }
  return null;
}

describe('EndOfShiftCard — handoff-note indicator', () => {
  it('shows the indicator (exact "For the next caregiver" copy) when hasHandoffNote is true', () => {
    const EndOfShiftCard = loadCard();
    const tree = withHour(20, () => EndOfShiftCard({ completedCount: 3, hasHandoffNote: true }));
    expect(findByTestId(tree, 'eos-note-indicator')).not.toBeNull();
    // Copy reuses the exact existing eyebrow string (+ glyph), nothing invented.
    expect(findText(tree)).toContain('📝 For the next caregiver');
  });

  it('hides the indicator when hasHandoffNote is false/undefined', () => {
    const EndOfShiftCard = loadCard();
    const treeFalse = withHour(20, () => EndOfShiftCard({ completedCount: 3, hasHandoffNote: false }));
    expect(findByTestId(treeFalse, 'eos-note-indicator')).toBeNull();
    const treeUndef = withHour(20, () => EndOfShiftCard({ completedCount: 3 }));
    expect(findByTestId(treeUndef, 'eos-note-indicator')).toBeNull();
  });

  it('does not render at all before evening even with a note (hour gate preserved)', () => {
    const EndOfShiftCard = loadCard();
    const tree = withHour(10, () => EndOfShiftCard({ completedCount: 3, hasHandoffNote: true }));
    expect(tree).toBeNull();
  });
});
