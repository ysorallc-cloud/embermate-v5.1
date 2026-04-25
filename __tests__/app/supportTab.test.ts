// ============================================================================
// Support Tab — Warm Room verification
// ============================================================================

import * as fs from 'fs';
import * as path from 'path';

const supportPath = path.resolve(__dirname, '../../app/(tabs)/support.tsx');
const src = fs.readFileSync(supportPath, 'utf-8');

const layoutPath = path.resolve(__dirname, '../../app/(tabs)/_layout.tsx');
const layoutContent = fs.readFileSync(layoutPath, 'utf-8');

describe('You tab — Warm Room', () => {
  it('renders with default export', () => {
    expect(src).toContain('export default function SupportScreen');
  });

  it('warm room header: emotionally intelligent copy', () => {
    // Tab renamed from "Support" → "You" (self-care framing).
    expect(src).toContain('>You</Text>');
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

  it('dual-primary layout: mood + breathing side by side', () => {
    expect(src).toContain('primaryRow');
    expect(src).toContain('primaryCard');
    expect(src).toContain('primaryCardLeft');
    expect(src).toContain('primaryCardRight');
  });

  it('inline mood emoji row (replaces MoodSlider component)', () => {
    expect(src).toContain('emojiRow');
    expect(src).toContain('emojiCircle');
    expect(src).toContain('selectedMoodIndex');
    expect(src).toContain('MOOD_POSITIONS');
    expect(src).toContain('AFFIRMATIONS');
    expect(src).toContain('Log this');
    // MoodSlider component is no longer rendered directly
    expect(src).not.toContain('<MoodSlider');
  });

  it('breathing card in primary row', () => {
    expect(src).toContain('Take a breath');
    expect(src).toContain('breathePlayTriangle');
    expect(src).toContain('setBreathingVisible(true)');
  });

  it('compact contact tiles: helpline + community', () => {
    expect(src).toContain('contactTilesRow');
    expect(src).toContain('contactTile');
    expect(src).toContain('Linking.openURL');
    expect(src).toContain('Helpline');
    expect(src).toContain('Community');
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

  it('breathing + resources components render', () => {
    expect(src).toContain('breathePlayTriangle');
    expect(src).toContain('setBreathingVisible(true)');
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

  it('tab bar: You tab is last (after Insights)', () => {
    expect(layoutContent).toContain('name="support"');
    const insightsIdx = layoutContent.indexOf('name="understand"');
    const supportIdx = layoutContent.indexOf('name="support"');
    expect(insightsIdx).toBeLessThan(supportIdx);
  });

  it('AuroraBackground with support variant', () => {
    expect(src).toContain('variant="support"');
  });
});
