// ============================================================================
// Phase 5.13.2 — orb-update wiring contract.
//
// The "orb" tiles on Now (StatRings) read counts off instancesState, which
// comes from useDailyCareInstances. After wizard completion the wizard
// writes carePlanConfig via setBucketEnabled / setAppliedTemplateId; both
// call saveCarePlanConfig which emits EVENT.CARE_PLAN_CONFIG. The hook
// must listen for that event and trigger a full reload so newly-enabled
// buckets show up as orb counts. This pin guards the chain — a future
// refactor that drops the listener fails loudly.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');

const dailyInstancesSrc = readFileSync(
  join(ROOT, 'hooks/useDailyCareInstances.ts'),
  'utf8',
);
const configRepoSrc = readFileSync(
  join(ROOT, 'storage/carePlanConfigRepo.ts'),
  'utf8',
);
const nowSrc = readFileSync(join(ROOT, 'app/(tabs)/now.tsx'), 'utf8');
const statRingsSrc = readFileSync(
  join(ROOT, 'components/now/StatRings.tsx'),
  'utf8',
);

describe('Phase 5.13.2 — orb update chain (wizard config → orb re-render)', () => {
  it('saveCarePlanConfig emits EVENT.CARE_PLAN_CONFIG', () => {
    // The repo writes the config and emits the canonical event so any
    // listener (instances hook, derived stats) gets a chance to react.
    expect(configRepoSrc).toMatch(/saveCarePlanConfig/);
    expect(configRepoSrc).toMatch(/emitDataUpdate\(\s*EVENT\.CARE_PLAN_CONFIG\s*\)/);
  });

  it('setAppliedTemplateId routes through saveCarePlanConfig (so it emits the same event)', () => {
    // Stamping the template id on a fresh wizard run must travel the
    // same emit path as bucket toggles — otherwise the orbs would not
    // refresh when only the template id changed.
    const block = configRepoSrc.match(
      /export async function setAppliedTemplateId[\s\S]*?\n\}/,
    );
    expect(block).not.toBeNull();
    expect(block![0]).toMatch(/saveCarePlanConfig\(/);
  });

  it('useDailyCareInstances listens for the carePlanConfig event', () => {
    // The Tier-1 reload branch handles config/structure changes by
    // running ensureDailyInstances → regenerated instances.
    expect(dailyInstancesSrc).toMatch(
      /\[\s*['"]carePlanConfig['"][\s\S]{0,80}\]\s*\.includes\(\s*category\s*\)/,
    );
  });

  it('useDailyCareInstances calls loadInstances on a carePlanConfig event', () => {
    // The branch must trigger a full reload (not just a refresh-from-storage)
    // so newly-enabled buckets pick up newly-generated instances.
    const listenerBlock = dailyInstancesSrc.match(
      /useDataListener\([\s\S]*?\}\);/,
    );
    expect(listenerBlock).not.toBeNull();
    expect(listenerBlock![0]).toMatch(/loadInstances\(/);
  });

  it('todayStats is still computed by now.tsx (consumed by useNowPrompts + NowTimeline post-Item-A)', () => {
    // Phase 33b extension pre-Lock-3 Item A — StatRings orb mount hidden;
    // the original "Now passes todayStats into StatRings" assertion is
    // reframed. todayStats is still computed because two consumers remain
    // on Now: useNowPrompts(todayStats, ...) and NowTimeline's
    // todayStats prop. The orb-update wiring chain (instancesState →
    // todayStats memo → consumers) stays intact; only the orb
    // RENDER target was removed.
    expect(nowSrc).toMatch(/const\s+todayStats\s*=\s*useMemo/);
    expect(nowSrc).toMatch(/useNowPrompts\s*\(\s*todayStats\b/);
  });

  it('todayStats derives from instancesState (not from a static fallback)', () => {
    // The memo inspects instancesState first; only when it has zero items
    // does it fall back to legacyStats. A wizard-fresh user with newly
    // enabled buckets gets totals as soon as ensureDailyInstances runs.
    // (Unchanged by Item A — todayStats memo still drives the consumers
    // that survived the orb-mount removal.)
    expect(nowSrc).toMatch(/instancesState\s*&&\s*instancesState\.instances\.length\s*>\s*0/);
  });

  it('StatRings shows an em-dash empty state when total === 0 (preserved for post-launch restore)', () => {
    // Item A is hide-don't-delete: the StatRings.tsx component +
    // em-dash empty-state are preserved as the post-launch restore path
    // once the 7-into-6 cap conflict is resolved. Pin the empty-state
    // behavior at the component layer so a future restore doesn't have
    // to rebuild this from scratch.
    expect(statRingsSrc).toMatch(/isEmpty\s*=\s*stat\.total\s*===\s*0/);
  });
});
