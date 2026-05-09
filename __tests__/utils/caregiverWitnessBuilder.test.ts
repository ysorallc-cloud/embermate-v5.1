// ============================================================================
// Phase 11.1 — caregiverWitnessBuilder contracts.
//
// The witness builder reads from the same union pipeline as
// narrativeSummaryBuilder (instances + logs + events) and surfaces a
// short observation-only line for the You-tab affirmation/footer
// slots. The contracts below pin behaviour that consumers rely on:
//
//   1. Empty data → null. No instances, no events, no logs → null.
//   2. Morning streak qualification (5/7 days w/ completed morning).
//   3. High completion fallback (≥80% acted, morning < threshold).
//   4. Medication volume fallback.
//   5. Forbidden-words audit. Observation, not praise.
//   6. Patient-name audit. The footer addresses the caregiver.
//   7. Signal priority order — earliest-listed wins on multi-qualify.
//   8. Union-dedup. Same dedup key as narrativeSummaryBuilder.
//   9. Skipped status counts toward high_completion_week.
//
// The mock layer below stubs the three storage functions
// (listDailyInstancesRange, listLogsInRange, getEventsByDateRange)
// plus getActivePatientId. Each test seeds via mock.implementation so
// fixtures stay readable inline.
// ============================================================================

import {
  buildCaregiverWitness,
  WitnessSignal,
} from '../../utils/caregiverWitnessBuilder';

// ----------------------------------------------------------------------------
// Storage mocks
// ----------------------------------------------------------------------------

const mockListDailyInstancesRange = jest.fn();
const mockListLogsInRange = jest.fn();
const mockGetEventsByDateRange = jest.fn();

jest.mock('../../storage/carePlanRepo', () => ({
  listDailyInstancesRange: (...args: any[]) => mockListDailyInstancesRange(...args),
  listLogsInRange: (...args: any[]) => mockListLogsInRange(...args),
}));

jest.mock('../../storage/eventRepo', () => ({
  getEventsByDateRange: (...args: any[]) => mockGetEventsByDateRange(...args),
}));

jest.mock('../../storage/patientRegistry', () => ({
  getActivePatientId: async () => 'default',
}));

jest.mock('../../utils/devLog', () => ({ logError: () => {} }));

// ----------------------------------------------------------------------------
// Helpers — build dated fixtures relative to a fixed reference today.
// ----------------------------------------------------------------------------

const TODAY = new Date('2026-05-09T12:00:00Z');

