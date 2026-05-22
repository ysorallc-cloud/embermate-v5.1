// ============================================================================
// JOURNAL NOTES CARD
//
// Single-card replacement for the floating-eyebrow + ReflectionPrompt pair.
// Footer: privacy line + Save pill (outlined → mint when there are unsaved
// edits → outlined again after save). Owns its own dirty state and forwards
// to the same saveReflection / onDirtyChange contracts as before.
//
// Phase 22.1 — eyebrow + prompt reframed for the handoff-document
// surface. Eyebrow reads "NOTES FROM {caregiverName}" when a caregiver
// profile exists, "NOTES" otherwise. Prompt reads "Anything to pass to
// the next caregiver, or to flag for {provider}?" with the provider
// name resolved via utils/appointmentLookahead.ts; falls back to "for
// the next visit" when no upcoming appointment is in window.
// ============================================================================

import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Fonts } from '../../theme/theme-tokens';
import { SectionEyebrow } from '../SectionEyebrow';
import { formatTime } from '../../utils/text/primitives';

export interface JournalNotesCardProps {
  date: string;
  savedText?: string;
  savedAt?: string;
  onSave: (text: string) => Promise<void>;
  onDirtyChange?: (dirty: boolean) => void;
  /** Past-date view: lock the input, swap the placeholder, hide the Save pill. */
  readOnly?: boolean;
  /** 24-hour preference for the "last edited" timestamp. Defaults to 12h. */
  use24Hour?: boolean;
  /** Phase 22.1 — caregiver display name; threads into the eyebrow
   *  ("NOTES FROM {caregiverName}"). Null/empty falls back to "NOTES". */
  caregiverName?: string | null;
  /** Phase 22.1 — provider display name from the upcoming-appointment
   *  lookup (utils/appointmentLookahead). Null/empty falls back to
   *  "for the next visit" in the prompt copy. */
  providerName?: string | null;
  /**
   * Phase 27 F6 — strip own chrome (outer card + headerRow + section
   * divider + internal SectionEyebrow) for nesting inside Section 4
   * (Plan). Section 4 renders the inner "NOTES" sub-eyebrow at its
   * own level. Prompt + textarea + Save pill stay — those are
   * meaningful inner content. The "last edited" timestamp drops in
   * bare mode (no headerRow to host it).
   */
  bare?: boolean;
  /**
   * Phase 27 F6 — passes a ref through to the inner TextInput so the
   * parent can call .focus() imperatively. Section 1's empty-state
   * prompt taps into this single mount (audit D7: single input, two
   * surface tap targets). Optional; standalone consumers don't need it.
   */
  inputRef?: React.MutableRefObject<TextInput | null>;
}

