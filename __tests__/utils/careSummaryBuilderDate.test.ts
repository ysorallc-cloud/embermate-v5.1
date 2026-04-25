// ============================================================================
// 1_BLOCKERS Fix 7 — buildCareBrief date parameter
// ============================================================================
//
// Verifies the buildCareBrief signature accepts an optional targetDate and
// that the journal consumer passes selectedDate. Pure-source structural
// assertions; the existing careSummaryBuilder.test.ts covers runtime
// behavior on today's data.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
function read(rel: string): string {
  return readFileSync(join(ROOT, rel), 'utf8');
}

describe('buildCareBrief — targetDate parameter', () => {
  const src = read('utils/careSummaryBuilder.ts');

  it('signature accepts an optional targetDate string', () => {
    expect(src).toMatch(/export async function buildCareBrief\(targetDate\?\:\s*string\)/);
  });

  it('falls back to today when targetDate is omitted (backwards compatible)', () => {
    expect(src).toMatch(/const date\s*=\s*targetDate\s*\|\|\s*today/);
  });

  it('passes the resolved date to ensureDailyInstances + listLogsByDate + wellness fetches', () => {
    expect(src).toMatch(/ensureDailyInstances\(DEFAULT_PATIENT_ID,\s*date\)/);
    expect(src).toMatch(/listLogsByDate\(DEFAULT_PATIENT_ID,\s*date\)/);
    expect(src).toMatch(/getMorningWellness\(date\)/);
    expect(src).toMatch(/getEveningWellness\(date\)/);
  });

  it('uses the today-only fast path only when isToday is true', () => {
    expect(src).toMatch(/const isToday = date === today/);
    // The vitals/sleep/water promises must branch on isToday — calling the
    // today-only helpers when on today, falling back to a raw + filter
    // pattern for past dates.
    expect(src).toMatch(/isToday\s*\?\s*getTodayVitalsLog\(\)/);
    expect(src).toMatch(/isToday\s*\?\s*getTodaySleepLog\(\)/);
    expect(src).toMatch(/isToday\s*\?\s*getTodayWaterLog\(\)/);
  });

  it('past-date branch filters raw log arrays by toDateString matching the targetDateKey', () => {
    expect(src).toMatch(/getVitalsLogs\(\)\.then/);
    expect(src).toMatch(/getSleepLogs\(\)\.then/);
    expect(src).toMatch(/getWaterLogs\(\)\.then/);
    expect(src).toMatch(/targetDateKey/);
  });

  it('anchors targetDateKey at noon to dodge DST edges', () => {
    expect(src).toContain("`${date}T12:00:00`");
  });

  it('meals filter inside buildCareBrief uses targetDateKey, not new Date()', () => {
    // The buildCareBrief meals filter (the third occurrence of the
    // mealInstances pattern) must use targetDateKey. Earlier occurrences in
    // buildTodaySummary / buildShiftReport still legitimately filter on
    // today only.
    const buildCareBriefStart = src.indexOf('export async function buildCareBrief');
    expect(buildCareBriefStart).toBeGreaterThan(-1);
    const cbBody = src.slice(buildCareBriefStart);
    // Look for the meals filter line shape inside the buildCareBrief slice.
    // The callback contains its own parens (`new Date(m.timestamp)`), so
    // anchor on the assignment + the trailing comparison instead of trying
    // to balance brackets via regex.
    expect(cbBody).toContain('const todayMeals = mealsLogs.filter');
    expect(cbBody).toContain('=== targetDateKey');
    // And the deprecated `=== todayStr` shape must NOT appear inside the
    // buildCareBrief body (it's still legitimate in the earlier helpers).
    expect(cbBody).not.toMatch(/const todayStr = new Date\(\)\.toDateString\(\);[\s\S]{0,200}=== todayStr/);
  });

  it('evening wellness handoff prompt only fires when viewing today', () => {
    expect(src).toMatch(/isToday && !eveningWellness/);
  });
});

describe('Journal — passes selectedDate to buildCareBrief', () => {
  const src = read('app/(tabs)/journal.tsx');

  it('loadReport calls buildCareBrief with selectedDate', () => {
    expect(src).toMatch(/buildCareBrief\(selectedDate\)/);
  });

  it('loadReport useCallback dependency array includes selectedDate', () => {
    // Walk to the loadReport dep array.
    const start = src.indexOf('const loadReport = useCallback');
    expect(start).toBeGreaterThan(-1);
    const end = src.indexOf('useEffect', start);
    const block = src.slice(start, end);
    expect(block).toMatch(/\}, \[[^\]]*selectedDate[^\]]*\]\)/);
  });

  it('notes filter uses the selectedDate-anchored toDateString key', () => {
    // The previous bug: `new Date().toDateString()` always matched today.
    expect(src).toMatch(/new Date\(`\$\{selectedDate\}T12:00:00`\)\.toDateString\(\)/);
  });

  it('renders a past-date empty state when selectedDate !== today and no data', () => {
    // The past-date empty state may live in journal.tsx or in the extracted
    // JournalSummary component. Check both.
    const summarySrc = read('components/journal/JournalSummary.tsx');
    const combined = src + summarySrc;
    expect(combined).toContain('pastDateEmpty');
    expect(combined).toContain('No data recorded for this date');
  });

  it('first-use guidance is gated to today only', () => {
    // The isToday gate may be in journal.tsx or JournalSummary.tsx after
    // the Phase 10.2 decomposition.
    const summarySrc = read('components/journal/JournalSummary.tsx');
    const combined = src + summarySrc;
    expect(combined).toMatch(/selectedDate === getTodayDateString\(\)/);
  });
});
