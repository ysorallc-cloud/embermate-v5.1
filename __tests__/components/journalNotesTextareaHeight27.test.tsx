// ============================================================================
// Phase 27 F6 — JournalNotesCard textarea reduced to 3-line minHeight.
//
// Pre-27 the TextInput floored at minHeight: 36 (~1.8 lines at 20pt
// lineHeight) per a Phase 4 compaction. With the SOAP restructure
// moving the notes block into Section 4's lavender card, a 36pt floor
// reads as too tight for a free-text handoff prompt — the user can't
// see what they're typing without expanding it. Phase 27 raises the
// floor to ~3 lines (60pt) and lets RN's native multiline TextInput
// auto-expand as content grows.
//
// Pinned contracts:
//   1. The TextInput's minHeight is at least 60pt (3 lines × 20pt
//      lineHeight). Floor; not a hard cap.
//   2. The TextInput's lineHeight stays at 20 (Phase 4 contract) so
//      "3 lines" maps to 60pt cleanly.
//   3. multiline=true so RN's native auto-expand applies — no
//      explicit onFocus expansion is needed; native TextInput grows
//      with content past the floor.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const SRC_PATH = join(__dirname, '../../components/journal/JournalNotesCard.tsx');
const SRC = readFileSync(SRC_PATH, 'utf8');

function styleBlock(name: string): string {
  // Match `<name>: { ... }` at any indentation level; require the
  // closing brace on its own indented line. Loose to handle nested
  // objects.
  const re = new RegExp(`\\b${name}\\s*:\\s*\\{[\\s\\S]*?\\n\\s{2,6}\\}`, '');
  const m = SRC.match(re);
  return m ? m[0] : '';
}

describe('Phase 27 F6 — JournalNotesCard textarea 3-line floor', () => {
  it('contract 1: input.minHeight is ≥ 60pt (3 lines × 20pt lineHeight)', () => {
    const block = styleBlock('input');
    expect(block).toBeTruthy();
    const m = block.match(/minHeight:\s*(\d+(?:\.\d+)?)/);
    expect(m).toBeTruthy();
    const minHeight = Number(m![1]);
    expect(minHeight).toBeGreaterThanOrEqual(60);
  });

  it('contract 2: input.lineHeight stays at 20pt (Phase 4 contract)', () => {
    const block = styleBlock('input');
    expect(block).toMatch(/lineHeight:\s*20\b/);
  });

  it('contract 3: TextInput remains multiline (native auto-expand)', () => {
    // The textarea must still carry multiline so RN grows the field
    // naturally past the 3-line floor as the user types.
    expect(SRC).toMatch(/<TextInput[\s\S]*?multiline/);
  });
});
