// ============================================================================
// Shared types for the template-driven text composers.
//
// `DailyOutcomes` is the structured view of "what happened today" that drives
// the prose composers. `Alert` is a lightweight signal for things worth
// flagging. Composers are pure functions over these inputs — callers are
// responsible for shaping their domain data into these shapes.
// ============================================================================

export interface OutcomeCategoryCount {
  /** Human-readable category label, e.g. "meals", "morning check-in". */
  label: string;
  /** Number of items in this category. */
  count: number;
}

export interface NotableReading {
  /** Reading type — "BP", "HR", "Glucose", "Temp", etc. Case is preserved. */
  type: string;
  /** The reading text as displayed, e.g. "148/92", "92 bpm". */
  reading: string;
  /** When the reading was taken. */
  time: Date;
  /** Severity classification, drives the "slightly elevated" tail copy. */
  severity?: 'normal' | 'elevated' | 'high' | 'low';
}

export interface OutcomeItemRef {
  /** Display label (typically the medication / meal / vitals item name). */
  itemName: string;
  /** Canonical category key — drives the categorical detail formatter. */
  itemType: string;
}

export interface DailyOutcomes {
  logged: {
    count: number;
    /** Optional pre-baked summary phrase, e.g. "3 meals, 1 morning check-in". */
    summary?: string;
    /** Per-category breakdown — composers may build their own summary. */
    categories?: OutcomeCategoryCount[];
    /** Optional raw refs so UI can render the categorical detail formatter. */
    items?: OutcomeItemRef[];
  };
  missed: {
    count: number;
    /** Names of missed items, e.g. ["Acetaminophen", "Amlodipine"]. */
    names: string[];
    /** Optional raw refs (name + type) for the categorical detail formatter. */
    items?: OutcomeItemRef[];
  };
  pending: {
    count: number;
    /** Names of still-pending items. */
    names: string[];
    /** Optional raw refs (name + type) for the categorical detail formatter. */
    items?: OutcomeItemRef[];
  };
  /** Notable readings worth surfacing in prose drafts. */
  notable?: NotableReading[];
}

export interface Alert {
  category: 'medication' | 'vitals' | 'mood' | 'symptom' | 'other';
  message: string;
  severity: 'low' | 'medium' | 'high';
  time?: Date;
}
