// ============================================================================
// Phase 13.5.2 — Care Circle waitlist v1.0 gating
// ============================================================================
//
// Pins the App Store "Data Not Collected" privacy posture: with
// CARE_CIRCLE_V7_TEASER_ENABLED off, the teaser card and the email-capture
// modal are unreachable through any user flow, no eligibility check fires
// on mount, and no source file references EXPO_PUBLIC_WAITLIST_URL.
// ============================================================================

import React from 'react';
import { create, act } from 'react-test-renderer';

// ── React Native primitives ──────────────────────────────────────────────────
jest.mock('react-native', () => {
  const ReactLib = require('react');
  const make = (name: string) =>
    ReactLib.forwardRef((props: any, ref: any) =>
      ReactLib.createElement(name, { ...props, ref }, props.children),
    );
  return {
    View: make('View'),
    Text: make('Text'),
    TouchableOpacity: make('TouchableOpacity'),
    StyleSheet: { create: (s: any) => s, flatten: (s: any) => s },
  };
});

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({ colors: new Proxy({}, { get: () => '#000' }) }),
}));

jest.mock('../../theme/theme-tokens', () => ({
  Colors: new Proxy({}, { get: () => '#000' }),
  Spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 },
  Sizing: { cardRadius: 13, cardInternalPadding: 12 },
}));

jest.mock('../../lib/navigate', () => ({ navigate: jest.fn() }));

jest.mock('../../utils/careSummaryBuilder', () => ({
  buildJournalPreview: () => 'preview',
}));

jest.mock('../../components/now/EndOfShiftCard', () => {
  const ReactLib = require('react');
  return {
    EndOfShiftCard: () =>
      ReactLib.createElement('Text', null, '[EndOfShiftCard]'),
  };
});

// ── Sentinel mocks for the gated components ─────────────────────────────────
// If either renders, the tree contains a uniquely-keyed marker we can find.
jest.mock('../../components/CareCircleTeaser', () => {
  const ReactLib = require('react');
  return {
    CareCircleTeaser: () =>
      ReactLib.createElement(
        'Text',
        { testID: 'care-circle-teaser-sentinel' },
        '[CareCircleTeaser]',
      ),
  };
});

jest.mock('../../components/CareCircleEmailCapture', () => {
  const ReactLib = require('react');
  return {
    CareCircleEmailCapture: () =>
      ReactLib.createElement(
        'Text',
        { testID: 'care-circle-email-capture-sentinel' },
        '[CareCircleEmailCapture]',
      ),
  };
});

const mockShouldShow = jest.fn();
jest.mock('../../utils/careCircleTeaser', () => ({
  shouldShowTeaser: () => mockShouldShow(),
}));

jest.mock('../../utils/safeStorage', () => ({
  safeSetItem: jest.fn().mockResolvedValue(true),
}));

import { NowFooter } from '../../components/now/NowFooter';

const FOOTER_PROPS = {
  completedCount: 5,
  allPendingCount: 0,
  hasRegimenInstances: true,
  hasMissed: false,
  brief: null,
};

function findByTestID(tree: any, id: string): any | null {
  if (!tree || typeof tree !== 'object') return null;
  if (tree.props && tree.props.testID === id) return tree;
  const children = Array.isArray(tree.children) ? tree.children : [];
  for (const child of children) {
    const found = findByTestID(child, id);
    if (found) return found;
  }
  return null;
}

describe('Phase 13.5.2 — NowFooter teaser/modal gating', () => {
  beforeEach(() => {
    mockShouldShow.mockReset();
    // Mock as eligible user — proves the gate (not the eligibility check)
    // is what hides the teaser.
    mockShouldShow.mockResolvedValue(true);
  });

  it('does NOT render CareCircleTeaser when CARE_CIRCLE_V7_TEASER_ENABLED is false', async () => {
    let renderer: any;
    await act(async () => {
      renderer = create(React.createElement(NowFooter, FOOTER_PROPS));
    });
    const tree = renderer!.toJSON();
    expect(findByTestID(tree, 'care-circle-teaser-sentinel')).toBeNull();
  });

  it('does NOT render CareCircleEmailCapture when CARE_CIRCLE_V7_TEASER_ENABLED is false', async () => {
    let renderer: any;
    await act(async () => {
      renderer = create(React.createElement(NowFooter, FOOTER_PROPS));
    });
    const tree = renderer!.toJSON();
    expect(findByTestID(tree, 'care-circle-email-capture-sentinel')).toBeNull();
  });

  it('does NOT call shouldShowTeaser on mount (no eligibility check fires)', async () => {
    await act(async () => {
      create(React.createElement(NowFooter, FOOTER_PROPS));
    });
    expect(mockShouldShow).toHaveBeenCalledTimes(0);
  });
});

describe('Phase 13.5.2 — source audit', () => {
  // The contract is "no code consumes EXPO_PUBLIC_WAITLIST_URL." The literal
  // string is allowed in comments so the v1.1 enablement breadcrumb stays
  // useful for future-us; what must not survive is any executable read of the
  // env var. We assert two things:
  //   1. No `process.env.EXPO_PUBLIC_WAITLIST_URL` access pattern anywhere.
  //   2. No occurrence of the literal name outside of // line or /* block */
  //      comments — catches identifier uses, string literals, JSX text, etc.

  function walk(dir: string): string[] {
    const fs = require('fs');
    const path = require('path');
    const out: string[] = [];
    let entries: any[] = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return out;
    }
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        if (ent.name === 'node_modules' || ent.name === '__tests__') continue;
        out.push(...walk(full));
      } else if (/\.(tsx|ts|jsx|js)$/.test(ent.name)) {
        out.push(full);
      }
    }
    return out;
  }

  function collectFiles(): string[] {
    const path = require('path');
    const root = path.join(__dirname, '../..');
    const srcDirs = [
      'app',
      'components',
      'services',
      'utils',
      'lib',
      'hooks',
      'contexts',
      'storage',
      'theme',
      'types',
      'constants',
    ];
    const files: string[] = [];
    for (const d of srcDirs) files.push(...walk(path.join(root, d)));
    return files;
  }

  function stripComments(src: string): string {
    // Strip /* ... */ block comments first, then // line comments.
    return src
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
  }

  it('no production source file reads process.env.EXPO_PUBLIC_WAITLIST_URL', () => {
    const fs = require('fs');
    const path = require('path');
    const root = path.join(__dirname, '../..');
    const offenders: string[] = [];
    for (const f of collectFiles()) {
      const content = fs.readFileSync(f, 'utf8');
      if (/process\.env\.EXPO_PUBLIC_WAITLIST_URL/.test(content)) {
        offenders.push(path.relative(root, f));
      }
    }
    expect(offenders).toEqual([]);
  });

  it('EXPO_PUBLIC_WAITLIST_URL appears only inside comments (no executable references)', () => {
    const fs = require('fs');
    const path = require('path');
    const root = path.join(__dirname, '../..');
    const offenders: string[] = [];
    for (const f of collectFiles()) {
      const content = fs.readFileSync(f, 'utf8');
      const stripped = stripComments(content);
      if (stripped.includes('EXPO_PUBLIC_WAITLIST_URL')) {
        offenders.push(path.relative(root, f));
      }
    }
    expect(offenders).toEqual([]);
  });
});
