// ============================================================================
// Handoff builder uniqueness audit (Phase 5.8.e — Phase 31 reframe).
//
// Pins the post-consolidation invariant: only ONE module produces the
// canonical handoff-text-or-payload. Pre-Phase-31 the canonical was
// utils/handoffReportBuilder.ts :: buildHandoffReport (today-hardcoded
// curated template). Phase 31 retires that path entirely and promotes
// utils/handoffDayBuilder.ts :: buildHandoffDay as the canonical
// single-day handoff bundler, fed to services/handoffPdf.ts for
// rendering. This audit pins the new canonical so a future drift
// (a second bundler / a parallel template) gets caught here at PR
// time.
//
// Whitelist:
//   • utils/handoffDayBuilder.ts :: buildHandoffDay       — canonical bundler
//   • services/handoffPdf.ts     :: generateAndShareHandoff — renders bundled
//     payload to PDF (NOT a content builder; consumes the canonical payload)
//
// Phase 31 retired buildPreviewText (HandoffSheet.tsx file deleted) and
// buildHandoffReport (utils/handoffReportBuilder.ts deleted). The
// regex sweep below still catches future near-clone names (Builder /
// assemble*Handoff / build*Handoff*) so the pattern this audit was
// designed for — a second canonical sneaking in — stays defended.
// ============================================================================

import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const SOURCE_DIRS = ['utils', 'services', 'components', 'app', 'lib', 'storage'];
const SKIP_DIRS = new Set([
  'node_modules', '__tests__', '.git', '.expo', 'ios', 'android', 'build', 'dist',
]);

function walk(dir: string, out: string[] = []): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of entries) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    let s: ReturnType<typeof statSync>;
    try { s = statSync(full); } catch { continue; }
    if (s.isDirectory()) {
      walk(full, out);
    } else if (name.endsWith('.ts') || name.endsWith('.tsx')) {
      out.push(full);
    }
  }
  return out;
}

function listSourceFiles(): string[] {
  const all: string[] = [];
  for (const d of SOURCE_DIRS) {
    walk(join(ROOT, d), all);
  }
  return all;
}

describe('Handoff builder uniqueness (Phase 5.8.e — Phase 31 reframe)', () => {
  const files = listSourceFiles();

  it('only utils/handoffDayBuilder.ts defines buildHandoffDay (the canonical bundler)', () => {
    const offenders: string[] = [];
    for (const f of files) {
      const src = readFileSync(f, 'utf8');
      if (!/\bfunction\s+buildHandoffDay\b/.test(src) &&
          !/\bbuildHandoffDay\s*=\s*(?:async\s+)?\(/.test(src)) {
        continue;
      }
      const rel = f.replace(ROOT + '/', '');
      if (rel !== 'utils/handoffDayBuilder.ts') offenders.push(rel);
    }
    expect(offenders).toEqual([]);
  });

  it('no other module declares a function whose name produces handoff text (near-clone guard)', () => {
    // Catch obvious near-clones: build*Handoff* / handoff*Builder* /
    // assemble*Handoff*. The canonical bundler is whitelisted.
    //
    // The regex deliberately requires the literal "Handoff" substring AFTER
    // an initial uppercase letter, which means it does NOT match
    // `buildHandoffDay` itself (verified). It also catches the retired
    // legacy helper buildPreviewText so any re-introduction is flagged.
    const offenders: { file: string; match: string }[] = [];
    const RE = /\bfunction\s+(build[A-Z]\w*Handoff\w*|handoff[A-Z]\w*Builder\w*|assemble[A-Z]\w*Handoff\w*|buildPreviewText)\b/;
    for (const f of files) {
      const rel = f.replace(ROOT + '/', '');
      if (rel === 'utils/handoffDayBuilder.ts') continue;
      const src = readFileSync(f, 'utf8');
      const m = src.match(RE);
      if (m) offenders.push({ file: rel, match: m[1] });
    }
    expect(offenders).toEqual([]);
  });

  it('Phase 31 F3 — HandoffSheet.tsx file is RETIRED entirely (which trivially retires its legacy buildPreviewText helper)', () => {
    // Pre-F3 this contract read HandoffSheet.tsx and asserted the
    // legacy buildPreviewText helper had been removed (Phase 5.8.e
    // consolidation). Phase 31 F3 (2026-05-21) retired the entire
    // HandoffSheet component — the Journal page already shows all
    // the data, and Share fires generateAndShareHandoff directly
    // without an intermediate modal. The retirement subsumes the
    // 5.8.e helper-removal pin.
    expect(existsSync(join(ROOT, 'components/journal/HandoffSheet.tsx'))).toBe(false);
  });

  it('the canonical bundler is exported and importable from utils/handoffDayBuilder.ts', () => {
    const src = readFileSync(
      join(ROOT, 'utils/handoffDayBuilder.ts'),
      'utf8',
    );
    expect(src).toMatch(/export\s+async\s+function\s+buildHandoffDay\b/);
  });

  it('Phase 31 — the retired buildHandoffReport canonical is GONE from the source tree (utils/handoffReportBuilder.ts deleted)', () => {
    // Defense-in-depth: ensure the pre-31 canonical does not silently
    // come back as a sibling builder. The file was deleted as part of
    // Phase 31's cleanup; this pin catches any future re-introduction.
    expect(existsSync(join(ROOT, 'utils/handoffReportBuilder.ts'))).toBe(false);
  });
});
