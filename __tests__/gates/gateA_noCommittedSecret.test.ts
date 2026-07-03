// __tests__/gates/gateA_noCommittedSecret.test.ts
// ---------------------------------------------------------------------------
// SAFETY GATE A: no service-account key or private key is present in the repo.
//
// Two distinct claims, because "gitignored" and "gone" are NOT the same:
//   1. git is not TRACKING the leaked key (weaker — .gitignore satisfies this
//      even while the real credential still sits on disk in the working tree).
//   2. the leaked key is PHYSICALLY ABSENT from the working tree (stronger —
//      a dead credential on disk is still a credential on disk).
// This gate enforces the STRONGER claim: the file must not exist on disk.
//
// WHAT THIS TEST DOES NOT COVER (do these separately, they are not testable
// from the working tree):
//   1. Git HISTORY. Removing the file does not purge it from past commits.
//      You must scrub history (git filter-repo / BFG) and force-push.
//   2. REVOCATION in Google Cloud. (Amber has already revoked the key.)
// This test only guarantees the credential never re-enters the working tree.
// ---------------------------------------------------------------------------

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const ROOT = process.cwd();

// Directories that are vendored, generated, or huge — never hold our secrets
// and would make the physical walk slow / noisy.
const SKIP_DIRS = new Set([
  'node_modules', '.git', '.expo', 'ios', 'android', 'dist', 'build', 'coverage',
]);

// Files git is actually tracking (respects .gitignore; ignores node_modules).
function trackedFiles(): string[] {
  try {
    return execSync('git ls-files', { cwd: ROOT, encoding: 'utf8' })
      .split('\n')
      .filter(Boolean);
  } catch {
    return worktreeFiles();
  }
}

// Every file PHYSICALLY present in the working tree (tracked or not), minus the
// vendored/generated dirs above. This is what catches an untracked-but-present
// credential that git ls-files would miss.
function worktreeFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const name of fs.readdirSync(dir)) {
      if (SKIP_DIRS.has(name)) continue;
      const full = path.join(dir, name);
      let stat: fs.Stats;
      try {
        stat = fs.statSync(full);
      } catch {
        continue; // dangling symlink etc.
      }
      if (stat.isDirectory()) walk(full);
      else out.push(path.relative(ROOT, full));
    }
  };
  walk(ROOT);
  return out;
}

// A filename that looks like a service-account / credential key drop.
function looksLikeKeyFile(rel: string): boolean {
  const base = path.basename(rel);
  return (
    /^embermate-[0-9a-f]{12}\.json$/i.test(base) || // the known leak's shape
    /c9fb.*\.json$/i.test(base) ||
    /service[-_]?account.*\.json$/i.test(base)
  );
}

const SECRET_MARKERS = [
  '"type": "service_account"',
  '-----BEGIN PRIVATE KEY-----',
  '-----BEGIN RSA PRIVATE KEY-----',
  '"private_key":',
];

// The gate tests themselves DEFINE these marker strings as detection patterns;
// they are not credentials. Exclude them so the content scan doesn't flag its
// own source once this file is committed (and therefore tracked).
function isGateTest(rel: string): boolean {
  return rel.split(path.sep).join('/').startsWith('__tests__/gates/');
}

describe('Gate A: no committed credentials', () => {
  it('the known leaked key file is not tracked by git', () => {
    const offenders = trackedFiles().filter(looksLikeKeyFile);
    expect(offenders).toEqual([]);
  });

  it('the leaked key is PHYSICALLY ABSENT from the working tree (not merely gitignored)', () => {
    // Specific known file — the strongest, most direct assertion.
    const leaked = path.join(ROOT, 'embermate-c9fb6c60b1b9.json');
    expect(fs.existsSync(leaked)).toBe(false);

    // And nothing else key-shaped is sitting on disk, tracked or not.
    const present = worktreeFiles().filter(looksLikeKeyFile);
    expect(present).toEqual([]);
  });

  it('no tracked file contains a private key or service-account marker', () => {
    const tracked = trackedFiles()
      .filter((f) => /\.(json|pem|key|env|txt|ts|js)$/i.test(f))
      .filter((f) => !isGateTest(f));
    const offenders: string[] = [];
    for (const rel of tracked) {
      const abs = path.join(ROOT, rel);
      if (!fs.existsSync(abs)) continue;
      const src = fs.readFileSync(abs, 'utf8');
      if (SECRET_MARKERS.some((m) => src.includes(m))) offenders.push(rel);
    }
    expect(offenders).toEqual([]);
  });
});
