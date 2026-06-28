// ============================================================================
// SDK 54 — reanimated 3->4 SharedValue type import guard (Phase 2D).
//
// Reanimated 4 no longer re-exports the `SharedValue` type through the default
// `Animated` namespace, so `Animated.SharedValue<T>` fails to type-check
// (TS2694). The type must be imported as a top-level named export:
//   import Animated, { type SharedValue } from 'react-native-reanimated';
// OrbRings.tsx already uses the top-level form; PaginationDots.tsx was the
// last `Animated.SharedValue` holdout.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');

const PAGINATION = 'app/(onboarding)/components/PaginationDots.tsx';

// Reanimated consumers that reference the SharedValue TYPE (not just the
// useSharedValue hook). Each must use the top-level named import, never the
// removed `Animated.SharedValue` namespace access.
const SHAREDVALUE_TYPE_CONSUMERS = [
  PAGINATION,
  'components/support/OrbRings.tsx',
];

describe('reanimated 4 SharedValue import (Phase 2D)', () => {
  it.each(SHAREDVALUE_TYPE_CONSUMERS)(
    '%s does not use the removed Animated.SharedValue namespace access',
    (file) => {
      const src = read(file);
      expect(src).not.toMatch(/Animated\.SharedValue\b/);
    },
  );

  it('PaginationDots imports SharedValue as a top-level named type from react-native-reanimated', () => {
    const src = read(PAGINATION);
    // Named import present in the reanimated import block.
    expect(src).toMatch(/import\s+Animated\s*,\s*\{[\s\S]*\bSharedValue\b[\s\S]*\}\s*from\s+['"]react-native-reanimated['"]/);
    // And the prop types use the bare top-level form.
    expect(src).toMatch(/scrollX:\s*SharedValue<number>/);
  });
});
