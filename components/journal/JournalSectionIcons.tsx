// ============================================================================
// JOURNAL SECTION ICONS — the caps-header glyphs (journal-aligned).
//
// One small (13×13) stroke icon per section, colored by the section's register:
//   flag     → WORTH FLAGGING (coral)
//   record   → WHAT WAS LOGGED (neutral)
//   handoff  → FOR THE NEXT CAREGIVER (blue)
// Paths lifted from the embermate-journal-aligned mockup. `color` is the
// section tint (a resolved theme token), passed by SoapSectionFrame.
// ============================================================================

import React from 'react';
import Svg, { Path, Rect, Line } from 'react-native-svg';

interface IconProps {
  color: string;
  size?: number;
}

export function FlagIcon({ color, size = 13 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 13 13" fill="none">
      <Path d="M2 2h7l-1.5 3L9 8H2V2z" stroke={color} strokeWidth={1.1} strokeLinejoin="round" />
      <Line x1={2} y1={8} x2={2} y2={12} stroke={color} strokeWidth={1.1} strokeLinecap="round" />
    </Svg>
  );
}

export function RecordIcon({ color, size = 13 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 13 13" fill="none">
      <Rect x={2} y={1} width={9} height={11} rx={1.5} stroke={color} strokeWidth={1.1} />
      <Line x1={4} y1={4.5} x2={9} y2={4.5} stroke={color} strokeWidth={1.1} strokeLinecap="round" />
      <Line x1={4} y1={7} x2={7} y2={7} stroke={color} strokeWidth={1.1} strokeLinecap="round" />
    </Svg>
  );
}

export function HandoffIcon({ color, size = 13 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 13 13" fill="none">
      <Path d="M9.5 2L11.5 4L5 10.5H3V8.5L9.5 2Z" stroke={color} strokeWidth={1.1} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
