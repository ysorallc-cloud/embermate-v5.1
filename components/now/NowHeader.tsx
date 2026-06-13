// ============================================================================
// NOW HEADER — Greeting, date, patient chip, sample/hidden banners
// Extracted from now.tsx for maintainability
// ============================================================================

import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { NowGreeting } from './NowGreeting';
import { PatientSwitcherModal } from './PatientSwitcherModal';
import { OnboardingPrompt } from '../prompts';
import type { TodayStats } from '../../utils/nowHelpers';
import { getCaregiverProfile } from '../../storage/caregiverProfileRepo';

// F7 fix (2026-06-13) — caregiver-identity chip color. Dusty blue
// matches the You-tab nav avatar (C6c-A Option D) so the same lane
// reads consistently across surfaces.
const DUSTY = '#6b8cae';

// ============================================================================
// TYPES
// ============================================================================

export interface NowHeaderProps {
  patientName: string;
  patients: any[];
  isSampleMode: boolean;
  showPatientSwitcher: boolean;
  onShowPatientSwitcher: (show: boolean) => void;
  suppressedItems: any[];
  onRestoreSuppressed: () => Promise<void>;
  showOnboarding: boolean;
  onboardingHandlers: {
    handleShowMeWhatMatters: () => void;
    handleExploreOnMyOwn: () => void;
  };
  stats: TodayStats;
  nextScheduledTime?: string | null;
  onManageSample?: (focus: 'setup' | 'remove') => void;
}

// getGreeting removed — replaced by NowGreeting + buildGreeting()

// ============================================================================
// COMPONENT
// ============================================================================

export function NowHeader({
  patientName,
  patients,
  isSampleMode,
  showPatientSwitcher,
  onShowPatientSwitcher,
  suppressedItems,
  onRestoreSuppressed,
  showOnboarding,
  onboardingHandlers,
  stats,
  nextScheduledTime = null,
  onManageSample,
}: NowHeaderProps) {
  const { colors } = useTheme();
  const s = useMemo(() => createStyles(colors), [colors]);

  // F7 fix (2026-06-13) — caregiver-identity avatar. Replaces the
  // prior patient-initial + patient-name display so the header chip
  // identifies WHO the caregiver is, not which patient is in scope.
  // The patient-switcher modal still opens on tap (the affordance
  // doubles as a caregiver-identity marker + patient-switcher
  // entry); patient context surfaces inside the modal itself.
  // Heart-glyph fallback when no caregiver name is set.
  const [caregiverInitial, setCaregiverInitial] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    getCaregiverProfile()
      .then((profile) => {
        if (cancelled) return;
        const name = profile?.name?.trim() ?? '';
        setCaregiverInitial(name.length > 0 ? name.charAt(0).toUpperCase() : null);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  return (
    <>
      {/* Header row: greeting left + patient chip right */}
      <View style={s.headerRow}>
        <View style={{ flex: 1 }}>
          <NowGreeting
            stats={stats}
            patientName={patientName || 'your loved one'}
            nextScheduledTime={nextScheduledTime}
          />
        </View>
        {/* Phase 23.1 Fix 3 \u2014 DEMO badge retired. Sample-mode state is
            communicated by the SampleModeBanner pill ("Viewing example
            data") rendered below; the patient-chip badge was a redundant
            second affordance for the same fact. accessibilityLabel keeps
            "(example)" so screen readers still announce sample mode on
            the chip. */}
        {/* F7 fix (2026-06-13) \u2014 caregiver-identity avatar. The chip
            no longer renders the patient name (or patient initial) \u2014
            it shows the caregiver's first initial in dusty blue, with
            a heart-glyph fallback when no caregiver name is set.
            Tapping still opens the PatientSwitcherModal where patient
            context lives. The patientChip / patientAvatar / patient
            ChipName style definitions stay intact for back-compat
            with style-pin tests; only the JSX render flips. */}
        <TouchableOpacity
          onPress={() => onShowPatientSwitcher(true)}
          style={s.patientChip}
          accessibilityLabel={`Caregiver${isSampleMode ? ' (example mode)' : ''}. Tap to switch patient.`}
          accessibilityRole="button"
        >
          <View style={s.patientAvatar}>
            {caregiverInitial ? (
              <Text style={s.patientAvatarText}>{caregiverInitial}</Text>
            ) : (
              <Text style={s.patientAvatarText}>{'\u2665'}</Text>
            )}
          </View>
          {patients.length > 1 && (
            <Text style={{ fontSize: 10, color: colors.textMuted, marginLeft: 4 }}>{'\u25BC'}</Text>
          )}
        </TouchableOpacity>
      </View>
      <PatientSwitcherModal
        visible={showPatientSwitcher}
        onClose={() => onShowPatientSwitcher(false)}
        onManageSample={onManageSample}
      />

      {/* SampleModeBanner now renders at the now.tsx level (between header
          and StatRings). The legacy SampleDataBanner has been retired in
          favour of that lighter pill + the ManageSampleDataSheet. */}

      {suppressedItems.length > 0 && (
        <View
          style={s.hiddenBanner}
          accessibilityLabel={`${suppressedItems.length} item${suppressedItems.length === 1 ? '' : 's'} hidden for today`}
          accessibilityRole="text"
        >
          <Text style={s.hiddenBannerText}>
            {suppressedItems.length} item{suppressedItems.length === 1 ? '' : 's'} hidden for today
          </Text>
          <TouchableOpacity
            onPress={() => {
              Alert.alert(
                'Restore Hidden Items',
                'Show all Care Plan items for today?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Restore All', onPress: onRestoreSuppressed },
                ],
              );
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Restore all hidden items"
          >
            <Text style={s.hiddenBannerAction}>Restore All</Text>
          </TouchableOpacity>
        </View>
      )}

      {showOnboarding && (
        <OnboardingPrompt
          onShowMeWhatMatters={onboardingHandlers.handleShowMeWhatMatters}
          onExploreOnMyOwn={onboardingHandlers.handleExploreOnMyOwn}
        />
      )}
    </>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const createStyles = (c: any) => StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 16, // allow: tap-target padding (Apple HIG ≥44pt)
    paddingTop: 32,
    paddingBottom: 24, // allow: tap-target padding (Apple HIG ≥44pt)
  },
  patientChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.accentTint,
    borderWidth: 0.5,
    borderColor: c.accentBorder,
    borderRadius: 11,
    height: 22,
    paddingHorizontal: 8,
    gap: 5,
  },
  patientAvatar: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: c.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  patientAvatarText: {
    fontSize: 9,
    fontWeight: '600',
    color: c.textPrimary,
  },
  patientChipName: {
    fontSize: 10,
    color: c.textSecondary,
    fontWeight: '500',
  },
  hiddenBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginBottom: 8,
    padding: 12,
    backgroundColor: c.glass,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: c.glassHover,
  },
  hiddenBannerText: {
    fontSize: 13,
    color: c.textHalf,
  },
  hiddenBannerAction: {
    fontSize: 13,
    color: c.accent,
    fontWeight: '500',
  },
});
