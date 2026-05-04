// ============================================================================
// JOURNAL PATTERNS — Collapsible insight rows with expand/collapse animation
// Extracted from journal.tsx for maintainability
// ============================================================================

import React, { useState, useRef, useMemo } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { InsightData } from '../../utils/insightEngine';

// ============================================================================
// TYPES
// ============================================================================

export interface JournalPatternsProps {
  insights: InsightData[];
}

// ============================================================================
// COMPONENT
// ============================================================================

export function JournalPatterns({ insights }: JournalPatternsProps) {
  const { colors } = useTheme();
  const s = useMemo(() => createStyles(colors), [colors]);
  const [expandedPattern, setExpandedPattern] = useState<number | null>(null);
  const chevronAnims = useRef<Animated.Value[]>([]).current;

  if (insights.length === 0) return null;

  // Ensure we have enough animated values
  while (chevronAnims.length < insights.length) {
    chevronAnims.push(new Animated.Value(0));
  }

  const togglePattern = (index: number) => {
    const expanding = expandedPattern !== index;
    if (expandedPattern != null && expandedPattern < chevronAnims.length) {
      Animated.timing(chevronAnims[expandedPattern], {
        toValue: 0, duration: 200, useNativeDriver: true,
      }).start();
    }
    if (expanding) {
      Animated.timing(chevronAnims[index], {
        toValue: 1, duration: 200, useNativeDriver: true,
      }).start();
      setExpandedPattern(index);
    } else {
      setExpandedPattern(null);
    }
  };

  return (
    <View style={s.section}>
      <Text style={s.label}>Patterns</Text>
      {insights.map((insight, i) => (
        <TouchableOpacity
          key={insight.id}
          style={s.row}
          onPress={() => togglePattern(i)}
          activeOpacity={0.7}
          accessibilityLabel={`Pattern: ${insight.title}. ${expandedPattern === i ? 'Collapse' : 'Expand'}`}
          accessibilityRole="button"
        >
          <Text style={s.text}>
            <Text style={s.textBold}>{insight.title}</Text>
            {insight.context ? `: ${insight.context}` : ''}
          </Text>
          {expandedPattern === i && insight.actions && insight.actions.length > 0 && (
            <View style={s.expanded}>
              <Text style={s.action}>{'\u2192'} {insight.actions[0].label}</Text>
            </View>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const createStyles = (c: any) => StyleSheet.create({
  section: {
    paddingVertical: 14, // allow: tap-target padding (Apple HIG ≥44pt)
    borderBottomWidth: 0.5,
    borderBottomColor: c.warmSurfaceBorder,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: c.textSecondary,
    marginBottom: 8,
  },
  row: {
    marginBottom: 6,
  },
  text: {
    fontSize: 13,
    color: c.textWarmSecondary,
    lineHeight: 19,
  },
  textBold: {
    fontWeight: '500',
    color: c.textWarmPrimary,
  },
  expanded: {
    marginTop: 6,
    paddingLeft: 12,
  },
  action: {
    fontSize: 12,
    color: c.accent,
  },
});
