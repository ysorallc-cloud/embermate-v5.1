// ============================================================================
// Phase 31 F1 — Notes consolidation migration (read-time merge) contract.
//
// REPRODUCTION (RED before fix).
//
// Phase 31 collapses two notes surfaces into one (per Q-31.1 lock):
//   • Journal Section 4 "For the next caregiver" — writes to
//     reflectionStorage (the canonical store going forward).
//   • HandoffSheet tone input — wrote to handoffToneRepo (the legacy
//     store; HandoffSheet's tone TextInput retires in F3).
//
// HARD LOCK (R5 lock-confirmation): **read-time merge ONLY**. The
// utility loaded at Section 4 mount-time reads BOTH stores and
// concatenates for display. saveConsolidatedNotes writes to
// reflectionStorage ONLY — handoffToneRepo is NEVER written to and
// NEVER deleted. If the merge logic has a bug, no data is lost because
// the originals are untouched. This is the data-safety crux.
//
// The contract enumerates the 4 input states + dedupe edge + the
// never-write source-level guard. RED 7/7 before the utility lands;
// GREEN 7/7 after.
//
// SEPARATOR: per Q3 lock, two text blocks concatenate with a plain
// blank line (`\n\n`) — no marker, no "— legacy handoff tone —"
// banner, no migration artifact visible in the user's text. If both
// stores hold identical text, dedupe — show once, not twice.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

// --------------------------------------------------------------------------
// Storage mocks — must land before the utility import below.
// --------------------------------------------------------------------------
const mockGetReflection: jest.Mock = jest.fn();
const mockSaveReflection: jest.Mock = jest.fn();
jest.mock('../../storage/reflectionStorage', () => ({
  getReflection: (...args: any[]) => (mockGetReflection as any).apply(null, args),
  saveReflection: (...args: any[]) => (mockSaveReflection as any).apply(null, args),
}));

const mockGetHandoffTone: jest.Mock = jest.fn();
const mockSaveHandoffTone: jest.Mock = jest.fn();
jest.mock('../../storage/handoffToneRepo', () => ({
  getHandoffTone: (...args: any[]) => (mockGetHandoffTone as any).apply(null, args),
  saveHandoffTone: (...args: any[]) => (mockSaveHandoffTone as any).apply(null, args),
}));

// The utility under test. Import after mocks so the mocked storage
// modules wire up correctly.
import { getConsolidatedNotes, saveConsolidatedNotes } from '../../utils/consolidatedNotes';

