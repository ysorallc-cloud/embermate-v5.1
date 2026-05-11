// ============================================================================
// NOW FOOTER — All-done celebration + End of Shift card
//
// Phase 15.6 retired the Today's Journal feed-forward tile that
// previously sat at the top of the footer body. Both ternary
// branches (dimmed italic line at completedCount < 5, populated
// card with "📓 Today's Journal" preview + "View journal →" CTA at
// completedCount ≥ 5 with brief loaded) are gone. The Journal tab
// is reachable via the bottom tab bar — the in-Now preview was a
// duplicate navigation surface that competed with End-of-Shift for
// page-bottom attention.
//
// Dropped along with the tile:
//   • `brief` prop from NowFooterProps (the only consumer)
//   • `buildJournalPreview` + `CareBrief` imports from
//     careSummaryBuilder (CareBrief was only used to type the prop)
//   • 6 styles (journalPreviewCard / journalPreviewDimmed /
//     journalPreviewDimmedText / journalPreviewTitle /
//     journalPreviewText / journalPreviewLink)
//
// buildJournalPreview filed as dead code (no callers post-15.6;
// separate cleanup scope per spec).
// ============================================================================

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { EndOfShiftCard } from './EndOfShiftCard';
import type { DailyOutcomes } from '../../utils/text/types';
import { CareCircleTeaser } from '../CareCircleTeaser';
import { CareCircleEmailCapture } from '../CareCircleEmailCapture';
import { shouldShowTeaser } from '../../utils/careCircleTeaser';
import { safeSetItem } from '../../utils/safeStorage';

// ============================================================================
// FEATURE FLAG — Phase 13.5.2
// ============================================================================
// v1.0 ships without the Care Circle waitlist so the App Store privacy label
// can stay "Data Not Collected." When this flag is false, the teaser card
// and the email-capture modal are not rendered, the modal is unreachable
// through any user flow, and no email is captured locally or remotely.
//
// v1.1 enablement path:
//   1. Flip CARE_CIRCLE_V7_TEASER_ENABLED to true.
//   2. Wire components/CareCircleEmailCapture.tsx handleSubmit to a real
//      backend POST (currently writes to local AsyncStorage only).
//   3. Re-add EXPO_PUBLIC_WAITLIST_URL (or equivalent config path) to surface
//      the URL — at that point, the privacy label must declare Email Address
//      collection.
// ============================================================================

const CARE_CIRCLE_V7_TEASER_ENABLED = false;

// ============================================================================
// TYPES
// ============================================================================

export interface NowFooterProps {
  completedCount: number;
  allPendingCount: number;
  hasRegimenInstances: boolean;
  hasMissed: boolean;
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
  outcomes,
}: NowFooterProps) {
  const { colors } = useTheme();
  const s = useMemo(() => createStyles(colors), [colors]);

  // Care Circle teaser — non-blocking async visibility check
  const [showTeaser, setShowTeaser] = useState(false);
  const [emailSheetVisible, setEmailSheetVisible] = useState(false);

  useEffect(() => {
    if (!CARE_CIRCLE_V7_TEASER_ENABLED) return;
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

      {/* Care Circle teaser — gated off for v1.0 (see CARE_CIRCLE_V7_TEASER_ENABLED) */}
      {CARE_CIRCLE_V7_TEASER_ENABLED && showTeaser && (
        <CareCircleTeaser
          onJoin={handleTeaserJoin}
          onDismiss={handleTeaserDismiss}
        />
      )}

      {CARE_CIRCLE_V7_TEASER_ENABLED && (
        <CareCircleEmailCapture
          visible={emailSheetVisible}
          onClose={() => {
            setEmailSheetVisible(false);
            // Re-check visibility — if user joined, teaser should hide
            shouldShowTeaser().then(show => setShowTeaser(show));
          }}
        />
      )}
    </>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const createStyles = (c: any) => StyleSheet.create({
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
