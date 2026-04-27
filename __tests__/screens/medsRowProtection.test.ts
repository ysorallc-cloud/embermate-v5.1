// ============================================================================
// Meds list — protect Remove from accidental taps.
// Locks in v6.7 changes: inline Edit/Remove buttons removed, row tap-to-edit
// remains, Remove sits behind a swipe gesture, confirmation copy matches
// the spec, and the redundant bell-icon next to the toggle is gone.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const src = readFileSync(join(ROOT, 'app/care-plan/meds.tsx'), 'utf8');

describe('Meds row — Edit/Remove inline buttons removed', () => {
  it('no <Text>Edit</Text> action button under the row', () => {
    expect(src).not.toMatch(/<Text[^>]*>Edit<\/Text>/);
  });

  it('inline destructive medActionTextDanger style is no longer applied in JSX', () => {
    // The swipe-revealed Remove action has its own label style. The old
    // inline destructive Text style must no longer be wired up in JSX.
    expect(src).not.toMatch(/style=\{\[styles\.medActionText,\s*styles\.medActionTextDanger\]\}/);
  });

  it('medActionButton + medActionDivider styles are no longer referenced in JSX', () => {
    // Style definitions may stay (orphan cleanup is a follow-up), but the
    // JSX must no longer apply them — that's how the buttons are gone.
    expect(src).not.toMatch(/style=\{styles\.medActionButton\}/);
    expect(src).not.toMatch(/style=\{styles\.medActionDivider\}/);
  });
});

describe('Meds row — bell icon removed (toggle is the single source of truth)', () => {
  it('no bell or bell-off emoji rendered next to the toggle', () => {
    expect(src).not.toContain('🔔');
    expect(src).not.toContain('🔕');
  });

  it('notificationButton style is no longer applied in JSX', () => {
    expect(src).not.toMatch(/style=\{styles\.notificationButton\}/);
  });

  it('onToggleNotification handler is no longer plumbed through MedicationItem', () => {
    // The old prop signature included onToggleNotification because the bell
    // toggled it independently. With the bell gone, the toggle alone owns
    // both active state and notifications — no extra handler.
    const propsBlock = src.match(/interface MedicationItemProps[\s\S]*?\}\n/);
    expect(propsBlock).toBeTruthy();
    expect(propsBlock![0]).not.toMatch(/onToggleNotification/);
  });
});

describe('Meds row — Remove gated behind a swipe', () => {
  it('imports a swipe / pan-gesture mechanism', () => {
    // Either PanResponder (matches the existing SwipeableTimelineItem
    // pattern in the repo) or a Swipeable from gesture-handler.
    expect(src).toMatch(/PanResponder|Swipeable/);
  });

  it('row uses Animated for the translateX reveal', () => {
    expect(src).toMatch(/Animated\b/);
    expect(src).toMatch(/translateX/);
  });

  it('swipe reveals a Remove action button beside the row', () => {
    // The Remove action sits beside the row as a sibling View styled with
    // a destructive background. Look for an action JSX element whose
    // accessibilityLabel includes "Remove ${...}".
    expect(src).toMatch(/accessibilityLabel=\{`Remove \$\{medication\.name\}`\}/);
  });
});

describe('Meds row — confirmation sheet copy matches spec', () => {
  it('confirmation prompt reads "Remove [Med Name]? This can\'t be undone."', () => {
    // Either via Alert.alert title/message or a custom ActionSheet —
    // assert both the question and the irreversibility line are present.
    expect(src).toMatch(/Remove [^?]+\?/);
    expect(src).toMatch(/This can't be undone\./);
  });

  it('confirmation offers Cancel and Remove buttons', () => {
    expect(src).toMatch(/text:\s*['"]Cancel['"]/);
    expect(src).toMatch(/text:\s*['"]Remove['"]/);
    expect(src).toMatch(/style:\s*['"]destructive['"]/);
  });
});

describe('Meds row — tap-to-edit on the row body remains', () => {
  it('row body is still wrapped in a TouchableOpacity that calls onEdit', () => {
    // Either direct `onPress={onEdit}` or a wrapper handler that calls
    // `onEdit()` (the wrapper is needed when the row also handles a "tap
    // to close swipe" gesture). Either form satisfies the contract.
    expect(src).toMatch(/onPress=\{onEdit\}|onPress=\{\(\)\s*=>[\s\S]{0,200}?onEdit\(\)/);
  });
});
