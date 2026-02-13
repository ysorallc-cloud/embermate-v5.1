// ============================================================================
// useNowPrompts - Manages prompt/baseline/onboarding state for Now page
// ============================================================================

import { useState, useCallback, useEffect } from 'react';
import { logError } from '../utils/devLog';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import type { TodayStats } from '../utils/nowHelpers';
import {
  getOrientationPrompt,
  getRegulationPrompt,
  getClosurePrompt,
  recordAppOpen,
  getHoursSinceLastOpen,
  isFirstOpenOfDay,
  isRapidNavigation,
  recordNavigation,
  dismissPrompt,
  isPromptDismissed,
  isOnboardingComplete,
  completeOnboarding,
  shouldShowNotificationPrompt,
  dismissNotificationPrompt,
  type OrientationPrompt as OrientationPromptType,
  type RegulationPrompt as RegulationPromptType,
} from '../utils/promptSystem';
import {
  shouldShowWelcomeBanner,
  dismissWelcomeBanner,
} from '../utils/lastVisitTracker';
import {
  getAllBaselines,
  getAllTodayVsBaseline,
  getNextBaselineToConfirm,
  confirmBaseline,
  rejectBaseline,
  dismissBaselinePrompt,
  type BaselineData,
  type TodayVsBaseline,
  type BaselineCategory,
  type CategoryBaseline,
  getBaselineLanguage,
} from '../utils/baselineStorage';

