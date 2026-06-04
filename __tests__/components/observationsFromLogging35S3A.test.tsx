// ============================================================================
// Phase 35 Slice 3-A — ObservationsFromLogging sub-section BEHAVIOR pin.
//
// Surface: a new sub-section that lives WITHIN the Journal Section 4
// (Plan / Notes) SoapSectionFrame, ABOVE the JournalNotesCard, with
// a sub-eyebrow "OBSERVATIONS FROM LOGGING" matching the existing
// STILL PENDING sub-eyebrow chrome (Q-3A.4 lock). Reads
// listLogsByDate(date), filters entries with notes?.trim().length > 0
// (Q-3A.2), sorts ascending by timestamp (Q-3A.3), renders one row
// per entry with itemName + notes + time, read-only.
//
// itemName cascade (Q-3A.1):
//   (a) Prefer instance.itemName via dailyInstanceId lookup
//   (b) Fall back to data.medicationName when present
//   (c) Final fall back: per-type generic label (e.g. "Medication")
//
// Empty state (Q-3A.9): hide the entire sub-section. Section 4's
// other content (STILL PENDING + JournalNotesCard) still renders.
//
// Past-day mode (Q-3A.10): renders identically on past days
// (component is read-only by nature; no edit affordance).
//
// Refresh (Q-3A.11): no internal listener — the parent already
// subscribes to EVENT.LOGS via useDataListener; this component is
// re-mounted/re-rendered through that pathway.
//
// CONTRACTS (behavior, not source):
//   1. HIDDEN WHEN NO NOTES — no qualifying log → renders null
//   2. RENDERS SUB-EYEBROW + ROW — qualifying log → sub-eyebrow
//      "OBSERVATIONS FROM LOGGING" + one row with itemName + notes + time
//   3. ITEMNAME CASCADE (A — INSTANCE) — log linked via
//      dailyInstanceId resolves itemName from the instance
//   4. ITEMNAME CASCADE (B — DATA MED NAME) — no instance link,
//      data.medicationName present → uses that
//   5. ITEMNAME CASCADE (C — TYPE FALLBACK) — no instance, no
//      medicationName, data.type present → uses type label
//   6. SORT ASCENDING — multiple qualifying logs render earliest → latest
//   7. FILTER PREDICATE — empty / whitespace / undefined notes excluded
//   8. PAST-DAY MODE — renders on a date != today (Q-3A.10)
//
// Integration round-trip for the write→read pipeline this surface
// reads from is pinned separately in
// __tests__/integration/logEntryNotesRoundTrip35S3A.test.ts.
// ============================================================================

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      accent: '#5fb88a',
      caregiverAccent: '#aa8adc',
      textPrimary: '#f4ddb8',
      textSecondary: '#c4c1b3',
      textTertiary: '#9e9885',
      textMuted: '#6b7280',
      glass: '#363830',
      glassBorder: 'rgba(255,255,255,0.06)',
    },
  }),
}));

jest.mock('../../theme/theme-tokens', () => ({
  Spacing: { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 24 },
  Sizing: { cardRadius: 14, cardInternalPadding: 12 },
  Fonts: { serif: 'SourceSerif4_400Regular', serifItalic: 'SourceSerif4_400Regular_Italic' },
}));

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
    StyleSheet: { create: (s: any) => s, flatten: (s: any) => s },
    Platform: { OS: 'ios', select: (o: any) => o.ios || o.default },
  };
});

import React from 'react';
import { render, waitFor, within } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createLogEntry,
  upsertDailyInstances,
  DEFAULT_PATIENT_ID,
} from '../../storage/carePlanRepo';
import type { DailyCareInstance } from '../../types/carePlan';
import { ObservationsFromLogging } from '../../components/journal/ObservationsFromLogging';

const DATE = '2026-06-04';

async function clearAll(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  if (keys.length > 0) await AsyncStorage.multiRemove(keys as string[]);
}

function makeInstance(overrides: Partial<DailyCareInstance> = {}): DailyCareInstance {
  const now = new Date().toISOString();
  return {
    id: 'inst-1',
    carePlanId: 'plan-1',
    carePlanItemId: 'item-1',
    patientId: DEFAULT_PATIENT_ID,
    date: DATE,
    scheduledTime: '08:00',
    windowLabel: 'Morning',
    windowId: 'morning',
    status: 'pending',
    itemName: 'Atenolol 50mg',
    itemType: 'medication',
    priority: 'normal',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  } as DailyCareInstance;
}

