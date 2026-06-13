// ============================================================================
// MULTI-CAREGIVER CLAIM REMOVED + FAMILY-SHARE UNREACHABLE.
//
// Two-bundle contract:
//
//   A. STORE METADATA — app.json description + features carry no
//      "family care coordination" / "family-care-coordination" claim.
//      The shipped product is a single-caregiver companion in v1.0;
//      the multi-caregiver narrative shelves until a future release.
//
//   B. FAMILY-SHARE UNREACHABLE — no functional inbound navigation
//      to /family-sharing (or its sibling caregiver-management /
//      family-activity surfaces) exists in production code. The
//      cluster of orphaned screens lives on in-tree for the v1.x
//      restoration path, but no router.push / Link / href reaches
//      them from outside the cluster.
//
//      Stack.Screen `name=` registrations in app/_layout.tsx are
//      ROUTE DECLARATIONS, not navigation, and are intentionally
//      allowed — the cluster stays registered so the screens
//      compile + tree-shake correctly.
// ============================================================================

import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '..');

function stripComments(src: string): string {
  // Block + single-line comments out so commit narrative / TODO notes
  // that mention the retired strings can't false-positive the absence
  // pins.
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

// Files that constitute the "family cluster" — these can legitimately
// cross-reference each other since they form an internally-consistent
// orphan surface in v1.0.
const CLUSTER = [
  'app/family-sharing.tsx',
  'app/family-activity.tsx',
  'app/caregiver-management.tsx',
];

function isClusterFile(rel: string): boolean {
  return CLUSTER.some((c) => rel === c);
}

function walk(dir: string, exts: string[]): string[] {
  const out: string[] = [];
  let entries: any[] = [];
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const ent of entries) {
    const full = join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === 'node_modules' || ent.name === '.git' || ent.name === '__tests__') continue;
      out.push(...walk(full, exts));
    } else if (exts.some((e) => ent.name.endsWith(e))) {
      out.push(full);
    }
  }
  return out;
}

describe('Multi-caregiver claim removed + family-share unreachable', () => {
  describe('A. Store metadata', () => {
    const json = JSON.parse(readFileSync(join(ROOT, 'app.json'), 'utf8'));
    const description: string = json?.expo?.description ?? '';
    const features: string[] = json?.expo?.extra?.features ?? [];

    it('app.json description does not claim "family care coordination"', () => {
      expect(description.toLowerCase()).not.toContain('family care coordination');
    });

    it('app.json features[] does not include "family-care-coordination"', () => {
      expect(features).not.toContain('family-care-coordination');
    });

    it('app.json features[] includes "caregiver-handoff-notes" (the v1.0 replacement)', () => {
      expect(features).toContain('caregiver-handoff-notes');
    });
  });

  describe('B. family-share is unreachable from outside the cluster', () => {
    it('no router.push / router.replace / navigate / Link href to family-sharing outside the cluster files', () => {
      const files = walk(join(ROOT, 'app'), ['.ts', '.tsx']);
      // Patterns that ATTEMPT inbound navigation to the family-share
      // cluster. Stack.Screen `name="family-sharing"` registrations
      // are deliberately NOT in this list — they are route declarations
      // in _layout.tsx, not navigation.
      const navPatterns = [
        /router\.push\([\s\S]{0,200}?\bfamily-sharing\b/,
        /router\.replace\([\s\S]{0,200}?\bfamily-sharing\b/,
        /\bnavigate\(\s*['"`][^'"`]*\bfamily-sharing\b/,
        /\bhref\s*=\s*\{?\s*['"`][^'"`]*\bfamily-sharing\b/,
      ];
      const offenders: string[] = [];
      for (const f of files) {
        const rel = f.slice(ROOT.length + 1);
        if (isClusterFile(rel)) continue;
        const stripped = stripComments(readFileSync(f, 'utf8'));
        for (const re of navPatterns) {
          if (re.test(stripped)) {
            offenders.push(`${rel} matches ${re}`);
          }
        }
      }
      expect(offenders).toEqual([]);
    });
  });
});
