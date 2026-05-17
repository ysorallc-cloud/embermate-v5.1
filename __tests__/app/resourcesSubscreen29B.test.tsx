// ============================================================================
// Phase 29 Batch B F1 — /resources subscreen scaffold.
//
// The compact ResourcesList variant on the You tab routes here via per-row
// navigate('/resources'). The subscreen renders the default ResourcesList
// variant (full inline expand-on-tap) wrapped in a SubScreenHeader, mirroring
// the caregiver-wellness sibling-subscreen pattern.
//
// Title shipped in Batch B: "Resources" (neutral admin copy matching
// SubScreenHeader's default 32pt sans-serif weight 300 typography).
// Batch C will retitle to "For when you need it" SIMULTANEOUSLY with
// SubScreenHeader's titleVariant='serif' addition — the witness-voice
// copy + serif italic typography land together to avoid the
// admin-shout-over-whisper-copy mismatch Option A (Batch B typography
// decision) was explicitly designed to prevent.
//
// Tracker: memory/project_batch_c_scope_tracker.md pairs the title flip
// + titleVariant work as must-land-together.
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

  it('contract S4: SubScreenHeader title is "Resources" (Batch B interim — Batch C retitles)', () => {
    const src = readFileSync(SUBSCREEN_PATH, 'utf8');
    // Match either a string-literal title prop or a JSX expression
    // resolving to the literal "Resources".
    expect(src).toMatch(/<SubScreenHeader[^>]*title=\{?['"]Resources['"]\}?/);
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
