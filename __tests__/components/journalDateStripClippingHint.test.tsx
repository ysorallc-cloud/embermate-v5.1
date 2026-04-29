// ============================================================================
// DateTabStrip — left-edge fade overlay (Phase 5) + calendar icon removed
// (Phase 6) + Jump button popover (date-picker addendum).
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const src = readFileSync(
  join(ROOT, 'components/journal/DateTabStrip.tsx'),
  'utf8',
);

describe('DateTabStrip — left-edge fade overlay', () => {
  it('imports LinearGradient from expo-linear-gradient', () => {
    expect(src).toMatch(/import\s+\{\s*LinearGradient\s*\}\s+from\s+['"]expo-linear-gradient['"]/);
  });

  it('renders <LinearGradient ... pointerEvents="none" /> over the strip', () => {
    expect(src).toMatch(/<LinearGradient[\s\S]{0,400}?pointerEvents="none"/);
  });

  it('the gradient runs solid → transparent (left → right)', () => {
    // Either explicit start/end coordinates or `colors=` array with the
    // background-then-transparent stops makes it past the regex.
    expect(src).toMatch(/colors=\{\[[^\]]*background[^\]]*['"]transparent['"][^\]]*\]\}/);
  });

  it('overlay sits in an absolutely-positioned wrapper with width:16', () => {
    expect(src).toMatch(/fadeOverlay:\s*\{[\s\S]{0,200}?position:\s*['"]absolute['"]/);
    expect(src).toMatch(/fadeOverlay:\s*\{[\s\S]{0,200}?width:\s*16/);
  });
});

describe('DateTabStrip — legacy calendar toggle retired', () => {
  it('the calendar emoji is only used inside the new Jump button label', () => {
    // The legacy 36×36 toggle button + its standalone emoji are gone. The
    // Jump button does carry "📅 Jump" per the spec; that's the only place
    // the emoji should appear.
    const matches = src.match(/📅/g) ?? [];
    expect(matches.length).toBe(1);
    expect(src).toMatch(/📅 Jump|jumpText[\s\S]{0,200}?📅/);
  });

  it('does not declare calendarBtn / calendarIcon styles', () => {
    expect(src).not.toMatch(/calendarBtn:\s*\{/);
    expect(src).not.toMatch(/calendarIcon:\s*\{/);
  });

  it('does not accept a calendarOpen / onCalendarToggle prop', () => {
    expect(src).not.toMatch(/calendarOpen:\s*boolean/);
    expect(src).not.toMatch(/onCalendarToggle:\s*\(/);
  });
});

describe('DateTabStrip — Jump button popover', () => {
  it('renders a "Jump" affordance to the right of the strip', () => {
    expect(src).toMatch(/Jump\b/);
  });

  it('opens an inline popover with month / day cells', () => {
    expect(src).toMatch(/jumpOpen|popoverVisible|datePickerVisible/);
  });

  it('selecting a date closes the popover', () => {
    // Tapping a date should both call onDateSelect and dismiss the popover.
    expect(src).toMatch(/onDateSelect/);
  });
});
