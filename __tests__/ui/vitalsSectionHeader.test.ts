import { readFileSync } from 'fs';
import { join } from 'path';

const src = readFileSync(
  join(__dirname, '../../app/care-plan/vitals.tsx'),
  'utf8',
);

describe('vitals.tsx — sectionHeader style exists', () => {
  it('StyleSheet.create block contains a sectionHeader key', () => {
    // vitals.tsx:266 references `styles.sectionHeader` but the style was
    // never defined in the StyleSheet.create block, producing a runtime
    // crash (undefined style) when the Vitals care-plan auto-import
    // section renders on iOS with HealthKit enabled.
    const createBlock = src.match(/StyleSheet\.create\(\{[\s\S]*?\}\)/);
    expect(createBlock).toBeTruthy();
    expect(createBlock![0]).toMatch(/sectionHeader:\s*\{/);
  });
});
