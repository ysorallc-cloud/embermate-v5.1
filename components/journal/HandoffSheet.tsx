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
  Platform,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '../../contexts/ThemeContext';
import { SectionEyebrow } from '../SectionEyebrow';
import { generateAndShareHandoff } from '../../services/handoffPdf';
import { formatTime } from '../../utils/text/primitives';
import { getHandoffTone, saveHandoffTone } from '../../storage/handoffToneRepo';
import { requireProfileFields, type ProfileField } from '../../utils/requireProfileFields';
import { buildHandoffReport, ProfileMissingError } from '../../utils/handoffReportBuilder';
import { ProfilePromptSheet } from '../ProfilePromptSheet';

import { Spacing } from '../../theme/theme-tokens';
const NAME_FALLBACK = 'Your loved one';

export interface HandoffSheetProps {
  visible: boolean;
  onClose: () => void;
  patientName: string;
  date: Date;
  /** YYYY-MM-DD — keys the tone repo. Phase 5.8.a. */
  dateKey: string;
}

function resolveName(name: string): string {
  const trimmed = (name ?? '').trim();
  return trimmed.length > 0 ? trimmed : NAME_FALLBACK;
}

function dateLabel(d: Date): string {
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

export function HandoffSheet(props: HandoffSheetProps) {
  const { visible, onClose, patientName, date, dateKey } = props;
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const name = resolveName(patientName);

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

  const handleToneBlur = useCallback(async () => {
    if (dateKey) {
      await saveHandoffTone(dateKey, tone);
      // Trigger canonical rebuild so the TONE block appears in the preview
      // immediately without re-opening the sheet.
      setRebuildSignal((n) => n + 1);
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

  // ── Canonical handoff text (Phase 5.8.d) ─────────────────────────────────
  // Single source of truth for the preview surface AND the Copy / SMS / PDF
  // actions. Rebuilds when the sheet opens and after a TONE save (rebumped
  // via `rebuildSignal`).
  //
  // Phase 5.9.b — explicit loading + error states. Without these, an
  // in-flight build, a profile-prompt gate, or a thrown non-profile error
  // all collapsed onto the same blank preview. The user couldn't tell
  // "still loading" from "broken" from "I closed the prompt by accident."
  const [canonicalText, setCanonicalText] = useState<string>('');
  const [canonicalState, setCanonicalState] =
    useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [rebuildSignal, setRebuildSignal] = useState(0);
  useEffect(() => {
    let cancelled = false;
    if (!visible) {
      setCanonicalState('idle');
      return;
    }
    if (profilePromptVisible) {
      // Profile prompt owns the recovery path; preview stays idle until
      // the prompt dismisses with complete fields.
      setCanonicalState('idle');
      return;
    }
    setCanonicalState('loading');
    (async () => {
      try {
        const out = await buildHandoffReport({ now: date });
        if (cancelled) return;
        setCanonicalText(out);
        setCanonicalState('ready');
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ProfileMissingError) {
          // ProfilePromptSheet will (or already has) surfaced — leave
          // the preview idle so it doesn't flash an error first.
          setCanonicalText('');
          setCanonicalState('idle');
          return;
        }
        setCanonicalText('');
        setCanonicalState('error');
      }
    })();
    return () => { cancelled = true; };
  }, [visible, date, profilePromptVisible, rebuildSignal]);

  const handleCopy = useCallback(async () => {
    if (!canonicalText) return;
    await Clipboard.setStringAsync(canonicalText);
  }, [canonicalText]);

  const handleSharePdf = useCallback(async () => {
    if (!canonicalText) return;
    await generateAndShareHandoff({
      patientName: name,
      dateLabel: dateLabel(date),
      timeLabel: formatTime(date),
      bodyText: canonicalText,
    });
  }, [name, date, canonicalText]);

  const handleSms = useCallback(async () => {
    if (!canonicalText) return;
    const body = encodeURIComponent(canonicalText);
    await Linking.openURL(`sms:&body=${body}`);
  }, [canonicalText]);

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
            {/* Phase 5.8.d — TONE input stays editable above the canonical
                preview body. The canonical builder reads handoff_tone_{date}
                so the TONE section appears in the body once the user blurs. */}
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

            {/* Phase 5.8.d — single canonical body. What's previewed here is
                exactly what the Copy / SMS / PDF actions send.
                Phase 5.9.b — explicit loading / error states so an
                in-flight build never looks like a broken sheet. */}
            {canonicalState === 'loading' && (
              <Text style={styles.canonicalStatus}>{'Building summary…'}</Text>
            )}
            {canonicalState === 'error' && (
              <Text
                style={styles.canonicalError}
                accessibilityLiveRegion="polite"
              >
                {"Couldn't build today's summary. Pull down to retry, or close and reopen this sheet."}
              </Text>
            )}
            {canonicalState === 'ready' && (
              <Text style={styles.canonicalBody}>{canonicalText}</Text>
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
  // Phase 5.8.d — single block that renders the canonical handoff text.
  // Mono-feel font signals "this is the assembled message" and matches
  // how the recipient will see it in SMS/email.
  canonicalBody: {
    fontSize: 13,
    lineHeight: 19,
    color: c.textPrimary,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
  },
  // Phase 5.9.b — explicit loading + error states.
  canonicalStatus: {
    fontSize: 13,
    color: c.textSecondary,
    fontStyle: 'italic',
    paddingVertical: Spacing.sm,
  },
  canonicalError: {
    fontSize: 13,
    color: c.textPrimary,
    paddingVertical: Spacing.sm,
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
