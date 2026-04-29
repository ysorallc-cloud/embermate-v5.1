// ============================================================================
// DAILY OUTCOMES — adapter over DailyCareInstance that returns the shape the
// text composers (and TodayOutcomes UI) consume.
//
// Pure classification logic on the inside (`classifyOutcomes`) so the test
// suite never needs to mount the full storage layer. The thin async wrapper
// `getDailyOutcomes` reads from the same care-plan instances pipeline used
// by the Now tab and the careSummaryBuilder, so we don't introduce a third
// source of truth for "what was missed".
// ============================================================================

import type { DailyOutcomes } from './text/composers/../types';
// (re-import to avoid resolving the composers module's side-effects)
import type { OutcomeCategoryCount } from './text/types';
import { naturalList } from './text/primitives';
import { ensureDailyInstances, getTodayDateString } from '../services/carePlanGenerator';
import { DEFAULT_PATIENT_ID } from '../storage/carePlanRepo';
import { logError } from './devLog';

/** Shape required to classify a single instance. */
export interface ClassifyInput {
  status: 'completed' | 'missed' | 'pending' | 'skipped' | string;
  itemName: string;
  itemType: 'medication' | 'meal' | 'vitals' | 'wellness' | 'water' | 'sleep' | 'activity' | string;
}

/** Singular-noun labels keyed by the canonical itemType. Plural is "+s". */
const TYPE_SINGULAR: Record<string, string> = {
  medication: 'med',
  meal: 'meal',
  vitals: 'vitals',
  wellness: 'check-in',
  water: 'water',
  sleep: 'sleep',
  activity: 'activity',
};

/** Plural override for irregular nouns (otherwise singular + "s"). */
const TYPE_PLURAL: Record<string, string> = {
  medication: 'meds',
  vitals: 'vitals',  // already plural
  activity: 'activities',
  water: 'water',
  sleep: 'sleep',
  // 'meal' → 'meals' (regular)
  // 'check-in' → 'check-ins' (regular)
};

function singularFor(itemType: string): string {
  return TYPE_SINGULAR[itemType] ?? itemType;
}

function pluralFor(itemType: string, count: number): string {
  if (count === 1) return singularFor(itemType);
  return TYPE_PLURAL[itemType] ?? `${singularFor(itemType)}s`;
}

/**
 * Classify a list of daily care instances into the structured outcomes
 * shape. Pure / synchronous — no I/O. Drives the test surface.
 *
 * Status mapping:
 *   completed | skipped → logged   (skipped is an intentional, recorded action)
 *   missed              → missed
 *   anything else       → pending
 */
export function classifyOutcomes(instances: ClassifyInput[]): DailyOutcomes {
  const logged: ClassifyInput[] = [];
  const missed: ClassifyInput[] = [];
  const pending: ClassifyInput[] = [];

  for (const i of instances) {
    if (i.status === 'completed' || i.status === 'skipped') logged.push(i);
    else if (i.status === 'missed') missed.push(i);
    else pending.push(i);
  }

  // Group logged items by itemType to build the categorical summary.
  const byType = new Map<string, number>();
  for (const i of logged) {
    byType.set(i.itemType, (byType.get(i.itemType) ?? 0) + 1);
  }
  const categories: OutcomeCategoryCount[] = Array.from(byType.entries()).map(
    ([itemType, count]) => ({ label: pluralFor(itemType, count), count }),
  );
  const summary = categories.length > 0
    ? naturalList(categories.map((c) => `${c.count} ${c.label}`))
    : undefined;

  return {
    logged: {
      count: logged.length,
      summary,
      categories,
      items: logged.map((i) => ({ itemName: i.itemName, itemType: i.itemType })),
    },
    missed: {
      count: missed.length,
      names: missed.map((i) => i.itemName),
      items: missed.map((i) => ({ itemName: i.itemName, itemType: i.itemType })),
    },
    pending: {
      count: pending.length,
      names: pending.map((i) => i.itemName),
      items: pending.map((i) => ({ itemName: i.itemName, itemType: i.itemType })),
    },
  };
}

/** Generic noun phrases for single-item categories inside a mixed multi-
 *  category summary (e.g. "vitals check", "wellness check"). Categories not
 *  in this map fall back to the item's own name in mixed contexts — "1 med"
 *  / "1 meal" reads weak so we prefer the actual item label. */
const SINGULAR_GENERIC_IN_MIXED: Record<string, string> = {
  vitals: 'vitals check',
  wellness: 'wellness check',
};

/**
 * Format a categorical detail line for the missed / pending / logged rows
 * inside TodayOutcomes. Pure / synchronous.
 *
 *   single category, any count  → enumerated names ("Acetaminophen, Amlodipine")
 *   only-singletons across cats → enumerated names ("Morning vitals, Morning wellness check")
 *   any plural category present → per-category labels
 *                                 ("2 meds, 2 meals, vitals check, wellness check")
 *   ≥5 categories               → first 4 + "+N more"
 */
export function formatOutcomeDetail(items: ClassifyInput[]): string {
  if (items.length === 0) return '';

  // Group by itemType, preserving first-seen order.
  const groups = new Map<string, ClassifyInput[]>();
  for (const i of items) {
    const arr = groups.get(i.itemType) ?? [];
    arr.push(i);
    groups.set(i.itemType, arr);
  }

  // Single category — enumerate names with Oxford comma at length 3+.
  if (groups.size === 1) {
    const names = items.map((i) => i.itemName);
    if (names.length === 1) return names[0];
    if (names.length === 2) return `${names[0]}, ${names[1]}`;
    const head = names.slice(0, -1).join(', ');
    return `${head}, and ${names[names.length - 1]}`;
  }

  // Multi-category. The line tightens when either:
  //   (a) any category has count >= 2, or
  //   (b) we're going to overflow past 4 entries.
  // In those tightened cases, categories with a known generic phrase
  // (vitals / wellness) render that phrase rather than their item name; all
  // other count==1 entries still surface the item label.
  const totalCategories = groups.size;
  const anyPlural = Array.from(groups.values()).some((list) => list.length >= 2);
  const willOverflow = totalCategories > 4;
  const tighten = anyPlural || willOverflow;

  const phrases: string[] = [];
  for (const [type, list] of groups.entries()) {
    if (list.length >= 2) {
      phrases.push(`${list.length} ${pluralFor(type, list.length)}`);
    } else {
      const generic = SINGULAR_GENERIC_IN_MIXED[type];
      phrases.push(tighten && generic ? generic : list[0].itemName);
    }
  }

  if (phrases.length <= 4) return phrases.join(', ');
  const head = phrases.slice(0, 4).join(', ');
  const remaining = phrases.length - 4;
  return `${head}, +${remaining} more`;
}

/**
 * Async accessor — reads today's instances from the care-plan pipeline and
 * classifies them. UI surfaces (TodayOutcomes, HandoffSheet preview) use
 * this; tests use `classifyOutcomes` directly.
 */
export async function getDailyOutcomes(date?: string): Promise<DailyOutcomes> {
  try {
    const target = date ?? getTodayDateString();
    const instances = await ensureDailyInstances(DEFAULT_PATIENT_ID, target);
    return classifyOutcomes(instances as unknown as ClassifyInput[]);
  } catch (error) {
    logError('dailyOutcomes.getDailyOutcomes', error);
    return {
      logged: { count: 0 },
      missed: { count: 0, names: [] },
      pending: { count: 0, names: [] },
    };
  }
}
