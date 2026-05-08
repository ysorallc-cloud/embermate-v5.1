// ============================================================================
// Phase 5.12.4b — "WHAT CHANGED TODAY" section.
//
// Renders only when meaningful deltas exist for the day. Eyebrow color
// follows severity: coral when any change is 'flag', lavender when only
// 'note'-severity changes. Per-row text matches its own severity.
// ============================================================================

import React from 'react';
import type { DayLevelChange, DayLevelChangesResult } from '../../services/dayLevelChanges';

const ACCENT = '#5fb88a';
const CAREGIVER = '#aa8adc';
const CRITICAL = '#e6776e';
const TEXT_SECONDARY = '#c4c1b3';

let mockResult: DayLevelChangesResult | null = null;
let mockLoading = false;

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
      accent: ACCENT,
      caregiverAccent: CAREGIVER,
      criticalAlert: CRITICAL,
      error: CRITICAL,
      textPrimary: '#fff',
      textSecondary: TEXT_SECONDARY,
      textTertiary: '#6b7280',
    },
  }),
}));

jest.mock('react-native', () => {
  const PT = (n: string) => n;
  return {
    View: PT('View'),
    Text: PT('Text'),
    StyleSheet: { create: (s: any) => s, flatten: (s: any) => s },
  };
});

jest.mock('../../hooks/useDayLevelChanges', () => ({
  useDayLevelChanges: () => ({ result: mockResult, loading: mockLoading }),
}));

import { WhatChangedToday } from '../../components/journal/WhatChangedToday';

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
function styleOf(node: any): Record<string, any> {
  const s = node?.props?.style;
  if (!s) return {};
  if (Array.isArray(s)) return Object.assign({}, ...s.filter(Boolean));
  return s;
}

const flagChange = (extra: Partial<DayLevelChange> = {}): DayLevelChange => ({
  category: 'vitals',
  observation: 'BP 156/92 — 18 points above the rolling average',
  severity: 'flag',
  ...extra,
});
const noteChange = (extra: Partial<DayLevelChange> = {}): DayLevelChange => ({
  category: 'sleep',
  observation: 'Sleep 5h — 3h below the rolling average',
  severity: 'note',
  ...extra,
});

beforeEach(() => {
  mockResult = null;
  mockLoading = false;
});

describe('WhatChangedToday — null states', () => {
  it('renders nothing while loading', () => {
    mockLoading = true;
    mockResult = null;
    expect(WhatChangedToday({ dateKey: '2026-05-06' })).toBeNull();
  });

  it('renders nothing when the result has no changes', () => {
    mockResult = { changes: [], hasSignificantChange: false };
    expect(WhatChangedToday({ dateKey: '2026-05-06' })).toBeNull();
  });
});

describe('WhatChangedToday — eyebrow color follows severity', () => {
  it('coral eyebrow when any change is severity: flag', () => {
    mockResult = {
      changes: [flagChange(), noteChange()],
      hasSignificantChange: true,
    };
    const tree = WhatChangedToday({ dateKey: '2026-05-06' });
    const eyebrow = findAll(tree, (n) => n.props?.testID === 'what-changed-eyebrow')[0];
    expect(eyebrow).toBeDefined();
    expect(styleOf(eyebrow).color).toBe(CRITICAL);
  });

  it('lavender eyebrow when all changes are severity: note', () => {
    mockResult = {
      changes: [noteChange()],
      hasSignificantChange: false,
    };
    const tree = WhatChangedToday({ dateKey: '2026-05-06' });
    const eyebrow = findAll(tree, (n) => n.props?.testID === 'what-changed-eyebrow')[0];
    expect(styleOf(eyebrow).color).toBe(CAREGIVER);
  });

  it('coral eyebrow when only flags are present', () => {
    mockResult = {
      changes: [flagChange(), flagChange({ category: 'meals', observation: 'Refused breakfast' })],
      hasSignificantChange: true,
    };
    const tree = WhatChangedToday({ dateKey: '2026-05-06' });
    const eyebrow = findAll(tree, (n) => n.props?.testID === 'what-changed-eyebrow')[0];
    expect(styleOf(eyebrow).color).toBe(CRITICAL);
  });
});

describe('WhatChangedToday — per-row coloring', () => {
  it('flagged rows render in coral; note rows render in neutral cream', () => {
    mockResult = {
      changes: [flagChange(), noteChange()],
      hasSignificantChange: true,
    };
    const tree = WhatChangedToday({ dateKey: '2026-05-06' });
    const rows = findAll(tree, (n) =>
      typeof n.props?.testID === 'string' && /^what-changed-row-/.test(n.props.testID),
    );
    expect(rows).toHaveLength(2);
    const colors = rows.map((r) => styleOf(r).color);
    expect(colors).toContain(CRITICAL);
    expect(colors).toContain(TEXT_SECONDARY);
  });

  it('all rows render in coral when every change is flag', () => {
    mockResult = {
      changes: [
        flagChange(),
        flagChange({ category: 'meals', observation: 'Refused breakfast' }),
        flagChange({ category: 'symptoms', observation: 'New symptom: agitation' }),
      ],
      hasSignificantChange: true,
    };
    const tree = WhatChangedToday({ dateKey: '2026-05-06' });
    const rows = findAll(tree, (n) =>
      typeof n.props?.testID === 'string' && /^what-changed-row-/.test(n.props.testID),
    );
    expect(rows).toHaveLength(3);
    for (const r of rows) {
      expect(styleOf(r).color).toBe(CRITICAL);
    }
  });
});

describe('WhatChangedToday — Journal mounting', () => {
  const { readFileSync } = require('fs');
  const { join } = require('path');
  const journalSrc = readFileSync(
    join(__dirname, '../..', 'app/(tabs)/journal.tsx'),
    'utf8',
  );

  it('Journal imports WhatChangedToday', () => {
    expect(journalSrc).toMatch(
      /import\s+\{\s*WhatChangedToday\s*\}\s+from\s+['"][^'"]+WhatChangedToday['"]/,
    );
  });

  it('Journal renders WhatChangedToday between NarrativeSnapshot and JournalNotesCard', () => {
    const snapshot = journalSrc.indexOf('<NarrativeSnapshot');
    const whatChanged = journalSrc.indexOf('<WhatChangedToday');
    const notes = journalSrc.indexOf('<JournalNotesCard');
    expect(snapshot).toBeGreaterThan(-1);
    expect(whatChanged).toBeGreaterThan(snapshot);
    expect(notes).toBeGreaterThan(whatChanged);
  });
});
