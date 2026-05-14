// ============================================================================
// NOW HEADER — Greeting, date, patient chip, sample/hidden banners
// Extracted from now.tsx for maintainability
// ============================================================================

import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { NowGreeting } from './NowGreeting';
import { PatientSwitcherModal } from './PatientSwitcherModal';
import { OnboardingPrompt } from '../prompts';
import type { TodayStats } from '../../utils/nowHelpers';

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
        <TouchableOpacity
          onPress={() => onShowPatientSwitcher(true)}
          style={s.patientChip}
          accessibilityLabel={`Patient: ${patientName}${isSampleMode ? ' (example)' : ''}. Tap to switch.`}
          accessibilityRole="button"
        >
          <View style={s.patientAvatar}>
            <Text style={s.patientAvatarText}>
              {patientName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={s.patientChipName}>{patientName}</Text>
          {patients.length > 1 && (
            <Text style={{ fontSize: 10, color: colors.textMuted }}>{'\u25BC'}</Text>
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
