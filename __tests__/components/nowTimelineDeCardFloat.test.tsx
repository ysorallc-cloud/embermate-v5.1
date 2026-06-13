// ============================================================================
// NOW TIMELINE — schedule de-cards and floats on page bg.
//
// Pre-fix: NowTimeline's expanded-state body wrapped <FlatTimelineFeed /> in
// a <View style={s.sectionCard}> whose style declared:
//   backgroundColor: c.glass
//   borderWidth: 1
//   borderColor: c.glassBorder
//   borderRadius: 14
//   padding: 12
//
// The card chrome gave the schedule its own enclosed surface — visually a
// "card containing the rows" — competing with the zone-restructure direction
// of "rows floating on the page bg under the section header." Phase 35
// followup retires the wrapper so the schedule renders as a flat list under
// "Today's Schedule" / "Care Plan →" with rows sitting directly on the page
// background.
//
// Paired with a page/card token tighten:
//   - page bg `background` → #0d0b08 (was #1a1612; deeper warm-black)
//   - card surface `glass` → #211e18 (was #363830; one-step-from-bg)
//
// Contract bundle:
//
//   A. RESTRUCTURE — NowTimeline.tsx
//      1. The expanded-state branch no longer wraps FlatTimelineFeed in a
//         <View style={s.sectionCard}>. FlatTimelineFeed renders as a
//         sibling to the SectionHeaderRow + (optional) empty-state Views.
//      2. The `sectionCard` style block — which carried the card chrome
//         (backgroundColor + borderWidth + borderColor + borderRadius +
//         padding) — is gone from createStyles.
//
//   B. MOUNT-LEVEL (the rule: screen restructures need a mount test —
//      [[feedback_screen_restructure_needs_mount_test]])
//      3. NowTimeline mounts with a seeded pending instance and renders
//         the FlatTimelineFeed child (proves the expanded-state path
//         compiles + paints after the wrapper removal).
//      4. onItemPress fires when a row-tap propagates from
//         FlatTimelineFeed (proves the logging path survives the
//         de-card — Standing Rule [[feedback_input_validity_end_to_end]]).
//
//   C. TOKENS
//      5. DarkColors.background === '#0d0b08'.
//      6. DarkColors.glass === '#211e18'.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

// ── RN env: stub the primitives so NowTimeline mounts hermetically. ─────────
jest.mock('react-native', () => {
  const React = require('react');
  const make = (name: string) =>
    React.forwardRef((props: any, ref: any) =>
      React.createElement(name, { ...props, ref }, props.children),
    );
  return {
    View: make('View'),
    Text: make('Text'),
    TouchableOpacity: make('TouchableOpacity'),
    Pressable: make('Pressable'),
    StyleSheet: { create: (s: any) => s, flatten: (s: any) => s },
    Platform: { OS: 'ios', select: (o: any) => o.ios || o.default },
  };
});

jest.mock('../../contexts/ThemeContext', () => ({
  // Proxy resolves every colors.X access to a unique string keyed on the
  // token name so style props are stable + inspectable.
  useTheme: () => ({
    colors: new Proxy({} as any, { get: (_, k) => `c.${String(k)}` }),
  }),
}));

jest.mock('../../lib/navigate', () => ({ navigate: jest.fn() }));

// Heavy siblings of FlatTimelineFeed — stub to null so the expanded-state
// path under test is the only branch that paints content.
jest.mock('../../components/now/TimelineSection', () => ({
  TimelineSection: () => null,
}));
jest.mock('../../components/now/ScheduleCard', () => ({
  ScheduleCard: () => null,
}));

// FlatTimelineFeed stub: emits a testID + exposes an onPress that fires
// the parent's onItemPress with the first pending item, proving the
// row-tap handler still wires through after the de-card.
jest.mock('../../components/now/FlatTimelineFeed', () => {
  const React = require('react');
  return {
    FlatTimelineFeed: ({ allPending, onItemPress }: any) =>
      React.createElement('TouchableOpacity', {
        testID: 'flat-timeline-feed-stub',
        onPress: () => onItemPress(allPending[0]),
      }, 'feed-mounted'),
  };
});

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { NowTimeline } from '../../components/now/NowTimeline';
import { getDarkColors } from '../../theme/theme-tokens';

const ROOT = join(__dirname, '../..');
const SRC = readFileSync(join(ROOT, 'components/now/NowTimeline.tsx'), 'utf8');

function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

const seededPending = [
  {
    id: 'inst-pending-1',
    carePlanItemId: 'sync-vitals',
    itemName: 'Check vitals',
    itemType: 'vitals',
    scheduledTime: '2026-06-13T08:00:00',
    windowLabel: 'morning',
    status: 'pending',
  },
];

const baseProps = {
  timelineCollapsed: false, // expanded path — the one under restructure
  onToggleCollapse: jest.fn(),
  windowSummary: [],
  allPending: seededPending,
  completed: [],
  hasRegimenInstances: true,
  hasBucketCarePlan: true,
  hasCarePlan: true,
  selectedCategory: null,
  onClearCategory: jest.fn(),
  onItemPress: jest.fn(),
  onBatchMedConfirm: jest.fn(),
  onQuickConfirm: jest.fn(),
  onStartRoutine: jest.fn(),
  todayStats: { progress: 0, total: 1, completed: 0 } as any,
  enabledBuckets: ['meds' as const],
  waterGlasses: 0,
  waterGoal: 8,
  onWaterUpdate: jest.fn(),
} as any;

describe('NowTimeline — schedule de-cards, floats on page bg', () => {
  describe('A. Source structure', () => {
    const stripped = stripComments(SRC);

    it('does NOT wrap FlatTimelineFeed in a <View style={s.sectionCard}>', () => {
      // Pre-fix, the expanded-state branch read:
      //   <View style={s.sectionCard}>
      //     <FlatTimelineFeed ... />
      //     {empty-state branches}
      //   </View>
      // Post-fix, FlatTimelineFeed is a sibling of the header (no card
      // wrapper). Any other usage of s.sectionCard styling around
      // FlatTimelineFeed within the file is a regression.
      expect(stripped).not.toMatch(
        /style=\{s\.sectionCard\}[\s\S]*?<FlatTimelineFeed\b/,
      );
    });

    it('the sectionCard style block is removed from createStyles', () => {
      // The full card-chrome style block — backgroundColor + borderColor
      // + borderRadius + padding — has no remaining consumer once the
      // wrapper retires. Removing the style entry forward-guards
      // re-introduction.
      expect(stripped).not.toMatch(/\bsectionCard:\s*\{/);
    });
  });

  describe('B. Mount-level — restructured screen still paints + still logs', () => {
    it('NowTimeline mounts and FlatTimelineFeed renders in the expanded-state branch', () => {
      const { getByTestId } = render(<NowTimeline {...baseProps} />);
      expect(getByTestId('flat-timeline-feed-stub')).toBeTruthy();
    });

    it('onItemPress fires when a row tap propagates from FlatTimelineFeed', () => {
      const onItemPress = jest.fn();
      const { getByTestId } = render(
        <NowTimeline {...baseProps} onItemPress={onItemPress} />,
      );
      fireEvent.press(getByTestId('flat-timeline-feed-stub'));
      expect(onItemPress).toHaveBeenCalledWith(seededPending[0]);
    });
  });

  describe('C. Page/card tokens', () => {
    const dark = getDarkColors();

    it('background (page bg) is the deeper warm-black #0d0b08', () => {
      expect(dark.background).toBe('#0d0b08');
    });

    it('glass (card surface) is the one-step-from-bg #211e18', () => {
      expect(dark.glass).toBe('#211e18');
    });
  });
});
