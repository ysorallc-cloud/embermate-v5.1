// ============================================================================
// useSaveConfirmation — the app-wide save-confirmation pattern (Option C).
//
// Extracted from JournalNotesCard (the reference implementation) as the
// reusable hook every input surface adopts. The design call (banked):
//
//   The confirmation ("✓ Saved" pulse + a11y "Saved" announcement) is owned
//   by the SAVE ACTION and reset on IDENTITY change — never on the saved-value
//   prop echo. A surface that lifts its just-saved value back into a
//   `savedText`/`savedValue` prop would, under a value-keyed reset, clear the
//   confirmation before the caregiver could perceive it (the bug Option C
//   closes). Keying the reset to a stable identity (e.g., the day, the record
//   id) makes the confirmation immune to same-identity value echoes, and a
//   genuine identity switch still clears a stale badge from the prior record.
//
// Returns `confirmSave`, a guarded async runner: no-op while a save is in
// flight, awaits the caller's save, then flips `justSaved` on and schedules
// its reset. On save failure `justSaved` stays false — no false confirmation.
//
// See memory: project_save_confirmation_pattern.
// ============================================================================

import { useState, useRef, useEffect, useCallback } from 'react';

export interface UseSaveConfirmationOptions {
  /**
   * Stable identity for the thing being saved (the day string, a record
   * id, …). When it changes, any pending "just saved" confirmation is
   * cleared. A value echo within the SAME identity cannot reach justSaved.
   */
  identityKey: string;
  /** How long the confirmation stays visible after a save (ms). Default 3000. */
  holdMs?: number;
}

export interface UseSaveConfirmation {
  /** True for `holdMs` after a successful save — drives the visible pulse
   *  and the a11y "Saved" live-region announcement. */
  justSaved: boolean;
  /** True while a save is in flight. */
  saving: boolean;
  /**
   * Run a guarded save. No-op if a save is already in flight. Awaits
   * `save`; on success flips `justSaved` on and schedules its reset. The
   * confirmation is NOT set if `save` rejects (the rejection propagates to
   * the caller unchanged), so a failed write never shows a false "Saved".
   */
  confirmSave: (save: () => Promise<void>) => Promise<void>;
}

export function useSaveConfirmation(
  { identityKey, holdMs = 3000 }: UseSaveConfirmationOptions,
): UseSaveConfirmation {
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Confirmation reset keyed to IDENTITY (Option C). A genuine identity
  // switch clears any stale "✓ Saved" from the previous record; a value
  // echo within the same identity cannot reach justSaved. This is the
  // structural guard that removes the whole "echo clears the confirmation"
  // bug class rather than detecting and suppressing one specific echo.
  useEffect(() => {
    setJustSaved(false);
  }, [identityKey]);

  // Clean up the pending reset timer on unmount.
  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const confirmSave = useCallback(
    async (save: () => Promise<void>) => {
      if (saving) return;
      setSaving(true);
      try {
        await save();
        setJustSaved(true);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => setJustSaved(false), holdMs);
      } finally {
        setSaving(false);
      }
    },
    [saving, holdMs],
  );

  return { justSaved, saving, confirmSave };
}

export default useSaveConfirmation;
