// ============================================================================
// CARE PLAN REPOSITORY
// Storage layer for CarePlan, DailyCareInstance, and LogEntry
// Uses AsyncStorage with indexed keys for fast lookups
// ============================================================================

import { safeGetItem, safeSetItem } from '../utils/safeStorage';
import { generateUniqueId } from '../utils/idGenerator';
import { emitDataUpdate } from '../lib/events';
import { EVENT } from '../lib/eventNames';
import { withKeyLock } from '../utils/keyLock';
import { logWarning } from '../utils/devLog';
// getCareItemStatus previously created a real circular import
// (carePlanRepo -> careItemStatus -> carePlanGenerator -> carePlanRepo,
// since careItemStatus pulled MISSED_GRACE_PERIOD_MINUTES/getDefaultWindowEnd
// from carePlanGenerator). Closed by extracting those two into the leaf
// module utils/careWindowRules.ts (no imports from carePlanGenerator or
// carePlanRepo) — careItemStatus now imports from there instead. Reused
// deliberately per the "derivation over more persisted state" preference —
// recomputes the missed-vs-pending boundary from the SAME rule Now/Journal
// already use, instead of introducing a second, driftable source of truth.
import { getCareItemStatus } from '../utils/careItemStatus';
import {
  CarePlan,
  CarePlanItem,
  DailyCareInstance,
  LogEntry,
  LogOutcome,
  LogEntryData,
  LogSource,
  DailySchedule,
  TimeWindowLabel,
} from '../types/carePlan';
import { DEFAULT_PATIENT_ID } from '../types/patient';

// Re-export for consumers that import from here
export { DEFAULT_PATIENT_ID };

// ============================================================================
// STORAGE KEYS
// ============================================================================

const KEYS = {
  // CarePlan (one active per patient)
  CARE_PLAN: (patientId: string) => `@embermate_regimen_v2:${patientId}`,
  CARE_PLAN_ITEMS: (carePlanId: string) => `@embermate_regimen_items_v2:${carePlanId}`,

  // Daily Instances (indexed by patient + date for fast daily lookups)
  DAILY_INSTANCES: (patientId: string, date: string) => `@embermate_instances_v2:${patientId}:${date}`,
  DAILY_INSTANCES_INDEX: (patientId: string) => `@embermate_instances_index_v2:${patientId}`,

  // Logs (indexed by patient + date)
  LOGS: (patientId: string, date: string) => `@embermate_logs_v2:${patientId}:${date}`,
  LOGS_INDEX: (patientId: string) => `@embermate_logs_index_v2:${patientId}`,
  ALL_LOGS: (patientId: string) => `@embermate_all_logs_v2:${patientId}`,
};

// ============================================================================
// CARE PLAN OPERATIONS
// ============================================================================

/**
 * Get the active CarePlan for a patient
 */
export async function getActiveCarePlan(
  patientId: string = DEFAULT_PATIENT_ID
): Promise<CarePlan | null> {
  const plan = await safeGetItem<CarePlan | null>(KEYS.CARE_PLAN(patientId), null);
  if (plan && plan.status === 'active') {
    return plan;
  }
  return null;
}

/**
 * Get CarePlan by ID (regardless of status)
 */
export async function getCarePlanById(
  patientId: string,
  carePlanId: string
): Promise<CarePlan | null> {
  const plan = await safeGetItem<CarePlan | null>(KEYS.CARE_PLAN(patientId), null);
  if (plan && plan.id === carePlanId) {
    return plan;
  }
  return null;
}

/**
 * Create or update a CarePlan
 */
export async function upsertCarePlan(plan: CarePlan): Promise<CarePlan> {
  const now = new Date().toISOString();
  const existing = await getCarePlanById(plan.patientId, plan.id);

  const updatedPlan: CarePlan = {
    ...plan,
    version: existing ? existing.version + 1 : 1,
    updatedAt: now,
    createdAt: existing?.createdAt || now,
  };

  const ok = await safeSetItem(KEYS.CARE_PLAN(plan.patientId), updatedPlan);
  if (ok) emitDataUpdate(EVENT.CARE_PLAN);
  return updatedPlan;
}

/**
 * Create a new CarePlan with defaults
 */
export async function createCarePlan(
  patientId: string = DEFAULT_PATIENT_ID,
  timezone: string = Intl.DateTimeFormat().resolvedOptions().timeZone
): Promise<CarePlan> {
  const now = new Date().toISOString();
  const today = now.split('T')[0];

  const plan: CarePlan = {
    id: generateUniqueId(),
    patientId,
    timezone,
    startDate: today,
    status: 'active',
    version: 1,
    createdAt: now,
    updatedAt: now,
  };

  const ok = await safeSetItem(KEYS.CARE_PLAN(patientId), plan);
  if (ok) emitDataUpdate(EVENT.CARE_PLAN);
  return plan;
}

/**
 * Archive a CarePlan (soft delete)
 */
export async function archiveCarePlan(
  patientId: string,
  carePlanId: string
): Promise<void> {
  const plan = await getCarePlanById(patientId, carePlanId);
  if (plan) {
    await upsertCarePlan({ ...plan, status: 'archived' });
  }
}

// ============================================================================
// CARE PLAN ITEM OPERATIONS
// ============================================================================

/**
 * List all items for a CarePlan
 */
export async function listCarePlanItems(
  carePlanId: string,
  options: { activeOnly?: boolean } = {}
): Promise<CarePlanItem[]> {
  const items = await safeGetItem<CarePlanItem[]>(KEYS.CARE_PLAN_ITEMS(carePlanId), []);

  if (options.activeOnly) {
    return items.filter(item => item.active);
  }
  return items;
}

/**
 * Get a single CarePlanItem by ID
 */
