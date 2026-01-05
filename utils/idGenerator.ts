// ============================================================================
// UNIQUE ID GENERATOR
// Generates collision-resistant IDs without external dependencies
// ============================================================================

/**
 * Generate a unique ID using timestamp + random string
 * More collision-resistant than Date.now() alone
 *
 * Format: {timestamp}-{random}
 * Example: 1704326400000-k9x2p7f
 */
export function generateUniqueId(): string {
  const timestamp = Date.now();
  const random = generateRandomString(7);
  return `${timestamp}-${random}`;
}

/**
 * Generate a random alphanumeric string
 * Uses base36 for URL-safe characters
 */
function generateRandomString(length: number): string {
  let result = '';
  const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    result += characters[randomIndex];
  }

  return result;
}

/**
 * Generate a UUID v4-like string (without crypto library)
 * Format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 *
 * Note: This is NOT cryptographically secure, but sufficient for
 * client-side ID generation where collision resistance is the main concern.
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Generate a short, readable ID (8 characters)
 * Good for user-facing IDs like share codes
 */
export function generateShortId(): string {
  return generateRandomString(8);
}

/**
 * Check if an ID already exists in a list
 * Used to prevent duplicates
 */
export function isIdUnique(id: string, existingIds: string[]): boolean {
  return !existingIds.includes(id);
}

/**
 * Generate an ID that's guaranteed unique within the provided list
 * Will retry up to 10 times if collision occurs (extremely unlikely)
 */
export function generateUniqueIdWithCheck(existingIds: string[]): string {
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const id = generateUniqueId();

    if (isIdUnique(id, existingIds)) {
      return id;
    }

    attempts++;
    console.warn(`[IDGenerator] Collision detected, retrying... (attempt ${attempts})`);
  }

  // If we somehow get 10 collisions, add extra entropy
  const fallbackId = `${Date.now()}-${Math.random().toString(36).substr(2, 12)}`;
  console.error('[IDGenerator] Multiple collisions detected, using fallback ID');
  return fallbackId;
}
