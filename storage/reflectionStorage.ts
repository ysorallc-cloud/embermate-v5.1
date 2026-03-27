// ============================================================================
// REFLECTION STORAGE — Per-day caregiver reflections
// Key pattern: reflection_{YYYY-MM-DD}
// ============================================================================

import { safeGetItem, safeSetItem } from '../utils/safeStorage';
import { logError } from '../utils/devLog';

// ============================================================================
// TYPES
// ============================================================================

export interface StoredReflection {
  date: string;       // YYYY-MM-DD
  text: string;
  prompt: string;
  savedAt: string;    // ISO 8601
}

// ============================================================================
// KEY HELPER
// ============================================================================

function reflectionKey(date: string): string {
  return `reflection_${date}`;
}

// ============================================================================
// OPERATIONS
// ============================================================================

export async function getReflection(date: string): Promise<StoredReflection | null> {
  try {
    return await safeGetItem<StoredReflection | null>(reflectionKey(date), null);
  } catch (err) {
    logError('reflectionStorage.getReflection', err);
    return null;
  }
}

export async function saveReflection(
  date: string,
  text: string,
  prompt: string
): Promise<StoredReflection> {
  const reflection: StoredReflection = {
    date,
    text,
    prompt,
    savedAt: new Date().toISOString(),
  };
  try {
    await safeSetItem(reflectionKey(date), reflection);
  } catch (err) {
    logError('reflectionStorage.saveReflection', err);
    throw err;
  }
  return reflection;
}
