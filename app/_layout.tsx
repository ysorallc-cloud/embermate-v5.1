// ============================================================================
// ROOT LAYOUT
// App shell with navigation structure
// ============================================================================

import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { View, Text, StyleSheet, Platform, useWindowDimensions, AppState, AppStateStatus, TouchableOpacity } from 'react-native';
import { useEffect, useRef, useState, useCallback } from 'react';
// Phase 33 F3 — Source Serif 4 is the website source-of-truth serif. Loaded
// at app startup so all `Fonts.serif` consumers render with the brand font
// instead of falling back to system Georgia. Splash dismissal is gated on
// fontsLoaded so the first paint already carries Source Serif 4 metrics —
// avoids a visible font-swap flash on cold start.
import { useFonts } from 'expo-font';
// Redesign Phase 0 (F2) — single typeface Poppins per EmberMate-v6-Design-Lock
// §1. Weights: 300 light (earned line / VOICE via light-italic), 400 body,
// 500 names/values, 600 labels/titles, 700 letter-spaced eyebrows. Serif
// (SourceSerif4) retired entirely — the warm "voice" is now carried by
// weight (300 light-italic) + the narrative rule, NOT a serif family.
import {
  Poppins_300Light,
  Poppins_300Light_Italic,
  Poppins_400Regular,
  Poppins_400Regular_Italic,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';

// Keep the branded splash visible until the first render is ready —
// prevents the white-flash-on-cold-start that happens when the JS bundle
// finishes loading before the React tree paints.
SplashScreen.preventAutoHideAsync().catch(() => {
  // Safe to ignore — preventAutoHide is best-effort. On web and older
  // Expo SDK versions it may not be available.
});

// Redesign Phase 0 (F2) — global default typeface. RN has no app-wide
// fontFamily, so set it on Text: every text node without an explicit
// fontFamily defaults to Poppins (Design-Lock §1 "Poppins everywhere"); an
// explicit fontFamily still wins (own style applies after defaultProps.style).
// Caveat: React 19 deprecates component defaultProps — if this warns on the
// device build, the rebuilds move to a shared <AppText> wrapper. RN 0.81's
// Text still merges defaultProps.style at the native layer.
const _TextDefault = Text as unknown as { defaultProps?: { style?: unknown } };
_TextDefault.defaultProps = _TextDefault.defaultProps ?? {};
_TextDefault.defaultProps.style = [
  { fontFamily: 'Poppins_400Regular' },
  _TextDefault.defaultProps.style,
];

import { safeGetItem, safeSetItem } from '../utils/safeStorage';
import { requestNotificationPermissions } from '../utils/notificationService';
import { useNotificationHandler } from '../utils/useNotificationHandler';
import { runStartupSequence } from '../services/appStartup';
import { getPendingWizardResume } from '../services/wizardResume';
import { isBiometricEnabled, shouldLockSession, requireAuthentication, updateLastActivity, getAutoLockTimeout, getPINLockoutInfo, PINLockoutInfo } from '../utils/biometricAuth';
import { shouldShowIntegrityWarning } from '../utils/deviceIntegrity';
import { logError } from '../utils/devLog';
import ErrorBoundary from '../components/ErrorBoundary';
import { PatientProvider } from '../contexts/PatientContext';
import { ThemeProvider } from '../contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '../theme/theme-tokens';
import { StorageKeys } from '../utils/storageKeys';
function WebContainer({ children }: { children: React.ReactNode }) {
  const { width, height } = useWindowDimensions();

  if (Platform.OS !== 'web') {
    return <>{children}</>;
  }

  // Responsive breakpoints - narrower for better readability
  const isSmallScreen = width <= 768;
  const isMediumScreen = width > 768 && width <= 1024;
  const isLargeScreen = width > 1024;

  // Calculate container width - much narrower for data readability
  let containerWidth = '100%';
  if (isSmallScreen) {
    containerWidth = '100%'; // Full width on mobile
  } else if (isMediumScreen) {
    containerWidth = '440px'; // Tablet - phone-like width
  } else {
    containerWidth = '480px'; // Desktop - comfortable phone-like width
  }

  return (
    <View style={styles.webOuter}>
      <View style={[
        styles.webInner,
        {
          width: containerWidth as any,
          maxWidth: isSmallScreen ? '100%' : 480,
        }
      ]}>
        {children}
      </View>
    </View>
  );
}

function RootLayout() {
  // Handle notification taps
  useNotificationHandler();
  const insets = useSafeAreaInsets();
  const notificationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [locked, setLocked] = useState(false);
  const [lockoutInfo, setLockoutInfo] = useState<PINLockoutInfo | null>(null);
  const [integrityWarning, setIntegrityWarning] = useState(false);
  const lockoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const appStateRef = useRef(AppState.currentState);

  // Phase 33 F3 — Source Serif 4 loaded before splash dismisses so the
  // first paint already has the brand serif. Four weights cover the app's
  // typography needs: 400 regular (headlines), 400 italic (witness voice),
  // 500 medium (emphasis), 600 semibold (CTAs).
  const [fontsLoaded] = useFonts({
    Poppins_300Light,
    Poppins_300Light_Italic,
    Poppins_400Regular,
    Poppins_400Regular_Italic,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });
  // Phase 33 F3 — splash gate. The pre-existing logic dismissed splash
  // inline once runStartupSequence resolved (or rejected). F3 splits that
  // into a "startup complete" signal + a separate effect that dismisses
  // when BOTH startup and fonts are ready. Either source becoming ready
  // alone is insufficient — premature dismiss would either show the app
  // before migrations finish OR show it before Source Serif 4 metrics
  // resolve (visible font-swap flash on first paint).
  const [startupComplete, setStartupComplete] = useState(false);

  const checkSessionLock = useCallback(async () => {
    try {
      const enabled = await isBiometricEnabled();
      if (!enabled) return;
      const timeout = await getAutoLockTimeout();
      const stale = await shouldLockSession(timeout);
      if (stale) setLocked(true);
    } catch (err) {
      logError('RootLayout.checkSessionLock', err);
    }
  }, []);

  const refreshLockout = useCallback(async () => {
    const info = await getPINLockoutInfo();
    setLockoutInfo(info);
    // If locked, set a timer to refresh countdown
    if (info.locked && info.lockoutSeconds > 0) {
      lockoutTimerRef.current = setTimeout(() => refreshLockout(), 1000);
    }
  }, []);

  const handleUnlock = useCallback(async () => {
    const info = await getPINLockoutInfo();
    if (info.locked) {
      setLockoutInfo(info);
      return;
    }
    const success = await requireAuthentication();
    if (success) {
      setLockoutInfo(null);
      await updateLastActivity();
      setLocked(false);
    } else {
      await refreshLockout();
    }
  }, [refreshLockout]);

  useEffect(() => {
    // Orchestrated startup: error reporting → migrations → daily reset → cleanup.
    // Once complete, check for in-flight wizard progress (Phase 5.13.g) and
    // dismiss the native splash so the first React render is visible without
    // a white-flash gap.
    runStartupSequence().then(async () => {
      try {
        const resumePath = await getPendingWizardResume();
        if (resumePath) {
          router.replace(resumePath as any);
        }
      } catch (err) {
        logError('RootLayout.wizardResume', err);
      }
      // Phase 33 F3 — signal startup-done; the font-gate effect below
      // dismisses splash only when fonts are also loaded.
      setStartupComplete(true);
    }).catch(() => {
      // Phase 33 F3 — signal startup-done even on error (splash must
      // still hide, just gated on fonts so the app doesn't reveal
      // mid-font-load).
      setStartupComplete(true);
    });

    // Check device integrity (jailbreak/root) — non-blocking warning
    shouldShowIntegrityWarning().then(async compromised => {
      if (compromised) {
        const dismissed = await safeGetItem<boolean>('@integrity_banner_dismissed', false);
        if (!dismissed) setIntegrityWarning(true);
      }
    });

    // Notification permissions handled separately (needs delay for UX)
    requestNotificationPermissionsOnStartup();

    // Track activity for session timeout + check lock on resume
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active' && appStateRef.current.match(/inactive|background/)) {
        checkSessionLock();
        updateLastActivity();
      }
      appStateRef.current = nextState;
    });

    // Cleanup timer and subscription on unmount
    return () => {
      subscription.remove();
      if (notificationTimerRef.current) {
        clearTimeout(notificationTimerRef.current);
        notificationTimerRef.current = null;
      }
      if (lockoutTimerRef.current) {
        clearTimeout(lockoutTimerRef.current);
        lockoutTimerRef.current = null;
      }
    };
  }, [checkSessionLock]);

  // Phase 33 F3 — dual-gate splash dismissal. Either gate alone is
  // insufficient: startup-complete-only would reveal the app while
  // Source Serif 4 is still resolving (visible font-swap flash on
  // first paint); fonts-loaded-only would reveal the app before
  // migrations/daily-reset/cleanup finish. Both must be ready.
  useEffect(() => {
    if (fontsLoaded && startupComplete) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, startupComplete]);

  async function requestNotificationPermissionsOnStartup() {
    try {
      // Only request on first launch or if not yet requested
      const hasAskedBefore = await safeGetItem<string | null>(StorageKeys.NOTIFICATION_PERMISSIONS_ASKED, null);

      if (!hasAskedBefore) {
        // Wait a moment to let UI settle before showing permission dialog
        // Store ref for cleanup on unmount
        notificationTimerRef.current = setTimeout(async () => {
          await requestNotificationPermissions();
          await safeSetItem(StorageKeys.NOTIFICATION_PERMISSIONS_ASKED, 'true');
          notificationTimerRef.current = null;
        }, 1000);
      }
    } catch (error) {
      // Non-critical — permission dialog failure shouldn't crash the app
      if (__DEV__) console.error('Error requesting notification permissions:', error);
    }
  }

  if (locked) {
    const isLockedOut = lockoutInfo?.locked;
    return (
      <ErrorBoundary>
        <WebContainer>
          <StatusBar style="light" />
          <View style={styles.lockScreen}>
            <Text style={styles.lockIcon}>{'\uD83D\uDD12'}</Text>
            <Text style={styles.lockTitle}>EmberMate Locked</Text>
            <Text style={styles.lockSubtitle}>
              {isLockedOut
                ? `Too many attempts. Try again in ${lockoutInfo.lockoutSeconds}s`
                : 'Authenticate to continue'}
            </Text>
            {!isLockedOut && lockoutInfo && lockoutInfo.attemptsRemaining < 3 && (
              <Text style={styles.lockAttempts}>
                {lockoutInfo.attemptsRemaining} attempt{lockoutInfo.attemptsRemaining !== 1 ? 's' : ''} remaining
              </Text>
            )}
            <TouchableOpacity
              style={[styles.lockButton, isLockedOut && styles.lockButtonDisabled]}
              onPress={handleUnlock}
              disabled={isLockedOut}
              accessibilityRole="button"
              accessibilityLabel={isLockedOut ? 'Locked out' : 'Unlock app'}
            >
              <Text style={[styles.lockButtonText, isLockedOut && styles.lockButtonTextDisabled]}>
                {isLockedOut ? 'Locked Out' : 'Unlock'}
              </Text>
            </TouchableOpacity>
          </View>
        </WebContainer>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <ThemeProvider>
      <WebContainer>
        <StatusBar style="light" />
        {integrityWarning && (
          <View style={[styles.integrityBanner, { paddingTop: insets.top + 10 }]}>
            <Text style={styles.integrityText}>
              {'\u26A0\uFE0F'} This device may be jailbroken or rooted. Your health data could be at risk. Use a secure device for best protection.
            </Text>
            <TouchableOpacity
              onPress={() => { setIntegrityWarning(false); safeSetItem('@integrity_banner_dismissed', true); }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Dismiss device integrity warning"
            >
              <Text style={styles.integrityDismiss}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        )}
        <PatientProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          {/* (onboarding) + settings: auto-discovered file routes whose folders
              have no _layout.tsx (routes flatten), so a bare options-less
              <Stack.Screen> matched no navigator node → "No route named …"
              warning. Both stay reachable via Redirect/navigate; the redundant
              declarations are dropped to keep the launch console clean. */}
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="calendar" options={{ presentation: 'modal' }} />
          <Stack.Screen name="medication-form" />
          <Stack.Screen name="medication-interactions" />
          <Stack.Screen name="medications" />
          <Stack.Screen name="appointment-form" />
          <Stack.Screen name="appointments" />
          <Stack.Screen name="emergency" />
          <Stack.Screen name="upgrade" options={{ presentation: 'modal' }} />
          <Stack.Screen name="log-vitals" />
          <Stack.Screen name="log-water" />
          <Stack.Screen name="log-meal" />
          <Stack.Screen name="log-morning-wellness" />
          <Stack.Screen name="log-evening-wellness" />
          <Stack.Screen name="log-symptom" />
          <Stack.Screen name="log-pain" />
          <Stack.Screen name="care-report" />
          <Stack.Screen name="provider-prep" />
          <Stack.Screen name="family-sharing" />
          <Stack.Screen name="family-activity" />
          <Stack.Screen name="caregiver-management" />
          <Stack.Screen name="notification-settings" />
          <Stack.Screen name="care-plan" />
          <Stack.Screen name="log-medication-plan-item" />
          <Stack.Screen name="vital-threshold-settings" />
          <Stack.Screen name="patient" />
          <Stack.Screen name="today-scope" />
          <Stack.Screen name="data-privacy-settings" />
          <Stack.Screen name="correlation-report" />
          <Stack.Screen name="log-note" />
          <Stack.Screen name="appointment-confirmation" />
          <Stack.Screen name="medication-confirm" />
          <Stack.Screen name="log-mood" />
          <Stack.Screen name="log-sleep" />
          <Stack.Screen name="log-activity" />
          <Stack.Screen name="quick-log-more" />
          <Stack.Screen name="guide-hub" />
          <Stack.Screen name="hub" />
          <Stack.Screen name="silent-vitals" />
          <Stack.Screen name="patient-questions" />
          <Stack.Screen name="dev/tenure-override" />
        </Stack>
        </PatientProvider>
      </WebContainer>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  webOuter: {
    flex: 1,
    backgroundColor: Colors.background, // Phase 0 page bg (#1f201c)
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  webInner: {
    flex: 1,
    backgroundColor: Colors.background,
    boxShadow: '0px 0px 30px rgba(0, 0, 0, 0.4)',
    // Add border radius for larger screens
    borderRadius: 0,
  },
  webInnerConstrained: {
    // Legacy style - no longer used but kept for compatibility
    maxWidth: 480,
  },
  lockScreen: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  lockIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  lockTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.textBright,
    marginBottom: 8,
  },
  lockSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 24,
  },
  lockButton: {
    backgroundColor: Colors.accent,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 40,
  },
  lockButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  lockAttempts: {
    fontSize: 13,
    color: Colors.amber,
    marginBottom: 12,
  },
  lockButtonDisabled: {
    backgroundColor: Colors.border,
    opacity: 0.6,
  },
  lockButtonTextDisabled: {
    color: Colors.textMuted,
  },
  integrityBanner: {
    backgroundColor: '#422006',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(251, 191, 36, 0.4)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  integrityText: {
    flex: 1,
    fontSize: 13,
    color: '#FDE68A',
    lineHeight: 18,
  },
  integrityDismiss: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#FCD34D',
  },
});

export default RootLayout;
