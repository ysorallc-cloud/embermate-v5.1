// ============================================================================
// STREAK STORAGE
// Track and manage streaks for wellness checks, medications, vitals, self-care
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { StreakData, Achievement, DEFAULT_STREAK_DATA, ACHIEVEMENTS } from '../types/streaks';
import { format, subDays } from 'date-fns';

const STREAKS_KEY = '@EmberMate:streaks';
const ACHIEVEMENTS_KEY = '@EmberMate:achievements';

// ============================================
// STREAK MANAGEMENT
// ============================================

/**
 * Get all streaks
 */
export const getStreaks = async (): Promise<StreakData> => {
  try {
    const data = await AsyncStorage.getItem(STREAKS_KEY);
    return data ? JSON.parse(data) : DEFAULT_STREAK_DATA;
  } catch (error) {
    console.error('Error getting streaks:', error);
    return DEFAULT_STREAK_DATA;
  }
};

/**
 * Save streaks
 */
export const saveStreaks = async (streaks: StreakData): Promise<void> => {
  try {
    await AsyncStorage.setItem(STREAKS_KEY, JSON.stringify(streaks));
  } catch (error) {
    console.error('Error saving streaks:', error);
  }
};

/**
 * Update a specific streak type
 */
export const updateStreak = async (type: keyof StreakData): Promise<void> => {
  const streaks = await getStreaks();
  const today = format(new Date(), 'yyyy-MM-dd');
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');

  const streak = streaks[type];

  if (streak.lastDate === today) {
    // Already updated today
    return;
  }

  if (streak.lastDate === yesterday) {
    // Continue streak
    streak.current += 1;
    streak.longest = Math.max(streak.longest, streak.current);
  } else {
    // Reset streak (missed a day)
    streak.current = 1;
  }

  streak.lastDate = today;

  await saveStreaks(streaks);

  // Check for new achievements
  await checkAndAwardAchievements(type, streak.current);
};

/**
 * Reset a streak (when a day is missed)
 */
export const resetStreak = async (type: keyof StreakData): Promise<void> => {
  const streaks = await getStreaks();
  streaks[type].current = 0;
  await saveStreaks(streaks);
};

// ============================================
// ACHIEVEMENTS
// ============================================

/**
 * Get all earned achievements
 */
export const getAchievements = async (): Promise<Achievement[]> => {
  try {
    const data = await AsyncStorage.getItem(ACHIEVEMENTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting achievements:', error);
    return [];
  }
};

/**
 * Check and award achievements based on streak count
 */
const checkAndAwardAchievements = async (type: string, count: number): Promise<void> => {
  const thresholds = [3, 7, 14, 30];

  for (const threshold of thresholds) {
    if (count === threshold) {
      const achievementId = `${type.toUpperCase()}_${threshold}`;
      const achievementDef = ACHIEVEMENTS[achievementId as keyof typeof ACHIEVEMENTS];

      if (achievementDef) {
        await awardAchievement(achievementId, achievementDef);
      }
    }
  }
};

/**
 * Award an achievement
 */
const awardAchievement = async (
  achievementId: string,
  achievementDef: typeof ACHIEVEMENTS[keyof typeof ACHIEVEMENTS]
): Promise<void> => {
  try {
    const achievements = await getAchievements();

    // Check if already awarded
    if (achievements.some((a) => a.id === achievementId)) {
      return;
    }

    const newAchievement: Achievement = {
      id: achievementId,
      type: achievementId.split('_')[0].toLowerCase(),
      name: achievementDef.name,
      description: achievementDef.description,
      icon: achievementDef.icon,
      earnedAt: new Date().toISOString(),
      tier: achievementDef.tier,
    };

    achievements.push(newAchievement);
    await AsyncStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(achievements));

    // Trigger celebration (could be a notification or in-app animation)
    await triggerCelebration(newAchievement);
  } catch (error) {
    console.error('Error awarding achievement:', error);
  }
};

/**
 * Trigger celebration for new achievement
 * This could show a modal, send a notification, or play an animation
 */
const triggerCelebration = async (achievement: Achievement): Promise<void> => {
  console.log(`🎉 Achievement unlocked: ${achievement.name} ${achievement.icon}`);
  // TODO: Show celebration modal or animation
};

/**
 * Get achievements by type
 */
export const getAchievementsByType = async (type: string): Promise<Achievement[]> => {
  const achievements = await getAchievements();
  return achievements.filter((a) => a.type === type);
};

/**
 * Get recent achievements (last 7 days)
 */
export const getRecentAchievements = async (days: number = 7): Promise<Achievement[]> => {
  const achievements = await getAchievements();
  const cutoff = subDays(new Date(), days);

  return achievements.filter((a) => new Date(a.earnedAt) >= cutoff);
};

// ============================================
// STATS
// ============================================

/**
 * Get streak stats summary
 */
export const getStreakStats = async () => {
  const streaks = await getStreaks();
  const achievements = await getAchievements();

  return {
    totalStreaks: Object.values(streaks).reduce((sum, s) => sum + s.current, 0),
    longestStreak: Math.max(...Object.values(streaks).map((s) => s.longest)),
    totalAchievements: achievements.length,
    recentAchievements: await getRecentAchievements(7),
  };
};
