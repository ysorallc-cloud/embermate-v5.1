// ============================================================================
// Phase 5.7.b — ExportChooserSheet
//
// Bottom sheet that disambiguates Journal "Share" into two destinations:
//   • Today's handoff → opens existing HandoffSheet (sage card, primary)
//   • Visit prep      → navigates to /visit-prep      (lavender card)
//
// Source-level contract: copy, color tokens, and the two callbacks the
// component must surface. Render-level: tapping each card fires the right
// callback; backdrop dismiss closes without firing either.
// ============================================================================

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const sheetPath = join(ROOT, 'components/journal/ExportChooserSheet.tsx');

describe('Phase 5.7.b — file contract', () => {
  it('components/journal/ExportChooserSheet.tsx exists', () => {
    expect(existsSync(sheetPath)).toBe(true);
  });
});

describe('Phase 5.7.b — source-level visual + copy contract', () => {
  const src = existsSync(sheetPath) ? readFileSync(sheetPath, 'utf8') : '';

  it('exports a named React component ExportChooserSheet', () => {
    expect(src).toMatch(/export\s+function\s+ExportChooserSheet\b/);
  });

  it('declares props for visibility, dismiss, and the two destinations', () => {
    // The handler-prop names pin the wiring shape — journal.tsx passes
    // these in. Renaming them is a contract-breaking change.
    expect(src).toMatch(/visible:\s*boolean/);
    expect(src).toMatch(/onClose:\s*\(\)\s*=>\s*void/);
    expect(src).toMatch(/onChooseHandoff:\s*\(\)\s*=>\s*void/);
    expect(src).toMatch(/onChooseVisitPrep:\s*\(\)\s*=>\s*void/);
  });

  it('renders the sheet header copy', () => {
    expect(src).toMatch(/Share what\?/);
    expect(src).toMatch(/Pick what kind of summary you need/);
  });

  it("renders Today's handoff option with its description and metadata", () => {
    expect(src).toMatch(/Today's handoff/);
    expect(src).toMatch(/sibling|next caregiver/);
    expect(src).toMatch(/5-second read/);
  });

  it('renders Visit prep option with its description and metadata', () => {
    expect(src).toMatch(/Visit prep/);
    expect(src).toMatch(/doctor/);
    expect(src).toMatch(/PDF/);
    expect(src).toMatch(/7\/14\/30 days/);
  });

  it("Today's handoff card uses sage token family (accentFaint + accentBorder)", () => {
    // Locate the handoff card style block by name — pinned name keeps
    // the next assertion stable.
    expect(src).toMatch(/handoffCard:\s*\{[\s\S]*?\}/);
    const m = src.match(/handoffCard:\s*\{([\s\S]*?)\n\s\s\}/);
    expect(m).toBeTruthy();
    const body = (m && m[1]) || '';
    expect(body).toMatch(/backgroundColor:\s*c\.accentFaint\b/);
    expect(body).toMatch(/borderColor:\s*c\.accentBorder\b/);
  });

  it('Visit prep card uses caregiverAccent token family (lavender, NOT purpleFaint)', () => {
    // The chooser's Visit prep card aligns with caregiverAccent* — the
    // canonical lavender used elsewhere on cards. The header pill's
    // older purple* family is left alone (Phase 8 audit territory).
    const m = src.match(/visitPrepCard:\s*\{([\s\S]*?)\n\s\s\}/);
    expect(m).toBeTruthy();
    const body = (m && m[1]) || '';
    expect(body).toMatch(/backgroundColor:\s*c\.caregiverAccentBg\b/);
    expect(body).toMatch(/borderColor:\s*c\.caregiverAccentBorder\b/);
  });

  it('Cancel is rendered as a centered text link, not a heavyweight button', () => {
    // Keep this loose — no card surface around Cancel; just a text link.
    expect(src).toMatch(/Cancel/);
    expect(src).toMatch(/cancel(Button|Text|Link)/i);
  });

  it('uses a Modal as the sheet container with backdrop tap-to-dismiss', () => {
    expect(src).toMatch(/Modal/);
    // Backdrop is a TouchableOpacity wrapping the sheet — tapping it calls onClose.
    expect(src).toMatch(/<TouchableOpacity[\s\S]{0,200}onPress=\{onClose\}/);
  });
});

describe('Phase 5.7.b — render: option taps fire the right callback', () => {
  // Render mock — same pattern as propContractSampler.test.tsx so the
  // sheet renders without booting native bridges.
  jest.mock('react-native', () => {
    const React = require('react');
    const make = (name: string) =>
      React.forwardRef((props: any, ref: any) =>
        React.createElement(name, { ...props, ref }, props.children),
      );
    return {
      View: make('View'),
      Text: make('Text'),
      TouchableOpacity: make('TouchableOpacity'),
      Modal: ({ visible, children }: any) =>
        visible ? React.createElement('Modal', null, children) : null,
      StyleSheet: { create: (s: any) => s, flatten: (s: any) => s },
      Platform: { OS: 'ios', select: (o: any) => o.ios || o.default },
    };
  });

  jest.mock('../../contexts/ThemeContext', () => ({
    useTheme: () => ({
      colors: {
        accent: '#5fb88a',
        accentFaint: 'rgba(95,184,138,0.06)',
        accentBorder: 'rgba(95,184,138,0.4)',
        caregiverAccent: '#aa8adc',
        caregiverAccentBg: 'rgba(170,138,220,0.06)',
        caregiverAccentBorder: 'rgba(170,138,220,0.3)',
        textPrimary: '#fff',
        textSecondary: '#aaa',
        textTertiary: '#888',
        glass: '#363830',
        glassBorder: '#444',
        menuSurface: '#0a0a0a',
        overlay: 'rgba(0,0,0,0.9)',
        border: '#333',
      },
    }),
  }));

  it("Today's handoff tap fires onChooseHandoff and not onChooseVisitPrep", async () => {
    const React = require('react');
    const renderer = require('react-test-renderer');
    const { ExportChooserSheet } = require('../../components/journal/ExportChooserSheet');
    const onChooseHandoff = jest.fn();
    const onChooseVisitPrep = jest.fn();
    const onClose = jest.fn();
    let tree: any;
    await renderer.act(async () => {
      tree = renderer.create(
        React.createElement(ExportChooserSheet, {
          visible: true,
          onClose,
          onChooseHandoff,
          onChooseVisitPrep,
        }),
      );
    });
    const handoffNode = tree.root.findByProps({ accessibilityLabel: "Today's handoff" });
    await renderer.act(async () => {
      handoffNode.props.onPress();
    });
    expect(onChooseHandoff).toHaveBeenCalledTimes(1);
    expect(onChooseVisitPrep).not.toHaveBeenCalled();
  });

  it('Visit prep tap fires onChooseVisitPrep and not onChooseHandoff', async () => {
    const React = require('react');
    const renderer = require('react-test-renderer');
    const { ExportChooserSheet } = require('../../components/journal/ExportChooserSheet');
    const onChooseHandoff = jest.fn();
    const onChooseVisitPrep = jest.fn();
    const onClose = jest.fn();
    let tree: any;
    await renderer.act(async () => {
      tree = renderer.create(
        React.createElement(ExportChooserSheet, {
          visible: true,
          onClose,
          onChooseHandoff,
          onChooseVisitPrep,
        }),
      );
    });
    const visitPrepNode = tree.root.findByProps({ accessibilityLabel: 'Visit prep' });
    await renderer.act(async () => {
      visitPrepNode.props.onPress();
    });
    expect(onChooseVisitPrep).toHaveBeenCalledTimes(1);
    expect(onChooseHandoff).not.toHaveBeenCalled();
  });

  it('Cancel link fires onClose and neither destination callback', async () => {
    const React = require('react');
    const renderer = require('react-test-renderer');
    const { ExportChooserSheet } = require('../../components/journal/ExportChooserSheet');
    const onChooseHandoff = jest.fn();
    const onChooseVisitPrep = jest.fn();
    const onClose = jest.fn();
    let tree: any;
    await renderer.act(async () => {
      tree = renderer.create(
        React.createElement(ExportChooserSheet, {
          visible: true,
          onClose,
          onChooseHandoff,
          onChooseVisitPrep,
        }),
      );
    });
    const cancelNode = tree.root.findByProps({ accessibilityLabel: 'Cancel' });
    await renderer.act(async () => {
      cancelNode.props.onPress();
    });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onChooseHandoff).not.toHaveBeenCalled();
    expect(onChooseVisitPrep).not.toHaveBeenCalled();
  });
});

