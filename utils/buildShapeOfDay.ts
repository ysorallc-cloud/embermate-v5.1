// ============================================================================
// buildShapeOfDay — Phase 27.5b F3.
//
// Produces the Journal Section 1 (Subjective) gestalt line as a
// shape-of-day description rather than the pre-27.5b count-only roll-up
// ("5/5 medications logged. 1 wellness check recorded."). The new
// output describes what is done, what is pending, and what stands out
// in a single observational sentence sequence — same witness voice the
// rest of the Journal handoff document uses.
//
// Per Phase 27.5b D4 the builder must handle four state shapes
// naturally — fresh / mid-day / end-of-day / mostly-missed — but it
// does NOT branch templates by tone. The four shapes are
// configurations of the underlying data, not separate tone variants.
// Same observational voice across all states. The Phase 27 D4 guard
// "avoid tone categorization (celebratory/shaming risk)" enforces
// this.
//
// Forbidden-vocab guardrails (parallel to nowStatusBuilder + notable-
// MomentsBuilder + narrativeSummaryBuilder factualOnly):
//   • No second-person warmth ("you've", "your meds", etc.)
//   • No emotional adjectives ("great", "good job", "wonderful")
//   • Counts inline, not as the lead phrase
//
// API choice (Phase 27.5b D5): new builder, not a flag on
// buildDayNarrative. Preserves factualOnly for any other consumer
// (audit found zero production consumers post-F3 but the orphan
// reference in NarrativeSnapshot.tsx keeps it alive in source — the
// dead-code sweep covers both this and that in Phase 20).
// ============================================================================

import { listDailyInstances } from '../storage/carePlanRepo';
import { getActivePatientId } from '../storage/patientRegistry';
import { logError } from './devLog';

export interface ShapeOfDayResult {
  /** Single sentence-sequence describing the day's shape. Empty
   *  string when hasData is false. Never more than three sentences
   *  per Phase 27.5b contract 8. */
  summary: string;
  /** False when the day has zero scheduled instances. GestaltSummary's
   *  existing fallback ("No record from this day.") then renders. */
  hasData: boolean;
}

type ItemType = 'medication' | 'vitals' | 'wellness' | 'nutrition';
type Status = 'pending' | 'completed' | 'missed' | 'skipped' | string;

interface MinimalInstance {
  itemType: string;
  status: string;
}

interface CategorySnapshot {
  total: number;
  completed: number;
  missed: number;
  pending: number;
  skipped: number;
}

function snapshotCategory(instances: MinimalInstance[], itemType: ItemType): CategorySnapshot {
  const own = instances.filter((i) => i.itemType === itemType);
  const completed = own.filter((i) => i.status === 'completed').length;
  const missed = own.filter((i) => i.status === 'missed').length;
  const pending = own.filter((i) => i.status === 'pending').length;
  const skipped = own.filter((i) => i.status === 'skipped').length;
  return { total: own.length, completed, missed, pending, skipped };
}

// Label maps. Plural / singular per the spec's "counts inline, not as
// the lead" — when count > 1 we use the count + plural; when count is
// 1 we use the count + singular; when the data state is "all of N"
// we elide the count and use category-level language.
const CATEGORY_PLURAL: Record<ItemType, string> = {
  medication: 'meds',
  vitals: 'vitals',
  wellness: 'wellness check-ins',
  nutrition: 'meals',
};
const CATEGORY_SINGULAR: Record<ItemType, string> = {
  medication: 'med',
  vitals: 'vitals reading',
  wellness: 'wellness check',
  nutrition: 'meal',
};

// Per-status verb in the rendered prose. Order matters — clauses go
// completed first, pending next, missed last.
const STATUS_VERBS = {
  completed: { medication: 'logged', vitals: 'recorded', wellness: 'done', nutrition: 'logged' },
  pending:   { medication: 'still scheduled', vitals: 'not yet recorded', wellness: 'not yet done', nutrition: 'still scheduled' },
  missed:    { medication: 'missed', vitals: 'missed', wellness: 'missed', nutrition: 'missed' },
} as const;

