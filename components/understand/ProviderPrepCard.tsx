import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { navigate } from '../../lib/navigate';
import { Colors, Spacing, BorderRadius } from '../../theme/theme-tokens';
import type { ProviderPrepData } from '../../utils/providerPrepBuilder';

interface Props {
  data: ProviderPrepData;
}

export function ProviderPrepCard({ data }: Props) {
  const { appointment, questions } = data;
  const dateStr = new Date(appointment.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const daysLabel = appointment.daysUntil === 0 ? 'today' : appointment.daysUntil === 1 ? 'tomorrow' : `in ${appointment.daysUntil} days`;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.headerIcon}>{'\uD83D\uDCCB'}</Text>
        <View style={styles.headerText}>
          <Text style={styles.title}>Prep for {appointment.specialty}</Text>
          <Text style={styles.subtitle}>{appointment.provider} — {dateStr} ({daysLabel})</Text>
        </View>
      </View>

      <Text style={styles.prompt}>Based on recent patterns, you might want to ask:</Text>

      {questions.map((q, i) => (
        <View key={q.id} style={styles.questionRow}>
          <Text style={styles.questionNumber}>{i + 1}.</Text>
          <Text style={styles.questionText}>{q.question}</Text>
        </View>
      ))}

      {/* Care Brief link */}
      <TouchableOpacity
        style={styles.careBriefLink}
        onPress={() => navigate('/care-brief')}
        activeOpacity={0.7}
        accessibilityRole="link"
        accessibilityLabel="View full Care Brief"
      >
        <Text style={styles.careBriefText}>View full Care Brief →</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.sageTint,
    borderWidth: 1,
    borderColor: Colors.sageBorder,
    borderRadius: 16,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  headerIcon: {
    fontSize: 24,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  prompt: {
    fontSize: 13,
    color: Colors.textTertiary,
    marginBottom: 10,
    fontStyle: 'italic',
  },
  questionRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  questionNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.accent,
    width: 20,
  },
  questionText: {
    flex: 1,
    fontSize: 14,
    color: Colors.textBright,
    lineHeight: 20,
  },
  careBriefLink: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.sageBorder,
    alignItems: 'center',
  },
  careBriefText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.accent,
  },
});
