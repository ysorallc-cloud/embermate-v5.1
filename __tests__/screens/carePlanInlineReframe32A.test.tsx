// ============================================================================
// Phase 32A — Care Plan inline-expand reframe (structural contract).
//
// Source-level audit for the F2 page restructure. Pins:
//
//   1. Three section bucket-allocation constants exist with the locked
//      membership: ALWAYS_ON_BUCKETS=['meds'],
//      DAILY_TRACKING_BUCKETS=['vitals','wellness','meals'],
//      ADD_WHEN_READY_BUCKETS=['water','sleep','activity','appointments'].
//   2. None of the three MVP-suppressed buckets (errands, shifts,
//      self_care) appear in any section list. (The "MVP render filter"
//      from the brief is expressed structurally — they're absent from
//      every section, not filtered at render time.)
//   3. The dead `allBuckets` const at the pre-32A care-plan/index.tsx:232
//      is retired.
//   4. The three section eyebrows render via the SectionEyebrow primitive
//      with the canonical labels ("Always on", "Daily tracking", "Add
//      when ready") — letterSpacing/uppercase canon is owned by
//      SectionEyebrow itself.
//   5. The render scaffold tracks ONE expanded bucket at a time (single
//      `expandedBucket` state — accordion behavior). Toggle-on opens the
//      drawer for that bucket and closes any other open drawer; toggle-
//      off clears the state.
//
// Render-level pins (full mount + interaction) get added by F4 (meds
// inline list) and F6+ (drawer chip/dropdown internals) when those Fs
// land. F2's job is the structural skeleton — sections, row allocation,
// accordion state, dead-code retirement.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const SRC = readFileSync(join(ROOT, 'app/care-plan/index.tsx'), 'utf8');

// Strip line + block comments so structural assertions don't false-
// positive on commentary that mentions retired symbols by name.
function stripComments(s: string): string {
  return s
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '');
}

const STRIPPED = stripComments(SRC);

