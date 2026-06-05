// ============================================================================
// Phase 34 F5.0 — EditorSection primitive BEHAVIOR pin.
//
// F5.0 is the first of five F5 commits that restructure the four v1
// editor surfaces (Meds, Wellness-split, Meals, Vitals) onto a shared
// What → When → Reminder skeleton with narration line under each
// section. F5.0 ships the primitive ONLY — no drawer adopts it yet;
// F5.1 (Vitals + the F2.1-banked When-gap close) through F5.4 (Meds)
// land the per-category adoptions in their own atomic commits per
// the standing pattern.
//
// THE CONTRACT (locked here, consumed by every F5.x adoption):
//
//   1. TITLE renders with the existing-drawer uppercase header chrome.
//      The chrome matches the per-drawer `label` styles already in
//      VitalsDrawer / MealsDrawer / WellnessDrawer (fontSize 10,
//      fontWeight 600, letterSpacing 1.5, uppercase, textTertiary) so
//      adopting drawers can retire their inline `styles.label` and
//      route through the primitive without visual regression.
//   2. NARRATION is OPTIONAL — when the `narration` prop is set, a
//      sentence renders below the title in the textSecondary tone;
//      when undefined, no extra Text node renders (no empty-string
//      ghost, no collapsed spacing — clean tree, clean a11y).
//   3. BODY slot renders the children below the title (and below the
//      narration when present). The primitive is OPACITY-ZERO over
//      the body — it doesn't wrap, restyle, or react to children;
//      adopting drawers pass chip rows / lists / switch rows as-is.
//   4. NO STATE OWNED — the component is purely presentational.
//      Adopting drawers retain their existing state ownership; the
//      primitive's only API surface is its props.
//
// SISTER FILES:
//   None yet — F5.1 onwards add adoption pins per drawer.
// ============================================================================

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      textPrimary: '#f4ddb8',
      textSecondary: '#c4c1b3',
      textTertiary: '#9e9885',
    },
  }),
}));

jest.mock('../../theme/theme-tokens', () => ({
  Spacing: { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 24 },
  Fonts: { serif: 'SourceSerif4_400Regular' },
}));

jest.mock('react-native', () => {
  const React = require('react');
  const make = (name: string) =>
    React.forwardRef((props: any, ref: any) =>
      React.createElement(name, { ...props, ref }, props.children),
    );
  return {
    View: make('View'),
    Text: make('Text'),
    StyleSheet: { create: (s: any) => s, flatten: (s: any) => s },
    Platform: { OS: 'ios', select: (o: any) => o.ios || o.default },
  };
});

import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import { EditorSection } from '../../components/careplan/editor/EditorSection';

