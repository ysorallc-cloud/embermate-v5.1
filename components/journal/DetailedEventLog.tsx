// ============================================================================
// DETAILED EVENT LOG — Collapsible clinical event list
// Shows actual medication names, vitals values, meal descriptions, skip reasons
// ============================================================================

import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

import { Spacing } from '../../theme/theme-tokens';
// ============================================================================
// TYPES
// ============================================================================

export interface EventLogEntry {
  id: string;
  time: string;              // '8:15am'
  title: string;             // 'Medications taken'
  detail: string;            // 'Acetaminophen 325mg · Amlodipine 2.5mg'
  status: 'completed' | 'skipped';
}

interface DetailedEventLogProps {
  events: EventLogEntry[];
  defaultExpanded?: boolean;  // Default false
}

// ============================================================================
// COMPONENT
// ============================================================================

export function DetailedEventLog({ events, defaultExpanded = false }: DetailedEventLogProps) {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(defaultExpanded);

  if (events.length === 0) return null;

  return (
    <View>
      {/* Accent bar + label (always visible) */}
      <TouchableOpacity
        style={styles.headerRow}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
        accessibilityLabel={`Events logged, ${events.length} items. ${expanded ? 'Collapse' : 'Expand'}`}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
      >
        <View style={styles.accentBar} />
        <Text style={styles.headerLabel}>Events logged</Text>
        <Text style={styles.headerCount}>{events.length}</Text>
        <Text style={styles.chevron}>{expanded ? '▾' : '›'}</Text>
      </TouchableOpacity>

      {/* Expanded: light card with event rows */}
      {expanded && (
        <View style={styles.card}>
          {events.map((event, i) => (
            <View
              key={event.id}
              style={[styles.eventRow, i < events.length - 1 && styles.eventRowBorder]}
            >
              <Text style={styles.eventTime}>{event.time}</Text>
              <View style={styles.eventBody}>
                <View style={styles.eventTitleRow}>
                  <Text style={styles.eventTitle}>{event.title}</Text>
                  {event.status === 'skipped' ? (
                    <View style={styles.skippedBadge}>
                      <Text style={styles.skippedText}>Skipped</Text>
                    </View>
                  ) : (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </View>
                {event.detail ? (
                  <Text style={styles.eventDetail} numberOfLines={3}>{event.detail}</Text>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 8,
  },
  accentBar: {
    width: 3,
    height: 16,
    borderRadius: 2,
    backgroundColor: 'rgba(200,195,180,0.15)',
  },
  headerLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(200,195,180,0.5)',
    flex: 1,
  },
  headerCount: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(200,195,180,0.35)',
  },
  chevron: {
    fontSize: 14,
    color: 'rgba(200,195,180,0.35)',
    width: 16,
    textAlign: 'center',
  },
  card: {
    backgroundColor: 'rgba(74,107,93,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(74,107,93,0.1)',
    borderRadius: 14,
    padding: 14,
    marginBottom: Spacing.lg,
  },
  eventRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    gap: 8,
  },
  eventRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(74,107,93,0.08)',
  },
  eventTime: {
    fontSize: 11,
    color: 'rgba(200,195,180,0.4)',
    width: 50,
    paddingTop: 2,
  },
  eventBody: {
    flex: 1,
  },
  eventTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  eventTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#eae6db',
    flex: 1,
  },
  checkmark: {
    fontSize: 12,
    color: '#5DCAA5',
    marginLeft: 8,
  },
  skippedBadge: {
    backgroundColor: 'rgba(200,160,78,0.12)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginLeft: 8,
  },
  skippedText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#c8a44e',
  },
  eventDetail: {
    fontSize: 12,
    color: 'rgba(220,216,205,0.5)',
    lineHeight: 17,
    marginLeft: 0,  // Indent aligns with title via eventTime width
  },
});
