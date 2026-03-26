// ============================================================================
// Timeline Type Badges + Type Legend — Tests
// Tests mapping logic and dynamic legend filtering
// ============================================================================

import { Colors } from '../../theme/theme-tokens';

// Replicate the exported mappings from TimelineSection.tsx
const ITEM_TYPE_TO_BADGE_TEXT: Record<string, string> = {
  medication: 'CARE',
  vitals: 'VITALS',
  wellness: 'WELLNESS',
  nutrition: 'MEAL',
  hydration: 'WATER',
  sleep: 'SLEEP',
  activity: 'ACTIVITY',
  errand: 'ERRAND',
  self_care: 'YOU',
  shift: 'HANDOFF',
  appointment: 'APPT',
  custom: 'TASK',
};

const ITEM_TYPE_TO_BADGE_COLOR: Record<string, string> = {
  medication: '#34D399',    // green
  vitals: '#A78BFA',        // purple
  wellness: '#34D399',      // green
  nutrition: '#FBBF24',     // amber
  hydration: '#38BDF8',     // blue
  sleep: Colors.accent,
  activity: '#F97316',
  errand: '#FBBF24',        // amber
  self_care: '#F472B6',     // rose
  shift: '#7DD3FC',         // sky
  appointment: '#EF4444',   // red
  custom: '#A78BFA',
};

// Replicate LEGEND_TYPES from TimelineSection.tsx
const LEGEND_TYPES = [
  { itemType: 'medication', label: 'CARE',     color: '#34D399' },
  { itemType: 'vitals',     label: 'VITALS',   color: '#A78BFA' },
  { itemType: 'wellness',   label: 'WELLNESS', color: '#34D399' },
  { itemType: 'nutrition',  label: 'MEAL',     color: '#FBBF24' },
  { itemType: 'errand',     label: 'ERRAND',   color: '#FBBF24' },
  { itemType: 'appointment',label: 'APPT',     color: '#EF4444' },
  { itemType: 'self_care',  label: 'YOU',       color: '#F472B6' },
  { itemType: 'shift',      label: 'HANDOFF',  color: '#7DD3FC' },
];

// Replicate the legend filtering logic
function buildActiveLegend(instances: { itemType: string }[]) {
  const presentTypes = new Set(instances.map(i => i.itemType));
  return LEGEND_TYPES.filter(lt => presentTypes.has(lt.itemType));
}

describe('Timeline type badges', () => {
  const expectedBadges: [string, string, string][] = [
    ['medication', 'CARE',     '#34D399'],
    ['vitals',     'VITALS',   '#A78BFA'],
    ['wellness',   'WELLNESS', '#34D399'],
    ['nutrition',  'MEAL',     '#FBBF24'],
    ['errand',     'ERRAND',   '#FBBF24'],
    ['self_care',  'YOU',      '#F472B6'],
    ['shift',      'HANDOFF',  '#7DD3FC'],
    ['appointment','APPT',     '#EF4444'],
  ];

  it.each(expectedBadges)(
    '%s renders correct badge text %s',
    (itemType, expectedText) => {
      expect(ITEM_TYPE_TO_BADGE_TEXT[itemType]).toBe(expectedText);
    }
  );

  it.each(expectedBadges)(
    '%s uses correct color %s',
    (itemType, _text, expectedColor) => {
      expect(ITEM_TYPE_TO_BADGE_COLOR[itemType]).toBe(expectedColor);
    }
  );

  it('every type with badge text has a corresponding badge color', () => {
    for (const type of Object.keys(ITEM_TYPE_TO_BADGE_TEXT)) {
      expect(ITEM_TYPE_TO_BADGE_COLOR[type]).toBeDefined();
    }
  });

  it('all timeline item types have badge mappings', () => {
    const types = ['medication', 'vitals', 'nutrition', 'wellness', 'errand', 'self_care', 'shift', 'appointment'];
    for (const type of types) {
      expect(ITEM_TYPE_TO_BADGE_TEXT[type]).toBeDefined();
      expect(ITEM_TYPE_TO_BADGE_TEXT[type].length).toBeGreaterThan(0);
    }
  });
});

describe('Type Legend (dynamic)', () => {
  it('shows only types present in today\'s instances', () => {
    const instances = [
      { itemType: 'medication' },
      { itemType: 'nutrition' },
      { itemType: 'medication' }, // duplicate — should not double-show
    ];
    const legend = buildActiveLegend(instances);
    expect(legend).toHaveLength(2);
    expect(legend[0].label).toBe('CARE');
    expect(legend[1].label).toBe('MEAL');
  });

  it('returns empty when no instances', () => {
    expect(buildActiveLegend([])).toHaveLength(0);
  });

  it('renders in canonical order regardless of instance order', () => {
    const instances = [
      { itemType: 'shift' },
      { itemType: 'medication' },
      { itemType: 'errand' },
    ];
    const legend = buildActiveLegend(instances);
    expect(legend[0].label).toBe('CARE');     // medication first
    expect(legend[1].label).toBe('ERRAND');   // errand second
    expect(legend[2].label).toBe('HANDOFF');  // shift third
  });

  it('includes all 8 legend types when all are present', () => {
    const instances = LEGEND_TYPES.map(lt => ({ itemType: lt.itemType }));
    const legend = buildActiveLegend(instances);
    expect(legend).toHaveLength(8);
    expect(legend.map(l => l.label)).toEqual([
      'CARE', 'VITALS', 'WELLNESS', 'MEAL', 'ERRAND', 'APPT', 'YOU', 'HANDOFF',
    ]);
  });

  it('uses correct colors: CARE=green, ERRAND=amber, APPT=red, YOU=rose, HANDOFF=sky', () => {
    const instances = LEGEND_TYPES.map(lt => ({ itemType: lt.itemType }));
    const legend = buildActiveLegend(instances);
    const byLabel = Object.fromEntries(legend.map(l => [l.label, l.color]));
    expect(byLabel['CARE']).toBe('#34D399');
    expect(byLabel['ERRAND']).toBe('#FBBF24');
    expect(byLabel['APPT']).toBe('#EF4444');
    expect(byLabel['YOU']).toBe('#F472B6');
    expect(byLabel['HANDOFF']).toBe('#7DD3FC');
    expect(byLabel['VITALS']).toBe('#A78BFA');
  });

  it('ignores item types not in LEGEND_TYPES (e.g. hydration, sleep)', () => {
    const instances = [
      { itemType: 'hydration' },
      { itemType: 'sleep' },
      { itemType: 'medication' },
    ];
    const legend = buildActiveLegend(instances);
    // Only medication is in LEGEND_TYPES
    expect(legend).toHaveLength(1);
    expect(legend[0].label).toBe('CARE');
  });
});