describe('Phase 5.7.b — journal.tsx wires the chooser correctly', () => {
  const journalSrc = readFileSync(join(ROOT, 'app/(tabs)/journal.tsx'), 'utf8');

  it('journal.tsx imports ExportChooserSheet', () => {
    expect(journalSrc).toMatch(
      /import\s+\{\s*ExportChooserSheet\s*\}\s+from\s+['"][^'"]+ExportChooserSheet['"]/,
    );
  });

  it('journal.tsx tracks chooser visibility state', () => {
    expect(journalSrc).toMatch(/exportChooserVisible|showExportChooser|chooserVisible/);
  });

  it('the header Share pill opens the chooser instead of navigating directly', () => {
    // Slice the share-clinical handler body and assert it no longer
    // navigates straight to /visit-prep.
    const start = journalSrc.indexOf('function handleShareClinical');
    const tail = journalSrc.slice(start);
    const body = tail.slice(0, tail.indexOf('\n  }') + 4);
    expect(body).not.toMatch(/navigate\s*\(\s*['"]\/visit-prep['"]\s*\)/);
    // It now opens the chooser.
    expect(body).toMatch(/setExportChooserVisible|setShowExportChooser|setChooserVisible/);
  });

  it('chooser onChooseHandoff routes to the existing HandoffSheet', () => {
    // The chooser hands handoff intent to the existing HandoffSheet via
    // the same setHandoffSheetVisible(true) path.
    expect(journalSrc).toMatch(
      /onChooseHandoff=\{[\s\S]{0,200}?setHandoffSheetVisible\(\s*true\s*\)/,
    );
  });

  it('chooser onChooseVisitPrep navigates to /visit-prep', () => {
    expect(journalSrc).toMatch(
      /onChooseVisitPrep=\{[\s\S]{0,200}?navigate\s*\(\s*['"]\/visit-prep['"]\s*\)/,
    );
  });
});
