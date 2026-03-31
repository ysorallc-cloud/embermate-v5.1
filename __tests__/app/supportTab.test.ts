// ============================================================================
// Support Tab — Structure and layout verification
// ============================================================================

import * as fs from 'fs';
import * as path from 'path';

const supportPath = path.resolve(__dirname, '../../app/(tabs)/support.tsx');
const src = fs.readFileSync(supportPath, 'utf-8');

const layoutPath = path.resolve(__dirname, '../../app/(tabs)/_layout.tsx');
const layoutContent = fs.readFileSync(layoutPath, 'utf-8');

describe('Support tab', () => {
  it('renders with default export', () => {
    expect(src).toContain('export default function SupportScreen');
  });

  it('header: light weight title, no date line, conversational subtitle', () => {
    expect(src).toContain('>Support</Text>');
    expect(src).toContain("fontWeight: '300'");
    expect(src).toContain('This space is yours. Take a moment.');
    expect(src).not.toContain('dateStr');
  });

  it('uses conversational zone labels, no uppercase section headers', () => {
    expect(src).toContain('How are you right now?');
    expect(src).toContain('Need a reset?');
    expect(src).toContain('Talk to someone');
    expect(src).toContain('Resources');
    expect(src).not.toContain('CHECK IN');
    expect(src).not.toContain('BREATHE');
    expect(src).not.toContain('REACH OUT');
    expect(src).not.toContain('YOUR WELLNESS');
  });

  it('no bordered card wrappers', () => {
    expect(src).not.toMatch(/card:\s*\{[\s\S]*?borderWidth/);
    expect(src).not.toContain("styles.card");
  });

  it('zone spacing: 32px spacers and thin dividers', () => {
    expect(src).toContain('zoneSpacer');
    expect(src).toContain('zoneDivider');
    expect(src).toContain('height: 32');
    expect(src).toContain('height: 0.5');
  });

  it('MoodSlider rendered in zone 1', () => {
    expect(src).toContain('<MoodSlider');
  });

  it('breathing entry: Begin pill, not Start button', () => {
    expect(src).toContain('breathePill');
    expect(src).toContain('>Begin</Text>');
    expect(src).toContain('setBreathingVisible(true)');
    expect(src).not.toContain('startButton');
  });

  it('reach out rows without card wrapper', () => {
    expect(src).toContain('Caregiver Helpline');
    expect(src).toContain('Caregiver community');
    expect(src).toContain('reachRow');
  });

  it('Your Wellness as a single link row below Resources', () => {
    expect(src).toContain('wellnessLink');
    expect(src).toContain("navigate('/caregiver-wellness')");
    const resourcesIdx = src.indexOf('ResourcesList');
    const wellnessIdx = src.indexOf('wellnessLink');
    expect(resourcesIdx).toBeLessThan(wellnessIdx);
  });

  it('footer affirmation', () => {
    expect(src).toContain("You're doing something");
    expect(src).toContain('most people never see.');
    expect(src).toContain('footerText');
  });

  it('tab bar: 4 tabs with Support between Journal and Insights', () => {
    expect(layoutContent).toContain('name="support"');
    expect(layoutContent).toContain("title: 'Support'");
    const journalIdx = layoutContent.indexOf('name="journal"');
    const supportIdx = layoutContent.indexOf('name="support"');
    const insightsIdx = layoutContent.indexOf('name="understand"');
    expect(journalIdx).toBeLessThan(supportIdx);
    expect(supportIdx).toBeLessThan(insightsIdx);
  });

  it('AuroraBackground with support variant', () => {
    expect(src).toContain('variant="support"');
  });
});
