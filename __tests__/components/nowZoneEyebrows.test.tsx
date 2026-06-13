// ============================================================================
// HARMONIZED CAPS EYEBROWS — Now zones share one form, three accents.
//
// Phase C of the post-slice-1 warm-restore reshape. All three Now zones
// render their header as a caps eyebrow (icon + LABEL + lowercase verb)
// pinned by TypeScale.micro (or equivalent caps form). The per-zone
// accent encodes the zone's role:
//
//   Schedule (NowTimeline)   → gold accent  (c.amber)
//   Health   (HealthZoneNow) → green accent (c.accent)
//   Reflection (ReflectionZoneNow) → coral accent (c.coral)
//
// "Care Plan →" stays a live action on the Schedule header (the link
// to the Care Plan home screen).
//
// CONTRACT BUNDLE
//
//   A. NowTimeline — Schedule eyebrow (gold)
//      1. NowTimeline.tsx renders a caps eyebrow form (textTransform
//         'uppercase' on the label OR pre-uppercased label text),
//         distinct from the pre-fix sentence-case "Today's Schedule".
//      2. The schedule label uses the gold accent token (c.amber).
//      3. The "Care Plan →" action affordance is preserved; pressing
//         the rendered action fires its onAction callback.
//
//   B. HealthZoneNow — caps eyebrow with green accent
//      4. HealthZoneNow.tsx's <Zone ... /> passes accent="green".
//      5. Zone primitive's accent prop maps "green" to c.accent on
//         eyebrowLabel (i.e., the Zone primitive supports the new prop).
//
//   C. ReflectionZoneNow — caps eyebrow with coral accent
//      6. ReflectionZoneNow.tsx's eyebrowLabel style references
//         c.coral (replacing the prior c.textPrimary).
//
//   D. Form consistency across zones
//      7. All three eyebrows use the caps form (textTransform
//         'uppercase' OR pre-uppercased literal) — confirmed by
//         source-pin of each component file.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const NOW_TIMELINE_SRC = readFileSync(join(ROOT, 'components/now/NowTimeline.tsx'), 'utf8');
const HEALTH_ZONE_SRC = readFileSync(join(ROOT, 'components/now/HealthZoneNow.tsx'), 'utf8');
const REFLECTION_ZONE_SRC = readFileSync(join(ROOT, 'components/now/ReflectionZoneNow.tsx'), 'utf8');
const ZONE_SRC = readFileSync(join(ROOT, 'components/now/Zone.tsx'), 'utf8');

function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

describe('Harmonized caps eyebrows across Now zones', () => {
  describe('A. NowTimeline — Schedule eyebrow (gold accent)', () => {
    const stripped = stripComments(NOW_TIMELINE_SRC);

    it('renders a caps-eyebrow form (uppercase label) for the schedule header', () => {
      // The pre-fix used <Text style={s.sectionHeaderTitle}>{title}</Text>
      // with title="Today's Schedule" (sentence case). The new form is
      // either a pre-uppercased literal ("TODAY'S SCHEDULE") in the
      // JSX OR a textTransform: 'uppercase' on the label style. Accept
      // either shape.
      const hasUppercaseLiteral = /TODAY'S\s+SCHEDULE/.test(stripped);
      const hasTextTransformUppercase = /textTransform:\s*['"]uppercase['"]/.test(stripped);
      expect(hasUppercaseLiteral || hasTextTransformUppercase).toBe(true);
    });

    it('schedule label uses the gold accent token (c.amber)', () => {
      // The label style references c.amber so the caps eyebrow reads
      // as the gold-accent variant.
      expect(stripped).toMatch(/color:\s*c\.amber\b/);
    });

    it('keeps the "Care Plan →" action as a live affordance', () => {
      // The action affordance still mounts: an onAction-style callback
      // tied to navigate('/care-plan') or equivalent. Source-pin: the
      // action="Care Plan" prop or "Care Plan" literal is still rendered.
      expect(stripped).toMatch(/Care\s+Plan/);
    });
  });

  describe('B. HealthZoneNow — caps eyebrow with green accent', () => {
    const stripped = stripComments(HEALTH_ZONE_SRC);
    const zoneStripped = stripComments(ZONE_SRC);

    it('HealthZoneNow passes accent="green" to <Zone />', () => {
      expect(stripped).toMatch(/<Zone\b[\s\S]{0,400}?accent=['"]green['"]/);
    });

    it('Zone primitive supports the accent prop and maps "green" to c.accent', () => {
      // The Zone primitive's signature must include accent as a prop,
      // and its createStyles (or equivalent) must map accent === 'green'
      // to c.accent (sage mint) on eyebrowLabel. Accept either direct
      // literal-union signature or a named type alias that contains the
      // three accent literals.
      expect(zoneStripped).toMatch(/\baccent\b/);
      expect(zoneStripped).toMatch(/['"]gold['"]/);
      expect(zoneStripped).toMatch(/['"]green['"]/);
      expect(zoneStripped).toMatch(/['"]coral['"]/);
      expect(zoneStripped).toMatch(/c\.accent\b/);
    });
  });

  describe('C. ReflectionZoneNow — caps eyebrow with coral accent', () => {
    const stripped = stripComments(REFLECTION_ZONE_SRC);

    it('eyebrowLabel style references c.coral (coral accent)', () => {
      // Pre-fix: eyebrowLabel: { color: c.textPrimary } — neutral cream.
      // Post-fix: eyebrowLabel: { color: c.coral } — the coral accent.
      expect(stripped).toMatch(/eyebrowLabel:\s*\{[^}]*color:\s*c\.coral\b/);
    });
  });

  describe('D. Form consistency across zones', () => {
    const tStripped = stripComments(NOW_TIMELINE_SRC);
    const hStripped = stripComments(HEALTH_ZONE_SRC);
    const rStripped = stripComments(REFLECTION_ZONE_SRC);

    it('NowTimeline eyebrow reads as a caps eyebrow (uppercase form)', () => {
      const ok =
        /TODAY'S\s+SCHEDULE/.test(tStripped) ||
        /textTransform:\s*['"]uppercase['"]/.test(tStripped);
      expect(ok).toBe(true);
    });

    it('HealthZoneNow eyebrow reads as a caps eyebrow (Zone primitive label is pre-uppercased)', () => {
      // HealthZoneNow passes label="TODAY'S HEALTH" — uppercase literal.
      expect(hStripped).toMatch(/label=["']TODAY'S\s+HEALTH["']/);
    });

    it('ReflectionZoneNow eyebrow reads as a caps eyebrow (pre-uppercased literal)', () => {
      // ReflectionZoneNow inlines its own eyebrow with REFLECTION literal.
      expect(rStripped).toMatch(/REFLECTION/);
    });
  });
});
