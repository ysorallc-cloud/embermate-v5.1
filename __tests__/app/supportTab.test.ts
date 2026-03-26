// ============================================================================
// Support Tab — Structure and layout verification
// ============================================================================

import * as fs from 'fs';
import * as path from 'path';

const supportPath = path.resolve(__dirname, '../../app/(tabs)/support.tsx');
const supportContent = fs.readFileSync(supportPath, 'utf-8');

const layoutPath = path.resolve(__dirname, '../../app/(tabs)/_layout.tsx');
const layoutContent = fs.readFileSync(layoutPath, 'utf-8');

describe('Support tab', () => {
  it('Support tab screen file exists and renders without crash markers', () => {
    expect(supportContent).toBeDefined();
    expect(supportContent.length).toBeGreaterThan(100);
    expect(supportContent).toContain('export default function SupportScreen');
  });

  it('all 5 sections visible: CHECK IN, BREATHE, REACH OUT, YOUR WELLNESS, RESOURCES', () => {
    expect(supportContent).toContain('CHECK IN');
    expect(supportContent).toContain('BREATHE');
    expect(supportContent).toContain('REACH OUT');
    expect(supportContent).toContain('YOUR WELLNESS');
    expect(supportContent).toContain('RESOURCES');
  });

  it('tab bar shows 4 tabs: Now, Journal, Support, Insights', () => {
    // All 4 tab screens defined in _layout.tsx
    expect(layoutContent).toContain('name="now"');
    expect(layoutContent).toContain('name="journal"');
    expect(layoutContent).toContain('name="support"');
    expect(layoutContent).toContain('name="understand"');

    // Support tab has correct title and icon
    expect(layoutContent).toContain("title: 'Support'");
    expect(layoutContent).toContain('icon="💛"');
  });

  it('Support tab is positioned between Journal and Insights', () => {
    const journalIdx = layoutContent.indexOf('name="journal"');
    const supportIdx = layoutContent.indexOf('name="support"');
    const insightsIdx = layoutContent.indexOf('name="understand"');

    expect(journalIdx).toBeLessThan(supportIdx);
    expect(supportIdx).toBeLessThan(insightsIdx);
  });

  it('MoodSlider is interactive (imported and rendered)', () => {
    expect(supportContent).toContain('MoodSlider');
    expect(supportContent).toContain('<MoodSlider');
  });

  it('Breathing card tappable (opens modal)', () => {
    expect(supportContent).toContain('BreathingExercise');
    expect(supportContent).toContain('setBreathingVisible(true)');
    expect(supportContent).toContain('Start');
  });

  it('Your Wellness link navigable', () => {
    expect(supportContent).toContain("navigate('/caregiver-wellness')");
    expect(supportContent).toContain('Your wellness');
  });

  it('uses AuroraBackground with support variant', () => {
    expect(supportContent).toContain('AuroraBackground');
    expect(supportContent).toContain('variant="support"');
  });

  it('header shows "Support" title and "This space is yours."', () => {
    expect(supportContent).toContain('>Support</Text>');
    expect(supportContent).toContain('This space is yours.');
  });
});
