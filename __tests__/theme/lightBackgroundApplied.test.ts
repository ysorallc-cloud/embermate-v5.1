import { readFileSync } from 'fs';
import { join } from 'path';

const src = readFileSync(join(__dirname, '../../theme/light-tokens.ts'), 'utf8');

describe('Light-mode background tokens applied', () => {
  it('background is #e8dcbe (deep parchment cream)', () => {
    expect(src).toMatch(/background:\s*'#e8dcbe'/);
  });
  it('glass/surface is #fdfaf0 (warm-tinted white card)', () => {
    expect(src).toMatch(/glass:\s*'#fdfaf0'/);
    expect(src).toMatch(/surface:\s*'#fdfaf0'/);
  });
  it('surfaceElevated is #ffffff', () => {
    expect(src).toMatch(/surfaceElevated:\s*'#ffffff'/);
  });
});
