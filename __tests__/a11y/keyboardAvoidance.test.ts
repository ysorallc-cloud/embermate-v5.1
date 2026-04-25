// ============================================================================
// 3_POLISH_AND_TESTING Fix 19 — Keyboard avoidance
// ============================================================================
//
// Asserts that every screen with a TextInput wraps its content in a
// KeyboardAvoidingView so the keyboard doesn't cover the field being
// edited. This is a per-screen structural check — the spec enumerates
// 7 priority screens; the test covers all of them plus any additional
// log screens that have TextInputs.
// ============================================================================

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
function read(rel: string): string {
  return readFileSync(join(ROOT, rel), 'utf8');
}

// Priority screens from the spec (19A checklist)
const PRIORITY_SCREENS = [
  'app/log-vitals.tsx',
  'app/log-meal.tsx',
  'app/log-morning-wellness.tsx',
  'app/log-evening-wellness.tsx',
  'app/log-note.tsx',
  'app/log-sleep.tsx',
  'app/medication-form.tsx',
];

// Additional screens confirmed to have TextInput
const ADDITIONAL_SCREENS = [
  'app/log-medication-plan-item.tsx',
  'app/log-activity.tsx',
  'app/log-bathroom.tsx',
  'app/log-symptom.tsx',
  'app/log-pain.tsx',
];

const ALL_SCREENS = [...PRIORITY_SCREENS, ...ADDITIONAL_SCREENS];

describe('Keyboard avoidance — every TextInput screen has KeyboardAvoidingView', () => {
  for (const rel of ALL_SCREENS) {
    const full = join(ROOT, rel);
    if (!existsSync(full)) continue;
    const src = read(rel);
    const hasTextInput = src.includes('TextInput');
    if (!hasTextInput) continue;

    it(`${rel} wraps content in KeyboardAvoidingView`, () => {
      expect(src).toContain('KeyboardAvoidingView');
    });

    it(`${rel} uses platform-appropriate behavior prop`, () => {
      // iOS should use 'padding', Android 'height'. The recommended
      // pattern: `behavior={Platform.OS === 'ios' ? 'padding' : 'height'}`.
      // Accept any pattern that references Platform.OS in the behavior prop.
      expect(src).toMatch(
        /KeyboardAvoidingView[\s\S]*?behavior=\{Platform\.OS/,
      );
    });
  }
});
