// ============================================================================
// Care Plan Stay-on-Track card — Phase 2.6.5.
//
// The "Stay on track" notification-prompt card on the Care Plan landing
// (rendered via the aiInsightCard style block) was reading heavy lavender
// on device — same overpowering treatment Phase 2 dimmed on the
// End-of-shift card.
//
// Diagnostic: the card consumed three legacy `purple*` tokens
// (purpleMuted bg, purpleStrong border, purpleBright title) — all built
// on the OLD electric lavender hex `#a78bfa`. The user spec's proposed
// fix referenced `rgba(170, 138, 220, ...)` — which is the NEW warm
// caregiverAccent palette (`#aa8adc`) introduced in Phase 7's 3-accent
// budget. The cool-electric purple* tones never got Phase 7's warmth
// pass and now read mismatched against the warm-charcoal page bg.
//
// Phase 2.6.5 fix: switch the card from purple* → caregiverAccent*
// tokens. Same hue family the spec asks for; bg drops 8% → 6% (slightly
// subtler); border stays at 25%; title shifts to caregiverAccentText
// (`#d4baff`). Lavender stays on heading + bell only — bg + border are
// quieter than before.
//
// Body text was already routed through `c.textSecondary` (no change there).
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '..');
const src = readFileSync(join(ROOT, 'app/care-plan/index.tsx'), 'utf8');

// Pull just the aiInsightCard + aiInsightTitle + aiInsightMessage blocks
// for surgical assertions.
function extractBlock(name: string): string {
  const open = src.indexOf(`${name}: {`);
  if (open < 0) return '';
  const start = open + `${name}: {`.length;
  let depth = 1;
  let i = start;
  while (i < src.length && depth > 0) {
    if (src[i] === '{') depth += 1;
    else if (src[i] === '}') depth -= 1;
    i += 1;
  }
  return src.slice(start, i - 1);
}

describe('Phase 2.6.5 — Stay-on-Track card uses caregiverAccent palette', () => {
  it('aiInsightCard bg routes through caregiverAccentBg (warm lavender)', () => {
    const body = extractBlock('aiInsightCard');
    expect(body).toMatch(/backgroundColor:\s*c\.caregiverAccentBg\b/);
  });

  it('aiInsightCard border routes through caregiverAccentStrong', () => {
    const body = extractBlock('aiInsightCard');
    expect(body).toMatch(/borderColor:\s*c\.caregiverAccentStrong\b/);
  });

  it('aiInsightTitle uses caregiverAccentText (the heading lavender stays)', () => {
    const body = extractBlock('aiInsightTitle');
    expect(body).toMatch(/color:\s*c\.caregiverAccentText\b/);
  });

  it('aiInsightMessage body text uses textSecondary, NOT primary', () => {
    const body = extractBlock('aiInsightMessage');
    expect(body).toMatch(/color:\s*c\.textSecondary\b/);
    expect(body).not.toMatch(/color:\s*c\.textPrimary\b/);
  });

  it('the legacy purple* tokens are gone from the Stay-on-Track card', () => {
    const card = extractBlock('aiInsightCard');
    const title = extractBlock('aiInsightTitle');
    const combined = card + '\n' + title;
    expect(combined).not.toMatch(/c\.purpleMuted\b/);
    expect(combined).not.toMatch(/c\.purpleStrong\b/);
    expect(combined).not.toMatch(/c\.purpleBright\b/);
  });

  it('caregiverAccentStrong opacity is ≤ 0.3 (matches Phase 2 dim contract)', () => {
    // Read directly from the token source so the test reflects the live
    // value rather than just the consuming code.
    const tokens = readFileSync(join(ROOT, 'theme/theme-tokens.ts'), 'utf8');
    const m = tokens.match(/caregiverAccentStrong:\s*['"]rgba\([^)]+,\s*([\d.]+)\s*\)['"]/);
    expect(m).not.toBeNull();
    const alpha = parseFloat(m![1]);
    expect(alpha).toBeLessThanOrEqual(0.3);
  });
});
