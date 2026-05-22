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

// In-memory backing store for safeStorage. The authoritative flag lives
// here via a key pattern owned by the consolidatedNotes utility. Tests
// reset the store between cases.
const safeStorageBacking: Record<string, any> = {};
jest.mock('../../utils/safeStorage', () => ({
  safeGetItem: jest.fn(async (key: string, fallback: any) => {
    return key in safeStorageBacking ? safeStorageBacking[key] : fallback;
  }),
  safeSetItem: jest.fn(async (key: string, value: any) => {
    safeStorageBacking[key] = value;
  }),
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
    for (const key of Object.keys(safeStorageBacking)) {
      delete safeStorageBacking[key];
    }
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
  // Authoritative-flag semantics — "reflectionStorage owns this date"
  //
  // The flag is the design extension that closes the after-save re-merge
  // corruption bug. Semantics:
  //
  //   • Flag SET for a date → reflectionStorage is authoritative. The
  //     legacy tone store is NEVER consulted for that date again, even
  //     if it still has content. This is what kills the doubling at
  //     the root: once the user has saved through the consolidated
  //     input, their notes are canonical and the legacy tone is purely
  //     historical.
  //   • Flag NOT SET (date never saved through consolidated path) →
  //     read-time merge applies (the 4 input states + dedupe above).
  //   • On first save through saveConsolidatedNotes → flag set
  //     unconditionally for that date. From then on, the
  //     "authoritative" rule applies forever.
  //
  // Pre-extension: the original 4-state merge runs every load, so an
  // after-save read with diverged-from-tone content re-concatenates
  // and corrupts. Contract (a) below pins the exact bug RED before
  // the flag mechanism lands.
  // ------------------------------------------------------------------------
  describe('authoritative-flag semantics — after-save reads must not re-merge', () => {
    it('(a) after-save read does NOT re-merge — even when edited text diverges from raw tone (THE BUG)', async () => {
      // Setup: mid-day legacy user. handoffToneRepo has "Felt off." and
      // reflectionStorage starts empty.
      mockGetReflection.mockResolvedValueOnce(null);
      mockGetHandoffTone.mockResolvedValue('Felt off.');

      // First load — case 3 (only-tone-legacy).
      const first = await getConsolidatedNotes('2026-05-19');
      expect(first?.text).toBe('Felt off.');

      // User edits + saves a diverged version. saveReflection mock
      // returns the new value as if persisted.
      mockSaveReflection.mockResolvedValue({
        date: '2026-05-19',
        text: 'Felt off but recovered.',
        prompt: '',
        savedAt: '2026-05-19T16:00:00Z',
      });
      await saveConsolidatedNotes('2026-05-19', 'Felt off but recovered.');

      // Subsequent reads should see ONLY the saved reflection — the
      // legacy tone store is no longer consulted for this date.
      mockGetReflection.mockResolvedValue({
        date: '2026-05-19',
        text: 'Felt off but recovered.',
        prompt: '',
        savedAt: '2026-05-19T16:00:00Z',
      });
      // Legacy tone still present in its store (NEVER deleted per R5).
      // The authoritative flag should cause the merge to skip it.

      const second = await getConsolidatedNotes('2026-05-19');
      expect(second?.text).toBe('Felt off but recovered.');
      // Crucially: no concatenation, no doubling, no trace of the
      // raw tone re-appended.
      expect(second?.text).not.toContain('Felt off but recovered.\n\nFelt off.');
      expect(second?.text).not.toMatch(/Felt off\.\s*$/);
    });

    it('(b) the authoritative flag is set on save (regardless of whether tone existed)', async () => {
      // Setup: user with no prior data writes a fresh note.
      mockGetReflection.mockResolvedValue(null);
      mockGetHandoffTone.mockResolvedValue(null);
      mockSaveReflection.mockResolvedValue({
        date: '2026-05-20',
        text: 'Fresh note.',
        prompt: '',
        savedAt: '2026-05-20T10:00:00Z',
      });

      // Pre-save: flag absent.
      const flagKeys = Object.keys(safeStorageBacking).filter((k) =>
        k.includes('authoritative') || k.includes('consolidated'),
      );
      expect(flagKeys.length).toBe(0);

      await saveConsolidatedNotes('2026-05-20', 'Fresh note.');

      // Post-save: a flag key exists for this date. The exact key
      // shape is an implementation detail; pin presence + per-date
      // scoping (key contains the date).
      const flagKeysAfter = Object.keys(safeStorageBacking).filter((k) =>
        k.includes('2026-05-20'),
      );
      expect(flagKeysAfter.length).toBeGreaterThanOrEqual(1);
      // And the value is truthy so the read-side guard can branch on it.
      const flagValue = safeStorageBacking[flagKeysAfter[0]];
      expect(flagValue).toBeTruthy();
    });

    it('(c) first load (flag NOT set) still concatenates both stores per the brief — preserves the mid-day-legacy case', async () => {
      // Setup: BOTH stores have different content, no prior save
      // through the consolidated input (flag absent). This is the
      // pre-existing case 4a — the merge MUST still fire on this
      // first interaction so the user sees both blocks of legacy
      // content before they edit.
      mockGetReflection.mockResolvedValue({
        date: '2026-05-21',
        text: 'BP was high but he ate well.',
        prompt: '',
        savedAt: '2026-05-21T18:00:00Z',
      });
      mockGetHandoffTone.mockResolvedValue('Felt off today.');

      // No save call between setup and read — flag absent.
      const result = await getConsolidatedNotes('2026-05-21');
      expect(result?.text).toBe(
        'BP was high but he ate well.\n\nFelt off today.',
      );
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
