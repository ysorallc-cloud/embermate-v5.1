// ============================================================================
// Now header compression — Phase 3.6.2.
//
// Device review of Phase 3.5 showed the Now-tab header consuming ~110pt
// of vertical space for what it communicates: a greeting, the device
// clock (already shown in the iOS status bar above), a weather emoji,
// and the next-meds time. The "5:58 PM" current-time display was a
// tautology — the device clock is already visible — and the metadata
// row added ~30pt for an emoji + time + subtitle that could be inlined.
//
// 3.6.2 fix: collapse to a tighter ~60pt header zone.
//   • Greeting title fontSize 32 → 22, fontWeight 300 → 500,
//     letterSpacing -0.5 → -0.3.
//   • Drop the standalone metadata row (emoji + current time + dot +
//     subtitle).
//   • Replace with a single inline subtitle: "{tod-emoji} {subtitle}".
//   • Subtitle styling: fontSize 12, textSecondary, marginTop 4.
//
// The patient chip on NowHeader is already compact (height 22); this
// test asserts ≤ 32 to allow either the existing geometry or the
// spec's nominal target.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const greetingSrc = readFileSync(
  join(ROOT, 'components/now/NowGreeting.tsx'),
  'utf8',
);
const headerSrc = readFileSync(
  join(ROOT, 'components/now/NowHeader.tsx'),
  'utf8',
);

function extractStyleBody(src: string, name: string): string {
  const open = src.indexOf(`${name}: {`);
  if (open < 0) return '';
  const start = open + `${name}: {`.length;
  let depth = 1;
  let i = start;
  while (i < src.length && depth > 0) {
    if (src[i] === '{') depth += 1;
    else if (src[i] === '}') depth -= 1;
    i += 1;
  }
  return src.slice(start, i - 1);
}

function num(body: string, prop: string): number | null {
  const m = body.match(new RegExp(`\\b${prop}:\\s*(-?\\d+(?:\\.\\d+)?)`));
  return m ? Number(m[1]) : null;
}

describe('Phase 3.6.2 — Now greeting compressed (Phase 33b Scope 1 relock)', () => {
  it('greeting title fontSize is 26 (Phase 33b Scope 1 canonical block; was 22 post-3.6.2 / 32 pre-3.6.2)', () => {
    // Phase 3.6.2 (May 3) compressed greeting from 32 → 22pt sans.
    // Phase 33b Scope 1 (2026-05-18) relocked to canonical block per
    // `.phone-greeting` website canon — 26pt regular serif weight 400
    // letterSpacing -0.5. The compression intent survives (greeting
    // stays smaller than the page-header 32pt register on Insights/
    // Journal); the exact value moves to canon.
    const body = extractStyleBody(greetingSrc, 'title');
    expect(num(body, 'fontSize')).toBe(26);
  });

  it('no element in NowGreeting uses fontSize ≥ 28 (heroes capped)', () => {
    const sizes = Array.from(
      greetingSrc.matchAll(/fontSize:\s*(\d+(?:\.\d+)?)/g),
    ).map((m) => Number(m[1]));
    for (const s of sizes) {
      expect(s).toBeLessThan(28);
    }
  });

  it('no standalone metadata row contains the device-clock time format', () => {
    // The prior `metadataTime` element rendered a "5:58 PM" current-time
    // string from formatCurrentTime(). With the metadata row removed,
    // formatCurrentTime should no longer be called — the device clock
    // in the iOS status bar already covers that.
    expect(greetingSrc).not.toMatch(/formatCurrentTime\s*\(\s*\)/);
  });

  it('no metadataRow / metadataTime / metadataDot styles remain', () => {
    expect(greetingSrc).not.toMatch(/\bmetadataRow:\s*\{/);
    expect(greetingSrc).not.toMatch(/\bmetadataTime:\s*\{/);
    expect(greetingSrc).not.toMatch(/\bmetadataDot:\s*\{/);
  });

  it('a single inline subtitle style exists with fontSize 12 + textSecondary', () => {
    const body = extractStyleBody(greetingSrc, 'subtitle');
    expect(body.length).toBeGreaterThan(0);
    expect(num(body, 'fontSize')).toBe(12);
    expect(body).toMatch(/color:\s*c\.textSecondary\b/);
  });

  it('subtitle marginTop is 4 (tighter than the prior 8pt metadata gap)', () => {
    const body = extractStyleBody(greetingSrc, 'subtitle');
    expect(num(body, 'marginTop')).toBe(4);
  });
});

describe('Phase 3.6.2 — Patient chip stays compact', () => {
  it('patientChip rendered height ≤ 32pt (compact pill)', () => {
    // Either an explicit height ≤ 32 OR pV/pH that compose ≤ 32.
    const body = extractStyleBody(headerSrc, 'patientChip');
    expect(body.length).toBeGreaterThan(0);
    const h = num(body, 'height');
    if (h !== null) {
      expect(h).toBeLessThanOrEqual(32);
    } else {
      // Fall back to padding-based composition. Avatar inner height is
      // 16pt; even with vertical padding 8, total stays ≤ 32.
      const pV = num(body, 'paddingVertical') ?? 0;
      expect(16 + pV * 2).toBeLessThanOrEqual(32);
    }
  });
});