describe('Phase 31 F1 — notes consolidation migration', () => {
  beforeEach(() => {
    mockGetReflection.mockReset();
    mockSaveReflection.mockReset();
    mockGetHandoffTone.mockReset();
    mockSaveHandoffTone.mockReset();
  });

  // ------------------------------------------------------------------------
  // getConsolidatedNotes — the 4 input states + dedupe edge
  // ------------------------------------------------------------------------
  describe('getConsolidatedNotes — read-time merge across both stores', () => {
    it('case 1 (neither): both stores empty → returns null', async () => {
      mockGetReflection.mockResolvedValue(null);
      mockGetHandoffTone.mockResolvedValue(null);
      const result = await getConsolidatedNotes('2026-05-19');
      expect(result).toBeNull();
    });

    it('case 2 (only-notes): reflectionStorage has content; tone empty → returns notes verbatim', async () => {
      mockGetReflection.mockResolvedValue({
        date: '2026-05-19',
        text: 'BP was high but he ate well.',
        prompt: '',
        savedAt: '2026-05-19T20:00:00Z',
      });
      mockGetHandoffTone.mockResolvedValue(null);
      const result = await getConsolidatedNotes('2026-05-19');
      expect(result).not.toBeNull();
      expect(result!.text).toBe('BP was high but he ate well.');
      expect(result!.savedAt).toBe('2026-05-19T20:00:00Z');
    });

    it('case 3 (only-tone-legacy): reflectionStorage empty; tone has legacy content → returns tone as-if-notes', async () => {
      mockGetReflection.mockResolvedValue(null);
      mockGetHandoffTone.mockResolvedValue('Felt off today.');
      const result = await getConsolidatedNotes('2026-05-19');
      expect(result).not.toBeNull();
      expect(result!.text).toBe('Felt off today.');
      // No savedAt for legacy-tone-only origin (handoffToneRepo doesn't
      // carry a timestamp).
      expect(result!.savedAt).toBeNull();
    });

    it('case 4a (BOTH, different content): concatenates with a plain blank-line separator — NO marker, NO migration artifact', async () => {
      mockGetReflection.mockResolvedValue({
        date: '2026-05-19',
        text: 'BP was high but he ate well.',
        prompt: '',
        savedAt: '2026-05-19T20:00:00Z',
      });
      mockGetHandoffTone.mockResolvedValue('Felt off today.');
      const result = await getConsolidatedNotes('2026-05-19');
      expect(result).not.toBeNull();
      // Per Q3 lock: silent concat, just a blank line between.
      expect(result!.text).toBe('BP was high but he ate well.\n\nFelt off today.');
      // Guard against any migration artifact bleeding into the visible
      // text — the caregiver shouldn't see internal store mechanics.
      expect(result!.text).not.toMatch(/legacy/i);
      expect(result!.text).not.toMatch(/handoff tone/i);
      expect(result!.text).not.toMatch(/—\s*tone\s*—/i);
      expect(result!.text).not.toMatch(/\*\*tone\*\*/i);
    });

    it('case 4b (BOTH, identical content): dedupes — shows once, not twice', async () => {
      const same = 'BP was high but he ate well.';
      mockGetReflection.mockResolvedValue({
        date: '2026-05-19',
        text: same,
        prompt: '',
        savedAt: '2026-05-19T20:00:00Z',
      });
      mockGetHandoffTone.mockResolvedValue(same);
      const result = await getConsolidatedNotes('2026-05-19');
      expect(result).not.toBeNull();
      expect(result!.text).toBe(same);
      // Not duplicated — count occurrences of the substring.
      const occurrences = result!.text.split(same).length - 1;
      expect(occurrences).toBe(1);
    });
  });

  // ------------------------------------------------------------------------
  // saveConsolidatedNotes — write-target discipline
  // ------------------------------------------------------------------------
  describe('saveConsolidatedNotes — write target (R5 lock)', () => {
    it('writes the consolidated value to reflectionStorage', async () => {
      mockSaveReflection.mockResolvedValue({
        date: '2026-05-19',
        text: 'merged value',
        prompt: '',
        savedAt: '2026-05-19T20:30:00Z',
      });
      await saveConsolidatedNotes('2026-05-19', 'merged value');
      expect(mockSaveReflection).toHaveBeenCalledTimes(1);
      // Verify the call landed with the right date + text. The third arg
      // (prompt) is a structural detail of saveReflection — accept any
      // value passed.
      const call = mockSaveReflection.mock.calls[0];
      expect(call[0]).toBe('2026-05-19');
      expect(call[1]).toBe('merged value');
    });

    it('does NOT write to handoffToneRepo — ever (the legacy store is permanently read-only)', async () => {
      mockSaveReflection.mockResolvedValue({
        date: '2026-05-19',
        text: 'anything',
        prompt: '',
        savedAt: '2026-05-19T20:30:00Z',
      });
      await saveConsolidatedNotes('2026-05-19', 'anything');
      // The whole-phase data-safety crux. If saveConsolidatedNotes
      // ever writes to handoffToneRepo, F1's promise breaks: legacy
      // data is no longer untouched, and a F1 bug could lose data.
      expect(mockSaveHandoffTone).not.toHaveBeenCalled();
    });
  });

  // ------------------------------------------------------------------------
  // Source-level guard — never-write defense against future drift
  // ------------------------------------------------------------------------
  describe('source-level guard — never-write defense', () => {
    it('utils/consolidatedNotes.ts does NOT import any handoffToneRepo write API', () => {
      // Defensive pin. If a future contributor wires the legacy write
      // API into the consolidated utility (say, to "keep the legacy
      // store in sync"), the read-time-merge discipline collapses and
      // the R5 data-safety guarantee breaks. Pin the import surface
      // so the write API can never be reached.
      //
      // Strip comments before scanning so the documented retirement
      // can name the forbidden symbol without false-positiving the
      // absence pin — only the executable source surface is policed.
      const src = readFileSync(
        join(__dirname, '../../utils/consolidatedNotes.ts'),
        'utf8',
      );
      const stripped = src
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/(^|[^:])\/\/.*$/gm, '$1');
      // Allow the read API — getHandoffTone IS the merge mechanism.
      expect(stripped).toMatch(/getHandoffTone/);
      // Forbid the write API anywhere in executable source.
      expect(stripped).not.toMatch(/saveHandoffTone/);
    });
  });
});
