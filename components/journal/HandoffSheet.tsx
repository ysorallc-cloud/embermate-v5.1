// ============================================================================
// HANDOFF SHEET
// Bottom sheet that previews a handoff for the next caregiver and offers
// four actions: Copy as text, Share as PDF, Send via Messages, Cancel.
//
// Phase 7 of the Journal handoff redesign — replaces the old "Daily
// Summary" preview modal. Deliberately avoids duplicating outcome content
// in prose form (no top alert paragraph, no Guidance section).
// ============================================================================

import React, { useMemo, useCallback, useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  Linking,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '../../contexts/ThemeContext';
import { SectionEyebrow } from '../SectionEyebrow';
import { generateAndShareHandoff } from '../../services/handoffPdf';
import { formatTime } from '../../utils/text/primitives';
import { getHandoffTone, saveHandoffTone } from '../../storage/handoffToneRepo';
import { requireProfileFields, type ProfileField } from '../../utils/requireProfileFields';
import { ProfilePromptSheet } from '../ProfilePromptSheet';
import type { DailyOutcomes } from '../../utils/text/types';

import { Spacing } from '../../theme/theme-tokens';
const NAME_FALLBACK = 'Your loved one';

export interface HandoffEvent {
  time: Date;
  label: string;
}

export interface HandoffSheetProps {
  visible: boolean;
  onClose: () => void;
  patientName: string;
  date: Date;
  /** YYYY-MM-DD — keys the tone repo. Phase 5.8.a. */
  dateKey: string;
  outcomes: DailyOutcomes;
  notes: string;
  events: HandoffEvent[];
}

function resolveName(name: string): string {
  const trimmed = (name ?? '').trim();
  return trimmed.length > 0 ? trimmed : NAME_FALLBACK;
}

function dateLabel(d: Date): string {
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

function buildOutcomesLines(outcomes: DailyOutcomes): string[] {
  const lines: string[] = [];
  if (outcomes.missed.count > 0) {
    lines.push(`${outcomes.missed.count} not logged today: ${outcomes.missed.names.join(', ')}`);
  }
  if (outcomes.pending.count > 0) {
    lines.push(`${outcomes.pending.count} still to check: ${outcomes.pending.names.join(', ')}`);
  }
  if (outcomes.logged.count > 0) {
    const tail = outcomes.logged.summary ?? '';
    lines.push(tail.length > 0 ? `${outcomes.logged.count} logged: ${tail}` : `${outcomes.logged.count} logged`);
  }
  return lines;
}

function buildPreviewText(props: HandoffSheetProps): string {
  const name = resolveName(props.patientName);
  const lines: string[] = [
    `${name} · ${dateLabel(props.date)} · ${formatTime(props.date)}`,
    '',
    "TODAY'S OUTCOMES",
    ...buildOutcomesLines(props.outcomes),
  ];
  if (props.notes.trim().length > 0) {
    lines.push('', 'HANDOFF NOTES', props.notes.trim());
  }
  if (props.events.length > 0) {
    lines.push('', "TODAY'S EVENTS");
    for (const e of props.events) {
      lines.push(`${formatTime(e.time)} — ${e.label}`);
    }
  }
  return lines.join('\n');
}

export function HandoffSheet(props: HandoffSheetProps) {
  const { visible, onClose, patientName, date, dateKey, outcomes, notes, events } = props;
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const name = resolveName(patientName);
  const outcomesLines = useMemo(() => buildOutcomesLines(outcomes), [outcomes]);
  const trimmedNotes = notes.trim();

  // ── TONE state (Phase 5.8.a) ─────────────────────────────────────────────
  // Pre-populates from handoff_tone_{dateKey}; autosaves on blur.
  const [tone, setTone] = useState<string>('');
  useEffect(() => {
    let cancelled = false;
    if (visible && dateKey) {
      getHandoffTone(dateKey).then((saved) => {
        if (!cancelled) setTone(saved ?? '');
      });
    }
    return () => { cancelled = true; };
  }, [visible, dateKey]);

  const handleToneBlur = useCallback(() => {
    if (dateKey) {
      void saveHandoffTone(dateKey, tone);
    }
  }, [dateKey, tone]);

  // ── Profile-prompt gate (Phase 5.8.c) ────────────────────────────────────
  // Check on open; if missing, surface ProfilePromptSheet inline. The sheet
  // re-checks after save, dismissing automatically when complete.
  const [profileMissing, setProfileMissing] = useState<ProfileField[]>([]);
  const [profilePromptVisible, setProfilePromptVisible] = useState(false);
  useEffect(() => {
    let cancelled = false;
    if (!visible) {
      setProfilePromptVisible(false);
      return;
    }
    requireProfileFields().then((res) => {
      if (cancelled) return;
      setProfileMissing(res.missing);
      setProfilePromptVisible(res.missing.length > 0);
    });
    return () => { cancelled = true; };
  }, [visible]);

  const handleProfileSaved = useCallback(async () => {
    const res = await requireProfileFields();
    setProfileMissing(res.missing);
    setProfilePromptVisible(res.missing.length > 0);
  }, []);

  const handleCopy = useCallback(async () => {
    await Clipboard.setStringAsync(buildPreviewText(props));
  }, [props]);

  const handleSharePdf = useCallback(async () => {
    await generateAndShareHandoff({
      patientName: name,
      dateLabel: dateLabel(date),
      timeLabel: formatTime(date),
      outcomesLines,
      notes: trimmedNotes.length > 0 ? trimmedNotes : null,
      eventLines: events.map((e) => `${formatTime(e.time)} — ${e.label}`),
    });
  }, [name, date, outcomesLines, trimmedNotes, events]);

  const handleSms = useCallback(async () => {
    const body = encodeURIComponent(buildPreviewText(props));
    await Linking.openURL(`sms:&body=${body}`);
  }, [props]);

  return (
    <>
      <ProfilePromptSheet
        visible={visible && profilePromptVisible}
        onClose={() => setProfilePromptVisible(false)}
        onSaved={handleProfileSaved}
        missing={profileMissing}
      />
      <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close handoff sheet"
      >
        <TouchableOpacity
          activeOpacity={1}
          style={styles.sheet}
          accessibilityRole="none"
          accessibilityLabel="Hand off to next caregiver"
        >
          <View style={styles.handle} />
          <Text style={styles.title}>{'Hand off to next caregiver'}</Text>

          <ScrollView style={styles.preview} contentContainerStyle={styles.previewContent}>
            <Text style={styles.headerLine}>
              {`${name} · ${dateLabel(date)} · ${formatTime(date)}`}
            </Text>

            <View style={styles.section}>
              <SectionEyebrow text="TONE" />
              <TextInput
                style={styles.toneInput}
                value={tone}
                onChangeText={setTone}
                onBlur={handleToneBlur}
                placeholder="How would you sum up today?"
                placeholderTextColor={colors.textTertiary}
                accessibilityLabel="Tone — sum up today in one line"
                returnKeyType="done"
              />
            </View>

            <View style={styles.section}>
              <SectionEyebrow text="Today's outcomes" />
              {outcomesLines.map((line) => (
                <Text key={line} style={styles.outcomeLine}>{line}</Text>
              ))}
            </View>

            {trimmedNotes.length > 0 && (
              <View style={styles.section}>
                <SectionEyebrow text="Handoff notes" />
                <Text style={styles.notesBody}>{trimmedNotes}</Text>
              </View>
            )}

            {events.length > 0 && (
              <View style={styles.section}>
                <SectionEyebrow text="Today's events" />
                {events.map((e, i) => (
                  <Text key={`${i}-${e.label}`} style={styles.eventLine}>
                    {formatTime(e.time)} — {e.label}
                  </Text>
                ))}
              </View>
            )}
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleCopy}
              accessibilityRole="button"
              accessibilityLabel="Copy as text"
            >
              <Text style={styles.actionText}>{'Copy as text'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleSharePdf}
              accessibilityRole="button"
              accessibilityLabel="Share as PDF"
            >
              <Text style={styles.actionText}>{'Share as PDF'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleSms}
              accessibilityRole="button"
              accessibilityLabel="Send via Messages"
            >
              <Text style={styles.actionText}>{'Send via Messages'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
            >
              <Text style={styles.cancelText}>{'Cancel'}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
    </>
  );
}

const createStyles = (c: any) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: c.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: c.menuSurface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
    maxHeight: '88%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: c.glassBorder,
    alignSelf: 'center',
    marginBottom: 14, // allow: off-scale gap (intentional)
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: c.textPrimary,
    marginBottom: 14, // allow: off-scale gap (intentional)
  },
  preview: {
    flexGrow: 0,
  },
  previewContent: {
    paddingBottom: 12,
  },
  headerLine: {
    fontSize: 13,
    fontWeight: '500',
    color: c.textPrimary,
    marginBottom: 14, // allow: off-scale gap (intentional)
  },
  section: {
    marginBottom: Spacing.md,
  },
  // Phase 5.8.a — single-line TONE input. Serif-italic placeholder via the
  // placeholder prop (system-rendered italics on iOS); the input itself
  // uses the sheet's standard text style so what the caregiver typed
  // looks like the rest of the preview content.
  toneInput: {
    fontSize: 14,
    color: c.textPrimary,
    paddingVertical: 6,
    fontFamily: 'Georgia',
    fontStyle: 'italic',
    marginTop: 6,
  },
  outcomeLine: {
    fontSize: 13,
    color: c.textPrimary,
    lineHeight: 18,
    marginTop: 6,
  },
  notesBody: {
    fontSize: 13,
    color: c.textSecondary,
    lineHeight: 18,
    marginTop: 6,
    fontStyle: 'italic',
  },
  eventLine: {
    fontSize: 12,
    color: c.textSecondary,
    lineHeight: 18,
    marginTop: 4,
  },
  actions: {
    marginTop: 8,
    gap: 8,
  },
  // allow: tap-target shape for sheet action button — not a card surface.
  actionButton: {
    backgroundColor: c.glass,
    borderWidth: 0.5,
    borderColor: c.border,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  actionText: {
    fontSize: 13,
    fontWeight: '500',
    color: c.textPrimary,
  },
  cancelButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 13,
    color: c.textTertiary,
  },
});

export default HandoffSheet;