export async function getCarePlanItem(
  carePlanId: string,
  itemId: string
): Promise<CarePlanItem | null> {
  const items = await listCarePlanItems(carePlanId);
  return items.find(item => item.id === itemId) || null;
}

/**
 * Create or update a CarePlanItem
 */
export async function upsertCarePlanItem(item: CarePlanItem): Promise<CarePlanItem> {
  const now = new Date().toISOString();
  const items = await listCarePlanItems(item.carePlanId);

  const existingIndex = items.findIndex(i => i.id === item.id);
  const updatedItem: CarePlanItem = {
    ...item,
    updatedAt: now,
    createdAt: existingIndex >= 0 ? items[existingIndex].createdAt : now,
  };

  if (existingIndex >= 0) {
    items[existingIndex] = updatedItem;
  } else {
    items.push(updatedItem);
  }

  const ok = await safeSetItem(KEYS.CARE_PLAN_ITEMS(item.carePlanId), items);
  if (ok) emitDataUpdate(EVENT.CARE_PLAN_ITEMS);
  return updatedItem;
}

/**
 * Archive a CarePlanItem (sets active=false)
 */
export async function archiveCarePlanItem(
  carePlanId: string,
  itemId: string
): Promise<void> {
  const item = await getCarePlanItem(carePlanId, itemId);
  if (item) {
    await upsertCarePlanItem({ ...item, active: false });
  }
}

/**
 * Delete a CarePlanItem permanently
 */
export async function deleteCarePlanItem(
  carePlanId: string,
  itemId: string
): Promise<void> {
  const items = await listCarePlanItems(carePlanId);
  const filtered = items.filter(i => i.id !== itemId);
  const ok = await safeSetItem(KEYS.CARE_PLAN_ITEMS(carePlanId), filtered);
  if (ok) emitDataUpdate(EVENT.CARE_PLAN_ITEMS);
}

// ============================================================================
// DAILY CARE INSTANCE OPERATIONS
// ============================================================================

/**
 * List all instances for a patient on a specific date.
 *
 * Phase 34 F5.1.1 — bottom-layer soft-delete filter. Default reads
 * hide tombstoned (`deactivatedAt`) instances; audit-trail consumers
 * (insights, exports, edit-history v1.1+) opt in via
 * `{ includeDeactivated: true }`. Parallels Slice 3-D's
 * listLogsByDate / getLogById / listLogsInRange treatment of
 * LogEntry.deletedAt.
 */
export async function listDailyInstances(
  patientId: string,
  date: string,
  options: { includeDeactivated?: boolean } = {}
): Promise<DailyCareInstance[]> {
  const raw = await safeGetItem<DailyCareInstance[]>(KEYS.DAILY_INSTANCES(patientId, date), []);
  if (options.includeDeactivated) return raw;
  return raw.filter((i) => !i.deactivatedAt);
}

/**
 * Get a single instance by ID
 */
export async function getDailyInstance(
  patientId: string,
  date: string,
  instanceId: string
): Promise<DailyCareInstance | null> {
  const instances = await listDailyInstances(patientId, date);
  return instances.find(i => i.id === instanceId) || null;
}

// ============================================================================
// STALE-STATUS-WRITE-CLASS CLOSEOUT — PART B write-boundary guard.
//
// NOT.B3 (carePlanGenerator.ts) was the 4th manifestation of one root
// cause: a write decided from a stale snapshot clobbers a fresher acted
// status back to 'pending'. That fix closed ONE caller. This guard closes
// the CLASS, at the only two primitives that can overwrite status on an
// existing instance ID — updateDailyInstanceStatus and upsertDailyInstances
// — so a future caller can't reintroduce the same bug shape undetected.
//
// INVARIANT: no write may transition an instance from an acted status
// (completed | skipped | partial | missed) back to 'pending', except via
// an explicitly authorized undo path ({ reason: 'undo' } — a narrow,
// intentional opt-in, not a boolean bypass or an ambient flag a future
// caller could accidentally inherit).
//
// FAILURE SEMANTICS — both, deliberately:
//   - Auto-correct: preserve the acted status (+ its logId/skipReason,
//     which are semantically PART of that status, not independent
//     fields), while still applying every OTHER field the write intended
//     (scheduledTime, etc.) — mirrors what the NOT.B3 fix already does
//     deliberately in carePlanGenerator.ts. A caregiver must never lose
//     a legitimate field update to this guard, only the illegal part of
//     the write.
//   - Loud: logWarning always (dev console + Sentry in production), and
//     throw when __DEV__ so the offending caller surfaces in tests/dev
//     immediately, instead of a silent auto-correct reaching production
//     unnoticed — which is exactly how this class reached NOT.B3 (a 4th
//     occurrence nobody caught until a caregiver-visible symptom).
// ============================================================================

const ACTED_STATUSES: ReadonlySet<DailyCareInstance['status']> = new Set([
  'completed', 'skipped', 'partial', 'missed',
]);

interface GuardResult {
  value: DailyCareInstance;
  blockedStatus: DailyCareInstance['status'] | null;
}

/**
 * Applies the write-boundary guard to a single instance write. `current` is
 * the freshly-read persisted record (read under the same lock as the write,
 * per PART C); `next` is the fully-formed object the caller wants to
 * persist. Returns the object that should actually be written — `next`
 * unchanged when the write is legitimate, or `next` with the status triad
 * reset to `current`'s values when it isn't — PLUS whether it was blocked,
 * so the caller can persist first and throw only after the write succeeds
 * (never skip a legitimate write in the same batch to raise the alarm).
 */