function clauseFor(
  itemType: ItemType,
  status: 'completed' | 'pending' | 'missed',
  count: number,
  totalOfCategory: number,
): string | null {
  if (count === 0) return null;
  const verb = STATUS_VERBS[status][itemType];

  // "All N logged" when the entire category is in one state and there
  // are multiple items. Avoids "3/3 meds logged" count-lead phrasing.
  if (count === totalOfCategory && totalOfCategory > 1) {
    return `All ${CATEGORY_PLURAL[itemType]} ${verb}`;
  }
  // Single item — singular + count omitted ("Vitals recorded." rather
  // than "1 vitals reading recorded.").
  if (totalOfCategory === 1 && count === 1) {
    return capitalize(`${CATEGORY_SINGULAR[itemType]} ${verb}`);
  }
  // Partial state — count inline mid-sentence, not at the head.
  return `${count} ${count === 1 ? CATEGORY_SINGULAR[itemType] : CATEGORY_PLURAL[itemType]} ${verb}`;
}

function capitalize(s: string): string {
  if (s.length === 0) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export async function buildShapeOfDay(dateKey: string): Promise<ShapeOfDayResult> {
  try {
    const patientId = await getActivePatientId();
    const instances = (await listDailyInstances(patientId, dateKey)) as MinimalInstance[];

    if (!instances || instances.length === 0) {
      return { summary: '', hasData: false };
    }

    const snapshots: Record<ItemType, CategorySnapshot> = {
      medication: snapshotCategory(instances, 'medication'),
      vitals: snapshotCategory(instances, 'vitals'),
      wellness: snapshotCategory(instances, 'wellness'),
      nutrition: snapshotCategory(instances, 'nutrition'),
    };

    // Collect clauses per status bucket, then assemble.
    //
    // Order rules:
    //   • Completed first, then pending, then missed — within a
    //     status, iterate categories in a stable order so the line
    //     reads predictably.
    //   • Always surface at least one clause per non-empty status
    //     bucket so a mid-day state genuinely shows both done AND
    //     pending in the same line. The pre-fix algorithm took the
    //     first 3 clauses by global order, which would fill with
    //     completed clauses before any pending one had a chance.
    //   • Cap at 3 sentences total.
    const order: ItemType[] = ['medication', 'vitals', 'wellness', 'nutrition'];
    const buckets: Record<'completed' | 'pending' | 'missed', string[]> = {
      completed: [],
      pending: [],
      missed: [],
    };
    for (const status of ['completed', 'pending', 'missed'] as const) {
      for (const itemType of order) {
        const snap = snapshots[itemType];
        const c = clauseFor(itemType, status, snap[status], snap.total);
        if (c) buckets[status].push(c);
      }
    }

    const totalClauses = buckets.completed.length + buckets.pending.length + buckets.missed.length;
    if (totalClauses === 0) {
      // Only skipped instances on the day — no completed / pending /
      // missed to surface. Treat as no-data for the purposes of the
      // Section 1 line; GestaltSummary's fallback covers it.
      return { summary: '', hasData: false };
    }

    // Round-robin pick: one from completed, one from pending, one
    // from missed, then loop again for any remaining slot. Spec-
    // confirmed order within each pass (completed → pending → missed).
    const final: string[] = [];
    const cursors = { completed: 0, pending: 0, missed: 0 };
    while (final.length < 3 && (
      cursors.completed < buckets.completed.length ||
      cursors.pending   < buckets.pending.length   ||
      cursors.missed    < buckets.missed.length
    )) {
      for (const status of ['completed', 'pending', 'missed'] as const) {
        if (final.length >= 3) break;
        if (cursors[status] < buckets[status].length) {
          final.push(buckets[status][cursors[status]]);
          cursors[status] += 1;
        }
      }
    }

    // Each clause is its own sentence (no "and" / "but" connectors so
    // the line stays observational).
    const summary = final.map((c) => `${capitalize(c)}.`).join(' ');

    return { summary, hasData: true };
  } catch (err) {
    logError('buildShapeOfDay', err);
    return { summary: '', hasData: false };
  }
}
