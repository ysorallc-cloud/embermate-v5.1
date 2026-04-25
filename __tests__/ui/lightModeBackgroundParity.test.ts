import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');

const TAB_FILES = [
  'app/(tabs)/now.tsx',
  'app/(tabs)/journal.tsx',
  'app/(tabs)/understand.tsx',
  'app/(tabs)/support.tsx',
];

describe('Light-mode background parity — no hardcoded white', () => {
  for (const file of TAB_FILES) {
    it(`${file} does not hardcode backgroundColor to white`, () => {
      const src = read(file);
      // Must not contain backgroundColor: '#fff...' or '#FFF...' — should use token
      expect(src).not.toMatch(/backgroundColor:\s*['"]#[fF]{3,6}['"]/);
    });
  }
});
