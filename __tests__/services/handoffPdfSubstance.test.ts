// ============================================================================
// Handoff PDF — surfaces caregiver-entered substance the Journal now shows.
//
// The PDF is the artifact that reaches the doctor, and it was a SEPARATE, narrower
// read surface than the Journal — so the substance we fixed for the Journal never
// reached the document:
//   • med SIDE-EFFECTS — data was in payload.medications[].sideEffects but the med
//     table rendered name/dose/scheduled/status only.
//   • MEALS with their appetite + note/description — meals weren't in the payload
//     or the PDF at all.
// This drives __testing.buildHtml with the REAL data shapes and asserts the
// document contains them.
// ============================================================================

jest.mock('expo-print', () => ({ printToFileAsync: jest.fn() }));
jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(), shareAsync: jest.fn() }));
jest.mock('expo-file-system/legacy', () => ({}));

import { __testing } from '../../services/handoffPdf';
import type { HandoffDayPayload } from '../../utils/handoffDayBuilder';

const { buildHtml } = __testing;

function payload(over: Partial<HandoffDayPayload> = {}): HandoffDayPayload {
  return {
    date: '2026-07-19',
    patientName: 'Dad',
    gestalt: '',
    medications: [],
    vitals: null,
    meals: { total: 0, meals: [] },
    worthFlagging: [],
    notes: null,
    nextAppointment: null,
    hasLoggedContent: true,
    ...over,
  };
}
const wrap = (p: HandoffDayPayload) => buildHtml({ payload: p, dateLabel: 'Jul 19, 2026', timeLabel: '3:00 PM' });

describe('handoff PDF — med side-effects', () => {
  it('renders the selected symptoms in the medications block', () => {
    const html = wrap(payload({
      medications: [{
        name: 'Atorvastatin', dosage: '10mg', status: 'completed',
        scheduledTime: '2026-07-19T08:00:00Z', takenAt: '2026-07-19T08:05:00Z',
        sideEffects: ['nausea', 'tired'],
      }],
    }));
    expect(html).toContain('Side effects');
    expect(html).toContain('Nausea'); // title-cased for the reader
    expect(html).toContain('Tired');
  });

  it('omits the side-effects line when none were recorded', () => {
    const html = wrap(payload({
      medications: [{ name: 'Warfarin', dosage: '5mg', status: 'completed', scheduledTime: '2026-07-19T08:00:00Z' }],
    }));
    expect(html).not.toContain('Side effects');
  });
});

describe('handoff PDF — meals with appetite + note', () => {
  it('renders logged meals with their note and appetite', () => {
    const html = wrap(payload({
      meals: {
        total: 2,
        meals: [
          { name: 'Breakfast', status: 'completed', appetite: 'Good', description: 'ate half the eggs' },
          { name: 'Lunch', status: 'missed' },
        ],
      },
    }));
    expect(html).toContain('Breakfast');
    expect(html).toContain('ate half the eggs'); // the caregiver note
    expect(html).toContain('Good');              // appetite
    expect(html).toContain('Lunch');             // a missed meal still surfaces
  });

  it('renders nothing for meals when only pending (nothing logged)', () => {
    const html = wrap(payload({
      meals: { total: 1, meals: [{ name: 'Dinner', status: 'pending' }] },
    }));
    // The meals block should not appear for a pending-only day.
    expect(html).not.toContain('Dinner');
  });
});
