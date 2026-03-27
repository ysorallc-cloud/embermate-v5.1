// ============================================================================
// USE CALENDAR STATUSES — Generates DayStatus[] for MonthCalendar
// ============================================================================

import { useMemo, useState, useEffect } from 'react';
import { getEventsByDate } from '../storage/eventRepo';
import { listDailyInstances, DEFAULT_PATIENT_ID } from '../storage/carePlanRepo';
import { logError } from '../utils/devLog';
import type { DayStatus } from '../components/journal/MonthCalendar';

// ============================================================================
// HELPERS
// ============================================================================

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function todayStr(): string {
  const t = new Date();
  return `${t.getFullYear()}-${pad2(t.getMonth() + 1)}-${pad2(t.getDate())}`;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

// ============================================================================
// HOOK
// ============================================================================

export function useCalendarStatuses(year: number, month: number) {
  const [statuses, setStatuses] = useState<DayStatus[]>([]);
  const [loading, setLoading] = useState(true);

  const today = todayStr();

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        const daysInMonth = getDaysInMonth(year, month);
        const results: DayStatus[] = [];

        for (let day = 1; day <= daysInMonth; day++) {
          const dateStr = `${year}-${pad2(month + 1)}-${pad2(day)}`;

          // Future days
          if (dateStr > today) {
            results.push({ date: dateStr, status: 'future' });
            continue;
          }

          // Check daily instances (scheduled tasks)
          const instances = await listDailyInstances(DEFAULT_PATIENT_ID, dateStr);
          const events = await getEventsByDate(dateStr, 'default');

          const totalScheduled = instances.length;
          const completedInstances = instances.filter(
            i => i.status === 'completed' || i.status === 'skipped'
          ).length;
          const totalEvents = events.length;

          if (totalScheduled === 0 && totalEvents === 0) {
            results.push({ date: dateStr, status: 'none' });
          } else if (totalScheduled > 0 && completedInstances >= totalScheduled) {
            results.push({ date: dateStr, status: 'full' });
          } else if (completedInstances > 0 || totalEvents > 0) {
            results.push({ date: dateStr, status: 'partial' });
          } else {
            results.push({ date: dateStr, status: 'none' });
          }
        }

        if (!cancelled) {
          setStatuses(results);
        }
      } catch (err) {
        logError('useCalendarStatuses.load', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [year, month, today]);

  return { statuses, loading };
}
