// ============================================================================
// SPARKLINE — Phase 28 extraction.
//
// Tiny inline trend line for vital tiles. Pre-Phase-28 this lived as a
// private function inside app/(tabs)/understand.tsx; Phase 28 F4 relocates
// the vitals grid into InsightsDataCard so the primitive needed its own
// module to be shared without duplication.
//
// Pure render — `points` is the pre-computed SVG polyline `x,y x,y …`
// string from generateSparkPoints (still in understand.tsx). Returns null
// when points is empty so missing-history tiles don't ship a 1px artifact.
// ============================================================================

import React from 'react';
import Svg, { Polyline } from 'react-native-svg';

export interface SparklineProps {
  points: string;
  color: string;
  width?: number;
  height?: number;
}

export function Sparkline({ points, color, width = 50, height = 20 }: SparklineProps) {
  if (!points) return null;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Polyline
        points={points}
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

export default Sparkline;
