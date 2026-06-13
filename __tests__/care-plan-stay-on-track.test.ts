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

describe('Stay-on-Track notification nudge — F7 C6 ember reframe', () => {
  // F7 C6 (2026-06-12) migrated the Stay-on-Track / notification nudge
  // chrome from the Phase 2.6.5 caregiverAccent (lavender) palette to
  // ember (review tone). The nudge is dismissible — coral would over-
  // signal what is an informational affordance — and ember matches the
  // F7 review palette established by the broader zone architecture.

  it('aiInsightCard bg is transparent (F7 C6) — chrome reads through the page surface', () => {
    const body = extractBlock('aiInsightCard');
    expect(body).toMatch(/backgroundColor:\s*['"]transparent['"]/);
    expect(body).not.toMatch(/caregiverAccentBg/);
  });

  it('aiInsightCard border routes through CardBorder.ember', () => {
    const body = extractBlock('aiInsightCard');
    expect(body).toMatch(/borderColor:\s*CardBorder\.ember\b/);
    expect(body).not.toMatch(/caregiverAccentStrong/);
  });

  it('aiInsightTitle uses ember (#c98a4a) — heading reads in the review tone', () => {
    const body = extractBlock('aiInsightTitle');
    expect(body).toMatch(/color:\s*['"]#c98a4a['"]/);
    expect(body).not.toMatch(/caregiverAccentText/);
  });

  it('aiInsightMessage body text uses textSecondary, NOT primary (unchanged)', () => {
    const body = extractBlock('aiInsightMessage');
    expect(body).toMatch(/color:\s*c\.textSecondary\b/);
    expect(body).not.toMatch(/color:\s*c\.textPrimary\b/);
  });

  it('the legacy purple* tokens stay gone from the Stay-on-Track card', () => {
    const card = extractBlock('aiInsightCard');
    const title = extractBlock('aiInsightTitle');
    const combined = card + '\n' + title;
    expect(combined).not.toMatch(/c\.purpleMuted\b/);
    expect(combined).not.toMatch(/c\.purpleStrong\b/);
    expect(combined).not.toMatch(/c\.purpleBright\b/);
  });
});
