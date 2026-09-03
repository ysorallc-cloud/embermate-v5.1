// ============================================================================
// LOG EVENTS — SPRINT 1 TESTS
// Tests for MealEvent enrichment fields (amountConsumed, assistanceLevel)
//
// Appetite-half-feature removal — the appetite enrichment field (and its
// dedicated "appetite option values" coverage) was removed: no writer/UI
// ever set it in the live app (logMeal itself has zero live callers), and
// every reader of it across the app was dead weight. See
// project_appetite_dormant_half_feature memory. amountConsumed and
// assistanceLevel are unaffected — same dormant status, but out of scope
// for this removal.
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  logMeal,
  getLogEvents,
  MealEvent,
} from '../logEvents';

describe('logEvents — Sprint 1 MealEvent enrichment', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  // ==========================================================================
  // logMeal with new fields
  // ==========================================================================

  describe('logMeal with enrichment fields', () => {
    it('should log a meal with amountConsumed field', async () => {
      const event = await logMeal('Lunch', {
        amountConsumed: 'half',
      });
      expect(event.amountConsumed).toBe('half');
    });

    it('should log a meal with assistanceLevel field', async () => {
      const event = await logMeal('Dinner', {
        assistanceLevel: 'verbal',
      });
      expect(event.assistanceLevel).toBe('verbal');
    });

    it('should log a meal with all enrichment fields together', async () => {
      const event = await logMeal('Lunch', {
        description: 'Grilled chicken and rice',
        amountConsumed: 'most',
        assistanceLevel: 'independent',
      });
      expect(event.amountConsumed).toBe('most');
      expect(event.assistanceLevel).toBe('independent');
      expect(event.description).toBe('Grilled chicken and rice');
    });

    it('should log a meal without enrichment fields (backwards compatible)', async () => {
      const event = await logMeal('Snack', {
        description: 'Apple slices',
      });
      expect(event.amountConsumed).toBeUndefined();
      expect(event.assistanceLevel).toBeUndefined();
      expect(event.description).toBe('Apple slices');
    });

    it('should log a meal with no options at all', async () => {
      const event = await logMeal('Breakfast');
      expect(event.type).toBe('meal');
      expect(event.mealType).toBe('Breakfast');
      expect(event.id).toBeDefined();
      expect(event.timestamp).toBeDefined();
    });
  });

  // ==========================================================================
  // Persistence of enrichment fields
  // ==========================================================================

  describe('persistence of enrichment fields', () => {
    it('should persist and retrieve enrichment fields from storage', async () => {
      await logMeal('Dinner', {
        amountConsumed: 'little',
        assistanceLevel: 'full',
      });

      const events = await getLogEvents();
      expect(events.length).toBe(1);

      const meal = events[0] as MealEvent;
      expect(meal.type).toBe('meal');
      expect(meal.amountConsumed).toBe('little');
      expect(meal.assistanceLevel).toBe('full');
    });

    it('should persist multiple meals with different enrichment values', async () => {
      await logMeal('Breakfast', { amountConsumed: 'all' });
      await logMeal('Lunch', { amountConsumed: 'half' });
      await logMeal('Dinner', { amountConsumed: 'none' });

      const events = await getLogEvents();
      const meals = events.filter(e => e.type === 'meal') as MealEvent[];
      expect(meals.length).toBe(3);

      expect(meals[0].amountConsumed).toBe('all');
      expect(meals[1].amountConsumed).toBe('half');
      expect(meals[2].amountConsumed).toBe('none');
    });
  });

  // ==========================================================================
  // Amount consumed option values
  // ==========================================================================

  describe('amountConsumed option values', () => {
    const amountValues: Array<'all' | 'most' | 'half' | 'little' | 'none'> = [
      'all', 'most', 'half', 'little', 'none',
    ];

    amountValues.forEach(value => {
      it(`should accept amountConsumed value: ${value}`, async () => {
        const event = await logMeal('Dinner', { amountConsumed: value });
        expect(event.amountConsumed).toBe(value);
      });
    });
  });

  // ==========================================================================
  // Assistance level option values
  // ==========================================================================

  describe('assistanceLevel option values', () => {
    const assistanceValues: Array<'independent' | 'verbal' | 'partial' | 'full'> = [
      'independent', 'verbal', 'partial', 'full',
    ];

    assistanceValues.forEach(value => {
      it(`should accept assistanceLevel value: ${value}`, async () => {
        const event = await logMeal('Breakfast', { assistanceLevel: value });
        expect(event.assistanceLevel).toBe(value);
      });
    });
  });

  // ==========================================================================
  // Audit trail preserved with enrichment
  // ==========================================================================

  describe('audit trail with enrichment fields', () => {
    it('should preserve audit metadata alongside enrichment fields', async () => {
      const event = await logMeal('Lunch', {
        amountConsumed: 'all',
        assistanceLevel: 'independent',
        audit: {
          source: 'record',
          action: 'direct_tap',
        },
      });

      expect(event.amountConsumed).toBe('all');
      expect(event.audit?.source).toBe('record');
      expect(event.audit?.action).toBe('direct_tap');
    });
  });
});