export function useNowPrompts(todayStats: TodayStats, dailyTracking: any) {
  const router = useRouter();

  // Prompt system state
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showNotificationPrompt, setShowNotificationPromptState] = useState(false);
  const [orientationPrompt, setOrientationPrompt] = useState<OrientationPromptType | null>(null);
  const [regulationPrompt, setRegulationPrompt] = useState<RegulationPromptType | null>(null);
  const [showClosure, setShowClosure] = useState(false);
  const [closureMessage, setClosureMessage] = useState('');
  const [showWelcomeBanner, setShowWelcomeBanner] = useState(false);

  // Baseline state
  const [baselineData, setBaselineData] = useState<BaselineData | null>(null);
  const [todayVsBaseline, setTodayVsBaseline] = useState<TodayVsBaseline[]>([]);
  const [baselineToConfirm, setBaselineToConfirm] = useState<{
    category: BaselineCategory;
    baseline: CategoryBaseline;
  } | null>(null);

  // Check for onboarding, notification prompt, and welcome banner on mount
  useEffect(() => {
    checkOnboarding();
    checkNotificationPrompt();
    checkWelcomeBanner();
  }, []);

  const checkOnboarding = async () => {
    const complete = await isOnboardingComplete();
    setShowOnboarding(!complete);
  };

  const checkNotificationPrompt = async () => {
    const shouldShow = await shouldShowNotificationPrompt();
    setShowNotificationPromptState(shouldShow);
  };

  const checkWelcomeBanner = async () => {
    const shouldShow = await shouldShowWelcomeBanner();
    setShowWelcomeBanner(shouldShow);
  };

  const handleDismissBanner = async () => {
    await dismissWelcomeBanner();
    setShowWelcomeBanner(false);
  };

  const handleShowMeWhatMatters = async () => {
    await completeOnboarding();
    setShowOnboarding(false);
    router.push('/(tabs)/journal');
  };

  const handleExploreOnMyOwn = async () => {
    await completeOnboarding();
    setShowOnboarding(false);
  };

  const handleEnableNotifications = async () => {
    await dismissNotificationPrompt();
    setShowNotificationPromptState(false);

    const { status } = await Notifications.requestPermissionsAsync();
    if (status === 'granted') {
      router.push('/notification-settings');
    }
  };

  const handleNotNowNotifications = async () => {
    await dismissNotificationPrompt();
    setShowNotificationPromptState(false);
  };

  const handleDismissRegulation = async () => {
    await dismissPrompt('regulation');
    setRegulationPrompt(null);
  };

  // Baseline confirmation handlers
  const handleBaselineYes = async () => {
    if (baselineToConfirm) {
      await confirmBaseline(baselineToConfirm.category);
      setBaselineToConfirm(null);
      const next = await getNextBaselineToConfirm();
      setBaselineToConfirm(next);
    }
  };

  const handleBaselineNotReally = async () => {
    if (baselineToConfirm) {
      await rejectBaseline(baselineToConfirm.category);
      setBaselineToConfirm(null);
      const next = await getNextBaselineToConfirm();
      setBaselineToConfirm(next);
    }
  };

  const handleBaselineDismiss = async () => {
    if (baselineToConfirm) {
      await dismissBaselinePrompt(baselineToConfirm.category);
      setBaselineToConfirm(null);
      const next = await getNextBaselineToConfirm();
      setBaselineToConfirm(next);
    }
  };

  // Generate baseline status messages
  const getBaselineStatusMessage = (comparison: TodayVsBaseline): { main: string; sub?: string } | null => {
    const { category, baseline, today, matchesBaseline, belowBaseline } = comparison;

    // Get confidence level from baselineData
    let categoryBaseline: CategoryBaseline | null = null;
    if (baselineData) {
      switch (category) {
        case 'meals':
          categoryBaseline = baselineData.meals;
          break;
        case 'vitals':
          categoryBaseline = baselineData.vitals;
          break;
        case 'meds':
          categoryBaseline = baselineData.meds;
          break;
      }
    }

    if (!categoryBaseline || categoryBaseline.confidence === 'none') return null;

    const { adverb } = getBaselineLanguage(categoryBaseline.confidence);
    const isConfident = categoryBaseline.confidence === 'confident';

    if (matchesBaseline) {
      switch (category) {
        case 'meals':
          return { main: isConfident ? 'Meals are on your usual routine today.' : `Meals match your ${adverb} pattern.` };
        case 'vitals':
          return { main: isConfident ? 'Vitals match your normal daily pattern.' : `Vitals are on track so far.` };
        case 'meds':
          return { main: isConfident ? 'Medications are on your usual routine.' : `Medications are going as ${adverb}.` };
        default:
          return null;
      }
    }

    if (belowBaseline) {
      switch (category) {
        case 'meals':
          return {
            main: `Meals are lower than ${adverb} so far today.`,
            sub: "That's okay. You can update this anytime.",
          };
        case 'vitals':
          return {
            main: `Vitals are lower than ${adverb} so far today.`,
            sub: "That's okay. You can update this anytime.",
          };
        case 'meds':
          return {
            main: `Medications are behind ${adverb} today.`,
            sub: "That's okay. You can update this anytime.",
          };
        default:
          return null;
      }
    }

    return null;
  };

  // Compute prompts based on current state
  const computePrompts = useCallback(async (stats: TodayStats, moodLevel: number | null) => {
    try {
      recordNavigation();

      const hoursSinceOpen = await getHoursSinceLastOpen();
      const firstOpen = await isFirstOpenOfDay();
      const rapid = isRapidNavigation();

      const pendingCount =
        (stats.meds.total - stats.meds.completed) +
        (stats.vitals.total - stats.vitals.completed) +
        (stats.meals.total - stats.meals.completed);

      const overdueCount = pendingCount;

      // 1. Check for CLOSURE (all done)
      const allComplete =
        stats.meds.completed >= stats.meds.total &&
        stats.vitals.completed >= stats.vitals.total &&
        stats.meals.completed >= stats.meals.total;

      if (allComplete && stats.meds.total + stats.vitals.total + stats.meals.total > 0) {
        const closure = getClosurePrompt();
        setClosureMessage(closure.message);
        setShowClosure(true);
        setOrientationPrompt(null);
        setRegulationPrompt(null);
        return;
      } else {
        setShowClosure(false);
      }

      // 2. Check for REGULATION prompt
      const regDismissed = await isPromptDismissed('regulation');
      if (!regDismissed) {
        const reg = getRegulationPrompt(overdueCount, moodLevel, rapid, hoursSinceOpen);
        if (reg) {
          setRegulationPrompt(reg);
        } else {
          setRegulationPrompt(null);
        }
      } else {
        setRegulationPrompt(null);
      }

      // 3. Set ORIENTATION prompt
      if (firstOpen || hoursSinceOpen >= 12) {
        const orientation = getOrientationPrompt(pendingCount, firstOpen);
        setOrientationPrompt(orientation);
      } else {
        setOrientationPrompt(null);
      }

      await recordAppOpen();
    } catch (error) {
      logError('useNowPrompts.computePrompts', error);
    }
  }, []);

  // Load baseline data
  const loadBaselines = async () => {
    const baselines = await getAllBaselines();
    setBaselineData(baselines);

    if (baselines.hasAnyBaseline) {
      const comparisons = await getAllTodayVsBaseline();
      setTodayVsBaseline(comparisons);
    }

    const toConfirm = await getNextBaselineToConfirm();
    setBaselineToConfirm(toConfirm);
  };

  return {
    showOnboarding,
    showClosure,
    closureMessage,
    orientationPrompt,
    regulationPrompt,
    showNotificationPrompt,
    showWelcomeBanner,
    baselineToConfirm,
    todayVsBaseline,
    baselineData,
    handleShowMeWhatMatters,
    handleExploreOnMyOwn,
    handleEnableNotifications,
    handleNotNowNotifications,
    handleDismissRegulation,
    handleDismissBanner,
    handleBaselineYes,
    handleBaselineNotReally,
    handleBaselineDismiss,
    getBaselineStatusMessage,
    computePrompts,
    checkNotificationPrompt,
    loadBaselines,
  };
}
