import { readFileSync } from 'fs';
import { join } from 'path';

const src = readFileSync(join(__dirname, '../../theme/light-tokens.ts'), 'utf8');

describe('Light-mode background tokens applied', () => {
  it('background is #dbe5dc (deep parchment cream)', () => {
    expect(src).toMatch(/background:\s*'#dbe5dc'/);
  });
  it('glass/surface is #ffffff (warm-tinted white card)', () => {
    expect(src).toMatch(/glass:\s*'#ffffff'/);
    expect(src).toMatch(/surface:\s*'#ffffff'/);
  });
  it('surfaceElevated is #ffffff', () => {
    expect(src).toMatch(/surfaceElevated:\s*'#ffffff'/);
  });
});
