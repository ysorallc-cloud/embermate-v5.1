// ============================================================================
// GUIDANCE TILES — F7 C6b (2026-06-12).
//
// Four accordion tiles below the gentle-nudge card on the caregiver-wellness
// subscreen. Each tile collapses to icon · title · desc · tag chip; tapping
// expands the full body copy inline. No navigation, no external links —
// fully on-device.
//
// Renders alongside the existing wellness cards regardless of data state
// (even on the empty-state surface) so the guidance is available from day
// one of the caregiver's journey.
//
// Copy is sealed verbatim from the F7 spec — do not paraphrase.
// ============================================================================

import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Colors, Fonts } from '../../theme/theme-tokens';
import {
  CARD_PADDING_H,
  CARD_PADDING_V,
  CardBorder,
  ROW_V,
  TypeScale,
} from '../../theme/spacing';

interface TileSpec {
  id: string;
  icon: string;
  title: string;
  desc: string;
  tag: string;
  expanded: string;
}

const TILES: ReadonlyArray<TileSpec> = [
  {
    id: 'recognizing-burnout',
    icon: '📖',
    title: 'Recognizing caregiver burnout',
    desc:
      "The signs are quieter than you'd expect — and often mistaken for laziness or weakness. They're not.",
    tag: 'Read · 4 min',
    expanded:
      "Burnout in caregivers doesn't look like collapse. It looks like going through the motions. Feeling resentful and then guilty about it. Losing interest in things that used to matter. Sleeping but not resting. If any of that sounds familiar, you're not failing — you're depleted. The difference matters.",
  },
  {
    id: 'box-breathing',
    icon: '🌬️',
    title: 'Box breathing — 4 minutes',
    desc:
      'In for 4, hold for 4, out for 4, hold for 4. Used by ER nurses. Works when nothing else does.',
    tag: 'Exercise · 4 min',
    expanded:
      "Sit or lie down. Breathe in through your nose for 4 counts. Hold for 4. Out through your mouth for 4. Hold for 4. That's one cycle. Do 4–8 cycles. Your nervous system responds to this even when your mind doesn't believe it will. Set a 4-minute timer and just do it.",
  },
  {
    id: 'what-would-you-tell-a-friend',
    icon: '✍️',
    title: 'What would you tell a friend?',
    desc:
      "If a close friend was doing what you're doing — would you tell them to push harder, or to rest?",
    tag: 'Reflection · 2 min',
    expanded:
      "Take 2 minutes. Write down what a close friend would say to you right now if they could see everything — the exhaustion, the small moments, the things you're doing that no one notices. Would they tell you to do more? Or would they tell you that what you're doing is already enough? Read what you wrote.",
  },
  {
    id: 'what-to-say-when-you-need-help',
    icon: '💬',
    title: 'What to say when you need help',
    desc:
      "Most caregivers don't ask. A few sentences for when you're ready to.",
    tag: 'Read · 3 min',
    expanded:
      "Try this: 'I'm struggling more than I've been letting on. I don't need you to fix anything — I just need [one specific thing: a few hours off / someone to talk to / help with X]. Can you help with that?' You can send this as a text. You don't have to say it out loud.",
  },
];

export function GuidanceTiles() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <View style={styles.zone} testID="wellness-guidance-tiles">
      <Text style={styles.sectionHeader}>FOR CAREGIVERS</Text>
      {TILES.map((tile, idx) => {
        const isExpanded = expandedId === tile.id;
        return (
          <View
            key={tile.id}
            style={[styles.tile, idx > 0 && styles.tileSpacer]}
            testID={`guidance-tile-${tile.id}`}
          >
            <TouchableOpacity
              onPress={() => setExpandedId((curr) => (curr === tile.id ? null : tile.id))}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={tile.title}
              accessibilityState={{ expanded: isExpanded }}
              accessibilityHint={`Double tap to ${isExpanded ? 'collapse' : 'expand'} this tile.`}
              style={styles.tileHeader}
            >
              <Text style={styles.tileIcon}>{tile.icon}</Text>
              <View style={styles.tileBody}>
                <Text style={styles.tileTitle}>{tile.title}</Text>
                <Text style={styles.tileDesc}>{tile.desc}</Text>
                <View style={styles.tagChip}>
                  <Text style={styles.tagChipText}>{tile.tag}</Text>
                </View>
              </View>
              <Text style={styles.tileChevron}>{isExpanded ? '▴' : '▾'}</Text>
            </TouchableOpacity>
            {isExpanded && (
              <View style={styles.tileExpanded} testID={`guidance-tile-${tile.id}-expanded`}>
                <Text style={styles.tileExpandedText}>{tile.expanded}</Text>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const createStyles = (c: typeof Colors) =>
  StyleSheet.create({
    zone: {
      // Open fabric — no outer card, no tint. The section reads as a
      // grouped column of tiles below the gentle nudge.
    },
    sectionHeader: {
      ...TypeScale.micro,
      color: c.textTertiary,
      marginBottom: 14, // allow: section-header to first-tile rhythm
    },
    tile: {
      borderWidth: 1,
      borderColor: CardBorder.dusty,
      borderRadius: 12,
      backgroundColor: 'transparent',
    },
    tileSpacer: {
      marginTop: 10,
    },
    tileHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingVertical: CARD_PADDING_V,
      paddingHorizontal: CARD_PADDING_H,
      gap: 12,
    },
    tileIcon: {
      fontSize: 22,
      lineHeight: 24,
    },
    tileBody: {
      flex: 1,
    },
    tileTitle: {
      ...TypeScale.body,
      color: c.textPrimary,
      fontWeight: '500',
      marginBottom: 4,
    },
    tileDesc: {
      ...TypeScale.body,
      lineHeight: 19,
      color: c.textSecondary,
      marginBottom: 6,
    },
    tagChip: {
      alignSelf: 'flex-start',
      backgroundColor: 'rgba(107, 140, 174, 0.10)',
      borderRadius: 9,
      paddingHorizontal: 8, // allow: tag chip horizontal pad
      paddingVertical: 2,
    },
    tagChipText: {
      ...TypeScale.secondary,
      color: '#6b8cae',
      fontWeight: '500',
      letterSpacing: 0.2,
    },
    tileChevron: {
      fontSize: 14,
      color: c.textTertiary,
      marginTop: 2,
    },
    tileExpanded: {
      paddingHorizontal: CARD_PADDING_H,
      paddingBottom: CARD_PADDING_V,
      marginTop: -4, // tight up against the header pad
    },
    tileExpandedText: {
      fontFamily: Fonts.serif,
      ...TypeScale.body,
      lineHeight: 21,
      color: c.textSecondary,
      paddingVertical: ROW_V,
      borderTopWidth: 0.5,
      borderTopColor: c.glassBorder,
    },
  });

export default GuidanceTiles;
