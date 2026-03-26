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

  it('shows mood history section', () => {
    expect(screenContent).toContain('MOOD HISTORY');
    expect(screenContent).toContain('mood_logged');
  });

  it('shows breathing session count', () => {
    expect(screenContent).toContain('BREATHING SESSIONS');
    expect(screenContent).toContain('breathing_exercise');
  });

  it('has range toggle (7d, 14d, 30d)', () => {
    expect(screenContent).toContain('setRange');
    expect(screenContent).toContain('7');
    expect(screenContent).toContain('14');
    expect(screenContent).toContain('30');
  });

  it('uses SubScreenHeader with back button', () => {
    expect(screenContent).toContain('SubScreenHeader');
    expect(screenContent).toContain("title=\"Your Wellness\"");
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
