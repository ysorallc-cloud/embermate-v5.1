/**
 * Tests for the Now page v2 flat layout redesign.
 * Verifies zone dividers, flat section headers (no icons), and correct zone order.
 */
import * as fs from 'fs';
import * as path from 'path';

const nowTsxPath = path.resolve(__dirname, '../../app/(tabs)/now.tsx');
const nowSource = fs.readFileSync(nowTsxPath, 'utf-8');

describe('Now page v2 flat layout', () => {
  test('zoneDivider style exists with correct properties', () => {
    const dividerMatch = nowSource.match(/zoneDivider:\s*\{[^}]+\}/);
    expect(dividerMatch).not.toBeNull();
    const block = dividerMatch![0];
    expect(block).toContain('height: 1');
    expect(block).toContain("rgba(255, 255, 255, 0.04)");
  });

  test('no card wrapper styles remain (cardGlance, cardSchedule, cardUpcoming, cardEncouragement)', () => {
    expect(nowSource).not.toContain('cardGlance:');
    expect(nowSource).not.toContain('cardSchedule:');
    expect(nowSource).not.toContain('cardUpcoming:');
    expect(nowSource).not.toContain('cardEncouragement:');
  });

  test('section headers have no emoji icon props', () => {
    // SectionHeaderRow should not accept or render icon prop
    expect(nowSource).not.toMatch(/icon="📊"/);
    expect(nowSource).not.toMatch(/icon="🗓️"/);
    expect(nowSource).not.toMatch(/icon="📋"/);
    // No sectionHeaderIcon style
    expect(nowSource).not.toContain('sectionHeaderIcon:');
  });

  test('section titles are correct: Today\'s Progress, Today\'s Schedule, Upcoming This Week', () => {
    expect(nowSource).toContain('title="Today\'s Progress"');
    expect(nowSource).toContain('title="Today\'s Schedule"');
    expect(nowSource).toContain('title="Upcoming This Week"');
  });

  test('sections appear in correct order', () => {
    const progressIdx = nowSource.indexOf('title="Today\'s Progress"');
    const scheduleIdx = nowSource.indexOf('title="Today\'s Schedule"');
    const upcomingIdx = nowSource.indexOf('title="Upcoming This Week"');

    expect(progressIdx).toBeGreaterThan(-1);
    expect(scheduleIdx).toBeGreaterThan(-1);
    expect(upcomingIdx).toBeGreaterThan(-1);
    expect(progressIdx).toBeLessThan(scheduleIdx);
    expect(scheduleIdx).toBeLessThan(upcomingIdx);
  });

  test('GlanceSummary component is removed', () => {
    expect(nowSource).not.toContain('<GlanceSummary');
    expect(nowSource).not.toContain('function GlanceSummary');
  });

  test('old standalone SectionHeader is not imported', () => {
    expect(nowSource).not.toMatch(/<SectionHeader\s/);
    expect(nowSource).not.toMatch(/import\s+\{[^}]*SectionHeader[^}]*\}\s+from\s+['"].*SectionHeader/);
  });

  test('appointmentPrepCard has its own green-tinted background', () => {
    const cardMatch = nowSource.match(/appointmentPrepCard:\s*\{[^}]+\}/);
    expect(cardMatch).not.toBeNull();
    const block = cardMatch![0];
    expect(block).toContain('rgba(20, 55, 45, 0.3)');
    expect(block).toContain('borderRadius: 10');
  });

  test('no purpose prop on Now page ScreenHeader', () => {
    // The purpose prop should not be passed in Now page
    expect(nowSource).not.toContain('purpose="What needs your attention today."');
  });
});
