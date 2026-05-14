// ============================================================================
// Phase 23.1 Fix 2 — MorningMedsBanner witness-voice + non-alert palette pin.
//
// Pre-23.1 the banner read as an urgent alert:
//   • Background: warmSurfaceAlert (amber-tinted card)
//   • Border:     warmSurfaceAlertBorder
//   • Title:      "X meds due now"  (urgency word "due now")
//   • Subtitle:   "Tap to confirm all at once"
//   • CTA:        Filled amber pill labelled "Confirm All"
//
// Post-23.1 the banner observes rather than commands. Tokens migrate to
// the caregiverAccent (lavender) family that EndOfShiftCard already uses;
// copy reframes to "ready" + "Tap to log them together"; the CTA becomes
// a ghost text link. The handler (onConfirmAll, pendingInstanceIds, the
// one-shot dismiss) is unchanged — see MorningMedsBanner.test.tsx.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const SRC = readFileSync(
  join(__dirname, '../../components/now/MorningMedsBanner.tsx'),
  'utf8',
);

// Strip block + line comments so the migration narrative in the file
// header doesn't false-positive any "absence" assertion.
const stripped = SRC
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:])\/\/.*$/gm, '$1');

describe('Phase 23.1 Fix 2 — MorningMedsBanner witness-voice copy', () => {
  it('does not use "due now" urgency language in the title', () => {
    // Title was "X meds due now"; reframe drops the urgency word.
    expect(stripped).not.toMatch(/due now/i);
  });

  it('does not use the imperative "Confirm All" filled-button label', () => {
    // The previous CTA text was the imperative "Confirm All" (capitalised
    // as a button label). Post-fix the link reads as a ghost text action
    // ("Confirm all →") — lowercased + arrow, peer with the title.
    expect(stripped).not.toMatch(/>\s*Confirm All\s*</);
  });

  it('uses observational copy ("ready" / "log together")', () => {
    expect(stripped).toMatch(/ready/);
    expect(stripped).toMatch(/log them together/i);
  });
});

describe('Phase 23.1 Fix 2 — MorningMedsBanner non-alert palette', () => {
  it('does not use warmSurfaceAlert / warmSurfaceAlertBorder background tokens', () => {
    expect(stripped).not.toMatch(/warmSurfaceAlert\b/);
    expect(stripped).not.toMatch(/warmSurfaceAlertBorder\b/);
  });

  it('does not use the textAlert* color tokens (criticalAlert budget)', () => {
    expect(stripped).not.toMatch(/textAlertPrimary\b/);
    expect(stripped).not.toMatch(/textAlertSecondary\b/);
    expect(stripped).not.toMatch(/textAlertLabel\b/);
  });

  it('does not hardcode the amber rgba(224, 168, 78, ...) button background', () => {
    // The legacy CTA was `backgroundColor: 'rgba(224, 168, 78, 0.2)'` —
    // the hardcoded amber that EndOfShiftCard's audit (Phase 2.6.7) also
    // banned for its inline CTA. Same anti-pattern, same removal.
    expect(stripped).not.toMatch(/rgba\(224,\s*168,\s*78/);
  });

  it('routes the surface through the caregiverAccent (lavender) tokens', () => {
    // Same palette family EndOfShiftCard uses — matches the witness-voice
    // handoff treatment already established on Now.
    expect(stripped).toMatch(/caregiverAccentBg\b/);
    expect(stripped).toMatch(/caregiverAccentStrong\b/);
    expect(stripped).toMatch(/caregiverAccent\b/);
  });
});
