// ============================================================================
// Phase 5.13.2 — Now tab builds the welcome-card summary from carePlanConfig
// + CARE_PLAN_TEMPLATES and passes it through. The summary surfaces the
// applied template name (when present), enabled bucket display labels, and
// the medication count so the welcome card can echo the user's wizard
// choices back to them.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const src = readFileSync(join(ROOT, 'app/(tabs)/now.tsx'), 'utf8');

describe('Phase 5.13.2 — now.tsx welcome summary wiring', () => {
  it('imports CARE_PLAN_TEMPLATES for template-name lookup', () => {
    expect(src).toMatch(
      /import\s*\{\s*CARE_PLAN_TEMPLATES\s*\}\s*from\s*['"][^'"]+carePlanTemplates['"]/,
    );
  });

  it('imports BUCKET_META for enabled-bucket display labels', () => {
    expect(src).toMatch(/\bBUCKET_META\b/);
  });

  it('reads appliedTemplateId off carePlanConfig', () => {
    expect(src).toMatch(/appliedTemplateId/);
  });

  it('builds a welcomeSummary object with the three required fields', () => {
    expect(src).toMatch(/welcomeSummary/);
    expect(src).toMatch(/appliedTemplateName/);
    expect(src).toMatch(/enabledBucketLabels/);
    expect(src).toMatch(/medicationCount/);
  });

  it('passes summary into FirstTimeWelcomeCard', () => {
    // Match the JSX site where the card mounts with summary={...}.
    const mountBlock = src.match(/<FirstTimeWelcomeCard[\s\S]*?\/>/);
    expect(mountBlock).not.toBeNull();
    expect(mountBlock![0]).toMatch(/summary=\{welcomeSummary\}/);
  });
});
