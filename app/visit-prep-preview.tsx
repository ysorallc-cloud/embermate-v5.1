// ============================================================================
// VISIT PREP PREVIEW — Phase 5.9.d
//
// In-app structured preview of the assembled care summary. Renders
// section-by-section using React Native views from the same
// assembleVisitPrepData() output that the PDF generator consumes —
// so what the user sees IS what gets shared.
//
// This screen is the ONLY caller of generateAndShareVisitPrep. The
// config screen's primary button now navigates here; users can't ship
// a PDF without going through this surface.
//
// "What changed" lede is editable inline — taps reveal a textarea
// pre-populated with the auto-draft, save persists via
// visitPrepDraftRepo so a later open shows the same edit.
// ============================================================================

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { Spacing, Sizing } from '../theme/theme-tokens';
import { SubScreenHeader } from '../components/SubScreenHeader';
import { navigate, navigateBack } from '../lib/navigate';
import { logError } from '../utils/devLog';
import { hapticSuccess } from '../utils/hapticFeedback';
import { safeGetItem, safeSetItem } from '../utils/safeStorage';
import { NO_VITALS_IN_RANGE } from '../utils/reportVitals';
import {
  assembleVisitPrepData,
  generateAndShareVisitPrep,
  ProfileMissingError,
  type VisitPrepConfig,
  type VisitPrepData,
} from '../services/visitPrepPdf';
import {
  getVisitPrepDraft,
  saveVisitPrepDraft,
} from '../storage/visitPrepDraftRepo';

const PENDING_CONFIG_KEY = 'pending_visit_prep_config';

