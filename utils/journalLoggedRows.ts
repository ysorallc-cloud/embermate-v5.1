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

import type { DailyCareInstance, LogEntry } from '../types/carePlan';
import { getCareItemStatus } from './careItemStatus';
import { formatMedDisplay } from './medDisplay';

// Selected med symptoms are stored as lowercase ids ('nausea'); title-case them
// for the row so they read as the caregiver picked them ("Nausea, Tired").
function titleCase(s: string): string {
  return s.length ? s[0].toUpperCase() + s.slice(1) : s;
}

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

// Wellness instances carry the generic name "Wellness check" — distinguish the
// window so the caregiver doesn't have to disambiguate a missed-morning row
// from a pending-evening one (device-check refinement, matches FlatTimelineFeed
// displayNameFor). Other types keep their itemName.
function displayName(inst: DailyCareInstance): string {
  if (inst.itemType === 'wellness') {
    const w = String(inst.windowLabel ?? '').toLowerCase();
    if (w === 'morning') return 'Morning Wellness Check-in';
    if (w === 'evening') return 'Evening Wellness Check-in';
    if (w === 'afternoon') return 'Afternoon Wellness Check-in';
    if (w === 'night') return 'Night Wellness Check-in';
  }
  return inst.itemName;
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
  logs: LogEntry[] = [],
  now: Date = new Date(),
): JournalLogRow[] {
  const logById = new Map(logs.map((l) => [l.id, l]));
  return instances
    .map((inst) => {
      const d = parseDate(inst.scheduledTime);
      const status = stampRowStatus(inst, now);
      const time =
        status === 'missed' ? 'Missed'
        : status === 'due' ? `Due ${d ? clockShort(d) : ''}`.trim()
        : d ? clockLong(d) : '';
      // P1 dose de-dup — fold the med name + dose through formatMedDisplay so a
      // stored name that already contains the dose ("Aspirin 81mg") is not
      // doubled with the separate itemDosage ("Aspirin 81mg 81mg").
      const name =
        inst.itemType === 'medication'
          ? formatMedDisplay(displayName(inst), inst.itemDosage)
          : displayName(inst);
      // Bug 3 follow-up — the selected symptoms live on the completion LogEntry
      // (canonical MedicationLogData.sideEffects). Surface them on the med row so
      // the Journal shows what the caregiver picked (previously only the free-text
      // note reached the Journal, via Observations).
      let detail: string | undefined;
      if (inst.itemType === 'medication' && inst.logId) {
        const data: any = logById.get(inst.logId)?.data;
        if (data?.type === 'medication' && Array.isArray(data.sideEffects) && data.sideEffects.length > 0) {
          detail = `· ${data.sideEffects.map((e: string) => titleCase(e)).join(', ')}`;
        }
      }
      return {
        id: inst.id,
        type: typeLabel(inst.itemType),
        name,
        detail,
        time,
        status,
        _sort: d ? d.getTime() : Number.MAX_SAFE_INTEGER,
      };
    })
    .sort((a, b) => a._sort - b._sort)
    .map(({ _sort, ...row }) => row);
}
