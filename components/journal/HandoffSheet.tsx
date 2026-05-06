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
  Pressable,
  Modal,
  ScrollView,
  StyleSheet,
  Linking,
  Platform,
  Switch,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '../../contexts/ThemeContext';
import { SectionEyebrow } from '../SectionEyebrow';
import { generateAndShareHandoff } from '../../services/handoffPdf';
import { formatTime } from '../../utils/text/primitives';
import { getHandoffTone, saveHandoffTone } from '../../storage/handoffToneRepo';
import { requireProfileFields, type ProfileField } from '../../utils/requireProfileFields';
import { buildHandoffReport, ProfileMissingError } from '../../utils/handoffReportBuilder';
import {
  parseCanonicalSections,
  type HandoffSectionType,
} from '../../utils/handoffSectionParser';
import { ProfilePromptSheet } from '../ProfilePromptSheet';

import { Spacing } from '../../theme/theme-tokens';
const NAME_FALLBACK = 'Your loved one';

// Per-section visual treatment for the structured cards. Each section
// type gets its own bg + border + icon. Colors derive at render time
// from the theme context so light/dark modes work; palette below is
// the dark-theme baseline.
const SECTION_CARD_STYLES: Record<HandoffSectionType, {
  card: { backgroundColor: string; borderLeftColor: string };
  label: { color: string };
  icon: string;
}> = {
  todo:     { card: { backgroundColor: 'rgba(193, 72, 72, 0.08)',  borderLeftColor: '#c14848' }, label: { color: '#e8a4a4' }, icon: '⏳' },
  headsup:  { card: { backgroundColor: 'rgba(229, 176, 74, 0.08)', borderLeftColor: '#e5b04a' }, label: { color: '#e8c878' }, icon: '👁' },
  upcoming: { card: { backgroundColor: 'rgba(170, 138, 220, 0.08)',borderLeftColor: '#aa8adc' }, label: { color: '#d4baff' }, icon: '🩺' },
  notes:    { card: { backgroundColor: 'rgba(74, 107, 93, 0.06)',  borderLeftColor: '#4a6b5d' }, label: { color: '#9aa0a6' }, icon: '📝' },
  done:     { card: { backgroundColor: 'rgba(95, 184, 138, 0.08)', borderLeftColor: '#5fb88a' }, label: { color: '#9fdcb4' }, icon: '✓' },
};

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

  // Phase 5.7.c — include-notes toggle. Default true; canonical builder
  // omits the NOTES TODAY section when false.
  const [includeNotes, setIncludeNotes] = useState(true);

  // Phase 5.7.c — edit-before-share. When isEditing is true, the
  // canonical body becomes a multiline TextInput pre-populated with
  // canonicalText; the resulting `editedText` overrides canonicalText
  // for the Copy / SMS / PDF actions. "Reset" discards edits and
  // restores the builder output.
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState('');

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
        const out = await buildHandoffReport({ now: date, includeNotes });
        if (cancelled) return;
        setCanonicalText(out);
        setCanonicalState('ready');
        // Any rebuild discards in-progress edits — the user explicitly
        // asked for a fresh canonical render (toggle flip / sheet open).
        setIsEditing(false);
        setEditedText('');
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
  }, [visible, date, profilePromptVisible, rebuildSignal, includeNotes]);

  // Phase 5.7.c — what the share actions ship. When the user has edited,
  // their text wins; otherwise the canonical build flows through.
  const shareText = useMemo(
    () => (isEditing && editedText.length > 0 ? editedText : canonicalText),
    [isEditing, editedText, canonicalText],
  );

  const handleCopy = useCallback(async () => {
    if (!shareText) return;
    await Clipboard.setStringAsync(shareText);
  }, [shareText]);

  const handleSharePdf = useCallback(async () => {
    if (!shareText) return;
    await generateAndShareHandoff({
      patientName: name,
      dateLabel: dateLabel(date),
      timeLabel: formatTime(date),
      bodyText: shareText,
    });
  }, [name, date, shareText]);

  const handleSms = useCallback(async () => {
    if (!shareText) return;
    const body = encodeURIComponent(shareText);
    await Linking.openURL(`sms:&body=${body}`);
  }, [shareText]);

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
      <View style={styles.overlay}>
        {/* Tap-to-dismiss layer behind the sheet. A plain Pressable here
            (instead of wrapping the sheet in a TouchableOpacity) keeps
            the inner ScrollView's gesture responder uncontested, so the
            structured-section preview scrolls reliably on iOS. */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close handoff sheet"
        />
        <View
          style={styles.sheet}
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

            {/* Phase 5.7.c — include-notes toggle. Flipping rebuilds
                canonicalText with the new flag. Default true. */}
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>{"Include today's notes"}</Text>
              <Switch
                value={includeNotes}
                onValueChange={(val) => {
                  setIncludeNotes(val);
                  setRebuildSignal((n) => n + 1);
                }}
                trackColor={{ false: colors.glassDim, true: colors.accent }}
                thumbColor={colors.textPrimary}
                accessibilityLabel="Include today's notes in the handoff"
              />
            </View>

            {/* Phase 5.7.c — Edit / Reset link above the canonical body. */}
            {canonicalState === 'ready' && (
              <View style={styles.editHeader}>
                {!isEditing ? (
                  <TouchableOpacity
                    onPress={() => {
                      setIsEditing(true);
                      setEditedText(canonicalText);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Edit handoff text before sharing"
                  >
                    <Text style={styles.editLink}>{'Edit'}</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    onPress={() => {
                      setIsEditing(false);
                      setEditedText('');
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Reset handoff text — restore the auto-generated build"
                  >
                    <Text style={styles.editLink}>{'Reset'}</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Phase 5.8.d — canonical body. What's previewed here is
                exactly what Copy / SMS / PDF send.
                Phase 5.9.b — explicit loading / error states.
                Phase 5.7.c — toggleable to a multiline editor. */}
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
            {/* Structured section cards parsed from the canonical text.
                Coral STILL TO DO, amber HEADS UP, purple COMING UP,
                neutral NOTES, green DONE. Edit mode swaps the cards for
                a multiline editor that operates on raw canonical text. */}
            {canonicalState === 'ready' && !isEditing && (() => {
              const parsed = parseCanonicalSections(canonicalText);
              return (
                <View>
                  {parsed.tone.length > 0 && (
                    <Text style={styles.parsedTone}>{parsed.tone}</Text>
                  )}
                  {parsed.sections.map((section) => (
                    <View
                      key={section.label}
                      style={[
                        styles.sectionCardBase,
                        SECTION_CARD_STYLES[section.type].card,
                      ]}
                    >
                      <View style={styles.sectionCardHeader}>
                        <Text style={styles.sectionCardIcon}>
                          {SECTION_CARD_STYLES[section.type].icon}
                        </Text>
                        <Text
                          style={[
                            styles.sectionCardLabel,
                            SECTION_CARD_STYLES[section.type].label,
                          ]}
                        >
                          {section.label}
                        </Text>
                      </View>
                      {section.lines.map((line, i) => (
                        <Text key={`${section.label}-${i}`} style={styles.sectionCardLine}>
                          {line}
                        </Text>
                      ))}
                    </View>
                  ))}
                </View>
              );
            })()}
            {canonicalState === 'ready' && isEditing && (
              <TextInput
                style={styles.canonicalBodyEditable}
                multiline
                value={editedText}
                onChangeText={setEditedText}
                accessibilityLabel="Edit handoff text"
                textAlignVertical="top"
              />
            )}
          </ScrollView>

          <View style={styles.actions}>
            {/* Phase 5.7.c-visual — "Send via Messages" promoted to
                primary CTA (most common caregiver action). Copy + PDF
                drop to secondary; Cancel stays as a ghost link. */}
            <TouchableOpacity
              style={styles.primaryAction}
              onPress={handleSms}
              accessibilityRole="button"
              accessibilityLabel="Send via Messages"
            >
              <Text style={styles.primaryActionText}>{'Send via Messages'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryAction}
              onPress={handleCopy}
              accessibilityRole="button"
              accessibilityLabel="Copy as text"
            >
              <Text style={styles.secondaryActionText}>{'Copy as text'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryAction}
              onPress={handleSharePdf}
              accessibilityRole="button"
              accessibilityLabel="Share as PDF"
            >
              <Text style={styles.secondaryActionText}>{'Share as PDF'}</Text>
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
        </View>
      </View>
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
    // Fixed height so the inner ScrollView (flex: 1) has bounded space
    // to claim. Without this the ScrollView collapses to 0 height and
    // the canonical preview disappears.
    height: '88%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: c.glassBorder,
    alignSelf: 'center',
    marginBottom: 14, // allow: off-scale gap (intentional)
  },
  // Phase 5.7.c-visual — title bumped to 20/700 for at-a-glance hierarchy.
  title: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: c.textPrimary,
    marginBottom: 14, // allow: off-scale gap (intentional)
  },
  preview: {
    // flex: 1 + minHeight: 0 lets the ScrollView claim the bounded space
    // between the title and the action stack. Without this, structured
    // section cards overflow the sheet's maxHeight and the user can't
    // scroll to the bottom of the canonical body.
    flex: 1,
    minHeight: 0,
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
  // Phase 5.8.d → UX-restructure: single block retired; structured
  // section cards render the parsed canonical output instead. The
  // canonicalBody style is kept (referenced by the audit guard) but
  // unused in the JSX.
  canonicalBody: {
    fontSize: 14,
    lineHeight: 20,
    color: c.textPrimary,
  },
  // UX-restructure: tone bare-line, italic muted-cream feel.
  parsedTone: {
    fontSize: 14,
    lineHeight: 20,
    color: c.textSecondary,
    fontStyle: 'italic' as const,
    marginBottom: Spacing.sm,
  },
  sectionCardBase: {
    borderLeftWidth: 3,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: Spacing.sm,
  },
  sectionCardHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    marginBottom: 4,
  },
  sectionCardIcon: {
    fontSize: 12,
  },
  sectionCardLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 0.5,
  },
  sectionCardLine: {
    fontSize: 14,
    lineHeight: 20,
    color: c.textPrimary,
    marginBottom: 2,
  },
  // Phase 5.7.c — include-notes toggle row.
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    marginBottom: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  toggleLabel: {
    fontSize: 13,
    color: c.textSecondary,
  },
  // Phase 5.7.c — Edit / Reset link above the canonical body.
  editHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 6,
  },
  editLink: {
    fontSize: 13,
    color: c.accent,
    fontWeight: '500' as const,
  },
  // Phase 5.7.c — multiline editable mirror of canonicalBody. System
  // font so caregivers don't feel like they're editing a code dump.
  canonicalBodyEditable: {
    fontSize: 14,
    lineHeight: 20,
    color: c.textPrimary,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    borderRadius: 8,
    padding: 10,
    minHeight: 120,
    textAlignVertical: 'top' as const,
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
  // Phase 5.7.c-visual — primary CTA. Sage-filled, dark text. The most
  // common caregiver share path (SMS to a sibling / next caregiver).
  primaryAction: {
    backgroundColor: c.accent,
    borderRadius: 12,
    paddingVertical: 14, // allow: primary CTA tap-target height (Apple HIG)
    alignItems: 'center',
  },
  primaryActionText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#1a1f1a',
  },
  // Phase 5.7.c-visual — secondary actions (Copy / Share as PDF).
  // Glass surface with hairline border; reads as supporting affordances.
  // allow: tap-target shape for sheet action button — not a card surface.
  secondaryAction: {
    backgroundColor: c.glass,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryActionText: {
    fontSize: 14,
    fontWeight: '500' as const,
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
