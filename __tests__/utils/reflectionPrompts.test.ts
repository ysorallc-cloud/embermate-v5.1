// ============================================================================
// Reflection Prompts + Storage — Tests
// ============================================================================

import { getDailyPrompt, getAllPrompts } from '../../utils/reflectionPrompts';
import { getReflection, saveReflection } from '../../storage/reflectionStorage';

describe('reflectionPrompts', () => {
  it('has exactly 30 prompts', () => {
    expect(getAllPrompts()).toHaveLength(30);
  });

  it('all prompts are non-empty strings', () => {
    for (const p of getAllPrompts()) {
      expect(typeof p).toBe('string');
      expect(p.length).toBeGreaterThan(10);
    }
  });

  it('getDailyPrompt returns a prompt for any date', () => {
    expect(getDailyPrompt('2026-03-01').length).toBeGreaterThan(0);
    expect(getDailyPrompt('2026-03-15').length).toBeGreaterThan(0);
    expect(getDailyPrompt('2026-03-30').length).toBeGreaterThan(0);
  });

  it('getDailyPrompt cycles: day 1 and day 31 return the same prompt', () => {
    expect(getDailyPrompt('2026-03-01')).toBe(getDailyPrompt('2026-03-31'));
  });

  it('different days return different prompts', () => {
    const p1 = getDailyPrompt('2026-03-01');
    const p2 = getDailyPrompt('2026-03-02');
    expect(p1).not.toBe(p2);
  });

  it('prompts are warm and non-clinical (no medical jargon)', () => {
    const all = getAllPrompts();
    const medicalTerms = ['diagnosis', 'symptom', 'medication', 'prescription', 'HIPAA', 'clinical'];
    for (const p of all) {
      for (const term of medicalTerms) {
        expect(p.toLowerCase()).not.toContain(term);
      }
    }
  });
});

describe('reflectionStorage', () => {
  it('getReflection returns null when no reflection exists', async () => {
    const result = await getReflection('2026-01-01');
    expect(result).toBeNull();
  });

  it('saveReflection stores and getReflection retrieves', async () => {
    const date = '2026-03-26';
    const saved = await saveReflection(date, 'Today was tough but good.', 'How are you feeling?');
    expect(saved.date).toBe(date);
    expect(saved.text).toBe('Today was tough but good.');
    expect(saved.prompt).toBe('How are you feeling?');
    expect(saved.savedAt).toBeDefined();

    const retrieved = await getReflection(date);
    expect(retrieved).not.toBeNull();
    expect(retrieved!.text).toBe('Today was tough but good.');
  });

  it('saveReflection overwrites existing reflection for same date', async () => {
    const date = '2026-03-27';
    await saveReflection(date, 'First version', 'Prompt 1');
    await saveReflection(date, 'Updated version', 'Prompt 1');
    const retrieved = await getReflection(date);
    expect(retrieved!.text).toBe('Updated version');
  });
});
