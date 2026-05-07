// ============================================================================
// Phase 5.13.1.d — patient-name read audit guard.
//
// Permanently enforces: app/ and components/ MUST NOT read
// StorageKeys.PATIENT_NAME (or the literal '@embermate_patient_name')
// directly. Reads go through useActivePatientName / useActivePatientNameRaw
// (or the patientRegistry directly for non-React code paths).
//
// Two allowed exceptions:
//   • utils/cloudBackup.ts — backs up the AsyncStorage layer, must read
//     the legacy key by definition. Lives outside the audit scope.
//   • app/(tabs)/now.tsx — one-shot legacy migration block. Each PATIENT_NAME
//     reference must be accompanied by an `// allow:` comment within 2 lines.
// ============================================================================

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');

interface Hit {
  file: string;
  line: number;
  text: string;
}

function grepHits(): Hit[] {
  let out = '';
  try {
    out = execSync(
      `grep -rEn '(getItem|safeGetItem)[^,)]*PATIENT_NAME|getItem[^,)]*['"'"'"]@embermate_patient_name['"'"'"]' app components --include='*.tsx' --include='*.ts' || true`,
      { cwd: ROOT, encoding: 'utf8' },
    );
  } catch {
    out = '';
  }
  const hits: Hit[] = [];
  for (const line of out.split('\n').filter(Boolean)) {
    const m = line.match(/^([^:]+):(\d+):(.*)$/);
    if (m) hits.push({ file: m[1], line: Number(m[2]), text: m[3] });
  }
  return hits;
}

function hasAllowComment(file: string, lineNumber: number): boolean {
  try {
    const src = readFileSync(join(ROOT, file), 'utf8').split('\n');
    // Look at the matching line plus the two prior lines for an `// allow:`
    // comment — the canonical exception mechanism used elsewhere in the
    // audit suite (spacing, card padding).
    for (let i = Math.max(0, lineNumber - 3); i < lineNumber; i++) {
      if (/\/\/\s*allow:/i.test(src[i] || '')) return true;
    }
    return false;
  } catch {
    return false;
  }
}

describe('Phase 5.13.1.d — patient-name read audit', () => {
  it('app/ and components/ do not read PATIENT_NAME directly (without // allow:)', () => {
    const hits = grepHits();
    const offenders = hits.filter((h) => !hasAllowComment(h.file, h.line));
    if (offenders.length > 0) {
      throw new Error(
        `${offenders.length} unguarded PATIENT_NAME read(s) found. ` +
          `Use useActivePatientName(Raw) (React) or the registry (utils):\n  ` +
          offenders.map((o) => `${o.file}:${o.line}  ${o.text.trim()}`).join('\n  '),
      );
    }
  });
});
