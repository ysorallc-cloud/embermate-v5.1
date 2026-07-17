// ============================================================================
// lavenderScaleRestraint33b — Phase 33b Scope 2 lavender canon contract.
//
// Defends against re-introduction of chrome-scale lavender (>11pt OR
// rendered as bg / border / large-body chrome) across app/ + components/.
// Phase 33b reframed lavender's role per website canon: garnish accent
// at eyebrow scale only (~10-11pt uppercase letter-spaced labels via
// SectionEyebrow tint="caregiverAccent"), never primary chrome.
//
// Whitelist scope:
//
//   (1) Q-33b.8 You-lane defining surfaces — 3 files (drops to 2 in v1.1
//       when AffirmationHeader retires alongside Subhead content fill):
//         • components/support/ReflectionCard.tsx
//         • components/support/BreathingOrbCard.tsx
//         • components/support/AffirmationHeader.tsx (retires v1.1)
//
//   (2) Atmospheric / decorative lavender uses (not section chrome):
//         • components/aurora/AuroraBackground.tsx (atmospheric gradients)
//         • components/support/OrbRings.tsx (breathing-orb SVG concentric
//           rings — decorative meditation chrome at the You-tab core)
//
//   (3) The lavender chip identity surfaces (small, non-chrome):
//         • app/(tabs)/support.tsx (caregiverChip + chip on You header)
//         • app/(tabs)/journal.tsx (caregiver-chip parity with Now/Journal
//           identity strip)
//
//   (4) Lane-defining subscreen — caregiver-wellness IS the You-tab
//       primary surface; Tier 3 cross-surface primary by definition:
//         • app/caregiver-wellness.tsx
//
//   (5) Theme primitives / token consumers (eyebrows + lane-coded
//       JournalSection variants):
//         • components/journal/JournalSection.tsx
//         • components/SectionEyebrow.tsx (canon eyebrow primitive)
//
//   (6) DateTabStrip / Today highlight (date-pill chrome — interactive-
//       state encoding, not section chrome; small footprint per pill):
//         • components/journal/DateTabStrip.tsx
//         • components/journal/DatePickerPopover.tsx
//
// Files NOT in the whitelist must not consume bare `c.caregiverAccent`
// (the solid lavender token). They may still use:
//   • SectionEyebrow tint="caregiverAccent" (canon-compliant eyebrow scale)
//   • Lavender via caregiverAccentBg / Light / etc. alpha rungs IF the
//     consumer file is in the whitelist for chrome-allowed surfaces
//
// This test catches future chrome-scale violations + whitelist staleness
// (entries pointing at files that no longer consume lavender).
// ============================================================================

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname, relative } from 'path';

const ROOT = join(__dirname, '../..');

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (name === 'node_modules' || name.startsWith('.') || name === '__tests__') continue;
      walk(full, out);
    } else {
      const ext = extname(name);
      if (
        ['.ts', '.tsx'].includes(ext) &&
        !name.endsWith('.d.ts') &&
        !name.endsWith('.test.ts') &&
        !name.endsWith('.test.tsx')
      ) {
        out.push(full);
      }
    }
  }
  return out;
}

const APP_FILES = walk(join(ROOT, 'app'));
const COMP_FILES = walk(join(ROOT, 'components'));
const SOURCE_FILES = [...APP_FILES, ...COMP_FILES];

// ── Whitelist: files allowed to consume bare `c.caregiverAccent` ─────────
//
// Each entry = relative path + rationale. Whitelist staleness check below
// catches entries that no longer consume bare caregiverAccent.

