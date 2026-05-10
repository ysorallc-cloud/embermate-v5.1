// ============================================================================
// Phase 5.12.f — "FOR NEXT CAREGIVER" section.
//
// Renders only when at least one item exists. Items derive from two
// sources:
//   1. Pending scheduled items (passed in as `pending: string[]`)
//   2. Flag-severity day-level changes from 5.12.4a (passed in as
//      `dayLevelChanges`). Sleep notes are excluded — flag severity only.
//
// Wording lives inside the component (template-owned, per the 5.12.e
// matcher pattern) so the DayLevelChange shape stays detection-focused.
//
// Ordering: symptoms/vitals flags first, then pending tasks, then
// softer mood/meals flags. Cap 3 bullets; overflow → "+ N more in handoff".
// Coral text for flag-derived items only.
// ============================================================================

import React from 'react';
import type { DayLevelChange } from '../../services/dayLevelChanges';

const CRITICAL = '#e6776e';
const TEXT_SECONDARY = '#c4c1b3';
const TEXT_TERTIARY = '#6b7280';
const CAREGIVER = '#aa8adc';

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
      caregiverAccent: CAREGIVER,
      criticalAlert: CRITICAL,
      error: CRITICAL,
      textPrimary: '#fff',
      textSecondary: TEXT_SECONDARY,
      textTertiary: TEXT_TERTIARY,
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

import { ForNextCaregiver } from '../../components/journal/ForNextCaregiver';

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
function textOf(node: any): string {
  const out: string[] = [];
  function walk(n: any) {
    if (n == null) return;
    if (typeof n === 'string') { out.push(n); return; }
    if (typeof n === 'number') { out.push(String(n)); return; }
    if (Array.isArray(n)) { n.forEach(walk); return; }
    if (n.props?.children !== undefined) walk(n.props.children);
  }
  walk(node);
  return out.join('');
}

const flagVitals: DayLevelChange = {
  category: 'vitals',
  observation: 'BP 156/92 — 18 points above the rolling average',
  severity: 'flag',
};
const flagMeals: DayLevelChange = {
  category: 'meals',
  observation: 'Refused a meal — first time in the past week',
  severity: 'flag',
};
const flagMood: DayLevelChange = {
  category: 'mood',
  observation: 'Mood drop of 2 points from the rolling average',
  severity: 'flag',
};
const flagSymptoms: DayLevelChange = {
  category: 'symptoms',
  observation: 'New symptom: agitation — not seen in 14 days',
  severity: 'flag',
};
const noteSleep: DayLevelChange = {
  category: 'sleep',
  observation: 'Sleep 5h — 3h below the rolling average',
  severity: 'note',
};

describe('ForNextCaregiver — null states', () => {
  it('returns null when no pending and no changes', () => {
    expect(ForNextCaregiver({ pending: [], dayLevelChanges: [] })).toBeNull();
  });

  it('returns null when only sleep notes are present (no flags, no pending)', () => {
    // Sleep emits 'note' severity per spec; this section is flags only.
    expect(
      ForNextCaregiver({ pending: [], dayLevelChanges: [noteSleep] }),
    ).toBeNull();
  });
});

describe('ForNextCaregiver — pending items render in neutral cream', () => {
  it('renders one bullet per pending item', () => {
    const tree = ForNextCaregiver({
      pending: ['Dinner not yet given', 'Encourage hydration before bed'],
      dayLevelChanges: [],
    });
    const bullets = findAll(tree, (n) =>
      typeof n.props?.testID === 'string' && /^for-next-bullet-\d+$/.test(n.props.testID),
    );
    expect(bullets).toHaveLength(2);
    for (const b of bullets) {
      expect(styleOf(b).color).toBe(TEXT_SECONDARY);
    }
  });
});

