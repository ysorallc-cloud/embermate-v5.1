// File: utils/__tests__/insightsQuickActionsCompact.test.ts
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Insights quick actions compact', () => {
  const src = readFileSync(join(__dirname, '../../app/(tabs)/understand.tsx'), 'utf8');
  const render = src.slice(src.indexOf('return ('));

  test('quickActionSub not rendered', () => {
    expect(render).not.toContain('quickActionSub');
  });

  test('quickActionCard uses row layout', () => {
    const m = src.match(/quickActionCard:\s*\{([^}]+)\}/);
    expect(m![1]).toContain("'row'");
  });

  test('patterns item removed from menuItems', () => {
    const menuBlock = src.slice(src.indexOf('const menuItems'), src.indexOf('], ['));
    expect(menuBlock).not.toContain("id: 'patterns'");
  });

  test('vitals-trends item removed from menuItems', () => {
    const menuBlock = src.slice(src.indexOf('const menuItems'), src.indexOf('], ['));
    expect(menuBlock).not.toContain("id: 'vitals-trends'");
  });
});
