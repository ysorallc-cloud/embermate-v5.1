// ============================================================================
// Caregiver Wellness Sub-Page — Structure and data flow tests
// ============================================================================

import * as fs from 'fs';
import * as path from 'path';
import { saveEvent, getEventsByDateRange } from '../../storage/eventRepo';

const screenPath = path.resolve(__dirname, '../../app/caregiver-wellness.tsx');
const screenContent = fs.readFileSync(screenPath, 'utf-8');

function todayDate(): string {
  return new Date().toISOString().split('T')[0];
}

describe('Caregiver Wellness sub-page', () => {
  it('page loads (file exists with default export)', () => {
    expect(screenContent).toContain('export default function CaregiverWellnessScreen');
  });

  it('shows the v6.7 timeline section ("How the week felt")', () => {
    // Replaces the old "MOOD HISTORY" header in the v6.7 reframe.
    expect(screenContent).toContain('HOW THE WEEK FELT');
    expect(screenContent).toContain('mood_logged');
  });

  it('breathing session count surfaces inside the rhythm card', () => {
    // The standalone "BREATHING SESSIONS" card was retired; the count now
    // shows in the rhythm row alongside time-since-last-check-in.
    expect(screenContent).toContain('YOUR RHYTHM');
    expect(screenContent).toContain('breathing_exercise');
    expect(screenContent).toContain('sessions in 30d');
  });

  it('has range toggle (7d, 14d, 30d)', () => {
    expect(screenContent).toContain('setRange');
    expect(screenContent).toContain('7');
    expect(screenContent).toContain('14');
    expect(screenContent).toContain('30');
  });

  it('uses SubScreenHeader with serif variant (Phase 29 Batch C F3 — lowercase witness voice)', () => {
    // Phase 29 Batch C F3 — title "Your Wellness" → "Your wellness"
    // (sentence case) + titleVariant="serif" (Georgia italic 20pt,
    // matching the You-tab greeting voice the rest of the lavender
    // lane carries).
    expect(screenContent).toContain('SubScreenHeader');
    expect(screenContent).toContain('title="Your wellness"');
    expect(screenContent).toContain('titleVariant="serif"');
    // Absence pin: pre-C capitalized title retired.
    expect(screenContent).not.toContain('title="Your Wellness"');
  });

  it('queries mood_logged events from event store', async () => {
    // Seed mood events
    await saveEvent({
      type: 'mood_logged',
      timestamp: `${todayDate()}T10:00:00.000Z`,
      patientId: 'default',
      value: 4,
      metadata: { score: 4, label: 'Okay' },
    });
    await saveEvent({
      type: 'mood_logged',
      timestamp: `${todayDate()}T15:00:00.000Z`,
      patientId: 'default',
      value: 3,
      metadata: { score: 3, label: 'Getting by' },
    });

    const events = await getEventsByDateRange(todayDate(), todayDate(), 'default');
    const moods = events.filter(e => e.type === 'mood_logged');
    expect(moods).toHaveLength(2);
  });

  it('breathing count is accurate from event store', async () => {
    await saveEvent({
      type: 'wellness_check',
      timestamp: `${todayDate()}T12:00:00.000Z`,
      patientId: 'default',
      metadata: { checkType: 'morning', responses: { type: 'breathing_exercise', cycles: 4 } },
    });

    const events = await getEventsByDateRange(todayDate(), todayDate(), 'default');
    const breathing = events.filter(e =>
      e.type === 'wellness_check' &&
      (e.metadata?.responses as any)?.type === 'breathing_exercise'
    );
    expect(breathing).toHaveLength(1);
  });
});
