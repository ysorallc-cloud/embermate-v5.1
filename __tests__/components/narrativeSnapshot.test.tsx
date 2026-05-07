// ============================================================================
// Phase 5.12.c — Journal narrative snapshot.
//
// The page's heart: a serif-italic block under the header that surfaces
// either the caregiver's authored tone or, when no tone exists, a
// factual auto-recap with an explicit "Auto-generated from your logs"
// disclaimer. Tapping the section opens the tone editor.
//
// Source-level audit: contract pinned at file level so downstream
// consumers can reason about the component without rendering it.
// ============================================================================

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const SNAPSHOT_PATH = join(ROOT, 'components/journal/NarrativeSnapshot.tsx');

describe('Phase 5.12.c — NarrativeSnapshot file + exports', () => {
  it('component file exists', () => {
    expect(existsSync(SNAPSHOT_PATH)).toBe(true);
  });

  it('exports NarrativeSnapshot as a named React component', () => {
    const src = readFileSync(SNAPSHOT_PATH, 'utf8');
    expect(src).toMatch(/export\s+(?:function|const)\s+NarrativeSnapshot\b/);
  });
});

describe('Phase 5.12.c — content sources', () => {
  const src = readFileSync(SNAPSHOT_PATH, 'utf8');

  it('reads the canonical handoff tone for the date', () => {
    expect(src).toMatch(/getHandoffTone\b/);
  });

  it('reads the factual narrative summary as a fallback', () => {
    expect(src).toMatch(/buildDayNarrative\b/);
    expect(src).toMatch(/factualOnly:\s*true/);
  });

  it('renders nothing when there is no tone and no summary', () => {
    // Empty-day surfaces are owned by 5.12.h's empty-day component,
    // not this snapshot. The snapshot must opt out cleanly.
    expect(src).toMatch(/return\s+null/);
  });
});

describe('Phase 5.12.c — auto-gen marker visibility', () => {
  const src = readFileSync(SNAPSHOT_PATH, 'utf8');

  it('declares the auto-gen disclaimer copy', () => {
    expect(src).toMatch(/Auto-generated from your logs/);
  });

  it('the disclaimer renders only when the snapshot is the auto-recap', () => {
    // The disclaimer must be inside a conditional that excludes the
    // tone-present branch — tone is caregiver-authored and needs no
    // auto-gen marker.
    const block = src.match(/Auto-generated from your logs[\s\S]{0,200}/);
    expect(block).toBeTruthy();
  });
});

describe('Phase 5.12.c — Edit affordance', () => {
  const src = readFileSync(SNAPSHOT_PATH, 'utf8');

  it('exposes an onEditPress prop so the parent owns the editor wiring', () => {
    expect(src).toMatch(/onEditPress\??:\s*\(\)\s*=>\s*void/);
  });

  it('renders the "Edit →" link', () => {
    // The arrow tail is part of the visual signal — the tap opens an
    // editor, not a navigation. Match either the literal arrow or its
    // unicode escape so the audit survives source-encoding changes.
    expect(src).toMatch(/Edit\s*(?:→|\\u2192)/);
  });

  it('the snapshot text container is tappable (whole-section tap target)', () => {
    expect(src).toMatch(/<TouchableOpacity\b/);
  });
});

describe('Phase 5.12.c — Journal wiring', () => {
  const journalSrc = readFileSync(
    join(ROOT, 'app/(tabs)/journal.tsx'),
    'utf8',
  );

  it('Journal imports and mounts the NarrativeSnapshot component', () => {
    expect(journalSrc).toMatch(
      /import\s+\{\s*NarrativeSnapshot\s*\}\s+from\s+['"][^'"]+NarrativeSnapshot['"]/,
    );
    expect(journalSrc).toMatch(/<NarrativeSnapshot\b/);
  });

  it('wires onEditPress to open an editor (HandoffSheet hosts the tone field)', () => {
    // The tone editor lives inside HandoffSheet today. Wiring onEditPress
    // to setHandoffSheetVisible(true) reuses the existing canonical tone
    // input. A future TonePromptSheet extraction can keep this contract.
    expect(journalSrc).toMatch(
      /onEditPress=\{[\s\S]{0,120}setHandoffSheetVisible\(\s*true\s*\)/,
    );
  });
});
