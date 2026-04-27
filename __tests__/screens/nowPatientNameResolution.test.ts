// ============================================================================
// Patient name resolution — Now tab must derive patientName the same way
// Journal and Understand do, so the header pill never lingers on
// "your loved one" after PatientContext hydrates.
//
// Failure mode this guards against: Now reads patientName from a useState
// seeded with the fallback, then updates it inside a loadData() effect
// whose dependency array excludes `activePatient`. When `activePatient`
// arrives after the first focus, the state stays stale.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');

const nowSrc        = read('app/(tabs)/now.tsx');
const journalSrc    = read('app/(tabs)/journal.tsx');
const understandSrc = read('app/(tabs)/understand.tsx');

describe('Now tab patientName resolution — re-derives on activePatient changes', () => {
  it('imports usePatient (same source as Journal and Understand)', () => {
    expect(nowSrc).toMatch(/from\s+['"][^'"]*PatientContext['"]/);
    expect(journalSrc).toMatch(/from\s+['"][^'"]*PatientContext['"]/);
    expect(understandSrc).toMatch(/from\s+['"][^'"]*PatientContext['"]/);
  });

  it('does NOT seed patientName with the fallback string in useState', () => {
    // The fallback "your loved one" must not be the initial useState value —
    // that's the leak that makes the pill render the fallback before
    // PatientContext hydrates. Use '' or derive directly from activePatient.
    expect(nowSrc).not.toMatch(/useState[^)]*\(\s*['"]your loved one['"]\s*\)/);
  });

  it('any useFocusEffect / useEffect that consumes activePatient declares it as a dependency', () => {
    // Find every effect in now.tsx that references activePatient inside its
    // body. Each must list `activePatient` in its dependency array, otherwise
    // the closure freezes the initial null value.
    const effectRe = /(useFocusEffect|useEffect)\s*\(\s*useCallback\(\s*\(\)\s*=>\s*\{([\s\S]*?)\}\s*,\s*\[([^\]]*)\]\s*\)\s*\)|(useFocusEffect|useEffect)\s*\(\s*\(\)\s*=>\s*\{([\s\S]*?)\}\s*,\s*\[([^\]]*)\]\s*\)/g;
    const offenders: string[] = [];
    let m: RegExpExecArray | null;
    while ((m = effectRe.exec(nowSrc)) !== null) {
      const body = m[2] ?? m[5] ?? '';
      const deps = m[3] ?? m[6] ?? '';
      // Only flag effects that actually use activePatient OR that call
      // loadData (which reads activePatient transitively).
      const usesPatient = /activePatient\b|loadData\b/.test(body);
      if (usesPatient && !/activePatient/.test(deps)) {
        offenders.push(`effect missing activePatient in deps: deps=[${deps.trim()}]`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('Now derives patientName so it tracks activePatient changes (no stale state)', () => {
    // Two acceptable shapes:
    // (a) inline derivation via const patientName = activePatient?.name ...
    //     (matches Understand's pattern), or
    // (b) useState seeded from the same expression, with activePatient in
    //     a useEffect dep array that re-syncs the state.
    const inlineDerivation = /const\s+patientName\s*=\s*activePatient\?\.\s*name/.test(nowSrc);
    const effectSync = /\.includes\(activePatient/.test(nowSrc) // unlikely
      || /\bactivePatient\b[^]{0,400}setPatientName/.test(nowSrc);
    expect(inlineDerivation || effectSync).toBe(true);
  });
});

describe('Patient name resolution — consistent fallback across tabs', () => {
  it('Journal, Understand, and Now all use the same family of fallback strings', () => {
    // The exact fallback can be 'your loved one' or 'Your loved one' depending
    // on grammatical position, but it must be one of those two — never blank,
    // never "Patient", never "the patient".
    const fallbacks = [
      /['"]your loved one['"]/i,
      /['"]Your loved one['"]/i,
    ];
    for (const src of [nowSrc, journalSrc, understandSrc]) {
      const hasFallback = fallbacks.some(re => re.test(src));
      expect(hasFallback).toBe(true);
    }
  });

  it('all three tabs filter out the legacy "Patient" placeholder', () => {
    // Every tab must reject `activePatient.name === 'Patient'` as a real
    // value — that's the legacy default for unconfigured profiles.
    expect(nowSrc).toMatch(/['"]Patient['"]/); // referenced in filter logic
    expect(understandSrc).toMatch(/['"]Patient['"]/);
    // Journal uses a PLACEHOLDERS set
    expect(journalSrc).toMatch(/PLACEHOLDERS|['"]Patient['"]/);
  });
});
