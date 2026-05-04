// ============================================================================
// JOURNAL FLAGGED — "Heads up" section with severity-colored accent bars
// Extracted from journal.tsx for maintainability
// ============================================================================

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { CareBrief } from '../../utils/careSummaryBuilder';

// ============================================================================
// TYPES
// ============================================================================

export type HandoffType = 'done' | 'watch' | 'flag';

export interface HandoffItem {
  icon: string;
  text: string;
  context?: string;
  type: HandoffType;
}

export interface JournalFlaggedProps {
  items: HandoffItem[];
}

// ============================================================================
// BUILDER — creates HandoffItems from a CareBrief
// ============================================================================

function formatTime(t: string): string {
  if (!t) return '';
  if (t.includes('T')) {
    const date = new Date(t);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }
  const parts = t.split(':');
  if (parts.length < 2) return t;
  const hr = parseInt(parts[0]);
  const min = parts[1];
  const period = hr >= 12 ? 'PM' : 'AM';
  return `${hr % 12 || 12}:${min} ${period}`;
}

export function buildHandoffNotes(brief: CareBrief | null): HandoffItem[] {
  if (!brief) return [];
  const items: HandoffItem[] = [];

  // Completed meds with times (deduplicate by name + time)
  const seenMeds = new Set<string>();
  for (const med of brief.medications) {
    if ((med.status === 'completed' || med.status === 'skipped') && med.takenAt) {
      const timeStr = formatTime(med.takenAt);
      const dedupKey = `${med.name}|${timeStr}`;
      if (seenMeds.has(dedupKey)) continue;
      seenMeds.add(dedupKey);
      items.push({
        icon: '\uD83D\uDC8A',
        text: `${med.name} taken at ${timeStr}`,
        type: 'done',
      });
    }
  }

  // Attention items
  const hasMedInterpretation = !!brief.interpretations?.medications;
  if (brief.attentionItems) {
    for (const ai of brief.attentionItems) {
      const text = ai.text || '';
      if (hasMedInterpretation && /not yet logged/i.test(text)) continue;
      let type: HandoffType = 'watch';
      let context: string | undefined;
      if (/miss|skip|overdue/i.test(text)) {
        type = 'flag';
        if (/med|medication/i.test(text)) {
          context = 'Check whether this was intentional or if there\'s a side effect concern.';
        } else if (/meal|breakfast|lunch|dinner/i.test(text)) {
          context = 'Ensure adequate nutrition at next meal.';
        }
      }
      if (/confus|disorient/i.test(text)) {
        context = 'Monitor if this recurs at the same time tomorrow.';
      }
      const icon = type === 'flag' ? '\uD83D\uDED1' : '\uD83D\uDC41\uFE0F';
      items.push({ icon, text, context, type });
    }
  }

  // Interpretations
  if (brief.interpretations?.medications) {
    items.push({ icon: '\uD83D\uDC8A', text: brief.interpretations.medications, type: 'watch' });
  }
  if (brief.interpretations?.vitals) {
    items.push({ icon: '\uD83C\uDF21\uFE0F', text: brief.interpretations.vitals, type: 'watch' });
  }
  if (brief.interpretations?.nutrition) {
    items.push({ icon: '\uD83C\uDF5E', text: brief.interpretations.nutrition, type: 'watch' });
  }

  return items;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function JournalFlagged({ items }: JournalFlaggedProps) {
  const { colors } = useTheme();
  const s = useMemo(() => createStyles(colors), [colors]);

  if (items.length === 0) return null;

  function borderColor(type: HandoffType): string {
    switch (type) {
      case 'flag': return colors.redBright;
      case 'watch': return colors.amberBright;
      case 'done': return colors.green;
    }
  }

  return (
    <View style={s.section}>
      <Text style={s.label}>Heads up</Text>
      {items.map((item, i) => (
        <View key={`handoff-${i}`} style={s.item}>
          <View style={[s.bar, { backgroundColor: borderColor(item.type) }]} />
          <View style={s.content}>
            <Text style={s.title}>{item.text}</Text>
            {item.context && (
              <Text style={s.context}>{item.context}</Text>
            )}
          </View>
        </View>
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
    color: c.textAlertLabel,
    marginBottom: 10,
  },
  item: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  bar: {
    width: 3,
    minHeight: 20,
    borderRadius: 0,
    marginTop: 2,
    alignSelf: 'stretch',
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 13,
    fontWeight: '500',
    color: c.textAlertPrimary,
    lineHeight: 19,
  },
  context: {
    fontSize: 11,
    color: c.textAlertHint,
    marginTop: 3,
    lineHeight: 16,
  },
});
