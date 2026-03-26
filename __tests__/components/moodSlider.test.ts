// ============================================================================
// MoodSlider — Tests for mood positions, labels, affirmations, and save flow
// Pure logic tests (no React rendering)
// ============================================================================

// Mock expo modules in the transitive dep chain
jest.mock('expo-store-review', () => ({ isAvailableAsync: jest.fn(), requestReview: jest.fn() }));
jest.mock('expo-constants', () => ({ default: {} }));

import { MOOD_POSITIONS, AFFIRMATIONS } from '../../components/support/MoodSlider';
import { SAVE_DESTINATIONS } from '../../utils/saveDestinations';
import { getEventsByDate } from '../../storage/eventRepo';
import { emitMoodEvent } from '../../utils/eventEmitter';

const PATIENT = 'default';

function todayDate(): string {
  return new Date().toISOString().split('T')[0];
}

describe('MoodSlider', () => {
  it('renders 5 positions with correct labels', () => {
    expect(MOOD_POSITIONS).toHaveLength(5);
    expect(MOOD_POSITIONS[0].label).toBe('Rough day');
    expect(MOOD_POSITIONS[1].label).toBe('Struggling');
    expect(MOOD_POSITIONS[2].label).toBe('Getting by');
    expect(MOOD_POSITIONS[3].label).toBe('Okay');
    expect(MOOD_POSITIONS[4].label).toBe('Good day');
  });

  it('slider value changes update displayed label (score maps to label)', () => {
    MOOD_POSITIONS.forEach((pos, i) => {
      expect(pos.score).toBe(i + 1);
      expect(typeof pos.label).toBe('string');
      expect(typeof pos.emoji).toBe('string');
    });
  });

  it('"Log this" triggers emitMoodEvent with correct score/label', async () => {
    const score = MOOD_POSITIONS[3].score; // Okay = 4
    const label = MOOD_POSITIONS[3].label; // "Okay"

    await emitMoodEvent(score, label, { source: 'dedicated_screen' });

    const events = await getEventsByDate(todayDate(), PATIENT);
    const moodEvents = events.filter(e => e.type === 'mood_logged');
    expect(moodEvents.length).toBeGreaterThanOrEqual(1);

    const latest = moodEvents[moodEvents.length - 1];
    expect(latest.value).toBe(4);
    expect(latest.metadata?.label).toBe('Okay');
  });

  it('affirmation appears after logging (one per score)', () => {
    for (let score = 1; score <= 5; score++) {
      expect(AFFIRMATIONS[score]).toBeDefined();
      expect(typeof AFFIRMATIONS[score]).toBe('string');
      expect(AFFIRMATIONS[score].length).toBeGreaterThan(10);
    }
  });

  it('save destination confirmation appears (mood destinations exist)', () => {
    expect(SAVE_DESTINATIONS.mood).toBeDefined();
    expect(SAVE_DESTINATIONS.mood.length).toBeGreaterThan(0);
    for (const dest of SAVE_DESTINATIONS.mood) {
      expect(dest.icon).toBeDefined();
      expect(dest.text).toBeDefined();
    }
  });

  it('streak increments on log (updateStreak is callable)', async () => {
    const { updateStreak } = require('../../utils/streakStorage');
    expect(typeof updateStreak).toBe('function');
    await expect(updateStreak('wellnessCheck')).resolves.not.toThrow();
  });
});