function guardPendingRegression(
  current: DailyCareInstance,
  next: DailyCareInstance,
  opts?: { reason?: 'undo' },
): GuardResult {
  const isUnauthorizedPendingRegression =
    opts?.reason !== 'undo' &&
    ACTED_STATUSES.has(current.status) &&
    next.status === 'pending';

  if (!isUnauthorizedPendingRegression) return { value: next, blockedStatus: null };

  const corrected: DailyCareInstance = {
    ...next,
    status: current.status,
    logId: current.logId,
    skipReason: current.skipReason,
  };

  logWarning(
    'carePlanRepo.guardPendingRegression',
    `Blocked an unauthorized ${current.status} -> pending write on instance ${current.id}. Status preserved; other fields in the write still applied.`,
  );

  return { value: corrected, blockedStatus: current.status };
}

/** Throws in dev/test once the guarded write has actually persisted —
 *  never before, so a blocked field never costs the batch its legitimate
 *  writes. Both effects always happen together: data is safe either way;
 *  __DEV__ additionally surfaces the offending caller immediately. */
function throwIfBlockedInDev(blockedStatus: DailyCareInstance['status'] | null, instanceId: string): void {
  if (blockedStatus && __DEV__) {
    throw new Error(
      `carePlanRepo: blocked an unauthorized ${blockedStatus} -> pending write on instance ${instanceId} (pass { reason: 'undo' } if this is a genuine undo)`,
    );
  }
}

/**
 * Bulk upsert daily instances
 */
export async function upsertDailyInstances(
  patientId: string,
  date: string,
  instances: DailyCareInstance[],
  opts?: { reason?: 'undo' },
): Promise<DailyCareInstance[]> {
  const lockKey = KEYS.DAILY_INSTANCES(patientId, date);
  return withKeyLock(lockKey, async () => {
    const now = new Date().toISOString();
    // Phase 34 F5.1.1 — opt into includeDeactivated so the bulk
    // upsert merges over tombstoned entries (same Slice 3-D
    // createLogEntry trap pattern). Without this, the default
    // soft-delete filter would hide tombstoned instances from the
    // read and they'd be silently lost when we write the array back.
    const existing = await listDailyInstances(patientId, date, { includeDeactivated: true });
    const existingMap = new Map(existing.map(i => [i.id, i]));

    const result: DailyCareInstance[] = [];
    // First blocked write in this batch, if any — thrown AFTER the batch
    // persists (see throwIfBlockedInDev), so one bad item in a bulk call
    // never costs its siblings their legitimate writes.
    let firstBlocked: { status: DailyCareInstance['status']; id: string } | null = null;

    for (const instance of instances) {
      const existingInstance = existingMap.get(instance.id);
      let updatedInstance: DailyCareInstance = {
        ...instance,
        updatedAt: now,
        createdAt: existingInstance?.createdAt || now,
      };
      if (existingInstance) {
        const guarded = guardPendingRegression(existingInstance, updatedInstance, opts);
        updatedInstance = guarded.value;
        if (guarded.blockedStatus && !firstBlocked) {
          firstBlocked = { status: guarded.blockedStatus, id: instance.id };
        }
      }
      existingMap.set(instance.id, updatedInstance);
      result.push(updatedInstance);
    }

    const ok = await safeSetItem(KEYS.DAILY_INSTANCES(patientId, date), Array.from(existingMap.values()));
    if (!ok) return result;

    // Update index
    await updateInstanceIndex(patientId, date);

    emitDataUpdate(EVENT.DAILY_INSTANCES);
    if (firstBlocked) throwIfBlockedInDev(firstBlocked.status, firstBlocked.id);
    return result;
  });
}

/**
 * PART C of the stale-status-write-class closeout. Read-decide-write for a
 * SINGLE existing instance, entirely inside the key lock.
 *
 * ensureDailyInstances's per-window loop used to read existingInstances
 * ONCE at the top of the function, then decide a status (missed-check /
 * staleness-refresh) and write per instance further down. withKeyLock
 * serialized the physical writes, but not the DECISION — it was made from
 * a snapshot taken before any lock was ever held. A caregiver write
 * (logInstanceCompletion) landing against the same instance after that
 * snapshot but before the pass's write could be stomped by a decision that
 * never saw it (triage-A: discards the caregiver's own logged action).
 *
 * `reviser` receives the FRESHLY re-read current record — read inside this
 * function's own lock, not the caller's stale copy — and returns the
 * fields to change, or `null` for "no change, skip the write" (keeps the
 * NOT.B3 property: one decision, one write per instance per pass, never
 * a write when nothing actually changed).
 */
export async function reviseDailyInstance(
  patientId: string,
  date: string,
  instanceId: string,
  reviser: (current: DailyCareInstance) => Partial<DailyCareInstance> | null,
): Promise<DailyCareInstance | null> {
  const lockKey = KEYS.DAILY_INSTANCES(patientId, date);
  return withKeyLock(lockKey, async () => {
    const instances = await listDailyInstances(patientId, date, { includeDeactivated: true });
    const index = instances.findIndex(i => i.id === instanceId);
    if (index === -1) return null;

    const current = instances[index];
    const changes = reviser(current);
    if (!changes) return current;

    const now = new Date().toISOString();
    let next: DailyCareInstance = { ...current, ...changes, updatedAt: now };

    const guarded = guardPendingRegression(current, next);
    next = guarded.value;
    instances[index] = next;

    const ok = await safeSetItem(KEYS.DAILY_INSTANCES(patientId, date), instances);
    if (ok) emitDataUpdate(EVENT.DAILY_INSTANCES);
    if (guarded.blockedStatus) throwIfBlockedInDev(guarded.blockedStatus, instanceId);
    return instances[index];
  });
}

/**
 * Update a single instance's status
 */