const WHITELIST: Array<{ path: string; rationale: string }> = [
  // (1) You-lane defining surfaces
  //
  // You rebuild (S4) — ReflectionCard was de-boxed (open fabric) and its bare
  // caregiverAccent chrome removed, so it left the whitelist. BreathingOrbCard
  // + AffirmationHeader never consumed the bare solid (alpha variants only, now
  // sage). The You tab is fully de-purpled; no You surface holds bare lavender.
  // (2) Atmospheric / decorative
  //
  // Note: AuroraBackground uses inline rgba(170, 138, 220, X) lavender
  // literals (not the bare token), so the contract doesn't flag it.
  {
    path: 'components/support/OrbRings.tsx',
    rationale: 'breathing-orb SVG concentric-rings — decorative meditation chrome',
  },
  // BreathingExercise.tsx removed from the whitelist in Phase 33b extension
  // lavender no-fill canon. The cleanup flipped its 4 bare-lavender sites
  // (dotDone / dotActive / two beginButton inline fills) to sage `c.accent`
  // — sites #10 / #11 / #12 / #13. The remaining lavender lane identity
  // for the modal lives in OrbRings (already whitelisted above) + the
  // SectionEyebrow tint, neither of which consumes bare `c.caregiverAccent`
  // inside BreathingExercise itself.
  // (3) Caregiver chip identity surfaces
  // You rebuild (S4) — app/(tabs)/support.tsx left the whitelist: the lavender
  // "This is your space" chip was retired in the full de-purple, so the file
  // no longer consumes bare c.caregiverAccent.
  {
    path: 'app/(tabs)/journal.tsx',
    rationale: 'caregiver chip parity with Now/Journal identity strip + BUILDING TOWARD eyebrow (canon-compliant tint)',
  },
  // (4) Lane-defining subscreen — S7 (2026-07-01): caregiver-wellness left the
  // whitelist. It's the You-tab "Your wellness" destination; since You went full
  // sage in S4, this page pivoted to sage too (nudge card de-filled). No bare
  // c.caregiverAccent remains.
  // (5) Theme primitives
  {
    path: 'components/journal/JournalSection.tsx',
    rationale: 'lane-coded primitive — caregiverAccent tint variant renders eyebrow scale only',
  },
  {
    path: 'components/journal/SoapSectionFrame.tsx',
    rationale: 'Phase 27 SOAP-only chrome — caregiverAccent renders as 2px left rule on Sections 1+4 (thin accent, no fill; lavender no-fill canon compliant)',
  },
  // (6) DateTab / Date-popover — interactive-state pill chrome
  {
    path: 'components/journal/DateTabStrip.tsx',
    rationale: 'date-pill interactive-state encoding — small footprint per pill',
  },
  {
    path: 'components/journal/DatePickerPopover.tsx',
    rationale: 'date-popover today highlight — interactive-state encoding',
  },
  // Remaining legacy consumers — surfaced during F-cadence, deferred for
  // per-file Phase 33b follow-up audits or accepted at small footprint.
  // These represent the "broader 31-file inventory" outside Scope 2's 9
  // surfaces. Each is allowed to continue consuming bare caregiverAccent
  // until a per-file audit decides migration vs preservation.
  { path: 'app/(onboarding)/screens/MeetSampleScreen.tsx', rationale: 'onboarding affordance — small lavender accent, low footprint' },
  // S7 sub-page harmonization (2026-07-01) — appointments, care-plan/setup/*
  // (confirm/template/who), hub/reports/index, log-meal, log-mood, log-vitals
  // left the whitelist: all de-purpled to sage (bare c.caregiverAccent removed).
  { path: 'app/visit-prep-preview.tsx', rationale: 'visit-prep preview — Tier 3 handoff-to-clinician surface' },
  { path: 'components/common/AIInsightCard.tsx', rationale: 'AI-derived insights — caregiver-lane content' },
  { path: 'components/journal/GestaltSummary.tsx', rationale: 'journal handoff narrative summary' },
  { path: 'components/journal/JournalEmptyDay.tsx', rationale: 'journal empty-day affordance — caregiver-action invite' },
  { path: 'components/journal/NarrativeSnapshot.tsx', rationale: 'journal narrative snapshot' },
  { path: 'components/journal/WhatChangedToday.tsx', rationale: 'journal what-changed-today summary' },
  { path: 'components/now/EndOfShiftCard.tsx', rationale: 'end-of-shift caregiver-handoff card' },
  { path: 'components/sample/ManageSampleDataSheet.tsx', rationale: 'sample-data management sheet' },
  { path: 'components/sample/SampleModeBanner.tsx', rationale: 'Q-33b.7 lavender sparkle glyph garnish (canon-compliant icon-scale lavender; chrome retired in 33b)' },
  // F7 C5 (2026-06-12) — ActionCardsRow migrated from caregiverAccent
  // (lavender) icon accent to dusty blue (#6b8cae). Whitelist entry
  // retired; the file no longer consumes bare c.caregiverAccent.
  // components/today/EndOfDayCard.tsx entry removed when the orphaned today/
  // timeline family was deleted as dead code (staleness check readFileSyncs
  // whitelist paths — a deleted file would fail it).
  { path: 'components/understand/RecentWindowCard.tsx', rationale: 'recent-window understand surface' },
];