export function JournalNotesCard({
  savedText,
  savedAt,
  onSave,
  onDirtyChange,
  readOnly = false,
  use24Hour = false,
  caregiverName,
  providerName,
  bare = false,
  inputRef,
}: JournalNotesCardProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [text, setText] = useState(savedText ?? '');
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const justSavedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Phase 27 F6 — internal ref on the TextInput. When the parent
  // supplies an inputRef prop, we mirror our internal ref into it so
  // the parent can call .focus() (Section 1's empty-state prompt taps
  // into this single mount per audit D7). The internal ref is used
  // directly by the TextInput; the prop forwarding happens in an
  // effect below.
  const textInputRef = useRef<TextInput>(null);
  useEffect(() => {
    if (inputRef) inputRef.current = textInputRef.current;
    return () => {
      if (inputRef) inputRef.current = null;
    };
  }, [inputRef]);

  // Sync incoming saved text (e.g. when the parent loads a different day).
  useEffect(() => {
    setText(savedText ?? '');
    setJustSaved(false);
  }, [savedText]);

  // Clean up the just-saved timer on unmount.
  useEffect(() => {
    return () => {
      if (justSavedTimer.current) clearTimeout(justSavedTimer.current);
    };
  }, []);

  const isDirty = text.trim() !== (savedText ?? '').trim() && text.trim().length > 0;
  const hasSaved = (savedText ?? '').trim().length > 0;

  // Notify the parent on dirty-state transitions so the global "unsaved
  // reflection" guard rails (route changes, day switches) keep working.
  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  const handleSave = useCallback(async () => {
    if (!isDirty || saving) return;
    const trimmed = text.trim();
    setSaving(true);
    try {
      await onSave(trimmed);
      setJustSaved(true);
      if (justSavedTimer.current) clearTimeout(justSavedTimer.current);
      justSavedTimer.current = setTimeout(() => setJustSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  }, [isDirty, saving, text, onSave]);

  // Four-state save UI:
  //   fresh      — never saved, input empty/unchanged → outlined "Save", disabled
  //   dirty      — unsaved edits in the input         → filled mint "Save"
  //   just-saved — transient ~3s after a save         → filled mint "✓ Saved"
  //   saved      — saved, no edits                    → outlined "✓ Saved"
  const saveState: 'fresh' | 'dirty' | 'just-saved' | 'saved' =
    saving ? 'dirty'
    : justSaved ? 'just-saved'
    : isDirty ? 'dirty'
    : hasSaved ? 'saved'
    : 'fresh';

  const saveLabel = saving ? 'Saving…'
    : saveState === 'just-saved' ? '✓ Saved'
    : saveState === 'dirty' ? 'Save'
    : saveState === 'saved' ? '✓ Saved'
    : 'Save';
  const filled = saveState === 'dirty' || saveState === 'just-saved';
  const a11ySelected = saveState === 'dirty';

  const lastEditedLabel = useMemo(() => {
    if (!savedAt) return null;
    const d = new Date(savedAt);
    if (isNaN(d.getTime())) return null;
    return `last edited ${formatTime(d, { format: use24Hour ? '24h' : '12h' })}`;
  }, [savedAt, use24Hour]);

  // Phase 22.1 — handoff-framed eyebrow + prompt.
  // Phase 27.5b F5 — `eyebrowText` and the chrome-mode `promptText`
  // (italic question form) are preserved for the non-bare render
  // path. Bare mode (Section 4 inside the SOAP layout) uses the
  // placeholder-as-prompt copy below instead — observational
  // invitation, no question mark, displayed inside the TextInput as
  // its empty-state placeholder.
  const trimmedCaregiver = (caregiverName ?? '').trim();
  const eyebrowText = trimmedCaregiver.length > 0
    ? `NOTES FROM ${trimmedCaregiver.toUpperCase()}`
    : 'NOTES';
  const trimmedProvider = (providerName ?? '').trim();
  const promptText = trimmedProvider.length > 0
    ? `Anything to pass to the next caregiver, or to flag for ${trimmedProvider}?`
    : 'Anything to pass to the next caregiver, or to flag for the next visit?';
  // Phase 31 F2 (2026-05-21) — bare-mode placeholder is the single
  // consolidated Notes prompt per the Q-31 lock: "Anything to pass to
  // the next caregiver, or to flag at the next appointment?" One
  // prompt, in the field, vanishes on type (Q-31 Q4 lock — no
  // persistent prompt above the input; the Phase 27 SOAP redesign
  // reduces chrome). The provider-name interpolation from Phase 27.5b
  // retires — "appointment" is generic enough to read sensibly with
  // or without a known upcoming visit, which aligns with the Section
  // 4 lavender lane's caregiver-to-clinician handoff voice.
  const barePlaceholder =
    'Anything to pass to the next caregiver, or to flag at the next appointment?';

  // Phase 27 F6 / 27.5b F5 — bare mode for Section 4 (Plan) nesting.
  // Section 4 owns the lavender card chrome. In bare mode this
  // component drops:
  //   • The hairline section-divider above.
  //   • The internal SectionEyebrow ("NOTES FROM …" / "NOTES").
  //   • The outer card View's backgroundColor + border + radius.
  //   • The headerRow (last-edited timestamp).
  //   • The italic question prompt above the textarea (the prompt
  //     copy migrates INTO the TextInput as the placeholder).
  //   • The footer's border-top.
  // The TextInput now carries visible input chrome of its own
  // (bg + border + radius + padding per F5 spec) so the writing
  // affordance is discoverable without a separate prompt cue. Voice
  // switch: sans-serif dim alpha for the placeholder; Georgia italic
  // for typed content. The two voices distinguish "this is the
  // invitation copy" from "this is what you wrote."
  if (bare) {
    // Phase 31 F3 (2026-05-21) — past-day notes are EDITABLE. Caregivers
    // remember things later ("Dad was off this morning" recalled at
    // night) and need to add or amend notes on the day they belong to.
    // The pre-F3 read-only static-prose branch retires — past-day bare
    // mode now renders the same editable TextInput as today. The
    // saved-at timestamp records WHEN the note was written; no
    // "added later" marker is needed.
    //
    // The readOnly prop stays in the API surface for non-bare future
    // consumers but is ignored inside bare mode — both today and past
    // get an editable input here.
    return (
      <View>
        <View testID="notes-body" style={styles.bareBody}>
          <TextInput
            ref={textInputRef}
            style={styles.bareInput}
            value={text}
            onChangeText={setText}
            placeholder={barePlaceholder}
            placeholderTextColor={'rgba(255,255,255,0.35)'}
            multiline
            textAlignVertical="top"
            editable
            accessibilityLabel={"Notes for this day — type anything to pass along to the next caregiver"}
          />
        </View>
        <Text
          accessibilityLiveRegion="polite"
          accessibilityElementsHidden={!justSaved}
          style={styles.liveRegion}
        >
          {justSaved ? 'Saved' : ''}
        </Text>
        <View style={[styles.footer, { borderTopWidth: 0, paddingHorizontal: 0 }]}>
          <View style={styles.footerLeft}>
            <Text style={styles.privacy}>{'🔒 Private · on this device'}</Text>
          </View>
          {!readOnly && (
            <TouchableOpacity
              style={[
                styles.saveButton,
                filled && styles.saveButtonFilled,
                saveState === 'saved' && styles.saveButtonSaved,
              ]}
              onPress={handleSave}
              disabled={!isDirty || saving}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={saveLabel}
              accessibilityState={{ selected: a11ySelected, disabled: !isDirty || saving }}
            >
              <Text
                style={[
                  styles.saveText,
                  filled && styles.saveTextFilled,
                  saveState === 'saved' && styles.saveTextSaved,
                ]}
              >
                {saveLabel}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  return (
    <View>
      {/* Phase 22.2 — uniform SectionEyebrow + section-color encoding.
          NOTES uses the default tint (textTertiary) so the human-voice
          notes content owns the visual weight, not the eyebrow. The
          hairline divider above matches the 15.12 Insights pattern.
          The card chrome below keeps its internal headerRow for the
          last-edited label only. */}
      <View style={styles.sectionDivider} />
      <SectionEyebrow text={eyebrowText} />
    <View style={styles.card}>
      <View style={styles.headerRow}>
        {lastEditedLabel && (
          <Text
            style={styles.lastEdited}
            accessibilityLabel={lastEditedLabel}
          >
            {lastEditedLabel}
          </Text>
        )}
      </View>

      <View testID="notes-body" style={styles.body}>
        {!readOnly && (
          <Text testID="notes-prompt" style={styles.prompt}>
            {promptText}
          </Text>
        )}
        <TextInput
          ref={textInputRef}
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder={readOnly ? 'Notes from this day' : ''}
          placeholderTextColor={colors.textTertiary}
          multiline
          textAlignVertical="top"
          editable={!readOnly}
          accessibilityLabel={
            readOnly
              ? 'Notes from this day (read-only)'
              : "Today's notes — type anything to pass along to the next caregiver"
          }
        />
      </View>

      {/* Hidden live region — VoiceOver announces "Saved" when justSaved
          flips to true; the visual state change on the pill alone wouldn't
          fire an a11y announcement on its own. */}
      <Text
        accessibilityLiveRegion="polite"
        accessibilityElementsHidden={!justSaved}
        style={styles.liveRegion}
      >
        {justSaved ? 'Saved' : ''}
      </Text>

      <View style={styles.footer}>
        <View style={styles.footerLeft}>
          <Text style={styles.privacy}>{'🔒 Private · on this device'}</Text>
          <Text
            style={styles.destinationHint}
            accessibilityLabel="Used in handoff and visit prep"
          >
            {'→ Used in handoff and visit prep'}
          </Text>
        </View>
        {!readOnly && (
          <TouchableOpacity
            style={[
              styles.saveButton,
              filled && styles.saveButtonFilled,
              saveState === 'saved' && styles.saveButtonSaved,
            ]}
            onPress={handleSave}
            disabled={!isDirty || saving}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={saveLabel}
            accessibilityState={{ selected: a11ySelected, disabled: !isDirty || saving }}
          >
            <Text
              style={[
                styles.saveText,
                filled && styles.saveTextFilled,
                saveState === 'saved' && styles.saveTextSaved,
              ]}
            >
              {saveLabel}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
    </View>
  );
}

const createStyles = (c: any) =>
  StyleSheet.create({
    card: {
      backgroundColor: c.glass,
      borderWidth: 0.5,
      borderColor: c.glassBorder,
      borderRadius: 10,
      overflow: 'hidden',
      // Card holds rows with their own padding; symmetric per Phase 2 contract.
      padding: 0,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      paddingTop: 11,
      paddingBottom: 8,
      paddingHorizontal: 14, // allow: tap-target padding (Apple HIG ≥44pt)
      backgroundColor: 'rgba(255,255,255,0.025)',
      borderBottomWidth: 0.5,
      borderBottomColor: c.glassBorder,
    },
    // Phase 22.2 — local eyebrow style retired; SectionEyebrow owns
    // the typography. Hairline divider matches the 15.12 Insights
    // pattern.
    sectionDivider: {
      height: 1,
      backgroundColor: 'rgba(255,255,255,0.04)',
      marginVertical: 16, // allow: section-divider rhythm (15.12 parity)
      marginHorizontal: -16, // allow: section-divider rhythm (15.12 parity)
    },
    lastEdited: {
      marginLeft: 'auto',
      fontSize: 8.5,
      fontStyle: 'italic',
      color: c.textTertiary,
    },
    body: {
      paddingTop: 12,
      paddingHorizontal: 14, // allow: tap-target padding (Apple HIG ≥44pt)
      paddingBottom: 10,
    },
    // Phase 27.5b F5 — bare-mode body + input chrome. Section 4 owns
    // the outer lavender card; the input gets its own visible chrome
    // so the writing affordance is discoverable without a separate
    // prompt label above it. The chrome values come straight from the
    // F5 spec (rgba(0,0,0,0.18) bg + rgba(255,255,255,0.10) border +
    // borderRadius 8 + padding 10/11). minHeight 44 is enough for the
    // placeholder + the first line; the multiline TextInput auto-grows
    // past it.
    bareBody: {
      // No internal padding — the input's own padding handles spacing.
      paddingBottom: 6, // allow: tap-target padding (Apple HIG ≥44pt)
    },
    bareInput: {
      backgroundColor: 'rgba(0,0,0,0.18)',
      borderWidth: 0.5,
      borderColor: 'rgba(255,255,255,0.10)',
      borderRadius: 8,
      paddingVertical: 10,
      paddingHorizontal: 11, // allow: tap-target padding (Apple HIG ≥44pt)
      minHeight: 44,
      // Serif italic throughout (placeholder + typed content). RN TextInput
      // placeholders inherit fontFamily/fontStyle from the style prop; voice
      // is differentiated by placeholderTextColor alpha (0.35) vs content
      // alpha (0.85), not by switching families. Matches the surrounding
      // caregiver-voice register on the Journal Plan card.
      fontFamily: Fonts.serifItalic,
      fontStyle: 'italic',
      fontSize: 11,
      lineHeight: 17,
      color: c.textPrimary,
    },
    // Phase 31 F2 fix — past-day read-only render. No input chrome
    // (no border, bg, or padding box) — the past day's saved notes
    // are static prose, not an editable surface. Typography matches
    // the writable bareInput's typed-content register so reading a
    // past note feels like reading the same content the user would
    // type today.
    bareReadOnlyText: {
      fontFamily: Fonts.serifItalic,
      fontStyle: 'italic',
      fontSize: 11,
      lineHeight: 17,
      color: c.textPrimary,
      paddingVertical: 4,
    },
    // Empty past-day state — quiet textTertiary so the absence reads
    // as "I checked and there's nothing here" rather than as missing
    // chrome or a broken surface.
    bareReadOnlyEmpty: {
      fontFamily: Fonts.serifItalic,
      fontStyle: 'italic',
      fontSize: 11,
      lineHeight: 17,
      color: c.textTertiary,
      paddingVertical: 4,
    },
    // v6.7 Phase 3 — visible serif italic prompt, replaces the rotating
    // placeholder text. Sits above the textarea so the prompt stays read
    // even when the input has user-typed content.
    prompt: {
      fontFamily: Fonts.serifItalic,
      fontStyle: 'italic',
      fontSize: 12,
      color: c.textSecondary,
      marginBottom: 4,
    },
    input: {
      fontSize: 14,
      color: c.textPrimary,
      lineHeight: 20,
      // Phase 27 F6 — minHeight raised 36 → 60 (3 lines × 20pt
      // lineHeight). The pre-27 36pt floor read as too tight for a
      // free-text handoff prompt once the notes block moved into
      // Section 4's lavender card; 3 lines gives the caregiver enough
      // initial canvas to start writing without expanding. RN's
      // native multiline TextInput auto-grows past this floor as
      // content grows — no explicit onFocus expansion is needed.
      minHeight: 60,
      // Deliberately no backgroundColor / borderWidth — the card surface IS
      // the input surface (per the v6.7 internal-header spec).
    },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingTop: 8,
      paddingBottom: 11,
      paddingHorizontal: 14, // allow: tap-target padding (Apple HIG ≥44pt)
      borderTopWidth: 0.5,
      borderTopColor: c.glassBorder,
    },
    footerLeft: {
      flexShrink: 1,
    },
    privacy: {
      fontSize: 9,
      color: c.textTertiary,
    },
    destinationHint: {
      marginTop: 2,
      fontSize: 8.5,
      fontWeight: '400',
      color: (c as any).caregiverAccent || c.textTertiary,
    },
    liveRegion: {
      // Visually hidden but accessible to VoiceOver via the live region.
      position: 'absolute',
      width: 1,
      height: 1,
      overflow: 'hidden',
      opacity: 0,
    },
    // v6.7 Phase 3 — outlined-sage Save in every state. The Share-summary
    // button on this screen carries the filled-sage primary; never both
    // filled at the same priority. The dirty / just-saved states bump the
    // border to 1px (was 0.5) so the affordance still reads as "act on it"
    // without flipping to a solid fill.
    saveButton: {
      marginLeft: 'auto',
      borderWidth: 0.5,
      borderColor: 'rgba(95, 184, 138, 0.5)',
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 4,
    },
    saveButtonFilled: {
      // Stays outlined; bumps border weight to read as "act on it now".
      borderWidth: 1,
      borderColor: 'rgba(95, 184, 138, 0.7)',
    },
    saveButtonSaved: {
      // Settled state — same outlined sage as fresh.
      borderColor: 'rgba(95, 184, 138, 0.5)',
      backgroundColor: 'transparent',
    },
    saveText: {
      fontSize: 11,
      color: c.accent,
      fontWeight: '500',
    },
    saveTextFilled: {
      color: c.accent,
      fontWeight: '600',
    },
    saveTextSaved: {
      color: c.accent,
    },
  });

export default JournalNotesCard;
