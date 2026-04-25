import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');

describe('Visit Prep navigation wiring', () => {
  it('app/visit-prep.tsx exists as a route', () => {
    expect(existsSync(join(ROOT, 'app/visit-prep.tsx'))).toBe(true);
  });

  it('Insights tab has a Visit Prep navigation target', () => {
    const src = read('app/(tabs)/understand.tsx');
    expect(src).toMatch(/visit-prep/);
  });

  it('services/visitPrepPdf.ts exists and exports assembleVisitPrepData', () => {
    const src = read('services/visitPrepPdf.ts');
    expect(src).toContain('export async function assembleVisitPrepData');
    expect(src).toContain('export interface VisitPrepConfig');
    expect(src).toContain('export interface VisitPrepData');
  });
});
