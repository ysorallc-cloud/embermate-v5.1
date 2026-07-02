// ============================================================================
// REFLECTION ZONE NOW — F7 evening-only reflection prompt on Now.
//
// Hidden entirely before 17:00. After 17:00 the zone renders one of
// three states:
//
//   State A — evening meds complete:
//     Ember card invites a coffee moment; CTA opens the ReflectionSheet
//     (which mounts the existing ReflectionCard — no card duplication).
//
//   State B — evening meds not yet complete:
//     Single quiet fabric line in italic serif, muted.
//
//   State C — Coffee Moment dismissed for today:
//     Single quiet fabric line. Dismissed flag persists for the calendar
//     day only via @embermate_coffee_moment_dismissed:{YYYY-MM-DD}.
//
// The 17:00 gate + state derivation refresh every minute so a caregiver
// who opens Now before 17:00 and stays past it doesn't need to refresh.
// ============================================================================

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Colors } from '../../theme/theme-tokens';
import { Fonts } from '../../theme/theme-tokens';
import {
  CARD_PADDING_H,
  CARD_PADDING_V,
  ROW_V,
  TypeScale,
  ZoneTint,
} from '../../theme/spacing';
import { safeGetItem, safeSetItem } from '../../utils/safeStorage';
import { ReflectionSheet } from './ReflectionSheet';

const EVENING_CUTOFF_HOUR = 17;

function todayKey(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function dismissedStorageKey(date: string): string {
  // Health-adjacent UX state — kept on a dedicated key, non-sensitive
  // (a single boolean per date). Calendar-day scoped: rolls over at
  // midnight via the date suffix.
  return `@embermate_coffee_moment_dismissed:${date}`;
}

export interface ReflectionZoneNowProps {
  /** Whether all evening medications for today are logged. The user
   *  spec ties State A's surfacing to this gate. Computed by Now from
   *  the day's care-plan instances. */
  eveningMedsComplete: boolean;
}

export function ReflectionZoneNow({ eveningMedsComplete }: ReflectionZoneNowProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // 17:00 gate — re-check every minute so the zone surfaces without
  // a tab switch / refresh if the user is on Now when the clock rolls.
  const [isEvening, setIsEvening] = useState(() => new Date().getHours() >= EVENING_CUTOFF_HOUR);
  useEffect(() => {
    const id = setInterval(() => {
      setIsEvening(new Date().getHours() >= EVENING_CUTOFF_HOUR);
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  const [dismissed, setDismissed] = useState<boolean | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const date = useMemo(todayKey, []);

  // Load the per-day dismissed flag on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const v = await safeGetItem<boolean>(dismissedStorageKey(date), false);
      if (!cancelled) setDismissed(!!v);
    })();
    return () => { cancelled = true; };
  }, [date]);

  const handleDismiss = useCallback(async () => {
    setDismissed(true);
    await safeSetItem(dismissedStorageKey(date), true);
  }, [date]);

  const handleSheetClose = useCallback(() => {
    setSheetOpen(false);
  }, []);

  // Hidden entirely before 17:00.
  if (!isEvening) return null;
  // Loading: render nothing rather than flash the wrong state.
  if (dismissed === null) return null;

  let body: React.ReactNode;
  if (dismissed) {
    // State C — quiet fabric line.
    body = (
      <Text style={styles.quietLine} testID="reflection-zone-state-c">
        Take a moment when you're ready.
      </Text>
    );
  } else if (!eveningMedsComplete) {
    // State B — quiet fabric line.
    body = (
      <Text style={styles.quietLine} testID="reflection-zone-state-b">
        Your reflection will appear when the evening is done.
      </Text>
    );
  } else {
    // State A — ember card with CTA.
    body = (
      <View style={styles.emberCard} testID="reflection-zone-state-a">
        <Text style={styles.emberCopy}>
          Evening meds done. Two minutes for yourself — how did today actually go?
        </Text>
        <View style={styles.emberActions}>
          <TouchableOpacity
            style={styles.cta}
            onPress={() => setSheetOpen(true)}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Take a coffee moment"
            testID="reflection-zone-cta"
          >
            <Text style={styles.ctaText}>Take a coffee moment →</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => void handleDismiss()}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Dismiss reflection for today"
            testID="reflection-zone-dismiss"
          >
            <Text style={styles.dismiss}>Not now</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.zone} testID="reflection-zone-now">
      <Text style={styles.eyebrow}>
        {'☕ '}
        <Text style={styles.eyebrowLabel}>REFLECTION</Text>
        <Text style={styles.eyebrowVerb}>{' · reflect'}</Text>
      </Text>
      {body}
      <ReflectionSheet visible={sheetOpen} onClose={handleSheetClose} />
    </View>
  );
}

const createStyles = (c: typeof Colors) =>
  StyleSheet.create({
    zone: {
      backgroundColor: ZoneTint.z2,
      paddingTop: CARD_PADDING_V,
      paddingBottom: CARD_PADDING_V,
      paddingHorizontal: CARD_PADDING_H,
      borderRadius: 12,
    },
    eyebrow: {
      ...TypeScale.micro,
      color: c.textTertiary,
      marginBottom: 14, // allow: zone-eyebrow rhythm matches Zone primitive
    },
    eyebrowLabel: {
      // Now rebuild — Reflection is SELF-CARE, so its eyebrow takes SAGE
      // (§5 semantic: sage = self-care/wellbeing), NOT coral. The
      // now-full-approved mockup drew it coral, but that overloaded coral
      // (which must stay "respond to this") onto a non-urgent zone — same
      // class as the you-calm blue-border mockup error, ruled sage.
      // Schedule stays gold (scheduled/due), Health stays sage (wellbeing).
      color: c.accent,
    },
    eyebrowVerb: {
      color: c.textTertiary,
      fontWeight: '400',
      letterSpacing: 0.3,
      textTransform: 'lowercase',
    },
    quietLine: {
      ...TypeScale.body,
      fontFamily: Fonts.serifItalic,
      color: c.textMuted,
      paddingVertical: ROW_V,
    },
    emberCard: {
      // B1 — Now Reflection frame carries the reflection-lane border tint.
      borderWidth: 1,
      borderColor: c.borderReflect,
      borderRadius: 12,
      padding: CARD_PADDING_V,
    },
    emberCopy: {
      ...TypeScale.body,
      // Warm reflective VOICE — italic light (Fonts.serifItalic resolves to
      // Poppins_300Light_Italic post-F2), matching the mockup's italic
      // reflection line.
      fontFamily: Fonts.serifItalic,
      fontStyle: 'italic' as const,
      color: c.textPrimary,
      lineHeight: 20,
      marginBottom: 14, // allow: copy-to-actions rhythm
    },
    emberActions: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    cta: {
      // Sage text-link (self-care action), not a filled pill.
    },
    ctaText: {
      ...TypeScale.body,
      // Sage per §5 (self-care) — the whole Reflection zone is sage, so the
      // CTA moves off the mockup's gold to the self-care register.
      color: c.accent,
      fontWeight: '600',
    },
    dismiss: {
      ...TypeScale.secondary,
      color: c.textMuted,
    },
  });

export default ReflectionZoneNow;
