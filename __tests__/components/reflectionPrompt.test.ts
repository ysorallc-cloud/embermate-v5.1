// ============================================================================
// ReflectionPrompt — Structure and style tests
// ============================================================================

import * as fs from 'fs';
import * as path from 'path';

const componentPath = path.resolve(__dirname, '../../components/journal/ReflectionPrompt.tsx');
const src = fs.readFileSync(componentPath, 'utf-8');

describe('ReflectionPrompt', () => {
  it('exports ReflectionPrompt and ReflectionPromptProps', () => {
    expect(src).toContain('export function ReflectionPrompt');
    expect(src).toContain('export interface ReflectionPromptProps');
  });

  it('renders italic prompt + multiline TextInput in editing state', () => {
    // Phase 6 redesign uses a compact layout — italic prompt, slim text
    // field, right-aligned "Save" link instead of an oversized button.
    expect(src).toContain("fontStyle: 'italic'");
    expect(src).toContain('TextInput');
    expect(src).toContain('multiline');
    // Handoff redesign — placeholder is now caregiver-facing (Phase 5).
    expect(src).toContain("placeholder=\"Anything to pass along to the next caregiver?\"");
  });

  it('Save link disabled when text is empty', () => {
    expect(src).toContain('!text.trim()');
    expect(src).toContain('disabled={!text.trim()');
  });

  it('saved state shows the reflection text and a private timestamp', () => {
    expect(src).toContain('savedText');
    expect(src).toContain('savedBox');
    // The compact form replaces "Stored privately on this device" with
    // a shorter "Saved at … · private" hint.
    expect(src).toContain('· private');
  });

  it('tapping saved text re-enters edit mode', () => {
    expect(src).toContain('setEditing(true)');
    expect(src).toContain('Tap to edit reflection');
  });

  it('section header rendered by parent (no internal accent bar)', () => {
    expect(src).not.toContain('accentBar');
    expect(src).not.toContain('headerRow');
    expect(src).not.toContain('headerLabel');
  });

  it('onSave callback receives trimmed text', () => {
    expect(src).toContain('const saved = text.trim()');
    expect(src).toContain('onSave(saved)');
  });

  it('props include onDirtyChange', () => {
    expect(src).toContain('onDirtyChange?: (dirty: boolean) => void');
  });

  it('tracks dirty state via handleTextChange', () => {
    expect(src).toContain('handleTextChange');
    expect(src).toContain('onDirtyChange?.(isDirty)');
    expect(src).toContain('onDirtyChange?.(false)');
  });

  it('privacy hint is inline with Save link', () => {
    // Handoff redesign tightened the line to "saved on this device".
    expect(src).toContain('Private · saved on this device');
  });

  it('encryption: reflection_ prefix in safeStorage', () => {
    const safePath = path.resolve(__dirname, '../../utils/safeStorage.ts');
    const safeSrc = fs.readFileSync(safePath, 'utf-8');
    expect(safeSrc).toContain("'reflection_'");
  });
});
