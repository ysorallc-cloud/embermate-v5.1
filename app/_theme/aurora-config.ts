// ============================================================================
// AURORA VARIANT CONFIGURATION
// Defines color schemes for different aurora backgrounds
// ============================================================================

export default null;

export type AuroraVariant = 'today' | 'hub' | 'family';

export interface AuroraConfig {
  baseHue1: number;
  baseHue2: number;
  saturation1: number;
  saturation2: number;
  lightness1: number;
  lightness2: number;
  opacity1: number;
  opacity2: number;
}

export const AURORA_CONFIGS: Record<AuroraVariant, AuroraConfig> = {
  today: {
    baseHue1: 160,    // Teal
    baseHue2: 280,    // Purple
    saturation1: 70,
    saturation2: 50,
    lightness1: 30,
    lightness2: 40,
    opacity1: 0.4,
    opacity2: 0.3,
  },
  hub: {
    baseHue1: 220,    // Blue
    baseHue2: 260,    // Violet
    saturation1: 60,
    saturation2: 50,
    lightness1: 35,
    lightness2: 30,
    opacity1: 0.35,
    opacity2: 0.25,
  },
  family: {
    baseHue1: 180,    // Teal-cyan
    baseHue2: 320,    // Rose
    saturation1: 50,
    saturation2: 40,
    lightness1: 30,
    lightness2: 35,
    opacity1: 0.3,
    opacity2: 0.25,
  },
};
