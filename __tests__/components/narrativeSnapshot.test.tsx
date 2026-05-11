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

describe('Phase 22.1 — auto-gen marker retired (was Phase 5.12.c)', () => {
  const src = readFileSync(SNAPSHOT_PATH, 'utf8');

  it('no longer declares the "Auto-generated from your logs" footnote', () => {
    // Phase 22.1 — the inline footnote + "Edit →" link retired from
    // NarrativeSnapshot. The Journal page reads as a handoff document
    // now; editing tone belongs on the canonical HandoffSheet surface,
    // still reachable via the sticky "Share handoff →" bottom button.
    expect(src).not.toMatch(/Auto-generated from your logs/);
  });
});

describe('Phase 22.1 — Edit affordance retired (was Phase 5.12.c)', () => {
  const src = readFileSync(SNAPSHOT_PATH, 'utf8');

  it('still exposes onEditPress prop (kept for parent-owned editor wiring; HandoffSheet still hooks here)', () => {
    // The prop stays so callers that bind it to setHandoffSheetVisible
    // keep working. Only the inline UI affordance ("Edit →" link)
    // is retired — the wrapping TouchableOpacity continues to invoke
    // onEditPress on tap.
    expect(src).toMatch(/onEditPress\??:\s*\(\)\s*=>\s*void/);
  });

  it('no longer renders the inline "Edit →" link', () => {
    // Phase 22.1 — inline affordance retired with the auto-gen
    // footnote. Sticky "Share handoff →" button at the bottom of
    // Journal is the surviving entry point to HandoffSheet.
    expect(src).not.toMatch(/['"]Edit\s*→['"]/);
    expect(src).not.toMatch(/['"]Edit\s*\\u2192['"]/);
  });

  it('the snapshot text container is still tappable (TouchableOpacity wrapper preserved)', () => {
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
