// ============================================================================
// Phase 5.8.a — TONE input on HandoffSheet
//
// First thing the caregiver sees when the sheet opens. Single-line input
// above the OUTCOMES section. Autosaves on blur via handoffToneRepo,
// keyed by handoff_tone_{YYYY-MM-DD}. Pre-populates from prior input on
// reopen. Empty input is a normal state — the canonical builder gates
// the TONE section out when this field is empty.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const sheetPath = join(ROOT, 'components/journal/HandoffSheet.tsx');
const sheetSrc = readFileSync(sheetPath, 'utf8');

describe('Phase 5.8.a — TONE input source contract', () => {
  it('imports getHandoffTone and saveHandoffTone from handoffToneRepo', () => {
    expect(sheetSrc).toMatch(
      /import\s+\{[^}]*\bgetHandoffTone\b[^}]*\bsaveHandoffTone\b[^}]*\}\s+from\s+['"][^'"]+handoffToneRepo['"]/,
    );
  });

  it('accepts a dateKey prop (YYYY-MM-DD) for tone storage keying', () => {
    // The sheet needs to know the date to key the tone repo. journal.tsx
    // passes selectedDate.
    expect(sheetSrc).toMatch(/dateKey:\s*string/);
  });

  it('renders a TextInput for the TONE field', () => {
    expect(sheetSrc).toMatch(/import\s+\{[^}]*\bTextInput\b[^}]*\}\s+from\s+'react-native'/);
    expect(sheetSrc).toMatch(/<TextInput[\s\S]{0,400}toneInput/);
  });

  it('TONE input has the spec placeholder "How would you sum up today?"', () => {
    expect(sheetSrc).toMatch(/placeholder=["']How would you sum up today\?["']/);
  });

  it('TONE eyebrow says "TONE"', () => {
    expect(sheetSrc).toMatch(/<SectionEyebrow\s+text=["']TONE["']/);
  });

  it('TONE input renders before the canonical body in the JSX', () => {
    // Phase 5.8.d collapsed the per-section JSX into a single canonical
    // body. The TONE input must still render above it.
    const toneIdx = sheetSrc.indexOf('toneInput');
    const bodyIdx = sheetSrc.indexOf('canonicalBody');
    expect(toneIdx).toBeGreaterThan(0);
    expect(bodyIdx).toBeGreaterThan(0);
    expect(toneIdx).toBeLessThan(bodyIdx);
  });

  it('TONE input is single-line (multiline NOT set / falsy)', () => {
    // Locate the TextInput tag and assert multiline is absent. The component
    // is single-line by default; we just want to keep that locked.
    const tag = sheetSrc.match(/<TextInput[\s\S]{0,800}?toneInput[\s\S]{0,400}?\/>/);
    expect(tag).toBeTruthy();
    if (tag) {
      expect(tag[0]).not.toMatch(/multiline=\{?\s*true\s*\}?/);
    }
  });

  it('TONE input fires autosave on blur via saveHandoffTone', () => {
    // The onBlur handler may be inlined or extracted. Two valid shapes:
    //   onBlur={() => saveHandoffTone(...)} — direct
    //   onBlur={handleToneBlur} where the handler body calls saveHandoffTone
    // Either way, saveHandoffTone(dateKey, ...) must be present in the file.
    expect(sheetSrc).toMatch(/saveHandoffTone\s*\(\s*dateKey\s*,/);
    // And the TextInput must wire onBlur to a callable (not absent).
    expect(sheetSrc).toMatch(/<TextInput[\s\S]{0,400}?onBlur=\{[\s\S]{0,80}?\}/);
  });

  it('TONE input pre-populates from getHandoffTone on mount', () => {
    // useEffect calling getHandoffTone(dateKey) and seeding the field.
    expect(sheetSrc).toMatch(/getHandoffTone\s*\([^)]*\)/);
  });

  it('TONE input value is local state (the field can be edited mid-session)', () => {
    // Local state pattern: useState typed string. Order-flexible — the
    // tuple destructuring may sit before useState.
    expect(sheetSrc).toMatch(/\[\s*tone\s*,\s*setTone\s*\][\s\S]{0,40}useState/);
  });
});

describe('Phase 5.8.a — journal.tsx passes dateKey to HandoffSheet', () => {
  const journalSrc = readFileSync(join(ROOT, 'app/(tabs)/journal.tsx'), 'utf8');

  it('HandoffSheet receives dateKey={getTodayDateString()} (Phase 5.9.e fix)', () => {
    // Phase 5.9.e — sheet must always key to today even when journal
    // is viewing a past date. Tone repo + canonical builder agree.
    expect(journalSrc).toMatch(/<HandoffSheet[\s\S]{0,400}?dateKey=\{getTodayDateString\(\)\}/);
  });
});
