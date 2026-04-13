// ============================================================================
// NOW HEADER — Greeting, date, patient chip, sample/hidden banners
// Extracted from now.tsx for maintainability
// ============================================================================

import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { ScreenHeader } from '../ScreenHeader';
import { PatientSwitcherModal } from './PatientSwitcherModal';
import { SampleDataBanner } from '../common/SampleDataBanner';
import { OnboardingPrompt } from '../prompts';

// ============================================================================
// TYPES
// ============================================================================

export interface NowHeaderProps {
  patientName: string;
  patients: any[];
  isSampleMode: boolean;
  showPatientSwitcher: boolean;
  onShowPatientSwitcher: (show: boolean) => void;
  onSampleCleared: () => void;
  suppressedItems: any[];
  onRestoreSuppressed: () => Promise<void>;
  showOnboarding: boolean;
  onboardingHandlers: {
    handleShowMeWhatMatters: () => void;
    handleExploreOnMyOwn: () => void;
  };
}

// ============================================================================
// HELPERS
// ============================================================================

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

// ============================================================================
// COMPONENT
// ============================================================================

export function NowHeader({
  patientName,
  patients,
  isSampleMode,
  showPatientSwitcher,
  onShowPatientSwitcher,
  onSampleCleared,
  suppressedItems,
  onRestoreSuppressed,
  showOnboarding,
  onboardingHandlers,
}: NowHeaderProps) {
  const { colors } = useTheme();
  const s = useMemo(() => createStyles(colors), [colors]);

  return (
    <>
      <ScreenHeader
        title={getGreeting()}
        subtitle={new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
        purpose={`Here's where ${patientName || 'your loved one'}'s care stands right now.`}
        rightAction={
          <TouchableOpacity
            onPress={() => onShowPatientSwitcher(true)}
            style={[s.patientChip, isSampleMode && s.patientChipDemo]}
            accessibilityLabel={`Patient: ${patientName}${isSampleMode ? ' (demo)' : ''}. Tap to switch.`}
            accessibilityRole="button"
          >
            <View style={s.patientAvatar}>
              <Text style={s.patientAvatarText}>
                {patientName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={s.patientChipName}>{patientName}</Text>
            {isSampleMode && (
              <Text style={s.demoBadge}>DEMO</Text>
            )}
            {patients.length > 1 && (
              <Text style={{ fontSize: 10, color: colors.textMuted }}>{'\u25BC'}</Text>
            )}
          </TouchableOpacity>
        }
      />
      <PatientSwitcherModal
        visible={showPatientSwitcher}
        onClose={() => onShowPatientSwitcher(false)}
      />

      {isSampleMode && (
        <View style={s.sampleBannerWrap}>
          <SampleDataBanner onCleared={onSampleCleared} />
        </View>
      )}

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
  patientChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.accentLight,
    borderWidth: 1,
    borderColor: c.accentBorder,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 6,
  },
  patientAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: c.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  patientAvatarText: {
    fontSize: 10,
    fontWeight: '600',
    color: c.textPrimary,
  },
  patientChipName: {
    fontSize: 12,
    color: c.textSecondary,
    fontWeight: '500',
  },
  patientChipDemo: {
    borderColor: c.purpleBright,
    borderWidth: 1.5,
  },
  demoBadge: {
    fontSize: 9,
    fontWeight: '700',
    color: c.purpleBright,
    backgroundColor: c.purpleFaint,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
    overflow: 'hidden',
    letterSpacing: 0.5,
  },
  sampleBannerWrap: {
    paddingHorizontal: 20,
    marginTop: 4,
  },
  hiddenBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginBottom: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
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
