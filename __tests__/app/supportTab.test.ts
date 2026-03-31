// ============================================================================
// Support Tab — Warm Room verification
// ============================================================================

import * as fs from 'fs';
import * as path from 'path';

const supportPath = path.resolve(__dirname, '../../app/(tabs)/support.tsx');
const src = fs.readFileSync(supportPath, 'utf-8');

const layoutPath = path.resolve(__dirname, '../../app/(tabs)/_layout.tsx');
const layoutContent = fs.readFileSync(layoutPath, 'utf-8');

describe('Support tab — Warm Room', () => {
  it('renders with default export', () => {
    expect(src).toContain('export default function SupportScreen');
  });

  it('warm room header: emotionally intelligent copy', () => {
    expect(src).toContain('>Support</Text>');
    expect(src).toContain('This page is for');
    expect(src).toContain('not your loved one.');
    expect(src).toContain('Caregivers who check in on themselves');
  });

  it('warm background: #0c100e, not pure black', () => {
    expect(src).toContain("'#0c100e'");
  });

  it('warm card surface system', () => {
    expect(src).toContain('warmCard');
    expect(src).toContain("'#131a16'");  // card bg
    expect(src).toContain("'#1a2a22'");  // card border
  });

  it('section label + context pattern', () => {
    expect(src).toContain('Pause and check in');
    expect(src).toContain('No one asks caregivers');
    expect(src).toContain('Take a breath');
    expect(src).toContain('your body needs a signal');
  });

  it('connection card: purple-warm variant', () => {
    expect(src).toContain('warmCardPurple');
    expect(src).toContain("You're not alone");
    expect(src).toContain('53 million Americans');
    expect(src).toContain('Linking.openURL');
  });

  it('resources card: quiet variant', () => {
    expect(src).toContain('warmCardQuiet');
    expect(src).toContain('Plan ahead');
    expect(src).toContain('When things are calm');
  });

  it('wellness link in quiet card', () => {
    expect(src).toContain('wellnessLink');
    expect(src).toContain("navigate('/caregiver-wellness')");
    expect(src).toContain('Your wellness over time');
  });

  it('MoodSlider + breathing + resources all render', () => {
    expect(src).toContain('<MoodSlider');
    expect(src).toContain('breathePill');
    expect(src).toContain('<ResourcesList');
  });

  it('footer affirmation', () => {
    expect(src).toContain("You're doing something");
    expect(src).toContain('most people never see.');
  });

  it('no uppercase section headers', () => {
    expect(src).not.toContain('CHECK IN');
    expect(src).not.toContain('BREATHE');
    expect(src).not.toContain('REACH OUT');
    expect(src).not.toContain('YOUR WELLNESS');
  });

  it('tab bar: Support between Journal and Insights', () => {
    expect(layoutContent).toContain('name="support"');
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
