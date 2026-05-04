// ============================================================================
// VISIT PREP NOTE CURATION — Pick up to N notes for the PDF
// Phase 5.8.b
//
// Selection priority:
//   Pass 1: notes containing flag keywords (utils/keywordFlags.ts) —
//           up to maxCount, oldest-first when more than maxCount match.
//   Pass 2: if Pass 1 returned fewer than maxCount, fill from the
//           remaining (non-flagged) notes by oldest / midpoint / newest
//           position in the chronological sequence.
//
// Returns notes in chronological order. Full text preserved — no
// truncation; the PDF template controls visual wrapping.
// ============================================================================

import { containsFlagKeyword } from './keywordFlags';

export interface CurationNote {
  date: string;  // YYYY-MM-DD
  text: string;
}

export interface SelectedNote {
  date: string;
  text: string;
  /** True when the note matched a flag keyword (utils/keywordFlags.ts). */
  flagged: boolean;
}

function sortByDateAsc(notes: CurationNote[]): CurationNote[] {
  return [...notes].sort((a, b) => a.date.localeCompare(b.date));
}

/** Pick up to maxCount notes. Flagged notes win; remaining slots fill from
 *  oldest/midpoint/newest of non-flagged remainder. Output is chronological. */
export function selectNotesForVisitPrep(
  notes: CurationNote[],
  maxCount: number,
): SelectedNote[] {
  if (notes.length === 0 || maxCount <= 0) return [];
  const sorted = sortByDateAsc(notes);

  const flagged = sorted.filter((n) => containsFlagKeyword(n.text));
  const nonFlagged = sorted.filter((n) => !containsFlagKeyword(n.text));

  // Pass 1 — take up to maxCount oldest flagged.
  const picked = new Map<string, SelectedNote>();
  for (const n of flagged) {
    if (picked.size >= maxCount) break;
    picked.set(`${n.date}|${n.text}`, { date: n.date, text: n.text, flagged: true });
  }

  // Pass 2 — fill from oldest / midpoint / newest of non-flagged remainder.
  const slotsLeft = maxCount - picked.size;
  if (slotsLeft > 0 && nonFlagged.length > 0) {
    const positions: number[] = [];
    if (slotsLeft >= 1) positions.push(0);                          // oldest
    if (slotsLeft >= 3) positions.push(Math.floor((nonFlagged.length - 1) / 2)); // midpoint
    if (slotsLeft >= 2) positions.push(nonFlagged.length - 1);      // newest
    const uniquePositions = Array.from(new Set(positions))
      .filter((i) => i >= 0 && i < nonFlagged.length)
      .slice(0, slotsLeft);
    for (const pos of uniquePositions) {
      const n = nonFlagged[pos];
      const k = `${n.date}|${n.text}`;
      if (!picked.has(k)) {
        picked.set(k, { date: n.date, text: n.text, flagged: false });
      }
    }
  }

  // Re-sort the picked set chronologically.
  return Array.from(picked.values()).sort((a, b) => a.date.localeCompare(b.date));
}