describe('Phase 32A F2 — Care Plan main 3-section restructure', () => {
  // --------------------------------------------------------------------------
  // Section bucket allocation (locked from brief)
  // --------------------------------------------------------------------------

  describe('contract 1: section bucket-allocation constants', () => {
    it('declares ALWAYS_ON_BUCKETS = [meds]', () => {
      // Match `const ALWAYS_ON_BUCKETS ... = [ ... 'meds' ... ]`.
      const m = STRIPPED.match(/const\s+ALWAYS_ON_BUCKETS[^=]*=\s*\[([^\]]*)\]/);
      expect(m).not.toBeNull();
      const body = m![1];
      expect(body).toMatch(/['"]meds['"]/);
      // No other buckets in this list.
      const matches = body.match(/['"][a-z_]+['"]/g) ?? [];
      expect(matches).toEqual(["'meds'"].map((s) => s.replace(/'/g, "'")) /* identity */);
    });

    it('declares DAILY_TRACKING_BUCKETS = [vitals, wellness, meals]', () => {
      const m = STRIPPED.match(/const\s+DAILY_TRACKING_BUCKETS[^=]*=\s*\[([^\]]*)\]/);
      expect(m).not.toBeNull();
      const body = m![1];
      expect(body).toMatch(/['"]vitals['"]/);
      expect(body).toMatch(/['"]wellness['"]/);
      expect(body).toMatch(/['"]meals['"]/);
      // Exactly three entries — nothing extra slipped in.
      const matches = body.match(/['"][a-z_]+['"]/g) ?? [];
      expect(matches.length).toBe(3);
    });

    it('declares ADD_WHEN_READY_BUCKETS = [water, sleep, activity, appointments]', () => {
      const m = STRIPPED.match(/const\s+ADD_WHEN_READY_BUCKETS[^=]*=\s*\[([^\]]*)\]/);
      expect(m).not.toBeNull();
      const body = m![1];
      expect(body).toMatch(/['"]water['"]/);
      expect(body).toMatch(/['"]sleep['"]/);
      expect(body).toMatch(/['"]activity['"]/);
      expect(body).toMatch(/['"]appointments['"]/);
      // Exactly four entries — render-filter integrity via list shape.
      const matches = body.match(/['"][a-z_]+['"]/g) ?? [];
      expect(matches.length).toBe(4);
    });
  });

  // --------------------------------------------------------------------------
  // MVP suppression — none of the three retired-from-UI buckets in any
  // section list. This is the "render filter" expressed structurally.
  // --------------------------------------------------------------------------

  describe('contract 2: MVP-suppressed buckets absent from every section', () => {
    it.each(['errands', 'shifts', 'self_care'] as const)(
      "no section list contains '%s'",
      (bucket) => {
        // Pull each section's array body and assert the bucket is absent
        // from all three.
        for (const sectionName of ['ALWAYS_ON_BUCKETS', 'DAILY_TRACKING_BUCKETS', 'ADD_WHEN_READY_BUCKETS']) {
          const m = STRIPPED.match(new RegExp(`const\\s+${sectionName}[^=]*=\\s*\\[([^\\]]*)\\]`));
          if (!m) continue;
          const body = m[1];
          expect(body).not.toMatch(new RegExp(`['"]${bucket}['"]`));
        }
      },
    );
  });

  // --------------------------------------------------------------------------
  // F3 — MVP suppression made explicit via a named const so future
  // contributors don't have to infer it from the section consts' absence.
  // --------------------------------------------------------------------------

  describe('contract 2b: MVP_SUPPRESSED_BUCKETS const documents the render filter', () => {
    it('source declares MVP_SUPPRESSED_BUCKETS containing exactly errands, shifts, self_care', () => {
      const m = STRIPPED.match(/const\s+MVP_SUPPRESSED_BUCKETS[^=]*=\s*\[([^\]]*)\]/);
      expect(m).not.toBeNull();
      const body = m![1];
      expect(body).toMatch(/['"]errands['"]/);
      expect(body).toMatch(/['"]shifts['"]/);
      expect(body).toMatch(/['"]self_care['"]/);
      // Exactly three — no narrowing or widening without an explicit decision.
      const matches = body.match(/['"][a-z_]+['"]/g) ?? [];
      expect(matches.length).toBe(3);
    });
  });

  // --------------------------------------------------------------------------
  // Dead-code retirement
  // --------------------------------------------------------------------------

  describe('contract 3: dead `allBuckets` const retired', () => {
    it('no `const allBuckets =` declaration remains in the file', () => {
      expect(STRIPPED).not.toMatch(/const\s+allBuckets\s*[:=]/);
    });
  });

  // --------------------------------------------------------------------------
  // Section eyebrows via SectionEyebrow primitive
  // --------------------------------------------------------------------------

  describe('contract 4: section eyebrows render via SectionEyebrow', () => {
    it('imports SectionEyebrow from components/SectionEyebrow', () => {
      expect(STRIPPED).toMatch(/import\s*\{[^}]*\bSectionEyebrow\b[^}]*\}\s*from\s*['"][^'"]*SectionEyebrow['"]/);
    });

    it('renders <SectionEyebrow text="Always on" ... />', () => {
      expect(STRIPPED).toMatch(/<SectionEyebrow[^/]*text=["']Always on["']/i);
    });

    it('renders <SectionEyebrow text="Daily tracking" ... />', () => {
      expect(STRIPPED).toMatch(/<SectionEyebrow[^/]*text=["']Daily tracking["']/i);
    });

    it('renders <SectionEyebrow text="Add when ready" ... />', () => {
      expect(STRIPPED).toMatch(/<SectionEyebrow[^/]*text=["']Add when ready["']/i);
    });
  });

  // --------------------------------------------------------------------------
  // F4 — Medications inline-expanded list. Renders ALWAYS expanded
  // (no toggle, no drawer chrome). Compact rows for each med (name +
  // dosage + time slot); "+ Add medication" affordance at bottom;
  // empty state when no meds. Per-med edit + add affordances route to
  // the canonical /medication-form deep links (the brief's
  // "or whatever the existing path is" defers to actual code — and the
  // meds subscreen itself routes to /medication-form for both flows).
  // --------------------------------------------------------------------------

  describe('contract 6: Medications inline list (F4 — 32A.1 F2 reframe: lives in MedicationsDrawer.tsx)', () => {
    // Phase 32A.1 F2 — the inline list extracted from care-plan/index.tsx
    // into components/careplan/drawers/MedicationsDrawer.tsx. The
    // contract pins below now read against the drawer source file
    // (consistent with the 7 other drawers shipped in Slice B of 32A —
    // each pinned at its own component file). care-plan/index.tsx
    // imports + mounts the drawer, gated on medsExpanded (pinned in
    // carePlanMedsDrawer32A1.test.tsx).
    const drawerSrc = readFileSync(
      join(ROOT, 'components/careplan/drawers/MedicationsDrawer.tsx'),
      'utf8',
    );

    it('drawer reads config.meds.medications to render the list', () => {
      // Accept optional-chaining variant (`config?.meds?.medications`)
      // — the drawer uses it for null-safety since useCarePlanConfig
      // may return null while loading.
      expect(drawerSrc).toMatch(/config\??\.meds\??\.medications|medsConfig\??\.medications/);
    });

    it('drawer contains the meds list test anchor (testID="meds-inline-list")', () => {
      expect(drawerSrc).toMatch(/testID=["']meds-inline-list["']/);
    });

    it('per-med edit affordance routes to /medication-form?id=<medId>&source=careplan', () => {
      expect(drawerSrc).toMatch(/\/medication-form\?id=\$\{[^}]+\}&source=careplan/);
    });

    it('add-medication affordance routes to /medication-form?source=careplan', () => {
      expect(drawerSrc).toMatch(/['"`]\/medication-form\?source=careplan['"`]/);
    });

    it('empty-state copy "No meds added yet" preserved', () => {
      expect(drawerSrc).toMatch(/No meds added yet/);
    });
  });

  // --------------------------------------------------------------------------
  // F5 — Surface retirement on home per P1+P2 locks.
  //
  //   P1: Quick Start TemplateCard surface RETIRED. The brief OUT-OF-SCOPE
  //       explicitly rejects templates ("EmberMate isn't right-sized for
  //       specific scenarios, templates would pretend it is"). The wizard's
  //       own template step stays untouched (wizard is OUT OF SCOPE per brief).
  //
  //   P2: Contextual insight banners — retire ones whose CTA breaks under
  //       the new layout, keep ones still semantically valid:
  //         RETIRE: start-simple ("enable Mood" — not a row),
  //                 select-vitals ("Tap Configure" — no Configure button),
  //                 focus-suggestion ("Focus for better habits" — named in brief).
  //         KEEP:   add-meds (with copy refresh to point at F4 affordance),
  //                 refill-reminder (still semantically valid),
  //                 enable-notifications ("Stay on track").
  // --------------------------------------------------------------------------

  describe('contract 7: Quick Start TemplateCard surface retired (P1)', () => {
    it('source no longer imports TemplateMedSeedingModal', () => {
      expect(STRIPPED).not.toMatch(/import\s*\{[^}]*\bTemplateMedSeedingModal\b[^}]*\}/);
    });

    it('source no longer declares a TemplateCard component', () => {
      expect(STRIPPED).not.toMatch(/function\s+TemplateCard\b/);
    });

    it('source no longer declares an applyTemplate callback', () => {
      expect(STRIPPED).not.toMatch(/\bconst\s+applyTemplate\s*=/);
    });

    it('source no longer mounts <TemplateCard /> in render', () => {
      expect(STRIPPED).not.toMatch(/<TemplateCard\b/);
    });

    it('source no longer mounts <TemplateMedSeedingModal /> in render', () => {
      expect(STRIPPED).not.toMatch(/<TemplateMedSeedingModal\b/);
    });

    it('source no longer renders the "QUICK START" template intro label', () => {
      expect(STRIPPED).not.toMatch(/QUICK START/);
    });
  });

  describe('contract 8: Contextual insight banners — retired ids (P2)', () => {
    it.each(['start-simple', 'focus-suggestion', 'select-vitals'] as const)(
      "no '%s' banner id in source",
      (id) => {
        expect(STRIPPED).not.toMatch(new RegExp(`['"]${id}['"]`));
      },
    );

    it('no "Focus for better habits" copy in source (Focus banner retired)', () => {
      expect(STRIPPED).not.toMatch(/Focus for better habits/);
    });
  });

  describe('contract 9: Contextual insight banners — kept ids (P2)', () => {
    it.each(['add-meds', 'refill-reminder', 'enable-notifications'] as const)(
      "'%s' banner id still present in source",
      (id) => {
        expect(STRIPPED).toMatch(new RegExp(`['"]${id}['"]`));
      },
    );

    it('add-meds banner copy refreshed — no "Tap Configure" instruction (the Configure button retired with F2)', () => {
      // Pull the add-meds branch by isolating the surrounding 400 chars
      // and asserting the copy does NOT contain the stale "Tap Configure"
      // instruction. The kept banner exists; we're guarding the COPY.
      const branchMatch = STRIPPED.match(/id:\s*['"]add-meds['"][\s\S]{0,400}/);
      expect(branchMatch).not.toBeNull();
      expect(branchMatch![0]).not.toMatch(/Tap Configure/);
    });
  });

  // --------------------------------------------------------------------------
  // Accordion state — single `expandedBucket` tracks one drawer at a time
  // --------------------------------------------------------------------------

  describe('contract 5: drawer accordion — one expanded at a time', () => {
    it('declares an expandedBucket state hook (single value, not a set)', () => {
      // Match a useState declaration whose name contains expandedBucket
      // (case-insensitive, allows `setExpandedBucket` companion).
      expect(STRIPPED).toMatch(/const\s*\[\s*expandedBucket\s*,\s*setExpandedBucket\s*\]\s*=\s*useState/);
    });

    it('expandedBucket state holds a BucketType | null (single bucket, not an array or set)', () => {
      // The state shape is single-bucket per accordion semantics.
      // BucketType | null is canonical; `string | null` is accepted too
      // (some surfaces use looser typing). Pin that it is NOT typed as
      // an array, a record, or a Set.
      const m = STRIPPED.match(/useState<([^>]+)>\(\s*null\s*\)\s*[\s\S]{0,200}?expandedBucket/);
      // Fallback: locate the declaration directly.
      const decl = STRIPPED.match(/const\s*\[\s*expandedBucket\s*,\s*setExpandedBucket\s*\]\s*=\s*useState<([^>]+)>/);
      const typeAnnotation = decl?.[1] ?? m?.[1] ?? '';
      expect(typeAnnotation).not.toMatch(/\[\s*\]/);     // not an array type like BucketType[]
      expect(typeAnnotation).not.toMatch(/\bSet</);      // not Set<...>
      expect(typeAnnotation).not.toMatch(/\bRecord</);   // not Record<...>
    });
  });
});
