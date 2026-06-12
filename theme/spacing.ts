// ============================================================================
// F7 ZONE DESIGN TOKENS — spacing rhythm, 4-size type scale, zone tints,
// card border colors.
//
// Lives alongside theme/theme-tokens.ts (the broader brand canon: Colors,
// Spacing, Sizing, BorderRadius, Typography) but pulls out the F7 pre-
// launch design-pass primitives so the new zone architecture has a single
// import. The legacy `Spacing` token (4/8/12/20/28/36 named + s1..s12
// numeric) stays as-is for existing consumers; F7-touched surfaces consume
// from this file so the rhythm pass can land surface-by-surface without
// pulling the whole codebase along.
//
// Type scale is intentionally restricted to 4 sizes (title / body /
// secondary / micro). Surfaces touched in F7 commits enforce these
// everywhere; the broader Typography object in theme-tokens.ts retains the
// legacy h1..h5 / displayLarge / displayMedium / etc. for surfaces that
// have not been re-passed yet.
// ============================================================================

// ----------------------------------------------------------------------------
// SPACING — zone rhythm
// ----------------------------------------------------------------------------

/** Major break between zones — replaces the prior ad-hoc 24-32pt gaps. */
export const SECTION_GAP = 36;

/** Pad between a section title (or zone eyebrow) and the first row of
 *  content. Keeps the eyebrow from glueing onto the row below. */
export const TITLE_CLEARANCE = 28;

/** Vertical padding inside cards (top/bottom). */
export const CARD_PADDING_V = 18;

/** Horizontal padding inside cards (left/right). */
export const CARD_PADDING_H = 20;

/** Page-edge horizontal gutter — the inset from the safe-area edge to
 *  the first content pixel. Distinct from CARD_PADDING_H because the
 *  page edge can be wider than a card's internal pad. */
export const GUTTER = 22;

/** Vertical padding on a single fabric row (open list, no card). */
export const ROW_V = 15;

// ----------------------------------------------------------------------------
// TYPE SCALE — 4 sizes only, enforce on touched surfaces
// ----------------------------------------------------------------------------

/** F7 type scale. Spread these into a style object — they intentionally
 *  carry only fontSize / letterSpacing / fontWeight, NOT fontFamily or
 *  color. Brand font + theme color are owned by the consumer so a
 *  surface can render the same size on either Source Serif 4 or the
 *  system sans without re-routing through this module. */
export const TypeScale = {
  /** Zone or screen title. 24px. */
  title: {
    fontSize: 24,
  },
  /** Default body copy. 13px. */
  body: {
    fontSize: 13,
  },
  /** Secondary metadata — counts, sub-rows, timestamps. 11px. */
  secondary: {
    fontSize: 11,
  },
  /** Micro eyebrow label. 9px with strong letter-spacing + 700 weight
   *  so it reads as a section/system label, not body copy. */
  micro: {
    fontSize: 9,
    letterSpacing: 1.8,
    fontWeight: '700' as const,
  },
} as const;

// ----------------------------------------------------------------------------
// ZONE TINTS — surface backgrounds for grouped sections
// ----------------------------------------------------------------------------

/** F7 zone tint colors. Apply to the wrapping <View> of a zone so the
 *  surface reads as a grouped region. z1 is the warmer ember-leaning
 *  tint (action zones); z2 is the slightly cooler reflection tint. */
export const ZoneTint = {
  /** Action zones (Now Action, Insights Patterns, Care Plan Meds, You
   *  check-in). Warm ember-near-black. */
  z1: '#1f1b15',
  /** Reflection / handoff zones (Now Reflection, You Support, Insights
   *  the-Read). Slightly cooler than z1. */
  z2: '#1d1914',
} as const;

// ----------------------------------------------------------------------------
// CARD BORDER COLORS — semantic by intent
// ----------------------------------------------------------------------------

/** F7 card-border colors. Each one names an intent rather than a hex
 *  family so consumers can read the surface from the call site
 *  (sage = action, coral = alert, ember = review/warm, dusty = handoff).
 *  All four sit at the same opacity band (~0.25-0.28) so the visual
 *  weight is consistent across intents. */
export const CardBorder = {
  /** Sage — action-affirmative (confirm, save, primary CTA card). */
  sage: 'rgba(127, 184, 138, 0.28)',
  /** Coral — alert / flag / worth-flagging. Use only for actual
   *  attention-needed states, never for chrome. */
  coral: 'rgba(192, 107, 90, 0.28)',
  /** Ember — review / warm-orange. Use for "worth a look" surfaces that
   *  are NOT alert-level. */
  ember: 'rgba(201, 138, 74, 0.28)',
  /** Dusty — handoff / caregiver-to-clinician bridge. Cool blue tone
   *  replaces the prior lavender for F7-touched surfaces. */
  dusty: 'rgba(107, 140, 174, 0.25)',
} as const;