export default function VisitPrepPreviewScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [config, setConfig] = useState<VisitPrepConfig | null>(null);
  const [data, setData] = useState<VisitPrepData | null>(null);
  const [loadState, setLoadState] = useState<'idle' | 'loading' | 'ready' | 'error'>('loading');
  const [generating, setGenerating] = useState(false);

  // "What changed" inline editor state.
  const [editing, setEditing] = useState(false);
  const [draftText, setDraftText] = useState('');

  // ── Load pending config + assemble data ─────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadState('loading');
        const pending = await safeGetItem<VisitPrepConfig | null>(
          PENDING_CONFIG_KEY,
          null,
        );
        if (cancelled) return;
        if (!pending) {
          // No pending config — user hit this route directly. Bounce.
          setLoadState('error');
          return;
        }
        setConfig(pending);
        const assembled = await assembleVisitPrepData(pending);
        if (cancelled) return;
        setData(assembled);
        setLoadState('ready');
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ProfileMissingError) {
          // The config screen's profile prompt should have caught this
          // earlier; bounce back so the user can fill it in.
          Alert.alert(
            'Profile incomplete',
            'Add patient and caregiver names in Settings → Profile, then try again.',
            [{ text: 'OK', onPress: () => navigateBack() }],
          );
          return;
        }
        logError('VisitPrepPreview.assemble', err);
        setLoadState('error');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Edit affordance state ────────────────────────────────────────────────
  const beginEdit = useCallback(() => {
    if (!data) return;
    setDraftText(data.whatChanged.observations.join('\n'));
    setEditing(true);
  }, [data]);

  const cancelEdit = useCallback(() => setEditing(false), []);

  const saveEdit = useCallback(async () => {
    if (!config) return;
    try {
      await saveVisitPrepDraft(config.dateRange.end, draftText);
      // Re-assemble so the on-screen preview reflects the saved draft.
      const assembled = await assembleVisitPrepData(config);
      setData(assembled);
      setEditing(false);
    } catch (err) {
      logError('VisitPrepPreview.saveEdit', err);
      Alert.alert('Error', 'Could not save your edit.');
    }
  }, [config, draftText]);

  // ── Action handlers ──────────────────────────────────────────────────────
  const handleGenerateShare = useCallback(async () => {
    if (!config || generating) return;
    setGenerating(true);
    try {
      const success = await generateAndShareVisitPrep(config);
      if (success) {
        void hapticSuccess();
        // Clear the pending config so a stale stash doesn't leak into a
        // future flow. Best-effort.
        try { await safeSetItem(PENDING_CONFIG_KEY, null); } catch {}
      } else {
        Alert.alert('Error', 'Could not generate the PDF. Please try again.');
      }
    } catch (err) {
      logError('VisitPrepPreview.generate', err);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setGenerating(false);
    }
  }, [config, generating]);

  const handleAdjustToggles = useCallback(() => {
    // Config screen is still in the stack — go back, preserving toggle
    // state via React's stack-resident state.
    navigateBack();
  }, []);

  const handleCancel = useCallback(async () => {
    try { await safeSetItem(PENDING_CONFIG_KEY, null); } catch {}
    navigate('/(tabs)/journal');
  }, []);

  // ── Render ───────────────────────────────────────────────────────────────
  const days = config
    ? Math.max(
        1,
        Math.ceil(
          (new Date(`${config.dateRange.end}T12:00:00`).getTime()
            - new Date(`${config.dateRange.start}T12:00:00`).getTime())
            / (1000 * 60 * 60 * 24),
        ) + 1,
      )
    : 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={[colors.backgroundGradientStart, colors.backgroundGradientEnd]}
        style={styles.gradient}
      >
        <SubScreenHeader
          title="Preview"
          subtitle={config ? `Visit prep · ${days} days` : 'Visit prep'}
        />

        {loadState === 'loading' && (
          <View style={styles.statusWrap}>
            <ActivityIndicator color={colors.caregiverAccent} />
            <Text style={styles.statusText}>{'Building report…'}</Text>
          </View>
        )}

        {loadState === 'error' && (
          <View style={styles.statusWrap}>
            <Text style={styles.statusText}>
              {"Couldn't build the report. Adjust toggles and try again."}
            </Text>
            <TouchableOpacity
              onPress={navigateBack}
              accessibilityRole="button"
              accessibilityLabel="Adjust toggles"
              style={styles.outlinedButton}
            >
              <Text style={styles.outlinedButtonText}>{'Adjust toggles'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {loadState === 'ready' && data && (
          <>
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator
            >
              {/* Header */}
              <Text style={styles.title}>Care Summary: {data.header.patientName}</Text>
              <Text style={styles.subtitle}>
                {data.header.dateRange}
                {data.header.preparedBy ? ` · Prepared by ${data.header.preparedBy}` : ''}
              </Text>
              {/* Phase 23.3 — provenance mirror of the PDF cover. The PDF
                  emits this line directly under the subtitle row so a
                  clinician reading cold calibrates before the first
                  clinical section; the preview mirrors so a caregiver
                  previewing before share sees the same framing. Colour
                  routes through textWarmMuted instead of the PDF's print
                  #9a9aa8 (which wouldn't read against the dark preview
                  surface). */}
              <Text style={styles.provenance}>
                {'Caregiver-reported observations · Not a clinical record'}
              </Text>

              {/* Phase 5.10.a — Red Flags & Alerts callout (top of page).
                  Phase 5.10.d — toggle gates the entire section; when ON
                  but no flags surface, the body becomes a "No flags
                  raised in this window." sentinel. */}
              {data.includes.redFlags && (
                <View style={styles.redFlagCallout}>
                  <Text style={styles.redFlagHeader}>{'RED FLAGS & ALERTS'}</Text>
                  {data.redFlags.length > 0 ? (
                    data.redFlags.map((f, i) => (
                      <Text key={`rf-${i}`} style={styles.redFlagLine}>
                        <Text style={styles.redFlagTag}>
                          {f.severity === 'critical' ? 'CRITICAL: ' : 'ATTENTION: '}
                        </Text>
                        {f.text}
                      </Text>
                    ))
                  ) : (
                    <Text style={styles.redFlagLine}>
                      {'No flags raised in this window.'}
                    </Text>
                  )}
                </View>
              )}

              {/* What changed — editable */}
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeader}>What changed</Text>
                {!editing && (
                  <TouchableOpacity
                    onPress={beginEdit}
                    accessibilityRole="button"
                    accessibilityLabel="Edit what changed"
                    style={styles.editLink}
                  >
                    <Text style={styles.editLinkText}>{'Edit'}</Text>
                  </TouchableOpacity>
                )}
              </View>
              {editing ? (
                <View style={styles.editorWrap}>
                  <TextInput
                    style={styles.editorInput}
                    value={draftText}
                    onChangeText={setDraftText}
                    multiline
                    accessibilityLabel="Edit what changed text"
                    placeholder="One observation per line"
                    placeholderTextColor={colors.textTertiary}
                  />
                  <View style={styles.editorActions}>
                    <TouchableOpacity
                      onPress={cancelEdit}
                      accessibilityRole="button"
                      accessibilityLabel="Cancel edit"
                      style={styles.editorCancel}
                    >
                      <Text style={styles.editorCancelText}>{'Cancel'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={saveEdit}
                      accessibilityRole="button"
                      accessibilityLabel="Save edit"
                      style={styles.editorSave}
                    >
                      <Text style={styles.editorSaveText}>{'Save'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.sectionBody}>
                  {data.whatChanged.observations.map((obs, i) => (
                    <Text
                      key={`${i}-${obs.slice(0, 24)}`}
                      style={[
                        styles.bulletLine,
                        data.whatChanged.insufficientData && styles.bulletLineMuted,
                      ]}
                    >
                      {`• ${obs}`}
                    </Text>
                  ))}
                </View>
              )}

              {/* Medication adherence — Phase 5.10.d toggle linkage. */}
              {data.includes.meds && (
                <>
                  <Text style={styles.sectionHeader}>Medication adherence</Text>
                  <View style={styles.sectionBody}>
                    {data.adherence.length > 0 ? (
                      data.adherence.map((m, i) => (
                        <Text key={`med-${i}`} style={styles.bulletLine}>
                          {`• ${m.name}${m.dosage ? ' ' + m.dosage : ''} — ${m.rate}% (${m.missedDays > 0 ? m.missedDays + ' missed' : 'no misses'})`}
                        </Text>
                      ))
                    ) : (
                      <Text style={[styles.bulletLine, styles.bulletLineMuted]}>
                        {'No medications logged in this window.'}
                      </Text>
                    )}
                  </View>
                </>
              )}

              {/* Vitals — Phase 5.10.d toggle linkage. */}
              {data.includes.vitals && (
                <>
                  <Text style={styles.sectionHeader}>Vitals</Text>
                  <View style={styles.sectionBody}>
                    {data.vitals.length > 0 ? (
                      data.vitals.map((v, i) => (
                        <Text key={`vital-${i}`} style={styles.bulletLine}>
                          {`• ${v.label}: ${v.latestValue}${v.outOfRange > 0 ? ` (${v.outOfRange} out of range)` : ''}`}
                        </Text>
                      ))
                    ) : (
                      <Text style={[styles.bulletLine, styles.bulletLineMuted]}>
                        {NO_VITALS_IN_RANGE}
                      </Text>
                    )}
                  </View>
                </>
              )}

              {/* Phase 5.10.a — Hydration & Nutrition callout.
                  Phase 5.10.d — toggle gates the section. */}
              {data.includes.hydrationNutrition && (
                <View style={styles.hydrationCallout}>
                  <Text style={styles.calloutHeader}>{'HYDRATION & NUTRITION'}</Text>
                  {data.hydrationNutrition ? (
                    <>
                      {data.hydrationNutrition.hydration && (
                        <Text style={styles.calloutBody}>
                          {`Hydration: ${data.hydrationNutrition.hydration.avgCupsPerDay.toFixed(1)} cups/day average (target ${data.hydrationNutrition.hydration.target}). ${data.hydrationNutrition.hydration.lowDays.length} low days.`}
                        </Text>
                      )}
                      {data.hydrationNutrition.meals && (
                        <Text style={styles.calloutBody}>
                          {`Meals: ${data.hydrationNutrition.meals.fullMealDays} full days, ${data.hydrationNutrition.meals.partialMealDays} partial. ${data.hydrationNutrition.meals.refusedMeals.length} refused.`}
                        </Text>
                      )}
                      {data.hydrationNutrition.appetiteSummary && (
                        <Text style={styles.calloutBody}>{data.hydrationNutrition.appetiteSummary}</Text>
                      )}
                    </>
                  ) : (
                    <Text style={styles.calloutBody}>
                      {'No hydration or meals logged in this window.'}
                    </Text>
                  )}
                </View>
              )}

              {/* Phase 5.10.a — Sleep, Energy & Mood Patterns callout.
                  Phase 5.10.d — toggle gates the section. */}
              {data.includes.wellness && (
                <View style={styles.wellnessCallout}>
                  <Text style={styles.calloutHeader}>{'SLEEP, ENERGY & MOOD PATTERNS'}</Text>
                  {(data.wellnessPatterns.sleep || data.wellnessPatterns.energy || data.wellnessPatterns.mood) ? (
                    <>
                      {data.wellnessPatterns.sleep && (
                        <Text style={styles.calloutBody}>
                          <Text style={styles.calloutLabel}>{'Sleep: '}</Text>
                          {`${data.wellnessPatterns.sleep.avgQuality.toFixed(1)}/5 average`}
                          {data.wellnessPatterns.sleep.priorAvg !== null
                            ? ` (vs ${data.wellnessPatterns.sleep.priorAvg.toFixed(1)} prior period)`
                            : ''}
                          {data.wellnessPatterns.sleep.poorNights.length > 0
                            ? `. ${data.wellnessPatterns.sleep.poorNights.length} poor night${data.wellnessPatterns.sleep.poorNights.length === 1 ? '' : 's'}`
                            : ''}
                          {data.wellnessPatterns.sleep.earlierWaking ? ' · concentrating recently' : ''}.
                        </Text>
                      )}
                      {data.wellnessPatterns.energy && (
                        <Text style={styles.calloutBody}>
                          <Text style={styles.calloutLabel}>{'Energy: '}</Text>
                          {`${data.wellnessPatterns.energy.afternoonDipDays} low-energy day${data.wellnessPatterns.energy.afternoonDipDays === 1 ? '' : 's'}`}
                          {data.wellnessPatterns.energy.correlatesWithPoorSleep && data.wellnessPatterns.energy.correlatesWithPoorSleep > 0
                            ? ` (correlates with poor sleep on ${data.wellnessPatterns.energy.correlatesWithPoorSleep} of those)`
                            : ''}
                          .
                        </Text>
                      )}
                      {data.wellnessPatterns.mood && (
                        <Text style={styles.calloutBody}>
                          <Text style={styles.calloutLabel}>{'Mood: '}</Text>
                          {`${data.wellnessPatterns.mood.difficultMornings.length} difficult morning${data.wellnessPatterns.mood.difficultMornings.length === 1 ? '' : 's'}.`}
                        </Text>
                      )}
                    </>
                  ) : (
                    <Text style={styles.calloutBody}>
                      {'No reflections logged in this window.'}
                    </Text>
                  )}
                </View>
              )}

              {/* Phase 5.10.a — Symptom progression (renamed from "Symptoms that changed"). */}
              {data.symptomChanges.length > 0 && (
                <>
                  <Text style={styles.sectionHeader}>Symptom progression</Text>
                  <View style={styles.sectionBody}>
                    {data.symptomChanges.map((s, i) => {
                      const tag = s.change === 'new' ? 'New' :
                        s.change === 'worse' ? 'Worse' :
                        s.change === 'better' ? 'Improving' : 'Resolved';
                      return (
                        <Text key={`sym-${i}`} style={styles.bulletLine}>
                          <Text style={styles.calloutLabel}>{`${tag}: `}</Text>
                          {s.briefDescription}
                        </Text>
                      );
                    })}
                  </View>
                </>
              )}

              {/* Functional issues */}
              {data.functionalIssues.length > 0 && (
                <>
                  <Text style={styles.sectionHeader}>Functional observations</Text>
                  <View style={styles.sectionBody}>
                    {data.functionalIssues.map((f, i) => (
                      <Text key={`fn-${i}`} style={styles.bulletLine}>
                        {`• ${f.observation}`}
                      </Text>
                    ))}
                  </View>
                </>
              )}

              {/* Caregiver notes — Phase 5.10.d toggle linkage. */}
              {data.includes.notes && (
                <>
                  <Text style={styles.sectionHeader}>Caregiver notes</Text>
                  <View style={styles.sectionBody}>
                    {data.selectedNotes.length > 0 ? (
                      data.selectedNotes.map((n, i) => (
                        <Text key={`note-${i}`} style={styles.bulletLine}>
                          {`• ${new Date(`${n.date}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}: ${n.text}`}
                        </Text>
                      ))
                    ) : (
                      <Text style={[styles.bulletLine, styles.bulletLineMuted]}>
                        {'No notes saved in this window.'}
                      </Text>
                    )}
                  </View>
                </>
              )}

              {/* Questions for this visit — Phase 5.10.d toggle linkage. */}
              {data.includes.questions && (
                <>
                  <Text style={styles.sectionHeader}>Questions for this visit</Text>
                  <View style={styles.sectionBody}>
                    {data.patientQuestions.length > 0 ? (
                      data.patientQuestions.map((q, i) => (
                        <Text key={`q-${i}`} style={styles.bulletLine}>
                          {`• ${q}`}
                        </Text>
                      ))
                    ) : (
                      <Text style={[styles.bulletLine, styles.bulletLineMuted]}>
                        {'No questions saved for this visit.'}
                      </Text>
                    )}
                  </View>
                </>
              )}

              {/* Footer */}
              <Text style={styles.footer}>{data.footer}</Text>
            </ScrollView>

            <View style={styles.actionsRow}>
              <TouchableOpacity
                onPress={handleGenerateShare}
                disabled={generating}
                accessibilityRole="button"
                accessibilityLabel="Generate & share PDF"
                accessibilityState={{ busy: generating }}
                style={[styles.primaryButton, generating && styles.primaryButtonDisabled]}
              >
                {generating ? (
                  <ActivityIndicator color="#0a0c0a" />
                ) : (
                  <Text style={styles.primaryButtonText}>{'Generate & share PDF'}</Text>
                )}
              </TouchableOpacity>
              <View style={styles.secondaryRow}>
                <TouchableOpacity
                  onPress={handleAdjustToggles}
                  accessibilityRole="button"
                  accessibilityLabel="Adjust toggles"
                  style={styles.outlinedButton}
                >
                  <Text style={styles.outlinedButtonText}>{'Adjust toggles'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleCancel}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel"
                  style={styles.ghostButton}
                >
                  <Text style={styles.ghostButtonText}>{'Cancel'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}
      </LinearGradient>
    </SafeAreaView>
  );
}

const createStyles = (c: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  gradient: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  statusWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: Spacing.sm,
  },
  statusText: {
    fontSize: 13,
    color: c.textSecondary,
    textAlign: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: c.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: c.textSecondary,
    marginBottom: Spacing.md,
  },
  // Phase 23.3 — provenance line mirrors the PDF cover. textWarmMuted
  // (one step quieter than textSecondary) renders on the dark preview
  // surface; the PDF uses #9a9aa8 instead because that's the right
  // tone on white print. Italic + 11pt mirrors the PDF's reduced-
  // emphasis treatment without sub-10pt sizing (preview is read on a
  // phone screen, not print).
  provenance: {
    fontSize: 11,
    color: c.textWarmMuted,
    fontStyle: 'italic' as const,
    marginTop: -Spacing.sm,
    marginBottom: Spacing.md,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
    marginBottom: 6,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: c.textPrimary,
    marginTop: Spacing.md,
    marginBottom: 6,
  },
  sectionBody: {
    marginBottom: 4,
  },
  bulletLine: {
    fontSize: 13,
    lineHeight: 19,
    color: c.textPrimary,
    marginBottom: 4,
  },
  bulletLineMuted: {
    color: c.textSecondary,
    fontStyle: 'italic',
  },
  // Phase 5.10.a — callout blocks. Light tinted bg + left border by family
  // (red for flags, sage for hydration/wellness). Header in muted-uppercase.
  redFlagCallout: {
    backgroundColor: 'rgba(193, 72, 72, 0.08)',
    borderLeftWidth: 3,
    borderLeftColor: '#c14848',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginVertical: Spacing.sm,
    borderRadius: 6,
  },
  redFlagHeader: {
    fontSize: 11,
    fontWeight: '600' as const,
    letterSpacing: 0.5,
    color: '#8b3030',
    marginBottom: 6,
  },
  redFlagLine: {
    fontSize: 13,
    lineHeight: 18,
    color: c.textPrimary,
    marginBottom: 4,
  },
  redFlagTag: {
    fontWeight: '700' as const,
    color: '#c14848',
  },
  hydrationCallout: {
    backgroundColor: 'rgba(74, 107, 93, 0.06)',
    borderLeftWidth: 3,
    borderLeftColor: '#4a6b5d',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginVertical: Spacing.sm,
    borderRadius: 6,
  },
  wellnessCallout: {
    backgroundColor: 'rgba(74, 107, 93, 0.06)',
    borderLeftWidth: 3,
    borderLeftColor: '#4a6b5d',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginVertical: Spacing.sm,
    borderRadius: 6,
  },
  calloutHeader: {
    fontSize: 11,
    fontWeight: '600' as const,
    letterSpacing: 0.5,
    color: c.textSecondary,
    marginBottom: 6,
  },
  calloutBody: {
    fontSize: 13,
    lineHeight: 19,
    color: c.textPrimary,
    marginBottom: 4,
  },
  calloutLabel: {
    fontWeight: '600' as const,
    color: c.textPrimary,
  },
  editLink: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  editLinkText: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: c.caregiverAccent,
  },
  editorWrap: {
    backgroundColor: c.glass,
    borderWidth: 0.5,
    borderColor: c.glassBorder,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  editorInput: {
    fontSize: 13,
    color: c.textPrimary,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  editorActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  editorCancel: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  editorCancelText: {
    fontSize: 13,
    color: c.textTertiary,
  },
  // Phase 33b extension lavender no-fill canon — site #8. In-editor Save
  // button is action-affirmative (commit an edit). Flipped from lavender
  // fill to sage `c.accent`; near-black `editorSaveText` reads on sage
  // unchanged.
  editorSave: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: c.accent,
    borderRadius: 8,
  },
  editorSaveText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#0a0c0a',
  },
  footer: {
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 0.5,
    borderTopColor: c.glassBorder,
    fontSize: 11,
    color: c.textSecondary,
    lineHeight: 16,
  },
  actionsRow: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: Spacing.sm,
    borderTopWidth: 0.5,
    borderTopColor: c.glassBorder,
    backgroundColor: c.background,
  },
  // Phase 33b extension lavender no-fill canon — site #9. "Generate &
  // share PDF" is a handoff-lane CTA (caregiver → clinician share), the
  // same lane semantics as confirm.tsx's "Done — let's start". Pre-cleanup
  // it carried a saturated `c.caregiverAccent` fill; under the new canon
  // the lane signal moves into the chrome: dark/glass fill + 1pt lavender
  // border + lavender label. Distinguishes the handoff CTA from sage
  // action-affirmative CTAs without the saturated fill.
  primaryButton: {
    backgroundColor: c.background,
    borderWidth: 1,
    borderColor: c.caregiverAccent,
    borderRadius: Sizing.cardRadius,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: c.caregiverAccent,
  },
  secondaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  outlinedButton: {
    flex: 1,
    borderWidth: 0.5,
    borderColor: c.caregiverAccentStrong,
    backgroundColor: c.caregiverAccentBg,
    borderRadius: Sizing.cardRadius,
    paddingVertical: 12,
    alignItems: 'center',
  },
  outlinedButtonText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: c.caregiverAccent,
  },
  ghostButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  ghostButtonText: {
    fontSize: 13,
    color: c.textTertiary,
  },
});