export async function updateDailyInstanceStatus(
  patientId: string,
  date: string,
  instanceId: string,
  status: DailyCareInstance['status'],
  logId?: string,
  skipReason?: DailyCareInstance['skipReason'],
  opts?: { reason?: 'undo' },
): Promise<DailyCareInstance | null> {
  const lockKey = KEYS.DAILY_INSTANCES(patientId, date);
  return withKeyLock(lockKey, async () => {
    // Phase 34 F5.1.2 β fix — opt into includeDeactivated so the
    // write-back preserves tombstoned entries. Pre-F5.1.2 this
    // primitive read via the default filter (hiding tombstoned),
    // then wrote back the full filtered array — silently erasing
    // every tombstoned instance every time a caregiver completed/
    // skipped/missed/changed status on any LIVE instance. Same
    // trap class as Slice 3-D's createLogEntry / deleteLogEntry
    // pre-includeDeleted fixes. The trap was latent (no walk
    // path triggered it before F5.1.1 added tombstones), and is
    // closed in the same F5.1.2 commit as the audit-trail
    // predicate refinement so the class-of-bug guard is uniform.
    const instances = await listDailyInstances(patientId, date, { includeDeactivated: true });
    const index = instances.findIndex(i => i.id === instanceId);

    if (index === -1) return null;

    const now = new Date().toISOString();
    let next: DailyCareInstance = {
      ...instances[index],
      status,
      logId,
      updatedAt: now,
    };
    // Only carry skipReason when the new status is 'skipped'; clear otherwise
    // so an undo or re-log doesn't leave stale reason metadata behind.
    if (status === 'skipped' && skipReason) {
      next.skipReason = skipReason;
    } else {
      delete next.skipReason;
    }

    const guarded = guardPendingRegression(instances[index], next, opts);
    next = guarded.value;
    instances[index] = next;

    const ok = await safeSetItem(KEYS.DAILY_INSTANCES(patientId, date), instances);
    if (ok) emitDataUpdate(EVENT.DAILY_INSTANCES);
    if (guarded.blockedStatus) throwIfBlockedInDev(guarded.blockedStatus, instanceId);
    return instances[index];
  });
}

/**
 * Remove instances that don't match valid item IDs (cleanup stale data)
 * Called when Care Plan items are deleted or deactivated
 */
export async function removeStaleInstances(
  patientId: string,
  date: string,
  validItemIds: Set<string>
): Promise<number> {
  const lockKey = KEYS.DAILY_INSTANCES(patientId, date);
  return withKeyLock(lockKey, async () => {
    // Phase 34 F5.1.1 — primitive upgraded from hard-delete to
    // soft-delete (parallel to removeStaleWindowInstances below).
    // F5.1.2 — audit-trail preservation predicate REFINED. Pre-
    // F5.1.2 ALL non-pending statuses ('completed' | 'skipped' |
    // 'missed' | 'partial') were preserved under "audit-trail."
    // But 'missed' is SYSTEM-marked by ensureDailyInstances step 4
    // (pending → missed once past grace), NOT caregiver-acted.
    // Preserving missed across schedule changes left missed rows
    // visible on Now after the caregiver toggled the bucket OFF
    // (or removed the chip) — F5.1.1's user-reported regression.
    //
    // Refined contract:
    //   • Caregiver-acted statuses ('completed' | 'skipped' |
    //     'partial') for items not in validItemIds → PRESERVED
    //     VISIBLE (audit-trail intact across schedule changes).
    //   • Pending OR missed for items not in validItemIds →
    //     tombstone (set deactivatedAt; default reads hide them,
    //     includeDeactivated opt-in surfaces them).
    // Symmetric with removeStaleWindowInstances below.
    //
    // Internal read uses includeDeactivated so this sweep is
    // idempotent over already-tombstoned entries (Slice 3-D
    // createLogEntry/deleteLogEntry trap class).
    const instances = await listDailyInstances(patientId, date, { includeDeactivated: true });
    const now = new Date().toISOString();
    let tombstoned = 0;
    const next = instances.map((i) => {
      if (i.deactivatedAt) return i;
      if (validItemIds.has(i.carePlanItemId)) return i;
      // F5.1.2 — preserve ONLY caregiver-acted statuses. Missed
      // is system-marked and tombstones with pending.
      if (
        i.status === 'completed' ||
        i.status === 'skipped' ||
        i.status === 'partial'
      ) return i;
      tombstoned++;
      return { ...i, deactivatedAt: now };
    });
    if (tombstoned > 0) {
      const ok = await safeSetItem(KEYS.DAILY_INSTANCES(patientId, date), next);
      if (ok) emitDataUpdate(EVENT.DAILY_INSTANCES);
    }
    return tombstoned;
  });
}

/**
 * Phase 34 F5.1.1 — soft-deactivate DailyCareInstances whose windowId
 * is no longer in their item's current schedule.times. The class-of-
 * bug fix for "control doesn't control" when a caregiver removes a
 * window from a multi-window bucket's chip set (vitals + wellness +
 * any future bucket with one CarePlanItem holding multiple time
 * windows). Sister primitive to removeStaleInstances; both run from
 * ensureDailyInstances.
 *
 * Tombstones the stale instance by writing `deactivatedAt = now` ISO
 * timestamp. Raw storage retains the instance (hide-not-delete); the
 * default listDailyInstances reader filters it out.
 *
 * Hide-not-delete refinement (F5.1.2): only CAREGIVER-ACTED statuses
 * ('completed' | 'skipped' | 'partial') are preserved across window
 * changes. Pending and missed instances tombstone — missed is
 * system-marked by ensureDailyInstances step 4, not caregiver-acted,
 * so preserving it across schedule changes left missed rows on Now
 * after a chip removal (F5.1.1 user-reported regression).
 *
 * Items not present in `validWindowIdsByItem` are left untouched —
 * the caller (ensureDailyInstances) controls which items get window-
 * level cleanup; unknown items get the item-level cleanup via
 * removeStaleInstances. Class-of-bug guard matching wellness Pass-B
 * "unknown id form" pattern.
 */
