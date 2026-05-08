// ============================================================================
// useFirstRealMode — Phase 5.13.e.
//
// Reads the first-real-mode landing flag (set to 'false' by 5.13.d's wizard
// completion) and exposes:
//   • shouldShow — true when the flag is exactly 'false', meaning the user
//                  just finished the wizard and hasn't seen the Now-tab
//                  welcome card yet.
//   • markSeen   — flips the flag to 'true' so the card never re-renders.
//
// The flag is intentionally three-state:
//   • absent    — user hasn't completed the wizard (or pre-5.13 install).
//                 Welcome card stays hidden; no first-real-mode posture.
//   • 'false'   — wizard just finished. Welcome card shows once.
//   • 'true'    — card has been seen. Permanent off.
// ============================================================================

import { useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logError } from '../utils/devLog';

export const FIRST_REAL_MODE_KEY = '@embermate_first_real_mode_landed';

export interface UseFirstRealModeValue {
  shouldShow: boolean;
  markSeen: () => Promise<void>;
}

export function useFirstRealMode(): UseFirstRealModeValue {
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const v = await AsyncStorage.getItem(FIRST_REAL_MODE_KEY);
        if (cancelled) return;
        setShouldShow(v === 'false');
      } catch (err) {
        logError('useFirstRealMode.read', err);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const markSeen = useCallback(async () => {
    setShouldShow(false);
    try {
      await AsyncStorage.setItem(FIRST_REAL_MODE_KEY, 'true');
    } catch (err) {
      logError('useFirstRealMode.markSeen', err);
    }
  }, []);

  return { shouldShow, markSeen };
}
