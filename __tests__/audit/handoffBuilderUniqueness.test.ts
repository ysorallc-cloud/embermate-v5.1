// ============================================================================
// Phase 5.8.e — handoff builder uniqueness audit
//
// Pins the post-consolidation invariant: only utils/handoffReportBuilder.ts
// produces today's handoff text. New builders that drift this rule will
// be caught here.
//
// Whitelist:
//   • utils/handoffReportBuilder.ts :: buildHandoffReport — canonical text
//   • services/handoffPdf.ts :: generateAndShareHandoff — renders canonical
//     to PDF (NOT a content builder; reads canonical bodyText input)
// ============================================================================

import { readFileSync, readdirSync, statSync } from 'fs';
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

describe('Phase 5.8.e — handoff builder uniqueness', () => {
  const files = listSourceFiles();

  it('only utils/handoffReportBuilder.ts defines buildHandoffReport', () => {
    const offenders: string[] = [];
    for (const f of files) {
      const src = readFileSync(f, 'utf8');
      if (!/\bfunction\s+buildHandoffReport\b/.test(src) &&
          !/\bbuildHandoffReport\s*=\s*(?:async\s+)?\(/.test(src)) {
        continue;
      }
      const rel = f.replace(ROOT + '/', '');
      if (rel !== 'utils/handoffReportBuilder.ts') offenders.push(rel);
    }
    expect(offenders).toEqual([]);
  });

  it('no other module declares a function whose name produces handoff text', () => {
    // Catch obvious near-clones: build*Handoff* / handoff*Builder* /
    // assemble*Handoff*. The canonical file is whitelisted.
    const offenders: { file: string; match: string }[] = [];
    const RE = /\bfunction\s+(build[A-Z]\w*Handoff\w*|handoff[A-Z]\w*Builder\w*|assemble[A-Z]\w*Handoff\w*|buildPreviewText)\b/;
    for (const f of files) {
      const rel = f.replace(ROOT + '/', '');
      if (rel === 'utils/handoffReportBuilder.ts') continue;
      const src = readFileSync(f, 'utf8');
      const m = src.match(RE);
      if (m) offenders.push({ file: rel, match: m[1] });
    }
    expect(offenders).toEqual([]);
  });

  it('the legacy buildPreviewText helper is gone from HandoffSheet', () => {
    const sheet = readFileSync(
      join(ROOT, 'components/journal/HandoffSheet.tsx'),
      'utf8',
    );
    expect(sheet).not.toMatch(/\bfunction\s+buildPreviewText\b/);
  });

  it('the canonical builder is exported and importable from utils/handoffReportBuilder.ts', () => {
    const src = readFileSync(
      join(ROOT, 'utils/handoffReportBuilder.ts'),
      'utf8',
    );
    expect(src).toMatch(/export\s+async\s+function\s+buildHandoffReport\b/);
  });
});
