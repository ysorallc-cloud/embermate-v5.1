// ============================================================================
// Caregiver-name DEAD-KEY fix — Now banner + handoff author.
//
// BUG: the post-onboarding "Add your name so handoffs show who wrote
// what" banner (components/now/ProfileNamePrompt) never cleared after a
// caregiver added their name. Root cause = a dead storage key:
//   • ProfileNamePrompt + care-report READ StorageKeys.CAREGIVER_NAME
//     ('@embermate_caregiver_name') — a bare-string key with NO writer
//     anywhere in the app.
//   • who.tsx + Settings>Profile WRITE via saveCaregiverProfile →
//     CAREGIVER_PROFILE_KEY ('caregiver_profile'), an object {name,...}.
// The reader and the writer point at different keys AND shapes, so the
// name the caregiver enters is invisible to both surfaces.
//
// These tests exercise the REAL storage path (jest.setup provides
// in-memory AsyncStorage + SecureStore), so they catch the mismatch the
// predicate-only profileNamePrompt.test.tsx could not.
//
//   1. After saveCaregiverProfile({name}), ProfileNamePrompt resolves
//      the name and HIDES (isVisible false) — banner clears.
//   2. After saveCaregiverProfile({name}), care-report resolves the
//      author to the saved name (handoff-author consequence): the name
//      is round-trip-readable from the source care-report reads, and
//      care-report no longer reads the dead key.
// ============================================================================

jest.mock('react-native', () => {
  const React = require('react');
  const make = (name: string) =>
    React.forwardRef((props: any, ref: any) =>
      React.createElement(name, { ...props, ref }, props.children),
    );
  return {
    View: make('View'),
    Text: make('Text'),
    Pressable: make('Pressable'),
    StyleSheet: { create: (s: any) => s, flatten: (s: any) => s },
    Platform: { OS: 'ios', select: (o: any) => o.ios || o.default },
  };
});

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  return { Ionicons: (props: any) => React.createElement('Ionicons', props, null) };
});

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({ colors: new Proxy({}, { get: () => '#000' }) }),
}));

jest.mock('../../theme/theme-tokens', () => ({
  Colors: new Proxy({}, { get: () => '#000' }),
  Fonts: { serif: 'Serif' },
  Spacing: { xs: 4, sm: 8, md: 12, lg: 16 },
  BorderRadius: { lg: 12 },
}));

// Not in sample mode — a real user who should be asked / cleared.
jest.mock('../../hooks/useSampleMode', () => ({
  useSampleMode: () => ({ isSampleMode: false }),
}));

jest.mock('../../lib/navigate', () => ({ navigate: jest.fn() }));

import React from 'react';
import { readFileSync } from 'fs';
import { join } from 'path';
import { render, waitFor, act } from '@testing-library/react-native';
import { ProfileNamePrompt } from '../../components/now/ProfileNamePrompt';
import {
  saveCaregiverProfile,
  getCaregiverProfile,
} from '../../storage/caregiverProfileRepo';
import { safeSetItem } from '../../utils/safeStorage';
import { StorageKeys } from '../../utils/storageKeys';

const BANNER = 'Add your name so handoffs show who wrote what.';
const ROOT = join(__dirname, '../..');

// Seed every gate condition so the banner WOULD show — except the name,
// which we control per-test. Isolates the name as the only variable.
async function seedShowableGates() {
  await safeSetItem(StorageKeys.ONBOARDING_COMPLETE, 'true');
}

// Let the component's async refresh() (3 awaited safeGetItem reads +
// the setState re-render) fully settle. Without this, the prompt's
// initial render is null (onboardingComplete starts false), which would
// false-pass a naive "banner is null" assertion before the real read
// resolves.
async function settle() {
  await act(async () => {
    await new Promise((r) => setImmediate(r));
    await new Promise((r) => setImmediate(r));
  });
}

describe('Caregiver-name dead-key fix — ProfileNamePrompt clears after save', () => {
  it('control (BUG GATE SANITY): with NO name saved, the banner shows after load (all other gates satisfied)', async () => {
    await seedShowableGates();
    const { queryByText } = render(<ProfileNamePrompt hasRealLoggedEvent={true} />);
    await settle();
    // Proves the gate is otherwise satisfied — so the hide in contract 1
    // is attributable to the name, not some other unmet condition.
    expect(queryByText(BANNER)).toBeTruthy();
  });

  it('contract 1 (CLEARS AFTER SAVE): after saveCaregiverProfile({name}), the banner is hidden once refresh() settles — ProfileNamePrompt resolves caregiverName from the live profile', async () => {
    await seedShowableGates();
    await saveCaregiverProfile({ name: 'Sam Rivera' });

    const { queryByText } = render(<ProfileNamePrompt hasRealLoggedEvent={true} />);
    await settle();

    // After the read resolves, the banner must be gone (caregiverName
    // non-null → computeProfileNamePromptVisibility returns false). RED
    // pre-fix: the prompt reads the dead key, so the name stays null and
    // the banner appears here.
    expect(queryByText(BANNER)).toBeNull();
  });
});

describe('Caregiver-name dead-key fix — handoff author (care-report)', () => {
  it('contract 2a (AUTHOR RESOLVES TO SAVED NAME): the saved name is readable from getCaregiverProfile — the source care-report reads for the report author', async () => {
    await saveCaregiverProfile({ name: 'Sam Rivera' });
    const profile = await getCaregiverProfile();
    expect(profile?.name).toBe('Sam Rivera');
    expect(profile?.name).not.toBeNull();
    expect((profile?.name ?? '').trim().length).toBeGreaterThan(0);
  });

  it('contract 2b (SURVIVING REPORT READS THE LIVE PROFILE, NOT THE DEAD KEY): visit-prep resolves the "Prepared by" author via requireProfileFields and no longer reads StorageKeys.CAREGIVER_NAME', () => {
    // Retargeted from care-report (retired) to the surviving report that shows a
    // caregiver author — Visit Prep. It resolves the name via requireProfileFields
    // (which reads getCaregiverProfile, guarded by contract 2a) and must NOT read
    // the dead key. Strip comments so a historical mention can't false-trip.
    const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
    const code = strip(readFileSync(join(ROOT, 'app/visit-prep.tsx'), 'utf8'));
    expect(code).toMatch(/requireProfileFields\s*\(/);
    expect(code).not.toMatch(/StorageKeys\.CAREGIVER_NAME/);
    // The resolver itself reads the live profile store, not the dead key.
    const resolver = strip(readFileSync(join(ROOT, 'utils/requireProfileFields.ts'), 'utf8'));
    expect(resolver).toMatch(/getCaregiverProfile\s*\(/);
    expect(resolver).not.toMatch(/StorageKeys\.CAREGIVER_NAME/);
  });
});
