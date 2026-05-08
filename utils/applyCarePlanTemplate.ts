// ============================================================================
// applyCarePlanTemplate — Phase 5.13.c.
//
// Pure config-writing helper extracted from app/care-plan/index.tsx so the
// wizard's step 2 and Care Plan home both call the same apply path.
//
// Behaviour mirrors the legacy useCallback exactly:
//   1. Disable buckets that are NOT in template.enabledBuckets.
//   2. Enable each bucket that IS in template.enabledBuckets, applying
//      its suggestedSettings (priority, timesOfDay, vitalTypes, etc.).
//   3. Surface the template back via `pendingMedSeeding` when it carries
//      suggestedMedications, so the caller (component) decides whether
//      to mount the TemplateMedSeedingModal. UI side effects stay in
//      components — this util touches storage only.
// ============================================================================

import {
  setBucketEnabled,
  updateBucketConfig,
  setAppliedTemplateId,
} from '../storage/carePlanConfigRepo';
import {
  BUCKET_TYPES,
  type BucketType,
} from '../types/carePlanConfig';
import type { CarePlanTemplate } from '../constants/carePlanTemplates';
import { logError } from './devLog';

export interface ApplyTemplateResult {
  configWritten: boolean;
  /**
   * The template, returned when it carries suggestedMedications, so the
   * caller can decide whether to mount the medication-seeding modal.
   */
  pendingMedSeeding?: CarePlanTemplate;
}

const DEFAULT_PATIENT_ID = 'default';

export async function applyCarePlanTemplate(
  template: CarePlanTemplate,
  patientId: string = DEFAULT_PATIENT_ID,
): Promise<ApplyTemplateResult> {
  try {
    const enabledSet = new Set<BucketType>(template.enabledBuckets);

    // Disable everything the template doesn't include.
    for (const bucket of BUCKET_TYPES) {
      if (!enabledSet.has(bucket)) {
        await setBucketEnabled(patientId, bucket, false);
      }
    }

    // Enable + configure included buckets.
    for (const bucket of template.enabledBuckets) {
      await setBucketEnabled(patientId, bucket, true);
      const suggestion = template.suggestedSettings[bucket];
      if (!suggestion) continue;

      const updates: Record<string, any> = {};
      if (suggestion.priority) updates.priority = suggestion.priority;
      if (suggestion.timesOfDay) updates.timesOfDay = suggestion.timesOfDay;
      if (suggestion.vitalTypes) updates.vitalTypes = suggestion.vitalTypes;
      if (suggestion.frequency) updates.frequency = suggestion.frequency;
      if (suggestion.trackingStyle) updates.trackingStyle = suggestion.trackingStyle;
      if (suggestion.dailyGoalGlasses) updates.dailyGoalGlasses = suggestion.dailyGoalGlasses;

      if (Object.keys(updates).length > 0) {
        await updateBucketConfig(patientId, bucket, updates);
      }
    }

    // Phase 5.13.2 — stamp the picked template id so the Now-tab welcome
    // card can echo "Aging in Place template applied" back to the user.
    await setAppliedTemplateId(patientId, template.id);

    const pendingMedSeeding =
      template.suggestedMedications && template.suggestedMedications.length > 0
        ? template
        : undefined;

    return { configWritten: true, pendingMedSeeding };
  } catch (error) {
    logError('applyCarePlanTemplate', error);
    throw error;
  }
}