describe('Phase 35 Slice 3-A — ObservationsFromLogging sub-section behavior pin', () => {
  beforeEach(async () => {
    await clearAll();
  });

  it('contract 1 (HIDDEN WHEN NO NOTES): renders null when no logs have non-empty notes for the date', async () => {
    // Empty bucket → no eyebrow chrome, no rows. Section 4's other
    // content (STILL PENDING + JournalNotesCard) renders independently.
    await createLogEntry({
      patientId: DEFAULT_PATIENT_ID,
      timestamp: new Date(`${DATE}T08:00:00`).toISOString(),
      date: DATE,
      outcome: 'completed',
      notes: undefined,
      source: 'record',
    });
    const { queryByText } = render(<ObservationsFromLogging date={DATE} />);
    // Let the useEffect fetch resolve.
    await new Promise((r) => setTimeout(r, 20));
    expect(queryByText(/OBSERVATIONS FROM LOGGING/i)).toBeNull();
  });

  it('contract 2 (RENDERS SUB-EYEBROW + ROW): a qualifying log surfaces the eyebrow and a row with itemName + notes', async () => {
    const instance = makeInstance({ id: 'inst-1', itemName: 'Atenolol 50mg' });
    await upsertDailyInstances(DEFAULT_PATIENT_ID, DATE, [instance]);
    await createLogEntry({
      patientId: DEFAULT_PATIENT_ID,
      dailyInstanceId: 'inst-1',
      timestamp: new Date(`${DATE}T08:12:00`).toISOString(),
      date: DATE,
      outcome: 'completed',
      notes: 'BP elevated, observed during morning walk.',
      source: 'record',
    });
    const { findByText } = render(<ObservationsFromLogging date={DATE} />);
    expect(await findByText(/OBSERVATIONS FROM LOGGING/i)).toBeTruthy();
    expect(await findByText('Atenolol 50mg')).toBeTruthy();
    expect(await findByText('BP elevated, observed during morning walk.')).toBeTruthy();
  });

  it('contract 3 (ITEMNAME CASCADE A — INSTANCE): log linked via dailyInstanceId resolves itemName from instance.itemName', async () => {
    const instance = makeInstance({ id: 'inst-meds', itemName: 'Lisinopril 10mg' });
    await upsertDailyInstances(DEFAULT_PATIENT_ID, DATE, [instance]);
    await createLogEntry({
      patientId: DEFAULT_PATIENT_ID,
      dailyInstanceId: 'inst-meds',
      timestamp: new Date(`${DATE}T08:00:00`).toISOString(),
      date: DATE,
      outcome: 'completed',
      notes: 'No nausea today.',
      // Data also has medicationName but instance should win.
      data: { type: 'medication', medicationName: 'Lisinopril (raw)' },
      source: 'record',
    });
    const { findByText, queryByText } = render(<ObservationsFromLogging date={DATE} />);
    expect(await findByText('Lisinopril 10mg')).toBeTruthy();
    expect(queryByText('Lisinopril (raw)')).toBeNull();
  });

  it('contract 4 (ITEMNAME CASCADE B — DATA MED NAME): no instance link, data.medicationName present → uses medicationName', async () => {
    await createLogEntry({
      patientId: DEFAULT_PATIENT_ID,
      // NO dailyInstanceId.
      timestamp: new Date(`${DATE}T09:00:00`).toISOString(),
      date: DATE,
      outcome: 'completed',
      notes: 'Took with food.',
      data: { type: 'medication', medicationName: 'Aspirin 81mg' },
      source: 'record',
    });
    const { findByText } = render(<ObservationsFromLogging date={DATE} />);
    expect(await findByText('Aspirin 81mg')).toBeTruthy();
  });

  it('contract 5 (ITEMNAME CASCADE C — TYPE FALLBACK): no instance, no medicationName, data.type present → uses generic type label', async () => {
    await createLogEntry({
      patientId: DEFAULT_PATIENT_ID,
      timestamp: new Date(`${DATE}T10:00:00`).toISOString(),
      date: DATE,
      outcome: 'completed',
      notes: 'Felt low energy after lunch.',
      data: { type: 'mood', mood: 2 },
      source: 'record',
    });
    const { findByText } = render(<ObservationsFromLogging date={DATE} />);
    // Generic label — capitalized form of the type. Any
    // human-readable rendering of 'mood' is acceptable here; the
    // contract is "the cascade does NOT silently drop to a blank
    // row." A case-insensitive substring match keeps the test
    // robust to copy choice (Mood / Mood log / etc.).
    expect(await findByText(/mood/i)).toBeTruthy();
  });

  it('contract 6 (SORT ASCENDING): multiple qualifying logs render in chronological order (earliest → latest)', async () => {
    const inst1 = makeInstance({ id: 'inst-a', itemName: 'Item-A' });
    const inst2 = makeInstance({ id: 'inst-b', itemName: 'Item-B' });
    const inst3 = makeInstance({ id: 'inst-c', itemName: 'Item-C' });
    await upsertDailyInstances(DEFAULT_PATIENT_ID, DATE, [inst1, inst2, inst3]);
    // Insert out of order on purpose — sort must NOT rely on insertion order.
    await createLogEntry({
      patientId: DEFAULT_PATIENT_ID, dailyInstanceId: 'inst-c',
      timestamp: new Date(`${DATE}T16:00:00`).toISOString(),
      date: DATE, outcome: 'completed', notes: 'Late row.', source: 'record',
    });
    await createLogEntry({
      patientId: DEFAULT_PATIENT_ID, dailyInstanceId: 'inst-a',
      timestamp: new Date(`${DATE}T08:00:00`).toISOString(),
      date: DATE, outcome: 'completed', notes: 'Early row.', source: 'record',
    });
    await createLogEntry({
      patientId: DEFAULT_PATIENT_ID, dailyInstanceId: 'inst-b',
      timestamp: new Date(`${DATE}T12:00:00`).toISOString(),
      date: DATE, outcome: 'completed', notes: 'Mid row.', source: 'record',
    });

    const { findAllByTestId } = render(<ObservationsFromLogging date={DATE} />);
    const rows = await findAllByTestId(/observations-row-/);
    expect(rows).toHaveLength(3);
    // testID encoding: observations-row-{index} — index 0 is earliest.
    expect(rows[0].props.testID).toBe('observations-row-0');
    expect(rows[1].props.testID).toBe('observations-row-1');
    expect(rows[2].props.testID).toBe('observations-row-2');
    // Cross-check by text content order via within() — JSON.stringify
    // on Fiber nodes hits a circular structure, so we traverse via
    // testing-library's own scoped queries.
    expect(within(rows[0]).getByText('Early row.')).toBeTruthy();
    expect(within(rows[1]).getByText('Mid row.')).toBeTruthy();
    expect(within(rows[2]).getByText('Late row.')).toBeTruthy();
  });

  it('contract 7 (FILTER PREDICATE): logs with undefined / empty / whitespace-only notes are excluded; only meaningful notes surface', async () => {
    await createLogEntry({
      patientId: DEFAULT_PATIENT_ID,
      timestamp: new Date(`${DATE}T07:00:00`).toISOString(),
      date: DATE, outcome: 'completed', notes: 'Meaningful row.', source: 'record',
    });
    await createLogEntry({
      patientId: DEFAULT_PATIENT_ID,
      timestamp: new Date(`${DATE}T08:00:00`).toISOString(),
      date: DATE, outcome: 'completed', notes: undefined, source: 'record',
    });
    await createLogEntry({
      patientId: DEFAULT_PATIENT_ID,
      timestamp: new Date(`${DATE}T09:00:00`).toISOString(),
      date: DATE, outcome: 'completed', notes: '', source: 'record',
    });
    await createLogEntry({
      patientId: DEFAULT_PATIENT_ID,
      timestamp: new Date(`${DATE}T10:00:00`).toISOString(),
      date: DATE, outcome: 'completed', notes: '   \n\t  ', source: 'record',
    });

    const { findAllByTestId, queryByText } = render(<ObservationsFromLogging date={DATE} />);
    const rows = await findAllByTestId(/observations-row-/);
    expect(rows).toHaveLength(1);
    expect(queryByText('Meaningful row.')).toBeTruthy();
  });

  it('contract 8 (PAST-DAY MODE): renders identically on a date that is not today (no edit affordance, just observation rows)', async () => {
    // Q-3A.10 — past-day audit value. Same component, same render,
    // no past/today branching at this layer.
    const PAST = '2026-05-01';
    const instance = makeInstance({ id: 'inst-past', date: PAST, itemName: 'Past Med' });
    await upsertDailyInstances(DEFAULT_PATIENT_ID, PAST, [instance]);
    await createLogEntry({
      patientId: DEFAULT_PATIENT_ID, dailyInstanceId: 'inst-past',
      timestamp: new Date(`${PAST}T08:00:00`).toISOString(),
      date: PAST, outcome: 'completed', notes: 'Recorded a month ago.', source: 'record',
    });
    const { findByText } = render(<ObservationsFromLogging date={PAST} />);
    expect(await findByText('Past Med')).toBeTruthy();
    expect(await findByText('Recorded a month ago.')).toBeTruthy();
  });
});