export async function removeStaleWindowInstances(
  patientId: string,
  date: string,
  validWindowIdsByItem: Map<string, Set<string>>
): Promise<number> {
  const lockKey = KEYS.DAILY_INSTANCES(patientId, date);
  return withKeyLock(lockKey, async () => {
    const instances = await listDailyInstances(patientId, date, { includeDeactivated: true });
    const now = new Date().toISOString();
    let tombstoned = 0;
    const next = instances.map((i) => {
      if (i.deactivatedAt) return i; // already tombstoned
      // F5.1.2 — preserve ONLY caregiver-acted statuses (symmetric
      // with removeStaleInstances above). Missed is system-marked
      // and tombstones with pending.
      if (
        i.status === 'completed' ||
        i.status === 'skipped' ||
        i.status === 'partial'
      ) return i;
      const valid = validWindowIdsByItem.get(i.carePlanItemId);
      if (!valid) return i; // item not tracked by this cleanup
      if (valid.has(i.windowId)) return i; // current window — keep
      tombstoned++;
      return { ...i, deactivatedAt: now };
    });
    if (tombstoned > 0) {
      const ok = await safeSetItem(KEYS.DAILY_INSTANCES(patientId, date), next);
      if (ok) emitDataUpdate(EVENT.DAILY_INSTANCES);
    }
    return tombstoned;
  });
}

/**
 * Update instance index (tracks which dates have instances)
 */
async function updateInstanceIndex(patientId: string, date: string): Promise<void> {
  const index = await safeGetItem<string[]>(KEYS.DAILY_INSTANCES_INDEX(patientId), []);
  if (!index.includes(date)) {
    index.push(date);
    index.sort();
    // Keep only last 90 days
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);
    const cutoffStr = cutoff.toISOString().split('T')[0];
    const filtered = index.filter(d => d >= cutoffStr);
    await safeSetItem(KEYS.DAILY_INSTANCES_INDEX(patientId), filtered);
  }
}

/**
 * Get instances for a date range
 */
export async function listDailyInstancesRange(
  patientId: string,
  startDate: string,
  endDate: string
): Promise<DailyCareInstance[]> {
  const index = await safeGetItem<string[]>(KEYS.DAILY_INSTANCES_INDEX(patientId), []);
  const relevantDates = index.filter(d => d >= startDate && d <= endDate);

  const allInstances: DailyCareInstance[] = [];
  for (const date of relevantDates) {
    const instances = await listDailyInstances(patientId, date);
    allInstances.push(...instances);
  }

  return allInstances.sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
}

// ============================================================================
// LOG ENTRY OPERATIONS
// ============================================================================

/**
 * Create a new log entry (immutable - no updates allowed)
 */
export async function createLogEntry(
  log: Omit<LogEntry, 'id' | 'createdAt' | 'immutable'>
): Promise<LogEntry> {
  const now = new Date().toISOString();
  const date = log.date || log.timestamp.split('T')[0];

  const newLog: LogEntry = {
    ...log,
    id: generateUniqueId(),
    date,
    immutable: true,
    createdAt: now,
  };

  // Store in daily bucket — bail early if this fails. Opt into
  // includeDeleted so tombstoned entries in the same date are
  // preserved when we write the new entry back (the default
  // filter would silently drop them).
  const dailyLogs = await listLogsByDate(log.patientId, date, { includeDeleted: true });
  dailyLogs.push(newLog);
  const dailyOk = await safeSetItem(KEYS.LOGS(log.patientId, date), dailyLogs);
  if (!dailyOk) return newLog;

  // Update index
  await updateLogIndex(log.patientId, date);

  // Also store in append-only all-logs
  const allLogs = await safeGetItem<LogEntry[]>(KEYS.ALL_LOGS(log.patientId), []);
  allLogs.push(newLog);
  // Keep only last 5000 logs
  const trimmed = allLogs.slice(-5000);
  await safeSetItem(KEYS.ALL_LOGS(log.patientId), trimmed);

  emitDataUpdate(EVENT.LOGS);
  return newLog;
}

/**
 * List logs for a specific date
 */
export async function listLogsByDate(
  patientId: string,
  date: string,
  options: { includeDeleted?: boolean } = {}
): Promise<LogEntry[]> {
  const raw = await safeGetItem<LogEntry[]>(KEYS.LOGS(patientId, date), []);
  // Phase 35 Slice 3-D — bottom-layer soft-delete filter. Default reads
  // hide tombstoned entries; audit-trail consumers opt in.
  if (options.includeDeleted) return raw;
  return raw.filter((l) => !l.deletedAt);
}

/**
 * List logs for a date range
 */
