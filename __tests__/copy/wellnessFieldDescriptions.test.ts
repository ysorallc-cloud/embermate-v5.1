// ============================================================================
// Wellness field descriptions — should read as complete sentences explaining
// what's being tracked, not as comma-separated lists of the option values.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const src = readFileSync(join(ROOT, 'app/care-plan/wellness.tsx'), 'utf8');

describe('Wellness field descriptions — complete sentences, not option lists', () => {
  it('Orientation reads "Track whether [patient] is alert, confused, or disoriented."', () => {
    expect(src).toMatch(/Track whether [^.]+ is alert, confused, or disoriented\./);
    // Old "Alert & oriented, confused, disoriented" must be gone.
    expect(src).not.toContain('Alert & oriented, confused, disoriented');
  });

  it('Decision Making reads "Track [patient]\'s decision-making capacity day-to-day."', () => {
    expect(src).toMatch(/Track [^.]+ decision-making capacity day-to-day\./);
    expect(src).not.toContain('Own decisions, needs guidance, unable');
  });

  it('Pain Level reads as a sentence, not "None, mild, moderate, severe"', () => {
    expect(src).not.toContain('None, mild, moderate, severe');
    // Keep the descriptor concise but full-sentence — must end with a period.
    expect(src).toMatch(/key: 'painLevel'[\s\S]{0,200}?description:\s*(?:`[^`]+\.`|['"][^'"]+\.['"])/);
  });

  it('Alertness reads as a sentence, not "Alert, confused, drowsy, unresponsive"', () => {
    expect(src).not.toContain('Alert, confused, drowsy, unresponsive');
    expect(src).toMatch(/key: 'alertness'[\s\S]{0,200}?description:\s*(?:`[^`]+\.`|['"][^'"]+\.['"])/);
  });

  it('Bowel Movement reads as a sentence, not "Yes, no, unknown"', () => {
    expect(src).not.toContain("'Yes, no, unknown'");
    expect(src).toMatch(/key: 'bowelMovement'[\s\S]{0,200}?description:\s*(?:`[^`]+\.`|['"][^'"]+\.['"])/);
  });

  it('Bathing Status reads as a sentence, not "Independent, partial/full assist"', () => {
    expect(src).not.toContain('Independent, partial/full assist');
    expect(src).toMatch(/key: 'bathingStatus'[\s\S]{0,200}?description:\s*(?:`[^`]+\.`|['"][^'"]+\.['"])/);
  });

  it('Mobility Status reads as a sentence, not "Independent, walker, cane, wheelchair"', () => {
    expect(src).not.toContain('Independent, walker, cane, wheelchair');
    expect(src).toMatch(/key: 'mobilityStatus'[\s\S]{0,200}?description:\s*(?:`[^`]+\.`|['"][^'"]+\.['"])/);
  });
});

describe('Wellness — patient name is wired through usePatient', () => {
  it('imports usePatient (descriptions interpolate the patient name)', () => {
    expect(src).toMatch(/from\s+['"][^'"]*PatientContext['"]/);
    expect(src).toMatch(/usePatient\(/);
  });

  it('falls back to the standard "your loved one" when context is unresolved', () => {
    // Same fallback contract as Now/Journal/Insights/Patient — ensures the
    // copy is grammatical when no patient is selected yet.
    expect(src).toMatch(/['"]your loved one['"]/);
  });
});
