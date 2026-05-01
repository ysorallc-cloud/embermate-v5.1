// ============================================================================
// SETTINGS → WHAT TO WATCH FOR
//
// Re-shows the onboarding WatchForScreen against the patient's current
// diagnoses. Active conditions are pulled from MedicalInfo; the screen is
// rendered with no Skip link (Settings re-views don't need that) and a
// Continue handler that just closes the screen.
//
// Last-shown timestamp is persisted in AsyncStorage and surfaced as the
// subtitle so caregivers can see when they last opened the list.
// ============================================================================

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';
import { WatchForScreen } from '../(onboarding)/screens/WatchForScreen';
import { getMedicalInfo } from '../../utils/medicalInfo';
import { logError } from '../../utils/devLog';
import { navigateBack } from '../../lib/navigate';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LAST_SHOWN_KEY = '@embermate_watch_for_last_shown';

function formatLastShown(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function WhatToWatchForScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [conditions, setConditions] = useState<string[]>([]);
  const [lastShown, setLastShown] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const info = await getMedicalInfo();
        if (!cancelled && info) {
          const active = info.diagnoses
            .filter((d) => d.status === 'active')
            .map((d) => d.condition);
          setConditions(active);
        }
        const stored = await AsyncStorage.getItem(LAST_SHOWN_KEY);
        if (!cancelled) setLastShown(stored);
        // Update last-shown to now so the next visit shows when this one
        // happened — fire-and-forget.
        AsyncStorage.setItem(LAST_SHOWN_KEY, new Date().toISOString()).catch((err) =>
          logError('what-to-watch-for.persistLastShown', err),
        );
      } catch (err) {
        logError('what-to-watch-for.load', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleContinue = useCallback(() => {
    navigateBack();
  }, []);

  const subtitle = lastShown
    ? `Last shown: ${formatLastShown(lastShown)}`
    : "For each condition you've added.";

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <WatchForScreen
          conditions={conditions}
          onContinue={handleContinue}
          subtitle={subtitle}
        />
      </SafeAreaView>
    </View>
  );
}

const createStyles = (c: typeof Colors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.background },
});