export async function listLogsInRange(
  patientId: string,
  startDate: string,
  endDate: string,
  options: { itemId?: string; includeDeleted?: boolean } = {}
): Promise<LogEntry[]> {
  const index = await safeGetItem<string[]>(KEYS.LOGS_INDEX(patientId), []);
  const relevantDates = index.filter(d => d >= startDate && d <= endDate);

  const allLogs: LogEntry[] = [];
  for (const date of relevantDates) {
    // Soft-delete filter cascades — pass the includeDeleted flag
    // through so the range read honors the same default-hide
    // contract listLogsByDate enforces.
    const logs = await listLogsByDate(patientId, date, {
      includeDeleted: options.includeDeleted,
    });
    allLogs.push(...logs);
  }

  let filtered = allLogs;
  if (options.itemId) {
    filtered = filtered.filter(log => log.carePlanItemId === options.itemId);
  }

  return filtered.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

/**
 * Get log by ID
 */
export async function getLogById(
  patientId: string,
  date: string,
  logId: string,
  options: { includeDeleted?: boolean } = {}
): Promise<LogEntry | null> {
  const logs = await listLogsByDate(patientId, date, options);
  return logs.find(l => l.id === logId) || null;
}

/**
 * Update log index (tracks which dates have logs)
 */
async function updateLogIndex(patientId: string, date: string): Promise<void> {
  const index = await safeGetItem<string[]>(KEYS.LOGS_INDEX(patientId), []);
  if (!index.includes(date)) {
    index.push(date);
    index.sort();
    // Keep only last 365 days
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 365);
    const cutoffStr = cutoff.toISOString().split('T')[0];
    const filtered = index.filter(d => d >= cutoffStr);
    await safeSetItem(KEYS.LOGS_INDEX(patientId), filtered);
  }
}

// ============================================================================
// COMBINED OPERATIONS
// ============================================================================

/** Shared LogOutcome -> DailyCareInstance.status mapping. Used by
 *  logInstanceCompletion, resurrectLogEntry, and undoInstanceCompletion's
 *  prior-log restoration — one map, not three independent copies. */
const LOG_OUTCOME_TO_INSTANCE_STATUS: Record<LogOutcome, DailyCareInstance['status']> = {
  taken: 'completed',
  completed: 'completed',
  skipped: 'skipped',
  partial: 'partial',
  missed: 'missed',
};

/**
 * Log completion of a daily instance
 */
export async function logInstanceCompletion(
  patientId: string,
  date: string,
  instanceId: string,
  outcome: LogOutcome,
  data?: LogEntryData,
  options: {
    notes?: string;
    source?: LogSource;
    caregiverName?: string;
    /** Only honoured when outcome === 'skipped' (Now-tab inline skip menu). */
    skipReason?: 'refused' | 'too-soon' | 'other';
  } = {}
): Promise<{ instance: DailyCareInstance; log: LogEntry } | null> {
  const instance = await getDailyInstance(patientId, date, instanceId);
  if (!instance) return null;

  const skipReason = outcome === 'skipped' ? options.skipReason : undefined;

  // Create the log entry
  const log = await createLogEntry({
    patientId,
    carePlanId: instance.carePlanId,
    carePlanItemId: instance.carePlanItemId,
    dailyInstanceId: instanceId,
    timestamp: new Date().toISOString(),
    date,
    outcome,
    skipReason,
    notes: options.notes,
    data,
    source: options.source || 'record',
    caregiverName: options.caregiverName,
  });

  // Update the instance
  const updatedInstance = await updateDailyInstanceStatus(
    patientId,
    date,
    instanceId,
    LOG_OUTCOME_TO_INSTANCE_STATUS[outcome],
    log.id,
    skipReason,
  );

  if (!updatedInstance) return null;

  return { instance: updatedInstance, log };
}

/**
 * Phase 35 Slice 3-D — CANONICAL undo for a completed/skipped instance.
 *
 * Three atomic effects:
 *   1. Soft-delete (tombstone) the linked LogEntry via tombstoneLogEntry
 *      — hide-not-delete preserved; audit trail accessible via
 *      `{ includeDeleted: true }` opt-in on the bottom-layer reads.
 *   2. Restore instance.logId / .status / .skipReason to the PRIOR TRUTH —
 *      not a blanket reset to 'pending'.
 *
 * PRODUCT RULING (stale-status-write-class closeout, PART A): undo restores
 * the prior truth; it does not erase it. An instance that was MISSED before
 * a late completion reverts to missed, not pending. Two sources for "prior
 * truth", tried in order:
 *
 *   a) A PRIOR non-deleted LogEntry for this same instance (dailyInstanceId),
 *      older than the one being undone — e.g. the caregiver skipped it, then
 *      later re-logged a completion over that skip; undoing the completion
 *      restores the skip (status + skipReason) via that earlier log, not a
 *      fresh derivation. This is the only way 'skipped' can be restored —
 *      it isn't time-derivable the way missed/pending are.
 *   b) No prior log exists (this was the very first action ever taken on
 *      the instance — completed straight from 'pending' or from a
 *      SYSTEM-marked 'missed', which never creates a LogEntry). Recompute
 *      what the instance's status would be RIGHT NOW via getCareItemStatus
 *      — the same rule Now/Journal already use to derive missed-vs-pending
 *      — rather than persisting a separate priorStatus field. Deliberately
 *      evaluated AT UNDO TIME, not at the moment the completion happened:
 *      an on-time completion undone days later must read missed now (the
 *      window is long gone), not resurrect as a stale 'pending' that the
 *      very next generation pass would just re-mark missed anyway.
 *
 * Pre-3-D this fn HARD-deleted the LogEntry via deleteLogEntry and
 * the Now-tab handleQuickConfirm path used a separate flow (Phase-1D
 * undoToast) that called updateDailyInstanceStatus directly without
 * touching the log — leaving the entry dangling. 3-D unifies all
 * four trigger paths (handleQuickLog / handleQuickSkip /
 * handleQuickConfirm / new long-press) through this single fn.
 *
 * Safe to call when no log exists (e.g. a sample-data instance with
 * logId never set, or an already-undone instance) — the tombstone
 * step is skipped and the instance is still reverted.
 *
 * Use `resurrectLogEntry` to undo the undo within the 5s redo window.
 */
