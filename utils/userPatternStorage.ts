// ============================================================================
// USER PATTERN STORAGE
// Stores user-defined quick action patterns and preferences
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface UserPattern {
  id: string;
  name: string;
  icon: string;
  timeRange?: { start: string; end: string }; // e.g., "06:00-10:00"
  includes: {
    vitals: boolean;
    medications: boolean;
    mood: boolean;
    notes: boolean;
  };
  defaults?: {
    systolic?: number;
    diastolic?: number;
    heartRate?: number;
    mood?: number;
    energy?: number;
    pain?: number;
  };
  frequency?: 'daily' | 'weekly' | 'asNeeded';
  lastUsed?: string;
  usageCount: number;
}

export interface UserPreferences {
  defaultSections: string[];
  collapsedByDefault: boolean;
  autoFillFromSchedule: boolean;
  showQuickActions: boolean;
}

const PATTERNS_KEY = '@embermate_user_patterns';
const PREFERENCES_KEY = '@embermate_user_preferences';

// Default patterns provided for new users
const DEFAULT_PATTERNS: UserPattern[] = [
  {
    id: 'morning-routine',
    name: 'Morning Done',
    icon: '🌅',
    timeRange: { start: '05:00', end: '11:00' },
    includes: { vitals: true, medications: true, mood: true, notes: false },
    defaults: { mood: 7, energy: 3, pain: 0 },
    frequency: 'daily',
    usageCount: 0,
  },
  {
    id: 'evening-meds',
    name: 'Evening Meds',
    icon: '🌙',
    timeRange: { start: '17:00', end: '23:00' },
    includes: { vitals: false, medications: true, mood: true, notes: false },
    defaults: { mood: 6, energy: 2, pain: 0 },
    frequency: 'daily',
    usageCount: 0,
  },
  {
    id: 'vitals-only',
    name: 'Vitals Only',
    icon: '❤️',
    includes: { vitals: true, medications: false, mood: false, notes: false },
    frequency: 'asNeeded',
    usageCount: 0,
  },
  {
    id: 'feeling-check',
    name: 'Feeling Check',
    icon: '😊',
    includes: { vitals: false, medications: false, mood: true, notes: true },
    defaults: { mood: 7, energy: 3, pain: 0 },
    frequency: 'asNeeded',
    usageCount: 0,
  },
];

const DEFAULT_PREFERENCES: UserPreferences = {
  defaultSections: ['medications', 'vitals', 'mood', 'notes'],
  collapsedByDefault: true,
  autoFillFromSchedule: true,
  showQuickActions: true,
};

/**
 * Get all user patterns
 */
export async function getUserPatterns(): Promise<UserPattern[]> {
  try {
    const data = await AsyncStorage.getItem(PATTERNS_KEY);
    if (!data) {
      // Return default patterns for first-time users
      await AsyncStorage.setItem(PATTERNS_KEY, JSON.stringify(DEFAULT_PATTERNS));
      return DEFAULT_PATTERNS;
    }
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading user patterns:', error);
    return DEFAULT_PATTERNS;
  }
}

/**
 * Create a new user pattern
 */
export async function createUserPattern(
  pattern: Omit<UserPattern, 'id' | 'usageCount'>
): Promise<UserPattern> {
  try {
    const patterns = await getUserPatterns();
    const newPattern: UserPattern = {
      ...pattern,
      id: `custom-${Date.now()}`,
      usageCount: 0,
    };
    patterns.push(newPattern);
    await AsyncStorage.setItem(PATTERNS_KEY, JSON.stringify(patterns));
    return newPattern;
  } catch (error) {
    console.error('Error creating user pattern:', error);
    throw error;
  }
}

/**
 * Update pattern usage statistics
 */
export async function updatePatternUsage(patternId: string): Promise<void> {
  try {
    const patterns = await getUserPatterns();
    const index = patterns.findIndex(p => p.id === patternId);
    if (index !== -1) {
      patterns[index].usageCount += 1;
      patterns[index].lastUsed = new Date().toISOString();
      await AsyncStorage.setItem(PATTERNS_KEY, JSON.stringify(patterns));
    }
  } catch (error) {
    console.error('Error updating pattern usage:', error);
  }
}

/**
 * Get suggested patterns for the current time
 */
export async function suggestPatternsForTime(time: Date = new Date()): Promise<UserPattern[]> {
  try {
    const patterns = await getUserPatterns();
    const currentHour = time.getHours();
    const currentTimeStr = `${currentHour.toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`;

    // Filter patterns that match the current time range
    const timeRelevant = patterns.filter(pattern => {
      if (!pattern.timeRange) return true;
      const { start, end } = pattern.timeRange;
      return currentTimeStr >= start && currentTimeStr <= end;
    });

    // Sort by usage count (most used first) and recency
    return timeRelevant.sort((a, b) => {
      // Prioritize time-specific patterns
      const aHasTime = a.timeRange ? 1 : 0;
      const bHasTime = b.timeRange ? 1 : 0;
      if (aHasTime !== bHasTime) return bHasTime - aHasTime;

      // Then by usage count
      return b.usageCount - a.usageCount;
    });
  } catch (error) {
    console.error('Error suggesting patterns:', error);
    return [];
  }
}

/**
 * Get user preferences
 */
export async function getUserPreferences(): Promise<UserPreferences> {
  try {
    const data = await AsyncStorage.getItem(PREFERENCES_KEY);
    if (!data) {
      await AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(DEFAULT_PREFERENCES));
      return DEFAULT_PREFERENCES;
    }
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading user preferences:', error);
    return DEFAULT_PREFERENCES;
  }
}

/**
 * Update user preferences
 */
export async function updateUserPreferences(
  updates: Partial<UserPreferences>
): Promise<UserPreferences> {
  try {
    const prefs = await getUserPreferences();
    const updated = { ...prefs, ...updates };
    await AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(updated));
    return updated;
  } catch (error) {
    console.error('Error updating user preferences:', error);
    throw error;
  }
}

/**
 * Delete a user pattern
 */
export async function deleteUserPattern(patternId: string): Promise<void> {
  try {
    const patterns = await getUserPatterns();
    const filtered = patterns.filter(p => p.id !== patternId);
    await AsyncStorage.setItem(PATTERNS_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error deleting user pattern:', error);
    throw error;
  }
}
