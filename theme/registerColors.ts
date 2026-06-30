// ============================================================================
// REGISTER COLORS — Design-Lock §5 + §6 semantic wayfinding system
//
// A "register" is the MEANING a card carries, not a decorative choice. The
// 3px left-accent bar (see components/common/RegisterCard) paints the card in
// its register color so two cards of the same register share a color BY
// DESIGN — that is the wayfinding. Never assign a register for visual variety;
// that would break the semantic (coral must stay trustworthy as "respond").
//
//   coral   — needs a response (overdue, flags, out-of-range)
//   gold    — meds / scheduled / due
//   sage    — health / wellbeing / good / done / self-care
//   blue    — handoff / share-out ONLY (Journal note, Visit Prep include,
//             Generate report). NEVER on the You tab (You is self-care = sage).
//   neutral — plain record (quiet line, no semantic weight)
//
// Replaces the old per-screen top-glow as the primary card differentiator
// (lock §6). Both modes resolve through theme tokens — never raw hex.
// NOTE: Not a route - utility file only.
// ============================================================================

export default null;

import { Colors } from './theme-tokens';

export type CardRegister = 'coral' | 'gold' | 'sage' | 'blue' | 'neutral';

/**
 * Resolve a register to its accent-bar color for the active theme.
 * `colors` is the live theme object from useTheme() so the bar tracks
 * theme changes — callers must pass the reactive object, not the module
 * singleton.
 *
 * sage → `accent` (the sage hue is the accent token in BOTH modes:
 * dark #9ccfa6 / light #3f7d57). coral → `coral`; the light-mode parity
 * reconcile (deferred with light-wiring) must add a `coral` key to
 * LightColors so this stays defined when light is wired.
 */
export function getRegisterColor(
  colors: typeof Colors,
  register: CardRegister,
): string {
  switch (register) {
    case 'coral':
      return colors.coral;
    case 'gold':
      return colors.gold;
    case 'sage':
      return colors.accent;
    case 'blue':
      return colors.blue;
    case 'neutral':
    default:
      return colors.textTertiary;
  }
}
