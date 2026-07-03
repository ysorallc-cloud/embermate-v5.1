// ============================================================================
// RED FLAGS & ALERTS — Phase 5.10.a
//
// Top-of-page colored callout for Visit Prep. Doctors triage the report
// by reading critical items first; this surfaces them up out of the
// scattered details below. Pulls from existing detector outputs +
// caregiver notes; emits a flat severity-tagged list.
//
// Severity rules (nurse-approved spec):
//   critical
//     • Symptom worsening (detectSymptomChanges → 'worse')
//     • Notes containing "fell" / "hurt" / "severe" / "blood"
//   (Vitals out-of-range was REMOVED for v1 — Gate D: "N readings outside the
//    usual range" is a fixed-cutoff clinical verdict, not the patient's own
//    baseline, and this callout is the most prominent provider-facing surface.
//    Per-person vitals deviation is deferred to the v1.1 snapshot engine.)
//   attention
//     • Medication refused ≥2 times in window
//     • Sleep quality dropped ≥0.5 vs prior period
//     • Notes containing "hard" / "struggle" (existing keywordFlags set,
//       minus the critical-bumped terms)
//
// Empty list → caller omits the callout entirely.
// ============================================================================

import type { AdherenceEntry } from './visitPrepPdf';
import type { SymptomChange } from './symptomChangeDetection';

export type RedFlagSeverity = 'critical' | 'attention';

export interface RedFlag {
  severity: RedFlagSeverity;
  text: string;
}

export interface BuildRedFlagsInput {
  adherence: AdherenceEntry[];
  notesInRange: { date: string; text: string }[];
  symptomChanges: SymptomChange[];
  /** Delta of avg sleep quality in current window minus prior window. */
  sleepDelta: number;
  /** Optional per-med refused-event count. Pass through from skipReason
   *  aggregation; the caller already produces a similar map for skipped doses. */
  refusedByMed?: Record<string, number>;
}

const REFUSAL_THRESHOLD = 2;
const SLEEP_DROP_THRESHOLD = -0.5;

const CRITICAL_KEYWORDS = ['fell', 'hurt', 'severe', 'blood'];
const ATTENTION_KEYWORDS = ['hard', 'struggle'];

function makeKeywordRegex(keywords: string[]): RegExp {
  return new RegExp(`\\b(${keywords.join('|')})\\b`, 'i');
}

const CRITICAL_RE = makeKeywordRegex(CRITICAL_KEYWORDS);
const ATTENTION_RE = makeKeywordRegex(ATTENTION_KEYWORDS);

const SHORT_MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function shortDate(yyyymmdd: string): string {
  // Local-noon parse so timezone shifts don't slide the calendar day.
  const [y, m, d] = yyyymmdd.split('-').map(Number);
  if (!y || !m || !d) return yyyymmdd;
  return `${SHORT_MONTHS[m - 1]} ${d}`;
}

export function buildRedFlags(input: BuildRedFlagsInput): RedFlag[] {
  const critical: RedFlag[] = [];
  const attention: RedFlag[] = [];

  // Vitals out-of-range was removed for v1 (Gate D — no fixed-cutoff clinical
  // verdict on a provider-facing surface). See the header note.

  // Symptom worsening
  for (const s of input.symptomChanges) {
    if (s.change === 'worse') {
      critical.push({ severity: 'critical', text: s.briefDescription });
    }
  }

  // Critical-keyword notes
  for (const note of input.notesInRange) {
    if (CRITICAL_RE.test(note.text)) {
      critical.push({
        severity: 'critical',
        text: `${shortDate(note.date)}: ${note.text}`,
      });
    }
  }

  // Medication refusals
  if (input.refusedByMed) {
    for (const [med, count] of Object.entries(input.refusedByMed)) {
      if (count >= REFUSAL_THRESHOLD) {
        attention.push({
          severity: 'attention',
          text: `${med} refused ${count} times in this window.`,
        });
      }
    }
  }

  // Sleep dropped
  if (input.sleepDelta <= SLEEP_DROP_THRESHOLD) {
    const drop = Math.abs(input.sleepDelta).toFixed(1);
    attention.push({
      severity: 'attention',
      text: `Sleep quality dropped ${drop} points vs prior period.`,
    });
  }

  // Attention-keyword notes (skip ones already flagged critical to avoid
  // double-counting the same note).
  for (const note of input.notesInRange) {
    if (CRITICAL_RE.test(note.text)) continue;
    if (ATTENTION_RE.test(note.text)) {
      attention.push({
        severity: 'attention',
        text: `${shortDate(note.date)}: ${note.text}`,
      });
    }
  }

  return [...critical, ...attention];
}
