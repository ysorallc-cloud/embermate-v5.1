// ============================================================================
// JOURNAL LOGGED ROWS — the middle-section "WHAT WAS LOGGED" view-model.
//
// Journal rebuild (S2, journal-aligned): the middle section is an explicit
// chronological list of the day's care items (TYPE · name · time), NOT the
// pre-rebuild per-bucket narrative prose. Each row's STATUS is stamped ONCE
// here from getCareItemStatus (the PART-B stamped-status pattern — same seed
// as Now's spine node); the row never re-derives status, and the component
// maps the stamped status → color via the register map.
//
// TRUST-FLOOR (non-negotiable): a pending item past its window (getCareItem-
// Status → 'overdue') stamps 'missed', so missed vitals/wellness/meals still
// surface here — this is where the Option-A "Still to do" floor + the meals-§2
// missed-surfacing land in the rebuilt middle section. Missed items are NOT
// silently dropped.
// ============================================================================

import type { DailyCareInstance } from '../types/carePlan';
import { getCareItemStatus } from './careItemStatus';

export type LogRowStatus = 'done' | 'skipped' | 'due' | 'missed' | 'pending';

export interface JournalLogRow {
  id: string;
  /** Caps type label — 'MEDICATION' | 'VITALS' | 'MEAL' | 'WELLNESS' … */
  type: string;
  name: string;
  /** Optional denormalized dosage / detail appended after the name. */
  detail?: string;
  /** Display time: 'h:mm A' (done/pending), 'Due 5p' (due), 'Missed'. */
  time: string;
  /** Stamped once from getCareItemStatus — drives the row color downstream. */
  status: LogRowStatus;
}

const TYPE_LABEL: Record<string, string> = {
  medication: 'MEDICATION',
  vitals: 'VITALS',
  nutrition: 'MEAL',
  wellness: 'WELLNESS',
  hydration: 'HYDRATION',
  sleep: 'SLEEP',
  activity: 'ACTIVITY',
};

function typeLabel(itemType: string): string {
  return TYPE_LABEL[itemType] ?? String(itemType || '').toUpperCase();
}

function parseDate(scheduledTime: string): Date | null {
  if (!scheduledTime) return null;
  let d = new Date(scheduledTime);
  if (isNaN(d.getTime()) && /^\d{2}:\d{2}/.test(scheduledTime)) {
    const today = new Date().toISOString().slice(0, 10);
    d = new Date(`${today}T${scheduledTime}:00`);
  }
  return isNaN(d.getTime()) ? null : d;
}

function clockLong(d: Date): string {
  let h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12; if (h === 0) h = 12;
  return `${h}:${String(m).padStart(2, '0')} ${ampm}`;
}

function clockShort(d: Date): string {
  let h = d.getHours();
  const m = d.getMinutes();
  const ap = h >= 12 ? 'p' : 'a';
  h = h % 12; if (h === 0) h = 12;
  return m === 0 ? `${h}${ap}` : `${h}:${String(m).padStart(2, '0')}${ap}`;
}

/** Stamp the row status ONCE from getCareItemStatus (never re-derived per row). */
function stampRowStatus(inst: DailyCareInstance, now: Date): LogRowStatus {
  if (inst.status === 'completed') return 'done';
  if (inst.status === 'skipped') return 'skipped';
  const cs = getCareItemStatus(inst, now);
  if (cs === 'overdue') return 'missed';
  if (cs === 'due') return 'due';
  return 'pending';
}

/**
 * Build the middle section's chronological log rows from the day's instances.
 * Sorted by scheduledTime asc. Status stamped once via getCareItemStatus.
 */
export function buildJournalLoggedRows(
  instances: DailyCareInstance[],
  now: Date = new Date(),
): JournalLogRow[] {
  return instances
    .map((inst) => {
      const d = parseDate(inst.scheduledTime);
      const status = stampRowStatus(inst, now);
      const time =
        status === 'missed' ? 'Missed'
        : status === 'due' ? `Due ${d ? clockShort(d) : ''}`.trim()
        : d ? clockLong(d) : '';
      const detail = inst.itemType === 'medication' ? inst.itemDosage : undefined;
      return {
        id: inst.id,
        type: typeLabel(inst.itemType),
        name: inst.itemName,
        detail,
        time,
        status,
        _sort: d ? d.getTime() : Number.MAX_SAFE_INTEGER,
      };
    })
    .sort((a, b) => a._sort - b._sort)
    .map(({ _sort, ...row }) => row);
}
