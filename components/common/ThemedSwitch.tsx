// ============================================================================
// THEMED SWITCH — the ONE canonical toggle for Care Plan.
//
// A thin wrapper over React Native's <Switch> that bakes in the
// sage-track / cream-knob palette so toggles can't drift back to the
// raw iOS-green/white default (or the louder saturated `accent`
// track). ON track = accentMuted (muted sage, per Phase 33 F3); knob =
// textPrimary (cream); OFF track + iOS background = glassStrong; OFF
// knob = switchThumbOff.
//
// Consumed by the Care Plan category rows (CategoryRow in
// app/care-plan/index.tsx) and the per-window rows in
// WellnessWindowsDrawer. New toggles in this surface should use this
// component rather than re-inlining the color props — that inlining is
// exactly how the WellnessWindowsDrawer enable Switch drifted to
// iOS-green in the first place.
//
// The themed color props are applied AFTER {...rest}, so a caller can
// never accidentally override them back to a non-dictionary palette.
// ============================================================================

import React from 'react';
import { Switch, SwitchProps } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

export function ThemedSwitch({ value, ...rest }: SwitchProps) {
  const { colors } = useTheme();
  return (
    <Switch
      {...rest}
      value={value}
      trackColor={{ false: colors.glassStrong, true: colors.accentMuted }}
      thumbColor={value ? colors.textPrimary : colors.switchThumbOff}
      ios_backgroundColor={colors.glassStrong}
    />
  );
}

export default ThemedSwitch;
