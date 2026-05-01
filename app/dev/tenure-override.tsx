// ============================================================================
// DEV → TENURE OVERRIDE
//
// Developer-only surface. Lets QA flip the user's tenure phase between New /
// Experienced / Seasoned without waiting 91 days, so the time-decay
// scaffolding (toast prompt copy, anomaly thresholds, etc.) can be
// validated end-to-end.
//
// Reachable only via Settings → Developer → Tenure override, which itself
// only renders when (a) __DEV__ is true and (b) the dev-mode flag is on.
// ============================================================================

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';
import { SubScreenHeader } from '../../components/SubScreenHeader';
import {
  getTenureOverride,
  setTenureOverride,
  clearTenureOverride,
  type TenurePhase,
} from '../../services/userTenure';

interface OptionRow {
  testID: string;
  label: string;
  helper: string;
  // null → "Use real tenure" (clears the override).
  phase: TenurePhase | null;
}

const OPTIONS: OptionRow[] = [
  {
    testID: 'tenure-override-real',
    label: 'Use real tenure (default)',
    helper: 'Phase resolved from the actual install date.',
    phase: null,
  },
  {
    testID: 'tenure-override-new',
    label: 'Override: New caregiver',
    helper: '0–30 days. Toast shows the example-rich prompt.',
    phase: 'new',
  },
  {
    testID: 'tenure-override-experienced',
    label: 'Override: Experienced',
    helper: '31–90 days. Toast shows the short prompt.',
    phase: 'experienced',
  },
  {
    testID: 'tenure-override-seasoned',
    label: 'Override: Seasoned',
    helper: '91+ days. Toast quiet by default; anomalies still fire.',
    phase: 'seasoned',
  },
];

export default function DevTenureOverrideScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [active, setActive] = useState<TenurePhase | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const v = await getTenureOverride();
      if (!cancelled) setActive(v);
    })();
    return () => { cancelled = true; };
  }, []);

  const handleSelect = useCallback(async (phase: TenurePhase | null) => {
    if (phase === null) {
      await clearTenureOverride();
    } else {
      await setTenureOverride(phase);
    }
    setActive(phase);
  }, []);

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <SubScreenHeader
          title="Tenure override"
          subtitle="QA-only — flips the time-decay scaffolding."
        />
        <ScrollView contentContainerStyle={styles.content}>
          {OPTIONS.map((opt) => {
            const isActive = active === opt.phase;
            return (
              <TouchableOpacity
                key={opt.testID}
                testID={opt.testID}
                style={[styles.row, isActive && styles.rowActive]}
                onPress={() => handleSelect(opt.phase)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={opt.label}
                accessibilityState={{ selected: isActive }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowLabel}>{opt.label}</Text>
                  <Text style={styles.rowHelper}>{opt.helper}</Text>
                </View>
                {isActive && <Text style={styles.rowCheck}>{'✓'}</Text>}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const createStyles = (c: typeof Colors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.background },
  content: { padding: 20, paddingBottom: 60, gap: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.glass,
    borderWidth: 0.5,
    borderColor: c.glassBorder,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
  },
  rowActive: {
    borderColor: c.accent,
    backgroundColor: 'rgba(95, 184, 138, 0.08)',
  },
  rowLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: c.textPrimary,
    marginBottom: 3,
  },
  rowHelper: {
    fontSize: 11,
    color: c.textSecondary,
    lineHeight: 15,
  },
  rowCheck: {
    fontSize: 16,
    fontWeight: '600',
    color: c.accent,
  },
});
