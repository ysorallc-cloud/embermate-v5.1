// ============================================================================
// HANDOFF SECTION PARSER — UX restructure (Commit 4 of UX bundle)
//
// The canonical handoff builder emits a flat string with section labels
// (STILL TO DO, HEADS UP, COMING UP, NOTES, DONE) separated by blank lines.
// HandoffSheet renders structured cards from that string, so we parse the
// builder output back into discrete section blocks for display.
//
// Pure function. No I/O.
// ============================================================================

export type HandoffSectionType = 'todo' | 'headsup' | 'upcoming' | 'notes' | 'done';

export interface HandoffSection {
  type: HandoffSectionType;
  label: string;       // The verbatim label as it appears in the canonical text.
  lines: string[];     // Body lines (excluding the label itself).
}

export interface ParsedHandoff {
  /** Always present — first line of the canonical output. */
  header: string;
  /** Optional bare-line tone block between header and first section. */
  tone: string;
  /** Section blocks in the order they appear. */
  sections: HandoffSection[];
  /** Privacy footer line. May be empty if the canonical text was edited. */
  footer: string;
}

const LABEL_TO_TYPE: Record<string, HandoffSectionType> = {
  'STILL TO DO': 'todo',
  'HEADS UP': 'headsup',
  'COMING UP': 'upcoming',
  'NOTES': 'notes',
  'DONE': 'done',
};

const KNOWN_LABELS = new Set(Object.keys(LABEL_TO_TYPE));

function isSectionLabel(line: string): boolean {
  return KNOWN_LABELS.has(line.trim());
}

/** Parse the canonical handoff text into structured sections.
 *
 *  Robust to:
 *    • trailing whitespace
 *    • extra blank lines between sections
 *    • missing footer (e.g., when text has been edited)
 *    • missing tone (jumps straight from header to first section)
 *    • unknown lines before the first label (treated as tone continuation)
 */
export function parseCanonicalSections(text: string): ParsedHandoff {
  const lines = text.split('\n');
  if (lines.length === 0) {
    return { header: '', tone: '', sections: [], footer: '' };
  }

  const header = lines[0] ?? '';
  let i = 1;

  // Skip leading blank lines after header.
  while (i < lines.length && lines[i].trim() === '') i += 1;

  // Tone — lines until the first section label.
  const toneLines: string[] = [];
  while (i < lines.length && !isSectionLabel(lines[i])) {
    // Stop if we hit the footer marker.
    if (lines[i].startsWith('From EmberMate')) break;
    if (lines[i].trim().length > 0) toneLines.push(lines[i]);
    i += 1;
  }
  const tone = toneLines.join('\n').trim();

  // Sections.
  const sections: HandoffSection[] = [];
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith('From EmberMate')) break;
    if (isSectionLabel(line)) {
      const label = line.trim();
      const type = LABEL_TO_TYPE[label];
      i += 1;
      const bodyLines: string[] = [];
      while (i < lines.length) {
        const next = lines[i];
        if (isSectionLabel(next)) break;
        if (next.startsWith('From EmberMate')) break;
        // Blank line: peek ahead — if the next non-blank is a label,
        // this blank is the section separator. Otherwise it's body content.
        if (next.trim() === '') {
          let j = i + 1;
          while (j < lines.length && lines[j].trim() === '') j += 1;
          if (j < lines.length && (isSectionLabel(lines[j]) || lines[j].startsWith('From EmberMate'))) {
            i = j;
            break;
          }
          bodyLines.push(next);
          i += 1;
          continue;
        }
        bodyLines.push(next);
        i += 1;
      }
      // Trim leading/trailing blank lines in section body.
      while (bodyLines.length > 0 && bodyLines[0].trim() === '') bodyLines.shift();
      while (bodyLines.length > 0 && bodyLines[bodyLines.length - 1].trim() === '') bodyLines.pop();
      sections.push({ type, label, lines: bodyLines });
    } else {
      i += 1;
    }
  }

  // Footer — collect remaining "From EmberMate" line(s).
  const footerLines: string[] = [];
  while (i < lines.length) {
    if (lines[i].trim().length > 0) footerLines.push(lines[i]);
    i += 1;
  }
  const footer = footerLines.join('\n').trim();

  return { header, tone, sections, footer };
}