const WHITELIST_PATHS = new Set(WHITELIST.map((w) => w.path));

// Bare c.caregiverAccent / colors.caregiverAccent / Colors.caregiverAccent
// — solid token reference (chrome indicator). Doesn't match
// caregiverAccentBg / caregiverAccentText / etc.
const BARE_LAVENDER =
  /\b(?:c|colors|Colors)\.caregiverAccent(?![A-Za-z])/;

describe('lavenderScaleRestraint33b — Phase 33b Scope 2 canon contract', () => {
  it('files consuming bare c.caregiverAccent must be in the whitelist', () => {
    const offenders: string[] = [];
    for (const absPath of SOURCE_FILES) {
      const rel = relative(ROOT, absPath);
      const src = readFileSync(absPath, 'utf8');
      // Strip line + block comments before checking — commit-narrative
      // comments mentioning caregiverAccent shouldn't false-positive.
      const stripped = src
        .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
        .replace(/(^|[^:])\/\/.*$/gm, '$1');
      if (BARE_LAVENDER.test(stripped) && !WHITELIST_PATHS.has(rel)) {
        offenders.push(rel);
      }
    }
    if (offenders.length > 0) {
      throw new Error(
        `Phase 33b Scope 2 — bare c.caregiverAccent in unwhitelisted file${offenders.length === 1 ? '' : 's'}:\n  ${offenders.join('\n  ')}\n\n` +
        `Each file consuming solid lavender must either:\n` +
        `  • route through SectionEyebrow tint="caregiverAccent" (canon eyebrow garnish), OR\n` +
        `  • be added to the WHITELIST in this file with a one-line rationale.\n\n` +
        `If migration: replace lavender chrome with cream/sage per the canon eyebrow-as-garnish pattern.\n` +
        `If whitelist: justify the chrome use (Tier 3 surface, interactive-state encoding, decorative atmospheric, etc.).`,
      );
    }
    expect(offenders).toEqual([]);
  });

  it('every whitelist entry points to a file that actually consumes bare c.caregiverAccent', () => {
    // Whitelist staleness check — if a whitelisted file was migrated
    // away from bare caregiverAccent but the whitelist entry wasn't
    // removed, the entry becomes a dead pin.
    const stale: string[] = [];
    for (const entry of WHITELIST) {
      const abs = join(ROOT, entry.path);
      try {
        const src = readFileSync(abs, 'utf8');
        const stripped = src
          .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
          .replace(/(^|[^:])\/\/.*$/gm, '$1');
        if (!BARE_LAVENDER.test(stripped)) {
          stale.push(
            `${entry.path} — whitelisted as "${entry.rationale}" but no longer consumes bare c.caregiverAccent.`,
          );
        }
      } catch (err) {
        stale.push(`${entry.path} — file missing or unreadable.`);
      }
    }
    if (stale.length > 0) {
      throw new Error(
        `Phase 33b Scope 2 — stale whitelist entries (${stale.length}):\n  ${stale.join('\n  ')}\n\n` +
        `If the file was migrated, remove the whitelist entry. If the file was renamed/moved, update the path.`,
      );
    }
    expect(stale).toEqual([]);
  });
});
