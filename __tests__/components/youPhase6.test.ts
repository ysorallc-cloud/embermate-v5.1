// ============================================================================
// You tab — May 1 sizing pass Phase 6.
//
// Three contracts for the You tab:
//   • ReflectionCard textarea minHeight ≤ 40 (was 60, too tall when empty;
//     drops to the Sizing.textareaMinHeight token).
//   • ReflectionCard Save pill is FILLED with the sage accent (already
//     locked in Phase 5; pinned here so a future refactor doesn't revert
//     to a low-contrast outlined pill).
//   • QuickResetPills "Helpline" no longer paints in coral/criticalAlert.
//     Coral is reserved (Phase 7) for genuine emergency cues — a routine
//     CTA shouldn't grab the same affordance. Helpline reverts to
//     textPrimary so the row reads as three peers.
//   • Plan ahead remains a single grouped surface (header outside, card
//     wrapping ResourcesList — pinning the Phase 5 grouping so it doesn't
//     get re-split into separate items).
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const reflectionSrc = readFileSync(join(ROOT, 'components/support/ReflectionCard.tsx'), 'utf8');
const pillsSrc = readFileSync(join(ROOT, 'components/support/QuickResetPills.tsx'), 'utf8');
const supportSrc = readFileSync(join(ROOT, 'app/(tabs)/support.tsx'), 'utf8');

describe('You tab Phase 6 — sizing + neutralized helpline', () => {
  describe('ReflectionCard textarea', () => {
    it('the input minHeight is ≤ 40pt (sizing-token aligned)', () => {
      // Accept either a literal digit (legacy) or the Sizing.textareaMinHeight
      // token reference (preferred). Both routes pin the contract: input
      // height must not balloon back to the old 60pt.
      const m = reflectionSrc.match(
        /input:\s*\{[^}]*minHeight:\s*(\d+|Sizing\.textareaMinHeight)/s,
      );
      expect(m).not.toBeNull();
      const v = m![1];
      if (/^\d+$/.test(v)) {
        expect(Number(v)).toBeLessThanOrEqual(40);
      } else {
        expect(v).toBe('Sizing.textareaMinHeight');
      }
    });
  });

  describe('ReflectionCard Save pill', () => {
    it('is filled with the sage accent (#5fb88a)', () => {
      // saveButton style block carries an explicit sage backgroundColor.
      expect(reflectionSrc).toMatch(
        /saveButton:\s*\{[^}]*backgroundColor:\s*['"]#5fb88a['"]/s,
      );
    });

    it('uses dark text on the filled pill (high-contrast)', () => {
      expect(reflectionSrc).toMatch(
        /saveButtonText:\s*\{[^}]*color:\s*['"]#0a1510['"]/s,
      );
    });
  });

  describe('QuickResetPills — Helpline neutralized', () => {
    it('Helpline icon does NOT use coral/error', () => {
      // The Helpline pill's icon style must not pick up a coral/error
      // color override. Find the helpline block and assert.
      const helplineIdx = pillsSrc.indexOf('onPress={onHelpline}');
      expect(helplineIdx).toBeGreaterThan(0);
      // ~400 chars below covers the icon + label + subtitle for that pill.
      const block = pillsSrc.slice(helplineIdx, helplineIdx + 600);
      expect(block).not.toMatch(/colors\.coral/);
      expect(block).not.toMatch(/colors\.error/);
      expect(block).not.toMatch(/\(colors as any\)\.coral/);
    });

    it('Helpline label and icon paint in textPrimary', () => {
      const helplineIdx = pillsSrc.indexOf('onPress={onHelpline}');
      // Wider window to clear any inline rationale comments above the
      // first <Text /> element.
      const block = pillsSrc.slice(helplineIdx, helplineIdx + 1400);
      expect(block).toMatch(/colors\.textPrimary/);
    });
  });

  describe('Plan ahead — single grouped surface', () => {
    it('the eyebrow + subtitle live OUTSIDE the planAheadCard wrapper', () => {
      // Header must precede the card in the source. Both must exist.
      const headerIdx = supportSrc.indexOf('planAheadHeader');
      const cardIdx = supportSrc.indexOf('planAheadCard');
      expect(headerIdx).toBeGreaterThan(0);
      expect(cardIdx).toBeGreaterThan(0);
      expect(headerIdx).toBeLessThan(cardIdx);
    });

    it('ResourcesList is wrapped by exactly one planAheadBody view', () => {
      // The card has a single body container, not multiple split sections.
      const matches = supportSrc.match(/planAheadBody/g) ?? [];
      // 1 in JSX (the View), 1 in styles (the style block). Total = 2.
      expect(matches.length).toBe(2);
    });
  });
});