export async function undoInstanceCompletion(
  patientId: string,
  date: string,
  instanceId: string,
): Promise<DailyCareInstance | null> {
  const instance = await getDailyInstance(patientId, date, instanceId);
  if (!instance) return null;

  const logId = instance.logId;

  // Look for an earlier log on this same instance BEFORE tombstoning the
  // current one, so the read isn't entangled with the write it's about to
  // affect. `!log.deletedAt` default filter is correct here — an
  // already-tombstoned older log (e.g. from a prior undo cycle) isn't a
  // valid "prior truth" to restore.
  const priorLog = (await listLogsByDate(patientId, date))
    .filter((l) => l.dailyInstanceId === instanceId && l.id !== logId)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];

  if (logId) {
    await tombstoneLogEntry(patientId, date, logId);
  }

  let targetStatus: DailyCareInstance['status'];
  let targetLogId: string | undefined;
  let targetSkipReason: DailyCareInstance['skipReason'];

  if (priorLog) {
    targetStatus = LOG_OUTCOME_TO_INSTANCE_STATUS[priorLog.outcome];
    targetLogId = priorLog.id;
    targetSkipReason = priorLog.outcome === 'skipped' ? priorLog.skipReason : undefined;
  } else {
    // status omitted deliberately below — getCareItemStatus short-circuits
    // on a caregiver-acted status (the CURRENT 'completed'/'skipped' we're
    // in the middle of undoing); omitting it forces the live-derive branch.
    const derived = getCareItemStatus(
      {
        scheduledTime: instance.scheduledTime,
        itemType: instance.itemType,
        windowLabel: instance.windowLabel,
        date: instance.date,
      },
      new Date(),
    );
    targetStatus = derived === 'overdue' ? 'missed' : 'pending';
    targetLogId = undefined;
    targetSkipReason = undefined;
  }

  // Authorized undo path — PART B's write-boundary guard would otherwise
  // block this exact write whenever targetStatus resolves to 'pending'
  // over a currently-acted status. This is the ONLY caller entitled to
  // pass { reason: 'undo' }, and only with the status THIS function just
  // computed above (case a/b) — never an arbitrary caller-supplied value.
  const reverted = await updateDailyInstanceStatus(
    patientId,
    date,
    instanceId,
    targetStatus,
    targetLogId,
    targetSkipReason,
    { reason: 'undo' },
  );

  return reverted;
}

/**
 * Phase 35 Slice 3-D — REDO for the just-undone LogEntry.
 *
 * The symmetric reverse of undoInstanceCompletion:
 *   1. Clear the log's deletedAt (resurrect the tombstoned entry).
 *   2. Relink instance.logId to the resurrected log.
 *   3. Restore instance.status from the log's outcome — 'taken' and
 *      'completed' both map to 'completed' (same as
 *      logInstanceCompletion's statusMap); 'skipped' maps to
 *      'skipped'; 'partial' to 'partial'; 'missed' to 'missed'.
 *
 * Only callable when the log still exists in raw storage (i.e.
 * tombstoned but not hard-deleted). Returns null when:
 *   • the log id is not found (already hard-deleted, or never existed)
 *   • the log is not currently tombstoned (no-op — already live)
 *   • the linked instance no longer exists (stale-instance edge)
 *
 * The 5s post-undo toast surfaces this via a "Redo" action; after the
 * window closes the affordance disappears, and re-confirming via
 * logInstanceCompletion creates a NEW log entry with a fresh id
 * (rt-5 pins this contract). The tombstoned original stays in raw
 * storage indefinitely as audit trail.
 */
export async function resurrectLogEntry(
  patientId: string,
  date: string,
  logId: string,
): Promise<{ instance: DailyCareInstance; log: LogEntry } | null> {
  const lockKey = KEYS.LOGS(patientId, date);
  const restored: { log: LogEntry | null } = { log: null };

  await withKeyLock(lockKey, async () => {
    // Daily bucket — opt into includeDeleted to read the
    // tombstoned entry.
    const dailyLogs = await listLogsByDate(patientId, date, { includeDeleted: true });
    const dailyIdx = dailyLogs.findIndex((l) => l.id === logId);
    if (dailyIdx === -1 || !dailyLogs[dailyIdx].deletedAt) {
      return;
    }
    const next: LogEntry = { ...dailyLogs[dailyIdx] };
    delete (next as Partial<LogEntry>).deletedAt;
    dailyLogs[dailyIdx] = next;
    await safeSetItem(KEYS.LOGS(patientId, date), dailyLogs);
    restored.log = next;

    // ALL_LOGS aggregate — mirror the restoration.
    const allLogs = await safeGetItem<LogEntry[]>(KEYS.ALL_LOGS(patientId), []);
    const allIdx = allLogs.findIndex((l) => l.id === logId);
    if (allIdx !== -1 && allLogs[allIdx].deletedAt) {
      const allNext: LogEntry = { ...allLogs[allIdx] };
      delete (allNext as Partial<LogEntry>).deletedAt;
      allLogs[allIdx] = allNext;
      await safeSetItem(KEYS.ALL_LOGS(patientId), allLogs);
    }
  });

  if (!restored.log) return null;

  const log = restored.log;
  const restoredStatus = LOG_OUTCOME_TO_INSTANCE_STATUS[log.outcome];

  const updatedInstance = log.dailyInstanceId
    ? await updateDailyInstanceStatus(
        patientId,
        date,
        log.dailyInstanceId,
        restoredStatus,
        log.id,
        log.outcome === 'skipped' ? log.skipReason : undefined,
      )
    : null;

  if (!updatedInstance) return null;
  return { instance: updatedInstance, log };
}

