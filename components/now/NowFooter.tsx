// ============================================================================
// NOW FOOTER — Journal preview card + all-done celebration
// Extracted from now.tsx for maintainability
// ============================================================================

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { navigate } from '../../lib/navigate';
import { buildJournalPreview, CareBrief } from '../../utils/careSummaryBuilder';
import { EndOfShiftCard } from './EndOfShiftCard';
import type { DailyOutcomes } from '../../utils/text/types';
import { CareCircleTeaser } from '../CareCircleTeaser';
import { CareCircleEmailCapture } from '../CareCircleEmailCapture';
import { shouldShowTeaser } from '../../utils/careCircleTeaser';
import { safeSetItem } from '../../utils/safeStorage';

// ============================================================================
// TYPES
// ============================================================================

export interface NowFooterProps {
  completedCount: number;
  allPendingCount: number;
  hasRegimenInstances: boolean;
  hasMissed: boolean;
  brief: CareBrief | null;
  /** Structured outcomes for the End of Shift body composer. */
  outcomes?: DailyOutcomes;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function NowFooter({
  completedCount,
  allPendingCount,
  hasRegimenInstances,
  hasMissed,
  brief,
  outcomes,
}: NowFooterProps) {
  const { colors } = useTheme();
  const s = useMemo(() => createStyles(colors), [colors]);

  // Care Circle teaser — non-blocking async visibility check
  const [showTeaser, setShowTeaser] = useState(false);
  const [emailSheetVisible, setEmailSheetVisible] = useState(false);

  useEffect(() => {
    shouldShowTeaser().then(show => setShowTeaser(show));
  }, []);

  const handleTeaserDismiss = useCallback(() => {
    setShowTeaser(false);
    safeSetItem('embermate.careCircle.teaserDismissed', 'true');
  }, []);

  const handleTeaserJoin = useCallback(() => {
    setEmailSheetVisible(true);
  }, []);

  return (
    <>
      {completedCount < 5 ? (
        <View style={s.journalPreviewDimmed}>
          <Text style={s.journalPreviewDimmedText}>
            Your journal entry builds throughout the day. Review it tonight.
          </Text>
        </View>
      ) : brief ? (
        <TouchableOpacity
          style={s.journalPreviewCard}
          onPress={() => navigate('/(tabs)/journal')}
          activeOpacity={0.7}
          accessibilityLabel="View journal"
          accessibilityRole="button"
        >
          <Text style={s.journalPreviewTitle}>{'\uD83D\uDCD3'} Today's Journal</Text>
          <Text style={s.journalPreviewText} numberOfLines={2}>
            {buildJournalPreview(brief)}
          </Text>
          <Text style={s.journalPreviewLink}>View journal →</Text>
        </TouchableOpacity>
      ) : null}

      {hasRegimenInstances &&
        allPendingCount === 0 &&
        completedCount > 0 &&
        !hasMissed && (
        <View
          style={s.allDoneMessage}
          accessible={true}
          accessibilityRole="text"
          accessibilityLabel="All caught up! All care plan items are complete for today."
          accessibilityLiveRegion="polite"
        >
          <Text style={s.allDoneEmoji}>🎉</Text>
          <Text style={s.allDoneText}>All caught up!</Text>
        </View>
      )}

      <EndOfShiftCard completedCount={completedCount} outcomes={outcomes} />

      {/* Care Circle teaser — only for invested users (14+ days) */}
      {showTeaser && (
        <CareCircleTeaser
          onJoin={handleTeaserJoin}
          onDismiss={handleTeaserDismiss}
        />
      )}

      <CareCircleEmailCapture
        visible={emailSheetVisible}
        onClose={() => {
          setEmailSheetVisible(false);
          // Re-check visibility — if user joined, teaser should hide
          shouldShowTeaser().then(show => setShowTeaser(show));
        }}
      />
    </>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const createStyles = (c: any) => StyleSheet.create({
  journalPreviewDimmed: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed' as any,
    borderColor: c.glassBorder,
    opacity: 0.5,
    alignItems: 'center' as const,
  },
  journalPreviewDimmedText: {
    fontSize: 13,
    color: c.textMuted,
    textAlign: 'center' as const,
  },
  journalPreviewCard: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    borderRadius: 14,
    backgroundColor: c.glass,
    borderWidth: 1,
    borderColor: c.glassBorder,
  },
  journalPreviewTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: c.textPrimary,
    marginBottom: 4,
  },
  journalPreviewText: {
    fontSize: 13,
    color: c.textSecondary,
    marginBottom: 8,
  },
  journalPreviewLink: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: c.accent,
  },
  allDoneMessage: {
    backgroundColor: c.greenTint,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 8,
  },
  allDoneEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  allDoneText: {
    fontSize: 16,
    fontWeight: '600',
    color: c.green,
  },
});