describe('Phase 34 F5.0 — EditorSection primitive behavior pin', () => {
  it('contract 1 (TITLE CHROME): title renders with the uppercase header chrome shared with the existing drawer `label` styles', () => {
    // The chrome contract — adopting drawers can retire their inline
    // `styles.label` and route through the primitive without visual
    // regression. Style values verified against VitalsDrawer.tsx,
    // MealsDrawer.tsx, and WellnessDrawer.tsx existing `label` rules.
    const { getByTestId } = render(
      <EditorSection title="What to track">
        <Text testID="body">body</Text>
      </EditorSection>,
    );
    const titleNode = getByTestId('editor-section-title');
    expect(titleNode).toBeTruthy();
    // The title text renders verbatim (uppercase transform is a CSS
    // property, not a content mutation, so the source string stays
    // mixed-case here).
    expect(JSON.stringify(titleNode.props.children)).toContain('What to track');

    // Chrome — read off the flattened style on the title node.
    const flat = Array.isArray(titleNode.props.style)
      ? Object.assign({}, ...titleNode.props.style)
      : titleNode.props.style;
    expect(flat.fontSize).toBe(10);
    expect(flat.fontWeight).toBe('600');
    expect(flat.letterSpacing).toBe(1.5);
    expect(flat.textTransform).toBe('uppercase');
    // Color resolves via the mocked theme to textTertiary.
    expect(flat.color).toBe('#9e9885');
  });

  it('contract 2 (NARRATION OPTIONAL — PRESENT): when narration is set, a Text node renders below the title with the secondary tone', () => {
    const { getByTestId } = render(
      <EditorSection
        title="What to track"
        narration="Which fields the caregiver records at each check-in."
      >
        <Text testID="body">body</Text>
      </EditorSection>,
    );
    const narrationNode = getByTestId('editor-section-narration');
    expect(narrationNode).toBeTruthy();
    expect(JSON.stringify(narrationNode.props.children)).toContain(
      'Which fields the caregiver records at each check-in.',
    );
    const flat = Array.isArray(narrationNode.props.style)
      ? Object.assign({}, ...narrationNode.props.style)
      : narrationNode.props.style;
    // Narration tone: textSecondary (not textTertiary — the title
    // already owns textTertiary; narration is the human voice that
    // sits one level closer to the reader).
    expect(flat.color).toBe('#c4c1b3');
  });

  it('contract 3 (NARRATION OPTIONAL — ABSENT): when narration is undefined, NO Text node renders below the title (no empty-string ghost, no collapsed spacing)', () => {
    const { queryByTestId } = render(
      <EditorSection title="What to track">
        <Text testID="body">body</Text>
      </EditorSection>,
    );
    expect(queryByTestId('editor-section-narration')).toBeNull();
  });

  it('contract 4 (NARRATION OPTIONAL — EMPTY STRING TREATED AS ABSENT): a narration of "" or whitespace-only does NOT render a Text node (defensive against an upstream blank caller)', () => {
    // Same predicate spirit as the Slice 3-A notes filter:
    // trim().length > 0 is the threshold for "renders." A blank
    // narration is content-empty; rendering nothing avoids a stray
    // empty-line under the title.
    const cases = ['', '   ', '\n\t  '];
    for (const narration of cases) {
      const { queryByTestId, unmount } = render(
        <EditorSection title="What to track" narration={narration}>
          <Text testID="body">body</Text>
        </EditorSection>,
      );
      expect(queryByTestId('editor-section-narration')).toBeNull();
      unmount();
    }
  });

  it('contract 5 (BODY SLOT): children render below the title (and below the narration when present); the primitive does NOT wrap, restyle, or react to body content', () => {
    const { getByTestId } = render(
      <EditorSection
        title="What to track"
        narration="Caregiver-visible sentence."
      >
        <Text testID="custom-body-1">first child</Text>
        <Text testID="custom-body-2">second child</Text>
      </EditorSection>,
    );
    // Children render verbatim and are individually queryable —
    // proves the slot is transparent (no chrome wrapper that would
    // collapse or restyle the children's testIDs).
    expect(getByTestId('custom-body-1')).toBeTruthy();
    expect(getByTestId('custom-body-2')).toBeTruthy();
  });

  it('contract 6 (NO STATE OWNED): re-rendering with the same props produces the same tree shape; the component owns no internal state that would mutate across renders', () => {
    const { getByTestId, rerender, queryByTestId } = render(
      <EditorSection title="First title">
        <Text testID="body">body</Text>
      </EditorSection>,
    );
    expect(
      JSON.stringify(getByTestId('editor-section-title').props.children),
    ).toContain('First title');

    rerender(
      <EditorSection title="Second title" narration="Now with narration.">
        <Text testID="body">body</Text>
      </EditorSection>,
    );
    expect(
      JSON.stringify(getByTestId('editor-section-title').props.children),
    ).toContain('Second title');
    expect(getByTestId('editor-section-narration')).toBeTruthy();

    rerender(
      <EditorSection title="Third title">
        <Text testID="body">body</Text>
      </EditorSection>,
    );
    expect(
      JSON.stringify(getByTestId('editor-section-title').props.children),
    ).toContain('Third title');
    // Narration absent again — no sticky state from the previous
    // render that left it mounted.
    expect(queryByTestId('editor-section-narration')).toBeNull();
  });
});