/**
 * Phase 35 Slice 3-D — soft-delete (hide-not-delete) the LogEntry by
 * writing a `deletedAt` ISO timestamp onto the persisted entry. Raw
 * storage retains the entry (audit trail); the bottom-layer read
 * primitives (`listLogsByDate`, `getLogById`, `listLogsInRange`)
 * filter `!log.deletedAt` by default.
 *
 * No-op when the logId is not found, when it's already tombstoned, or
 * when both daily + aggregate stores are empty for the date.
 *
 * The canonical caregiver-visible writer is undoInstanceCompletion (to
 * be unified in commit 2 of Slice 3-D). This primitive is exported so
 * the integration round-trip can pin the bottom-layer contract
 * independently of the caller, and so a future audit/edit-history flow
 * can soft-delete without needing the full instance state machine.
 */
export async function tombstoneLogEntry(
  patientId: string,
  date: string,
  logId: string,
): Promise<void> {
  const now = new Date().toISOString();
  const lockKey = KEYS.LOGS(patientId, date);
  await withKeyLock(lockKey, async () => {
    // Daily bucket — opt into includeDeleted so we can no-op cleanly
    // if the entry is already tombstoned (avoids overwriting the
    // original deletedAt timestamp).
    const dailyLogs = await listLogsByDate(patientId, date, { includeDeleted: true });
    const dailyIdx = dailyLogs.findIndex((l) => l.id === logId);
    if (dailyIdx !== -1 && !dailyLogs[dailyIdx].deletedAt) {
      dailyLogs[dailyIdx] = { ...dailyLogs[dailyIdx], deletedAt: now };
      await safeSetItem(KEYS.LOGS(patientId, date), dailyLogs);
    }

    // ALL_LOGS aggregate — append-only audit; mirror the tombstone so
    // future audit-trail readers see the same shape on either path.
    const allLogs = await safeGetItem<LogEntry[]>(KEYS.ALL_LOGS(patientId), []);
    const allIdx = allLogs.findIndex((l) => l.id === logId);
    if (allIdx !== -1 && !allLogs[allIdx].deletedAt) {
      allLogs[allIdx] = { ...allLogs[allIdx], deletedAt: now };
      await safeSetItem(KEYS.ALL_LOGS(patientId), allLogs);
    }
  });
}

/**
 * Remove a log entry from both the daily bucket and the all-logs append-only
 * store. Internal helper for undoInstanceCompletion — log entries are
 * otherwise immutable.
 */
async function deleteLogEntry(
  patientId: string,
  date: string,
  logId: string,
): Promise<void> {
  // Phase 35 Slice 3-D — opt into includeDeleted so hard-delete still
  // operates on tombstoned entries (the soft-delete filter would
  // otherwise hide them from the read and leave the raw entry behind).
  const dailyLogs = await listLogsByDate(patientId, date, { includeDeleted: true });
  const filteredDaily = dailyLogs.filter((l) => l.id !== logId);
  if (filteredDaily.length !== dailyLogs.length) {
    await safeSetItem(KEYS.LOGS(patientId, date), filteredDaily);
  }

  const allLogs = await safeGetItem<LogEntry[]>(KEYS.ALL_LOGS(patientId), []);
  const filteredAll = allLogs.filter((l) => l.id !== logId);
  if (filteredAll.length !== allLogs.length) {
    await safeSetItem(KEYS.ALL_LOGS(patientId), filteredAll);
  }

  emitDataUpdate(EVENT.LOGS);
}

/**
 * Get daily schedule with all computed stats
 */
export async function getDailySchedule(
  patientId: string,
  date: string
): Promise<DailySchedule> {
  const instances = await listDailyInstances(patientId, date);

  // Sort by scheduled time
  const sorted = [...instances].sort((a, b) =>
    a.scheduledTime.localeCompare(b.scheduledTime)
  );

  // Group by window
  const byWindow: DailySchedule['byWindow'] = {
    morning: [],
    afternoon: [],
    evening: [],
    night: [],
  };

  for (const instance of sorted) {
    const windowKey = instance.windowLabel as keyof typeof byWindow;
    if (byWindow[windowKey]) {
      byWindow[windowKey].push(instance);
    }
  }

  // Calculate stats
  const stats = {
    total: instances.length,
    pending: instances.filter(i => i.status === 'pending').length,
    completed: instances.filter(i => i.status === 'completed').length,
    skipped: instances.filter(i => i.status === 'skipped').length,
    missed: instances.filter(i => i.status === 'missed').length,
  };

  // Find next pending
  const now = new Date().toISOString();
  const nextPending = sorted.find(
    i => i.status === 'pending' && i.scheduledTime >= now
  ) || sorted.find(i => i.status === 'pending') || null;

  return {
    date,
    instances: sorted,
    byWindow,
    stats,
    nextPending,
  };
}

// ============================================================================
// CLEANUP OPERATIONS
// ============================================================================

/**
 * Clear all data for a patient (for testing/reset)
 */
export async function clearAllPatientData(patientId: string): Promise<void> {
  const plan = await getActiveCarePlan(patientId);
  const results: boolean[] = [];
  if (plan) {
    results.push(await safeSetItem(KEYS.CARE_PLAN_ITEMS(plan.id), []));
  }
  results.push(await safeSetItem(KEYS.CARE_PLAN(patientId), null));
  results.push(await safeSetItem(KEYS.DAILY_INSTANCES_INDEX(patientId), []));
  results.push(await safeSetItem(KEYS.LOGS_INDEX(patientId), []));
  results.push(await safeSetItem(KEYS.ALL_LOGS(patientId), []));
  const anySuccess = results.some(r => r);
  if (anySuccess) {
    emitDataUpdate(EVENT.CARE_PLAN);
    emitDataUpdate(EVENT.DAILY_INSTANCES);
    emitDataUpdate(EVENT.LOGS);
  }
}
