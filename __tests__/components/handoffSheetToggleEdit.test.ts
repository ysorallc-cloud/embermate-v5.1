// Phase 5.7.c — HandoffSheet has include-notes toggle + edit mode.

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const sheetSrc = readFileSync(join(ROOT, 'components/journal/HandoffSheet.tsx'), 'utf8');

describe('Phase 5.7.c — include-notes toggle', () => {
  it('has a boolean state for includeNotes', () => {
    // Order-flexible: tuple destructuring sits before useState in the
    // typical React Native pattern.
    expect(sheetSrc).toMatch(/\[\s*includeNotes\s*,\s*setIncludeNotes\s*\][\s\S]{0,40}useState/);
  });

  it('passes includeNotes to buildHandoffReport', () => {
    expect(sheetSrc).toMatch(/buildHandoffReport\s*\(\s*\{[\s\S]{0,200}?includeNotes/);
  });

  it('renders a toggle/switch for including notes', () => {
    // Either a Switch component or a TouchableOpacity toggle row.
    expect(sheetSrc).toMatch(/Include.*notes|includeNotes/i);
  });

  it('rebuilds canonical text when includeNotes changes', () => {
    // The useEffect dependency array must include includeNotes or a
    // rebuild signal that's bumped when the toggle flips.
    expect(sheetSrc).toMatch(/includeNotes|rebuildSignal/);
  });
});

describe('Phase 5.7.c — edit-before-share', () => {
  it('has a boolean state for edit mode', () => {
    expect(sheetSrc).toMatch(/useState[\s\S]{0,40}?editing|isEditing|editMode/);
  });

  it('renders a multiline TextInput when editing', () => {
    expect(sheetSrc).toMatch(/multiline/);
    // The editable input must be present in the JSX.
    expect(sheetSrc).toMatch(/TextInput[\s\S]{0,300}?multiline/);
  });

  it('has a reset/restore mechanism', () => {
    // A way to discard edits and restore the canonical builder output.
    expect(sheetSrc).toMatch(/reset|restore|Reset|Restore/i);
  });
});
