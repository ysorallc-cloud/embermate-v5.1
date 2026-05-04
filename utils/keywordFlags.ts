// ============================================================================
// KEYWORD FLAGS — Shared detector for caregiver-concern keywords
// Phase 5.8.b
//
// Centralizes the canonical keyword set used in two places:
//   • Visit Prep note curation (selectNotesForVisitPrep — prioritizes
//     notes containing any of these keywords)
//   • Future iterations of the canonical handoff WORTH KNOWING flag
//     detector that scan note text directly
//
// Keep the set narrow and stable. Adding "tired" or "stress" would dilute
// the signal — these terms should be specific to escalation.
// ============================================================================

export const FLAG_KEYWORDS: readonly string[] = [
  'hard', 'struggle', 'fell', 'refused', 'worried', 'pain', 'hurt',
];

const FLAG_REGEX = new RegExp(
  `\\b(${FLAG_KEYWORDS.join('|')})\\b`,
  'i',
);

/** True when the input contains at least one flag keyword (case-insensitive,
 *  word-bounded so "harder" doesn't match "hard"). */
export function containsFlagKeyword(text: string): boolean {
  if (!text) return false;
  return FLAG_REGEX.test(text);
}

/** Returns the unique flag keywords (lowercased) found in the input, in
 *  source order. Useful for highlighting or counting matches. */
export function getMatchedFlagKeywords(text: string): string[] {
  if (!text) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  const re = new RegExp(`\\b(${FLAG_KEYWORDS.join('|')})\\b`, 'gi');
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const k = m[1].toLowerCase();
    if (!seen.has(k)) {
      seen.add(k);
      out.push(k);
    }
  }
  return out;
}