describe('ForNextCaregiver — flag-derived bullets render in coral', () => {
  it('vitals flag yields a coral "Recheck BP" bullet that includes the BP value', () => {
    const tree = ForNextCaregiver({
      pending: [],
      dayLevelChanges: [flagVitals],
    });
    const bullets = findAll(tree, (n) =>
      typeof n.props?.testID === 'string' && /^for-next-bullet-\d+$/.test(n.props.testID),
    );
    expect(bullets).toHaveLength(1);
    expect(styleOf(bullets[0]).color).toBe(CRITICAL);
    expect(textOf(bullets[0])).toMatch(/Recheck BP/);
    expect(textOf(bullets[0])).toMatch(/156\/92/);
  });

  it('symptoms flag yields a coral "Monitor for recurring {name}" bullet', () => {
    const tree = ForNextCaregiver({
      pending: [],
      dayLevelChanges: [flagSymptoms],
    });
    const bullets = findAll(tree, (n) =>
      typeof n.props?.testID === 'string' && /^for-next-bullet-\d+$/.test(n.props.testID),
    );
    expect(bullets).toHaveLength(1);
    expect(styleOf(bullets[0]).color).toBe(CRITICAL);
    expect(textOf(bullets[0])).toMatch(/Monitor for recurring/);
    expect(textOf(bullets[0])).toMatch(/agitation/);
  });

  it('meals flag yields a coral "Encourage meals" bullet', () => {
    const tree = ForNextCaregiver({
      pending: [],
      dayLevelChanges: [flagMeals],
    });
    const bullets = findAll(tree, (n) =>
      typeof n.props?.testID === 'string' && /^for-next-bullet-\d+$/.test(n.props.testID),
    );
    expect(bullets).toHaveLength(1);
    expect(styleOf(bullets[0]).color).toBe(CRITICAL);
    expect(textOf(bullets[0])).toMatch(/Encourage/);
  });

  it('mood flag yields a coral "Check in on mood" bullet', () => {
    const tree = ForNextCaregiver({
      pending: [],
      dayLevelChanges: [flagMood],
    });
    const bullets = findAll(tree, (n) =>
      typeof n.props?.testID === 'string' && /^for-next-bullet-\d+$/.test(n.props.testID),
    );
    expect(bullets).toHaveLength(1);
    expect(styleOf(bullets[0]).color).toBe(CRITICAL);
    expect(textOf(bullets[0])).toMatch(/Check in on mood/);
  });
});

describe('ForNextCaregiver — ordering', () => {
  it('symptoms/vitals flags appear before pending tasks; mood/meals after pending', () => {
    const tree = ForNextCaregiver({
      pending: ['Dinner not yet given'],
      dayLevelChanges: [flagMeals, flagSymptoms, flagVitals, flagMood],
    });
    const bullets = findAll(tree, (n) =>
      typeof n.props?.testID === 'string' && /^for-next-bullet-\d+$/.test(n.props.testID),
    );
    // Cap is 3, so we should see [symptoms, vitals, pending] — meals/mood overflow.
    const texts = bullets.map(textOf);
    expect(texts.length).toBe(3);
    // First two slots must be symptoms + vitals (priority flags), in some order.
    const firstTwo = `${texts[0]} | ${texts[1]}`;
    expect(firstTwo).toMatch(/Monitor for recurring|agitation/);
    expect(firstTwo).toMatch(/Recheck BP|156\/92/);
    // Slot 3 is the pending task.
    expect(texts[2]).toMatch(/Dinner not yet given/);
  });
});

describe('ForNextCaregiver — overflow line', () => {
  it('renders "+ N more in handoff" when more than 3 items would render', () => {
    const tree = ForNextCaregiver({
      pending: ['Dinner not yet given', 'Hydration', 'Light stretch'],
      dayLevelChanges: [flagSymptoms, flagVitals],
    });
    const bullets = findAll(tree, (n) =>
      typeof n.props?.testID === 'string' && /^for-next-bullet-\d+$/.test(n.props.testID),
    );
    expect(bullets).toHaveLength(3);
    const overflow = findAll(tree, (n) => n.props?.testID === 'for-next-overflow')[0];
    expect(overflow).toBeDefined();
    expect(textOf(overflow)).toMatch(/\+\s*2\s+more in handoff/);
  });

  it('omits the overflow line when 3 or fewer items exist', () => {
    const tree = ForNextCaregiver({
      pending: ['Dinner not yet given'],
      dayLevelChanges: [flagSymptoms],
    });
    const overflow = findAll(tree, (n) => n.props?.testID === 'for-next-overflow')[0];
    expect(overflow).toBeUndefined();
  });
});

describe('ForNextCaregiver — Journal mounting (post-Phase 11.8.4 retirement)', () => {
  const { readFileSync } = require('fs');
  const { join } = require('path');
  const journalSrc = readFileSync(
    join(__dirname, '../..', 'app/(tabs)/journal.tsx'),
    'utf8',
  );

  // Phase 11.8.4 retired ForNextCaregiver from the today path —
  // TodayStillPending (Tier 3) supersedes its pending-handoff
  // role. Component stays in the codebase.
  it('Journal does NOT import ForNextCaregiver (retired in 11.8.4)', () => {
    expect(journalSrc).not.toMatch(
      /^\s*import\s+\{\s*ForNextCaregiver\s*\}\s+from\s+['"][^'"]+ForNextCaregiver['"]/m,
    );
  });

  it('Journal does NOT render <ForNextCaregiver />', () => {
    expect(journalSrc).not.toMatch(/<ForNextCaregiver\b/);
  });
});
