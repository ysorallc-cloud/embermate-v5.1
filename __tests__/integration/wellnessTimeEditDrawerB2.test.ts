// ============================================================================
// HIGH #5 — Wellness time-edit UI + B2 time-change trigger chain.
//
// STATE BEFORE FIX: wellnessSettings.{period}.time is the single
// source of truth for check-in fire time (Q-34.NOT.B.3 lock). The
// backend is fully wired: syncOtherBucketsWithConfig resolves item
// `at` from wellnessSettings via resolveWellnessTime (B3),
// ensureDailyInstances refreshes today's stale instance scheduledTime
// (line-1194 staleness refresh), rescheduleAllNotifications reads
// listDailyInstances and schedules the OS notifications. But NO UI
// writes the time — WellnessCheckInDrawer renders fields + a
// Reminder switch and nothing else. The caregiver cannot change
// 07:00/20:00 at all. Write-path exists, no writer.
//
// B2 ASYMMETRIC TRIGGER (locked, pinned by wellnessFireTimeNotB3
// contract 7):
//   • reminderEnabled toggle → rescheduleAllNotifications ONLY
//     (B1 gate is a live read at schedule time).
//   • time change → ensureDailyInstances (internal sync resolves the
//     new time into items + refreshes today's instances) →
//     rescheduleAllNotifications. Fire-time is BAKED into
//     instance.scheduledTime, not read live — a bare reschedule
//     after a time edit fires stale.
//
// CONTRACT PINNED HERE (source-level, per drawer/wizard convention —
// behavior at the generator/scheduler layer is already pinned by
// wellnessFireTimeNotB3.test.ts and wellnessReminderSchedulerNotB1):
//   1. The drawer renders a time-edit affordance per period.
//   2. The time-change handler persists via the wellnessSettings
//      store AND invokes the FULL chain in order:
//      ensureDailyInstances → rescheduleAllNotifications.
//   3. The reminder toggle keeps the asymmetry: it must NOT call
//      ensureDailyInstances.
//   4. The stale "no notification service currently reads that
//      field" banked-gap comment is gone — B1 closed the consumer
//      side; leaving the comment misleads the next dev.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const DRAWER_PATH = join(
  __dirname,
  '../../components/careplan/drawers/WellnessCheckInDrawer.tsx',
);

describe('High #5 — wellness time-edit UI in WellnessCheckInDrawer', () => {
  const src = readFileSync(DRAWER_PATH, 'utf8');

  it('renders a time-edit affordance for the period', () => {
    expect(src).toMatch(/wellness-\$\{period\}-time/);
    expect(src).toMatch(/DateTimePicker/);
  });

  it('time-change handler runs the FULL B2 chain: ensureDailyInstances then reschedule', () => {
    expect(src).toMatch(/ensureDailyInstances/);
    const handlerMatch = src.match(
      /(handleTimeChange|onTimeChange|commitTime)[\s\S]*?ensureDailyInstances[\s\S]*?rescheduleAllNotifications/,
    );
    expect(handlerMatch).not.toBeNull();
  });

  it('time-change handler persists through the wellnessSettings store', () => {
    const persistMatch = src.match(
      /(handleTimeChange|onTimeChange|commitTime)[\s\S]*?(saveSettings|updateSettings|updatePeriod)/,
    );
    expect(persistMatch).not.toBeNull();
  });

  it('reminder toggle keeps the B2 asymmetry — reschedule only, NO ensureDailyInstances', () => {
    const start = src.indexOf('const toggleReminder');
    expect(start).toBeGreaterThan(-1);
    const next = src.indexOf('\n  const ', start + 1);
    const toggleBody = src.slice(start, next === -1 ? undefined : next);
    expect(toggleBody).not.toMatch(/ensureDailyInstances\(/);
    expect(toggleBody).toMatch(/rescheduleAllNotifications/);
  });

  it('stale "REMINDER GAP BANKED" comment removed — B1 closed the consumer side', () => {
    expect(src).not.toMatch(/currently reads that field/);
  });
});
