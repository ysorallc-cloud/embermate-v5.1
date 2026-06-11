// ============================================================================
// SAMPLE-DATA LEAK (Journal half) — note placeholder must read as a
// PROMPT, never as a completed observation.
//
// Device-confirmed bug (2026-05-24): on a fresh account, opening
// add-note showed what looked like sample content pre-filled. Root
// cause: no data was pre-filled — the TextInput placeholder was a
// fully-composed realistic caregiver note ("Seemed more energetic
// today. Appetite was good at lunch…"). On the Charcoal Ink theme,
// muted placeholder text reads as existing content about a patient
// who doesn't exist.
//
// Contract: the placeholder is instructional (asks the caregiver what
// to write) and must not contain declarative past-tense observations
// that could be mistaken for a real note.
// ============================================================================

import * as fs from 'fs';
import * as path from 'path';

describe('log-note placeholder reads as a prompt, not sample content', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '../../app/log-note.tsx'),
    'utf8',
  );

  const placeholderMatch = source.match(/placeholder="([^"]+)"/);

  it('has a placeholder on the note input', () => {
    expect(placeholderMatch).not.toBeNull();
  });

  it('placeholder does not contain completed-observation sample sentences', () => {
    const text = placeholderMatch![1];
    // The original leaking copy, pinned so it can never return.
    expect(text).not.toMatch(/Seemed more energetic/i);
    expect(text).not.toMatch(/Appetite was good/i);
    // Declarative past-tense observation shapes read as real notes.
    expect(text).not.toMatch(/\b(was|were|seemed|had)\b [a-z]+ (today|at lunch|this morning)/i);
  });

  it('placeholder is phrased as a prompt to the caregiver', () => {
    const text = placeholderMatch![1];
    expect(text).toMatch(/\?|What|Anything|Write/i);
  });
});
