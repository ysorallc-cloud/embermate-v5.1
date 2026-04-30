// ============================================================================
// skipReason field — schema contract.
// Optional column on DailyCareInstance + LogEntry. Existing skipped entries
// without a reason default to undefined and downstream display treats them
// as 'other'.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const carePlanTypes = readFileSync(join(ROOT, 'types/carePlan.ts'), 'utf8');

describe('skipReason — type contract', () => {
  it('DailyCareInstance carries an optional skipReason field', () => {
    const instanceBlock = carePlanTypes.match(/export interface DailyCareInstance[\s\S]*?\n\}/);
    expect(instanceBlock).not.toBeNull();
    expect(instanceBlock![0]).toMatch(/skipReason\?:\s*['"]refused['"]\s*\|\s*['"]too-soon['"]\s*\|\s*['"]other['"]/);
  });

  it('LogEntry carries an optional skipReason field', () => {
    const logBlock = carePlanTypes.match(/export interface LogEntry[\s\S]*?\n\}/);
    expect(logBlock).not.toBeNull();
    expect(logBlock![0]).toMatch(/skipReason\?:\s*['"]refused['"]\s*\|\s*['"]too-soon['"]\s*\|\s*['"]other['"]/);
  });

  it('exports the SkipReason union type so consumers can import it', () => {
    expect(carePlanTypes).toMatch(
      /export type SkipReason\s*=\s*['"]refused['"]\s*\|\s*['"]too-soon['"]\s*\|\s*['"]other['"]/,
    );
  });

  it('back-compat: existing skipped status entries with no skipReason are still valid', () => {
    // The field is optional, so { status: 'skipped' } without skipReason
    // remains a valid DailyCareInstance shape. No migration required.
    const instanceBlock = carePlanTypes.match(/export interface DailyCareInstance[\s\S]*?\n\}/);
    expect(instanceBlock![0]).toMatch(/skipReason\?:/);
    expect(instanceBlock![0]).not.toMatch(/skipReason:\s*['"]refused/);
  });
});