function pad2(n: number): string { return n < 10 ? `0${n}` : String(n); }
function ymd(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function addDays(d: Date, n: number): Date {
  const out = new Date(d); out.setDate(out.getDate() + n); return out;
}

interface InstanceFixtureOpts {
  date?: string;
  scheduledTime?: string;
  windowLabel?: 'morning' | 'afternoon' | 'evening' | 'night' | 'custom';
  status?: 'pending' | 'completed' | 'skipped' | 'missed' | 'partial';
  itemType?: string;
  itemId?: string;
}

let nextId = 0;
function inst(opts: InstanceFixtureOpts = {}): any {
  const id = `inst-${++nextId}`;
  return {
    id,
    carePlanId: 'cp-1',
    carePlanItemId: opts.itemId ?? `item-${id}`,
    patientId: 'default',
    date: opts.date ?? ymd(TODAY),
    scheduledTime: opts.scheduledTime ?? `${opts.date ?? ymd(TODAY)}T08:00:00Z`,
    windowLabel: opts.windowLabel ?? 'morning',
    windowId: opts.windowLabel ?? 'morning',
    status: opts.status ?? 'completed',
    itemName: 'Item',
    itemType: opts.itemType ?? 'medication',
    priority: 'recommended',
    createdAt: ymd(TODAY),
    updatedAt: ymd(TODAY),
  };
}

function ev(type: string, opts: { date?: string; metadata?: any; id?: string } = {}): any {
  const date = opts.date ?? ymd(TODAY);
  return {
    id: opts.id ?? `evt-${++nextId}`,
    patientId: 'default',
    type,
    timestamp: `${date}T08:30:00Z`,
    metadata: opts.metadata ?? {},
  };
}

function log(opts: { date?: string; itemId?: string } = {}): any {
  const date = opts.date ?? ymd(TODAY);
  return {
    id: `log-${++nextId}`,
    patientId: 'default',
    carePlanItemId: opts.itemId,
    timestamp: `${date}T08:30:00Z`,
    date,
    outcome: 'completed',
    source: 'now',
    immutable: true,
    createdAt: `${date}T08:30:00Z`,
  };
}

function setMocks(
  instances: any[] = [],
  logs: any[] = [],
  events: any[] = [],
) {
  mockListDailyInstancesRange.mockResolvedValue(instances);
  mockListLogsInRange.mockResolvedValue(logs);
  mockGetEventsByDateRange.mockResolvedValue(events);
}

beforeEach(() => {
  nextId = 0;
  mockListDailyInstancesRange.mockReset();
  mockListLogsInRange.mockReset();
  mockGetEventsByDateRange.mockReset();
});

// ----------------------------------------------------------------------------
// Contracts
// ----------------------------------------------------------------------------

describe('Phase 11.1 — caregiverWitnessBuilder', () => {
  describe('Contract 1: empty data returns null', () => {
    it('returns null when no instances, logs, or events exist', async () => {
      setMocks([], [], []);
      const out = await buildCaregiverWitness('default', TODAY);
      expect(out).toBeNull();
    });
  });

  describe('Contract 2: morning streak qualification', () => {
    it('5 of 7 days with completed morning instances → source=morning_streak', async () => {
      // Days 0..4 (today, yesterday, ..., 4 days ago) have completed
      // morning instances; days 5-6 have nothing. That's 5/7.
      const instances = [];
      for (let n = 0; n < 5; n++) {
        const date = ymd(addDays(TODAY, -n));
        instances.push(inst({ date, windowLabel: 'morning', status: 'completed' }));
      }
      setMocks(instances, [], []);
      const out = await buildCaregiverWitness('default', TODAY);
      expect(out).not.toBeNull();
      expect(out!.source).toBe('morning_streak');
      expect(out!.line).toBe('You showed up 5 of 7 mornings this week');
    });

    it('all 7 mornings completed → "You showed up 7 of 7 mornings this week"', async () => {
      const instances = [];
      for (let n = 0; n < 7; n++) {
        const date = ymd(addDays(TODAY, -n));
        instances.push(inst({ date, windowLabel: 'morning', status: 'completed' }));
      }
      setMocks(instances, [], []);
      const out = await buildCaregiverWitness('default', TODAY);
      expect(out!.source).toBe('morning_streak');
      expect(out!.line).toBe('You showed up 7 of 7 mornings this week');
    });

    it('4 of 7 mornings does NOT qualify (below threshold)', async () => {
      // 4 morning days → must NOT trigger morning_streak. With no other
      // qualifying signals, the result is either null or a different
      // signal — but specifically NOT morning_streak.
      const instances = [];
      for (let n = 0; n < 4; n++) {
        const date = ymd(addDays(TODAY, -n));
        instances.push(inst({ date, windowLabel: 'morning', status: 'completed' }));
      }
      setMocks(instances, [], []);
      const out = await buildCaregiverWitness('default', TODAY);
      if (out) {
        expect(out.source).not.toBe('morning_streak');
      }
    });

    it('reads windowLabel, not a time-of-day heuristic from scheduledTime', async () => {
      // Schedule 5 instances with 08:00 timestamps but windowLabel:
      // 'afternoon' — they must NOT count toward morning_streak.
      const instances = [];
      for (let n = 0; n < 5; n++) {
        const date = ymd(addDays(TODAY, -n));
        instances.push(inst({
          date,
          windowLabel: 'afternoon',
          scheduledTime: `${date}T08:00:00Z`,
          status: 'completed',
        }));
      }
      setMocks(instances, [], []);
      const out = await buildCaregiverWitness('default', TODAY);
      if (out) {
        expect(out.source).not.toBe('morning_streak');
      }
    });
  });

  describe('Contract 3: high completion fallback', () => {
    it('24 of 30 instances completed (no morning streak) → source=high_completion_week', async () => {
      // Spread 30 scheduled instances across 7 days, 24 completed, 6
      // pending. Use afternoon windowLabel so morning_streak doesn't
      // qualify. 24/30 = 80% — exactly the threshold.
      const instances = [];
      for (let i = 0; i < 24; i++) {
        const date = ymd(addDays(TODAY, -(i % 7)));
        instances.push(inst({
          date, windowLabel: 'afternoon', status: 'completed',
          itemId: `item-${i}`,
        }));
      }
      for (let i = 0; i < 6; i++) {
        const date = ymd(addDays(TODAY, -(i % 7)));
        instances.push(inst({
          date, windowLabel: 'afternoon', status: 'pending',
          itemId: `pending-${i}`,
        }));
      }
      setMocks(instances, [], []);
      const out = await buildCaregiverWitness('default', TODAY);
      expect(out).not.toBeNull();
      expect(out!.source).toBe('high_completion_week');
      expect(out!.line).toBe('You handled 80% of this week\'s schedule');
    });
  });

  describe('Contract 4: medication volume fallback', () => {
    it('12 medication completions (morning + completion% don\'t qualify) → source=medication_volume', async () => {
      // 12 completed medication instances on a single day in the
      // afternoon (no morning streak). Total schedule has many
      // pending entries so the completion percentage drops below
      // threshold.
      const instances = [];
      for (let i = 0; i < 12; i++) {
        instances.push(inst({
          date: ymd(addDays(TODAY, -1)),
          windowLabel: 'afternoon',
          itemType: 'medication',
          status: 'completed',
          itemId: `med-${i}`,
        }));
      }
      // Pad the schedule with pending so completion% won't qualify.
      for (let i = 0; i < 100; i++) {
        instances.push(inst({
          date: ymd(addDays(TODAY, -2)),
          windowLabel: 'afternoon',
          itemType: 'medication',
          status: 'pending',
          itemId: `pending-${i}`,
        }));
      }
      setMocks(instances, [], []);
      const out = await buildCaregiverWitness('default', TODAY);
      expect(out).not.toBeNull();
      expect(out!.source).toBe('medication_volume');
      expect(out!.line).toBe('12 medication windows hit this week');
    });
  });

  describe('Contract 5: forbidden-words audit', () => {
    const FORBIDDEN = /\b(great|amazing|crushing|fantastic|awesome|well done)\b|keep going|keep it up/i;

    // Hit each signal at least once and audit the resulting copy.
    const scenarios: Array<{
      name: string;
      build: () => { instances: any[]; logs: any[]; events: any[] };
    }> = [
      {
        name: 'morning_streak',
        build: () => {
          const instances = [];
          for (let n = 0; n < 7; n++) {
            instances.push(inst({
              date: ymd(addDays(TODAY, -n)),
              windowLabel: 'morning',
              status: 'completed',
            }));
          }
          return { instances, logs: [], events: [] };
        },
      },
      {
        name: 'high_completion_week',
        build: () => {
          const instances = [];
          for (let i = 0; i < 10; i++) {
            instances.push(inst({
              date: ymd(addDays(TODAY, -(i % 7))),
              windowLabel: 'afternoon',
              status: 'completed',
              itemId: `i-${i}`,
            }));
          }
          for (let i = 0; i < 2; i++) {
            instances.push(inst({
              date: ymd(addDays(TODAY, -(i % 7))),
              windowLabel: 'afternoon',
              status: 'pending',
              itemId: `p-${i}`,
            }));
          }
          return { instances, logs: [], events: [] };
        },
      },
      {
        name: 'medication_volume',
        build: () => {
          const instances = [];
          for (let i = 0; i < 12; i++) {
            instances.push(inst({
              date: ymd(addDays(TODAY, -1)),
              windowLabel: 'afternoon',
              itemType: 'medication',
              status: 'completed',
              itemId: `m-${i}`,
            }));
          }
          for (let i = 0; i < 200; i++) {
            instances.push(inst({
              date: ymd(addDays(TODAY, -2)),
              windowLabel: 'afternoon',
              itemType: 'medication',
              status: 'pending',
              itemId: `p-${i}`,
            }));
          }
          return { instances, logs: [], events: [] };
        },
      },
      {
        name: 'wellness_consistency',
        build: () => {
          const instances = [];
          for (let i = 0; i < 5; i++) {
            instances.push(inst({
              date: ymd(addDays(TODAY, -i)),
              windowLabel: 'afternoon',
              itemType: 'wellness',
              status: 'completed',
              itemId: `w-${i}`,
            }));
          }
          for (let i = 0; i < 200; i++) {
            instances.push(inst({
              date: ymd(addDays(TODAY, -2)),
              windowLabel: 'afternoon',
              itemType: 'wellness',
              status: 'pending',
              itemId: `pw-${i}`,
            }));
          }
          return { instances, logs: [], events: [] };
        },
      },
      {
        name: 'long_stretch_carried',
        build: () => {
          // 21 consecutive days with at least one completed instance.
          // Use afternoon windowLabel + lots of pending so neither
          // morning_streak nor high_completion qualifies.
          const instances = [];
          for (let n = 0; n < 21; n++) {
            instances.push(inst({
              date: ymd(addDays(TODAY, -n)),
              windowLabel: 'afternoon',
              status: 'completed',
              itemId: `s-${n}`,
            }));
          }
          // Pad so high_completion_week doesn't qualify.
          for (let i = 0; i < 200; i++) {
            instances.push(inst({
              date: ymd(addDays(TODAY, -(i % 7))),
              windowLabel: 'afternoon',
              status: 'pending',
              itemId: `pad-${i}`,
            }));
          }
          return { instances, logs: [], events: [] };
        },
      },
    ];

    for (const sc of scenarios) {
      it(`${sc.name}: line and footerLine contain no praise/cheerleading vocab`, async () => {
        const fix = sc.build();
        setMocks(fix.instances, fix.logs, fix.events);
        const out = await buildCaregiverWitness('default', TODAY);
        expect(out).not.toBeNull();
        expect(out!.line).not.toMatch(FORBIDDEN);
        expect(out!.footerLine).not.toMatch(FORBIDDEN);
      });
    }
  });

  describe('Contract 6: patient-name audit', () => {
    it('returned line and footerLine never echo "Mom" even when patient name is Mom', async () => {
      // The witness builder is patient-agnostic by design — it never
      // reads the patient's name. This contract pins that against any
      // future regression that pipes name interpolation into the copy.
      const instances = [];
      for (let n = 0; n < 7; n++) {
        instances.push(inst({
          date: ymd(addDays(TODAY, -n)),
          windowLabel: 'morning',
          status: 'completed',
        }));
      }
      setMocks(instances, [], []);
      const out = await buildCaregiverWitness('default', TODAY);
      expect(out).not.toBeNull();
      expect(out!.line).not.toContain('Mom');
      expect(out!.footerLine).not.toContain('Mom');
    });
  });

  describe('Contract 7: signal priority', () => {
    it('morning_streak wins over high_completion_week when both qualify', async () => {
      // 7/7 mornings completed AND ≥80% completion. Order says
      // morning_streak first.
      const instances = [];
      for (let n = 0; n < 7; n++) {
        instances.push(inst({
          date: ymd(addDays(TODAY, -n)),
          windowLabel: 'morning',
          status: 'completed',
          itemId: `m-${n}`,
        }));
      }
      setMocks(instances, [], []);
      const out = await buildCaregiverWitness('default', TODAY);
      expect(out!.source).toBe('morning_streak');
    });

    it('high_completion_week wins over medication_volume when both qualify', async () => {
      const instances = [];
      // 24/30 completion + 12 med completions. afternoon windowLabel
      // → morning_streak skipped.
      for (let i = 0; i < 24; i++) {
        instances.push(inst({
          date: ymd(addDays(TODAY, -(i % 7))),
          windowLabel: 'afternoon',
          status: 'completed',
          itemType: 'medication',
          itemId: `c-${i}`,
        }));
      }
      for (let i = 0; i < 6; i++) {
        instances.push(inst({
          date: ymd(addDays(TODAY, -(i % 7))),
          windowLabel: 'afternoon',
          status: 'pending',
          itemId: `p-${i}`,
        }));
      }
      setMocks(instances, [], []);
      const out = await buildCaregiverWitness('default', TODAY);
      expect(out!.source).toBe('high_completion_week');
    });
  });

  describe('Contract 8: union-dedup with narrativeSummaryBuilder pattern', () => {
    it('event + instance for same (carePlanItemId, scheduledTime) counts once', async () => {
      // 9 unique medication completions (instances) + 1 event that
      // duplicates the first instance via metadata.carePlanItemId +
      // metadata.scheduledTime. Without dedup, the count is 10 and
      // medication_volume qualifies. With dedup, it's 9 and the
      // signal does NOT qualify.
      const instances = [];
      for (let i = 0; i < 9; i++) {
        instances.push(inst({
          date: ymd(addDays(TODAY, -1)),
          windowLabel: 'afternoon',
          itemType: 'medication',
          status: 'completed',
          itemId: `m-${i}`,
          scheduledTime: `${ymd(addDays(TODAY, -1))}T0${i}:00:00Z`,
        }));
      }
      const dupEvent = ev('medication_taken', {
        date: ymd(addDays(TODAY, -1)),
        metadata: {
          carePlanItemId: 'm-0',
          scheduledTime: `${ymd(addDays(TODAY, -1))}T00:00:00Z`,
        },
      });
      // Pad with pending so high_completion_week doesn't qualify.
      for (let i = 0; i < 200; i++) {
        instances.push(inst({
          date: ymd(addDays(TODAY, -2)),
          windowLabel: 'afternoon',
          itemType: 'medication',
          status: 'pending',
          itemId: `pad-${i}`,
        }));
      }
      setMocks(instances, [], [dupEvent]);
      const out = await buildCaregiverWitness('default', TODAY);
      // Without dedup, medication_volume would fire with count=10.
      // With dedup, count=9 < threshold (10), no signal fires.
      if (out) {
        expect(out.source).not.toBe('medication_volume');
      }
    });
  });

  describe('long_stretch_carried footer converges on the recognition anchor', () => {
    it('footer ends with "Most people never see what that takes."', async () => {
      // Every multi-line footer hands off to the same closing line so
      // the caregiver always lands on the same recognition, regardless
      // of which signal fired. long_stretch_carried's line carries the
      // signal-specific observation; the footer's second line carries
      // the convergence anchor.
      const instances = [];
      for (let n = 0; n < 21; n++) {
        instances.push(inst({
          date: ymd(addDays(TODAY, -n)),
          windowLabel: 'afternoon',
          status: 'completed',
          itemId: `s-${n}`,
        }));
      }
      for (let i = 0; i < 200; i++) {
        instances.push(inst({
          date: ymd(addDays(TODAY, -(i % 7))),
          windowLabel: 'afternoon',
          status: 'pending',
          itemId: `pad-${i}`,
        }));
      }
      setMocks(instances, [], []);
      const out = await buildCaregiverWitness('default', TODAY);
      expect(out!.source).toBe('long_stretch_carried');
      expect(out!.footerLine).toBe(
        '21 days running.\nMost people never see what that takes.',
      );
    });
  });

  describe('Contract 9: skipped-status counts toward high_completion_week', () => {
    it('skipped instances count as caregiver-acted', async () => {
      // 16 completed + 8 skipped + 6 pending = 24/30 acted = 80%.
      const instances = [];
      for (let i = 0; i < 16; i++) {
        instances.push(inst({
          date: ymd(addDays(TODAY, -(i % 7))),
          windowLabel: 'afternoon',
          status: 'completed',
          itemId: `c-${i}`,
        }));
      }
      for (let i = 0; i < 8; i++) {
        instances.push(inst({
          date: ymd(addDays(TODAY, -(i % 7))),
          windowLabel: 'afternoon',
          status: 'skipped',
          itemId: `s-${i}`,
        }));
      }
      for (let i = 0; i < 6; i++) {
        instances.push(inst({
          date: ymd(addDays(TODAY, -(i % 7))),
          windowLabel: 'afternoon',
          status: 'pending',
          itemId: `p-${i}`,
        }));
      }
      setMocks(instances, [], []);
      const out = await buildCaregiverWitness('default', TODAY);
      expect(out).not.toBeNull();
      expect(out!.source).toBe('high_completion_week');
      expect(out!.line).toBe('You handled 80% of this week\'s schedule');
    });
  });
});
