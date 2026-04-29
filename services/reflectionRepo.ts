// ============================================================================
// REFLECTION REPO
// You-tab reflection-card storage. One entry per calendar day with a mood
// (5-step scale) and optional free-text note. Same-day saves overwrite.
//
// Distinct from storage/reflectionStorage.ts — that module backs the
// Journal-tab daily reflection prompt (text + prompt). This module backs
// the You-tab reflection card (mood + text). Keys live under a separate
// prefix to avoid collisions.
//
// Storage: AsyncStorage via safeStorage. Keys with the `reflection_`
// prefix are transparently encrypted at rest (see utils/safeStorage.ts:13).
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  safeGetItem,
  safeSetItem,
} from '../utils/safeStorage';
import { logError } from '../utils/devLog';

// ============================================================================
// TYPES
// ============================================================================

export type ReflectionMood = 'rough' | 'low' | 'neutral' | 'okay' | 'good';

export interface ReflectionEntry {
  date: string;                 // YYYY-MM-DD
  mood: ReflectionMood | null;
  text: string | null;
  savedAt: string;              // ISO 8601
}

export interface SaveReflectionInput {
  date: string;
  mood: ReflectionMood | null;
  text: string | null;
}

// ============================================================================
// KEY HELPERS
// ============================================================================

// `reflection_` prefix routes through encrypted storage. Suffix is `card_`
// so it doesn't collide with the journal `reflection_${date}` keys.
const KEY_PREFIX = 'reflection_card_';

function reflectionKey(date: string): string {
  return `${KEY_PREFIX}${date}`;
}

function dateFromKey(key: string): string | null {
  if (!key.startsWith(KEY_PREFIX)) return null;
  return key.slice(KEY_PREFIX.length);
}

// ============================================================================
// OPERATIONS
// ============================================================================

/** Save (or overwrite) the reflection for `date`. Returns the persisted entry. */
export async function saveReflection(input: SaveReflectionInput): Promise<ReflectionEntry> {
  const entry: ReflectionEntry = {
    date: input.date,
    mood: input.mood,
    text: input.text,
    savedAt: new Date().toISOString(),
  };
  try {
    await safeSetItem(reflectionKey(input.date), entry);
  } catch (err) {
    logError('reflectionRepo.saveReflection', err);
    throw err;
  }
  return entry;
}

/** Fetch the reflection for `date`, or null if none exists. */
export async function getReflection(date: string): Promise<ReflectionEntry | null> {
  try {
    return await safeGetItem<ReflectionEntry | null>(reflectionKey(date), null);
  } catch (err) {
    logError('reflectionRepo.getReflection', err);
    return null;
  }
}

/**
 * Fetch every reflection whose date falls within [rangeStart, rangeEnd]
 * inclusive. Both bounds are YYYY-MM-DD. Result is sorted by date ascending.
 */
export async function getReflections(
  rangeStart: string,
  rangeEnd: string,
): Promise<ReflectionEntry[]> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const dates = keys
      .map(dateFromKey)
      .filter((d): d is string => d !== null && d >= rangeStart && d <= rangeEnd)
      .sort();

    const entries: ReflectionEntry[] = [];
    for (const date of dates) {
      const entry = await getReflection(date);
      if (entry) entries.push(entry);
    }
    return entries;
  } catch (err) {
    logError('reflectionRepo.getReflections', err);
    return [];
  }
}
