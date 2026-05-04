// ============================================================================
// Phase 5.8.c — ProfilePromptSheet
//
// Surfaces when a report would be generated without complete profile.
// Two text inputs: Patient name, Your name. Save persists both via
// patientRegistry.updatePatient + caregiverProfileRepo.saveCaregiverProfile,
// then dismisses. Pre-populated when re-opened with partial data.
// ============================================================================

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const sheetPath = join(ROOT, 'components/ProfilePromptSheet.tsx');

describe('Phase 5.8.c — file contract', () => {
  it('components/ProfilePromptSheet.tsx exists', () => {
    expect(existsSync(sheetPath)).toBe(true);
  });
});

describe('Phase 5.8.c — source contract', () => {
  const src = existsSync(sheetPath) ? readFileSync(sheetPath, 'utf8') : '';

  it('exports a named React component ProfilePromptSheet', () => {
    expect(src).toMatch(/export\s+function\s+ProfilePromptSheet\b/);
  });

  it('declares props: visible, onClose, onSaved, missing[]', () => {
    expect(src).toMatch(/visible:\s*boolean/);
    expect(src).toMatch(/onClose:\s*\(\)\s*=>\s*void/);
    expect(src).toMatch(/onSaved:\s*\(\)\s*=>\s*void/);
    // missing accepts 'patient' / 'caregiver' literals — either via inline
    // union type or a named ProfilePromptField alias.
    expect(src).toMatch(/missing:\s*(\(?['"]patient['"]|ProfilePromptField\[)/);
  });

  it('renders two TextInputs (patient + caregiver)', () => {
    const inputCount = (src.match(/<TextInput\b/g) ?? []).length;
    expect(inputCount).toBeGreaterThanOrEqual(2);
  });

  it('renders the spec copy "Mom\'s name?" and "Your name?"', () => {
    expect(src).toMatch(/Mom's name\?/);
    expect(src).toMatch(/Your name\?/);
  });

  it('imports patientRegistry.updatePatient', () => {
    expect(src).toMatch(/from\s+['"][^'"]+patientRegistry['"]/);
    expect(src).toMatch(/\bupdatePatient\b/);
  });

  it('imports caregiverProfileRepo.saveCaregiverProfile', () => {
    expect(src).toMatch(/from\s+['"][^'"]+caregiverProfileRepo['"]/);
    expect(src).toMatch(/\bsaveCaregiverProfile\b/);
  });

  it('Save handler invokes both saves and then onSaved', () => {
    // Locate the save handler body and assert both repos are called.
    expect(src).toMatch(/saveCaregiverProfile\s*\(/);
    expect(src).toMatch(/updatePatient\s*\(/);
    expect(src).toMatch(/onSaved\s*\(\s*\)/);
  });
});

describe('Phase 5.8.c — render contract', () => {
  jest.mock('react-native', () => {
    const React = require('react');
    const make = (name: string) =>
      React.forwardRef((props: any, ref: any) =>
        React.createElement(name, { ...props, ref }, props.children),
      );
    return {
      View: make('View'),
      Text: make('Text'),
      TextInput: make('TextInput'),
      TouchableOpacity: make('TouchableOpacity'),
      Modal: ({ visible, children }: any) =>
        visible ? React.createElement('Modal', null, children) : null,
      KeyboardAvoidingView: make('KeyboardAvoidingView'),
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
        textPrimary: '#fff',
        textSecondary: '#aaa',
        textTertiary: '#888',
        textWarmDim: '#888',
        glass: '#363830',
        glassBorder: '#444',
        menuSurface: '#0a0a0a',
        overlay: 'rgba(0,0,0,0.9)',
        border: '#333',
      },
    }),
  }));

  jest.mock('../../storage/patientRegistry', () => ({
    getPatientRegistry: jest.fn().mockResolvedValue({
      patients: [
        { id: 'p1', name: 'Patient', relationship: 'self', isDefault: true,
          createdAt: '', updatedAt: '' },
      ],
      activePatientId: 'p1',
      version: 1,
    }),
    updatePatient: jest.fn().mockResolvedValue(true),
  }));

  jest.mock('../../storage/caregiverProfileRepo', () => ({
    getCaregiverProfile: jest.fn().mockResolvedValue(null),
    saveCaregiverProfile: jest.fn().mockResolvedValue(undefined),
  }));

  it('Save invokes both repos and fires onSaved', async () => {
    const React = require('react');
    const renderer = require('react-test-renderer');
    const { ProfilePromptSheet } = require('../../components/ProfilePromptSheet');
    const onSaved = jest.fn();
    const onClose = jest.fn();
    let tree: any;
    await renderer.act(async () => {
      tree = renderer.create(
        React.createElement(ProfilePromptSheet, {
          visible: true,
          onClose,
          onSaved,
          missing: ['patient', 'caregiver'],
        }),
      );
    });
    // Find the patient + caregiver TextInputs by accessibilityLabel.
    const patientInput = tree.root.findByProps({ accessibilityLabel: "Patient's name" });
    const caregiverInput = tree.root.findByProps({ accessibilityLabel: 'Your name' });
    await renderer.act(async () => {
      patientInput.props.onChangeText('Mom');
      caregiverInput.props.onChangeText('Sarah');
    });
    const saveBtn = tree.root.findByProps({ accessibilityLabel: 'Save profile' });
    await renderer.act(async () => {
      await saveBtn.props.onPress();
    });
    const { updatePatient } = require('../../storage/patientRegistry');
    const { saveCaregiverProfile } = require('../../storage/caregiverProfileRepo');
    expect(updatePatient).toHaveBeenCalled();
    expect(saveCaregiverProfile).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Sarah' }),
    );
    expect(onSaved).toHaveBeenCalledTimes(1);
  });
});
