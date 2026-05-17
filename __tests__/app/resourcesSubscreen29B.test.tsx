// ============================================================================
// Phase 29 Batch B F1 — /resources subscreen scaffold.
//
// The compact ResourcesList variant on the You tab routes here via per-row
// navigate('/resources'). The subscreen renders the default ResourcesList
// variant (full inline expand-on-tap) wrapped in a SubScreenHeader, mirroring
// the caregiver-wellness sibling-subscreen pattern.
//
// Title shipped in Batch C: "For when you need it" + titleVariant='serif'
// — the witness-voice copy + Georgia italic typography landing together
// as Batch C Pair 1 promised. Pre-C the title was "Resources" (neutral
// admin copy) to match SubScreenHeader's default sans typography until
// the serif variant was ready.
// ============================================================================

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const SUBSCREEN_PATH = join(ROOT, 'app/resources.tsx');

describe('Phase 29 Batch B F1 — /resources subscreen scaffold', () => {
  it('contract S1: app/resources.tsx exists at the canonical Expo Router path', () => {
    expect(existsSync(SUBSCREEN_PATH)).toBe(true);
  });

  it('contract S2: subscreen imports SubScreenHeader', () => {
    const src = readFileSync(SUBSCREEN_PATH, 'utf8');
    expect(src).toMatch(
      /import\s*\{[^}]*\bSubScreenHeader\b[^}]*\}\s*from\s*['"][^'"]*SubScreenHeader['"]/,
    );
  });

  it('contract S3: subscreen imports ResourcesList', () => {
    const src = readFileSync(SUBSCREEN_PATH, 'utf8');
    expect(src).toMatch(
      /import\s*\{[^}]*\bResourcesList\b[^}]*\}\s*from\s*['"][^'"]*ResourcesList['"]/,
    );
  });

  it('contract S4: SubScreenHeader title is "For when you need it" with titleVariant="serif" (Batch C retitle)', () => {
    const src = readFileSync(SUBSCREEN_PATH, 'utf8');
    expect(src).toMatch(/<SubScreenHeader[^>]*title=['"]For when you need it['"]/);
    expect(src).toMatch(/<SubScreenHeader[^>]*titleVariant=['"]serif['"]/);
    // Absence pin: pre-C neutral admin title retired.
    expect(src).not.toMatch(/<SubScreenHeader[^>]*title=['"]Resources['"]/);
  });

  it('contract S5: subscreen mounts ResourcesList in default variant (no variant prop passed)', () => {
    const src = readFileSync(SUBSCREEN_PATH, 'utf8');
    // Self-closing OR paired <ResourcesList /> without a variant prop.
    // Default variant is the existing full inline expand-on-tap shape —
    // the subscreen surfaces the full reference experience.
    expect(src).toMatch(/<ResourcesList\s*\/>/);
    // Absence pin: no variant="compact" on the subscreen mount.
    expect(src).not.toMatch(/<ResourcesList[^>]*variant=['"]compact['"]/);
  });
});
