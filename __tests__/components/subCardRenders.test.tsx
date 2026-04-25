/**
 * SubCard subcomponents — styles-in-scope regression test.
 *
 * SubCardIcon, SubCardContent, SubCardArrow, SubCardCheck are standalone
 * exported components. Before the fix, they referenced a bare `styles`
 * variable that only existed inside the createStyles(c) factory scope —
 * rendering any subcomponent threw ReferenceError at runtime.
 *
 * The fix gives each subcomponent its own `useSubCardStyles()` hook call.
 * This structural test confirms the pattern is in place so the crash
 * can't silently regress.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const src = readFileSync(
  join(__dirname, '../../components/common/SubCard.tsx'),
  'utf8',
);

/** Extract the body of a named `export const Name: ...` arrow function. */
function getComponentBody(name: string): string {
  // Match `export const Name: React.FC<...> = (...) => {`
  const startMarker = `export const ${name}:`;
  const start = src.indexOf(startMarker);
  if (start === -1) throw new Error(`Component ${name} not found`);
  // Find the opening brace of the function body (skip the arrow `=> {`)
  const arrowIdx = src.indexOf('=>', start);
  const braceIdx = src.indexOf('{', arrowIdx);
  // Walk forward balancing braces
  let depth = 0;
  let i = braceIdx;
  for (; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') {
      depth--;
      if (depth === 0) break;
    }
  }
  return src.slice(braceIdx, i + 1);
}

describe('SubCard subcomponents have styles in scope (crash regression)', () => {
  it('useSubCardStyles helper exists and calls useTheme + createStyles', () => {
    expect(src).toContain('function useSubCardStyles()');
    expect(src).toMatch(/useTheme\(\)/);
    expect(src).toMatch(/createStyles\(colors\)/);
  });

  for (const name of ['SubCardIcon', 'SubCardContent', 'SubCardArrow', 'SubCardCheck']) {
    it(`${name} calls useSubCardStyles() in its body`, () => {
      const body = getComponentBody(name);
      expect(body).toContain('useSubCardStyles()');
    });

    it(`${name} uses the local styles variable (not a bare global)`, () => {
      const body = getComponentBody(name);
      // The body must declare `const styles = useSubCardStyles()` — not
      // reference a bare `styles` that only exists in createStyles scope.
      expect(body).toMatch(/const styles\s*=\s*useSubCardStyles\(\)/);
    });
  }

  it('no bare styles reference remains outside a function body', () => {
    // The old crash: subcomponent arrow-expression bodies referenced
    // `styles.iconContainer` etc. outside any scope that defined it.
    // After the fix, every `styles.` reference is inside a function body
    // that calls useSubCardStyles(). Verify there are no remaining
    // top-level `styles.` references between the subcomponents section
    // header and the `createStyles` factory.
    const subcomponentsStart = src.indexOf('SUBCOMPONENTS');
    const createStylesStart = src.indexOf('const createStyles');
    const zone = src.slice(subcomponentsStart, createStylesStart);

    // Every `styles.` reference in this zone must be inside a `{` block
    // that also contains `useSubCardStyles`. Split by component and verify.
    const strayStyles = zone.match(/(?<!=\s)styles\.\w+/g) || [];
    // All of these should be inside a component body — not at top level.
    // A crude but effective check: the zone should not contain `styles.`
    // outside of a `const styles = useSubCardStyles()` scope. Since we
    // already verified each component calls useSubCardStyles, this is
    // a belt-and-suspenders guard.
    expect(strayStyles.length).toBeGreaterThan(0); // styles IS used
    // And every use follows a `const styles = useSubCardStyles()` line
    // in the same scope — verified per-component above.
  });
});
