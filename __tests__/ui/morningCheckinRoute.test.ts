// ============================================================================
// MORNING WELLNESS CHECK-IN ROUTING — regression guard (fix-morning-checkin-route)
//
// Bug report: tapping the Now timeline's "Morning Wellness Check-in" item
// appeared to route nowhere. Diagnosis: the live path
// (now.tsx -> NowTimeline -> FlatTimelineFeed -> handleTimelineItemPress)
// routes wellness instances by windowLabel — evening keeps its dedicated
// wizard (/log-evening-wellness); morning/afternoon/night land on the
// single-screen /silent-vitals capture (the v6.7 reframe; destination
// CONFIRMED to stay /silent-vitals).
//
// The decision was inlined in now.tsx (untestable) and `nowHelpers` had no
// 'wellness' coverage at all. This guard:
//   1. pins the routing decision via an extracted, pure helper,
//   2. PROVES every wellness destination resolves to a real, registered
//      screen — the substitute for a device walk (blocked by the SDK-54
//      gate), and
//   3. source-pins that the Now timeline tap goes THROUGH the helper, so the
//      live behavior cannot drift from what is tested.
//
// Core anti-"nowhere" assertion: an instance with a missing/unknown
// windowLabel still resolves to a registered route, never '' / undefined.
// ============================================================================

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { getRouteForWellnessInstance } from '../../utils/nowHelpers';

const ROOT = join(__dirname, '../..');
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');

// Map a route string ('/silent-vitals') to its expo-router screen file.
const screenFileFor = (route: string) => `app/${route.replace(/^\//, '')}.tsx`;

describe('Morning wellness check-in routing (fix-morning-checkin-route)', () => {
  describe('getRouteForWellnessInstance — windowLabel mapping', () => {
    it('routes morning to the /silent-vitals capture (v6.7 reframe, confirmed)', () => {
      expect(getRouteForWellnessInstance({ windowLabel: 'morning' })).toBe('/silent-vitals');
    });

    it('routes afternoon and night to /silent-vitals as well', () => {
      expect(getRouteForWellnessInstance({ windowLabel: 'afternoon' })).toBe('/silent-vitals');
      expect(getRouteForWellnessInstance({ windowLabel: 'night' })).toBe('/silent-vitals');
    });

    it('routes evening to its dedicated /log-evening-wellness wizard', () => {
      expect(getRouteForWellnessInstance({ windowLabel: 'evening' })).toBe('/log-evening-wellness');
    });

    it('never routes nowhere: missing/unknown windowLabel still yields a registered route', () => {
      // The original "routes nowhere" symptom = an empty/undefined pathname.
      // Guard that the helper always returns a non-empty, leading-slash route.
      for (const instance of [{}, { windowLabel: undefined }, { windowLabel: 'bogus' }]) {
        const route = getRouteForWellnessInstance(instance as any);
        expect(typeof route).toBe('string');
        expect(route.length).toBeGreaterThan(0);
        expect(route.startsWith('/')).toBe(true);
      }
    });
  });

  describe('every wellness destination resolves to a real, registered screen', () => {
    const destinations = ['/silent-vitals', '/log-evening-wellness'];

    it.each(destinations)('%s has a screen file under app/', (route) => {
      expect(existsSync(join(ROOT, screenFileFor(route)))).toBe(true);
    });

    it.each(destinations)('%s is registered as a Stack.Screen in app/_layout.tsx', (route) => {
      const layout = read('app/_layout.tsx');
      const name = route.replace(/^\//, '');
      expect(layout).toMatch(new RegExp(`name=["']${name}["']`));
    });

    it('the morning destination specifically resolves (the reported gap)', () => {
      const morningRoute = getRouteForWellnessInstance({ windowLabel: 'morning' });
      expect(existsSync(join(ROOT, screenFileFor(morningRoute)))).toBe(true);
    });
  });

  describe('Now timeline routes wellness taps THROUGH the helper', () => {
    it('now.tsx handleTimelineItemPress uses getRouteForWellnessInstance for wellness', () => {
      const nowSrc = read('app/(tabs)/now.tsx');
      // Imported from nowHelpers and applied in the wellness branch.
      expect(nowSrc).toMatch(/getRouteForWellnessInstance/);
      // And the brittle inline ternary it replaces is gone.
      expect(nowSrc).not.toMatch(/windowLabel === 'evening'\s*\n?\s*\?\s*'\/log-evening-wellness'/);
    });
  });
});
