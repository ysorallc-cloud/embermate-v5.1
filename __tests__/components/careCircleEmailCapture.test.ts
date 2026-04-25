/**
 * CareCircleEmailCapture — structural + logic tests.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const src = readFileSync(
  join(__dirname, '../../components/CareCircleEmailCapture.tsx'),
  'utf8',
);

describe('CareCircleEmailCapture sheet', () => {
  it('renders an email TextInput with correct keyboard props', () => {
    expect(src).toContain('TextInput');
    expect(src).toMatch(/keyboardType=.*email-address/);
    expect(src).toMatch(/autoCapitalize=.*none/);
    expect(src).toMatch(/autoCorrect=\{false\}/);
  });

  it('submit button is disabled until email matches basic regex', () => {
    // The component should validate email with the standard pattern
    expect(src).toContain('[^\\s@]+@[^\\s@]+\\.[^\\s@]+');
    // Disabled state should depend on the validation result
    expect(src).toMatch(/disabled=\{.*!isValid|disabled=\{.*!emailValid/);
  });

  it('POSTs email to configurable waitlist endpoint on submit', () => {
    expect(src).toMatch(/fetch\(/);
    expect(src).toMatch(/method:\s*['"]POST['"]/);
    expect(src).toMatch(/EXPO_PUBLIC_WAITLIST_URL|waitlistUrl/);
  });

  it('reads endpoint URL from env with a fallback warning', () => {
    expect(src).toMatch(/process\.env\.EXPO_PUBLIC_WAITLIST_URL/);
    // Should log a warning if the env var is not set
    expect(src).toMatch(/warn|console\.warn|devLog/i);
  });

  it('on success, sets earlyAccessJoined flag in AsyncStorage', () => {
    expect(src).toContain('embermate.careCircle.earlyAccessJoined');
    expect(src).toMatch(/safeSetItem|AsyncStorage\.setItem/);
  });

  it('shows a confirmation state after successful submit', () => {
    // Some state like `submitted` or `joined` that switches the UI
    expect(src).toMatch(/setSubmitted\(true\)|setJoined\(true\)/);
    // Confirmation copy
    expect(src).toMatch(/you're on the list|signed up|we'll email you/i);
  });

  it('includes the privacy line about no marketing', () => {
    expect(src).toContain("We'll email you once when Care Circle launches");
    expect(src).toContain('No marketing, no third parties');
  });

  it('uses Modal component (matches codebase pattern)', () => {
    expect(src).toContain('Modal');
    expect(src).toMatch(/visible=\{/);
  });
});
