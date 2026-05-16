// ============================================================================
// ORB RINGS — Phase 29 Batch A.2 F1 + F3.
//
// Shared SVG primitive for both surfaces that need the lavender orb:
//   1. components/support/BreathingOrbCard.tsx — the at-rest tap-trigger
//      card on the You tab. Renders OrbRings static (no coreScale prop).
//   2. components/support/BreathingExercise.tsx — the active modal orb
//      during a guided breath. Passes a Reanimated SharedValue via the
//      coreScale prop so the core radius animates with the breath cycle
//      while the rings hold position.
//
// Single geometry for both states preserves visual continuity per Batch
// A.2 Q3d — when the user taps the at-rest orb, the modal opens and the
// SAME orb continues, just breathing.
//
// Geometry (Batch A.2 Q3b — expanded from A.1's 45/42/39/36):
//   • Canvas:  120×120
//   • Core:    radius 32 at rest (scale 1.0). At peak inhale (scale 1.3)
//              the core grows to radius ~41.6, sitting ~2px inside the
//              innermost ring at 44 — the breath fills the orb but the
//              rings hold it. F3 animates the `r` attribute directly via
//              `useAnimatedProps` (clean for SVG primitives — avoids
//              transform-origin pitfalls on a transform-based scale).
//   • Rings:   44 (innermost) / 47 / 50 / 53 (outermost), 3px gaps
//              preserved from A.1. Stroke 1.5px each. STATIC — only the
//              core animates per Q3.
//
// Alpha progression (unchanged from A.1):
//   • Outermost (radius 53):  rgba(170, 138, 220, 0.05) — faintest
//   • (radius 50):            rgba(170, 138, 220, 0.10)
//   • (radius 47):            rgba(170, 138, 220, 0.18)
//   • Innermost (radius 44):  rgba(170, 138, 220, 0.28) — brightest
// ============================================================================

import React from 'react';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import Animated, {
  useAnimatedProps,
  type SharedValue,
} from 'react-native-reanimated';
import { useTheme } from '../../contexts/ThemeContext';

const DEFAULT_CANVAS_SIZE = 120;
const DEFAULT_CORE_RADIUS = 32;
const RING_STROKE_WIDTH = 1.5;
const CORE_BORDER_WIDTH = 1.5;

// Reanimated wrapping. Module-scoped so the wrapped component identity
// stays stable across renders. With the canonical react-native-reanimated/mock
// in jest, createAnimatedComponent is a passthrough — AnimatedCircle
// resolves to Circle in tests, preserving F3.8's type === 'Circle' match.
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Outermost first — paint order makes the brighter inner rings land on top.
const RINGS: ReadonlyArray<{ radius: number; alpha: number }> = [
  { radius: 53, alpha: 0.05 }, // outermost — faintest
  { radius: 50, alpha: 0.10 },
  { radius: 47, alpha: 0.18 },
  { radius: 44, alpha: 0.28 }, // innermost — brightest
];

function ringStroke(alpha: number): string {
  // caregiverAccent base — #aa8adc → rgb(170, 138, 220).
  return `rgba(170, 138, 220, ${alpha.toFixed(2)})`;
}

export interface OrbRingsProps {
  /** Override for the SVG canvas size. Defaults to 120. */
  canvasSize?: number;
  /** Override for the core radius at rest (scale 1.0). Defaults to 32. */
  coreRadius?: number;
  /** Optional Reanimated SharedValue driving the core's animated scale.
   *  When omitted (the at-rest BreathingOrbCard path), the core renders
   *  static at scale 1.0. When provided (the active modal path), the
   *  core's `r` attribute is computed as `coreScale.value * coreRadius`
   *  via a worklet, so phase-bound withTiming calls in the parent drive
   *  smooth UI-thread animation without re-rendering the SVG tree. */
  coreScale?: SharedValue<number>;
}

export function OrbRings({
  canvasSize = DEFAULT_CANVAS_SIZE,
  coreRadius = DEFAULT_CORE_RADIUS,
  coreScale,
}: OrbRingsProps) {
  const { colors } = useTheme();
  const center = canvasSize / 2;

  // The worklet captures coreScale + coreRadius from the closure.
  // When coreScale is undefined (at-rest path), the optional chain
  // evaluates to undefined and the `?? 1.0` fallback keeps r at the
  // static coreRadius. When provided, the worklet reads the live
  // SharedValue on the UI thread — no re-render per frame.
  const animatedCoreProps = useAnimatedProps(() => ({
    r: (coreScale?.value ?? 1.0) * coreRadius,
  }));

  return (
    <Svg width={canvasSize} height={canvasSize} viewBox={`0 0 ${canvasSize} ${canvasSize}`}>
      <Defs>
        {/* Monochromatic lavender gradient — center alpha 0.75, edge 0.35. */}
        <RadialGradient
          id="orbGradient"
          cx="50%"
          cy="50%"
          rx="50%"
          ry="50%"
          fx="50%"
          fy="50%"
        >
          <Stop offset="0%" stopColor={colors.caregiverAccent} stopOpacity={0.75} />
          <Stop offset="100%" stopColor={colors.caregiverAccent} stopOpacity={0.35} />
        </RadialGradient>
      </Defs>
      {RINGS.map((r) => (
        <Circle
          key={r.radius}
          cx={center}
          cy={center}
          r={r.radius}
          fill="none"
          stroke={ringStroke(r.alpha)}
          strokeWidth={RING_STROKE_WIDTH}
        />
      ))}
      <AnimatedCircle
        cx={center}
        cy={center}
        animatedProps={animatedCoreProps}
        fill="url(#orbGradient)"
        stroke={colors.caregiverAccentStrong}
        strokeWidth={CORE_BORDER_WIDTH}
      />
    </Svg>
  );
}

export default OrbRings;
