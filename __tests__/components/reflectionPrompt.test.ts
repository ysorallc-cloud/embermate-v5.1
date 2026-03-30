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

  it('unsaved state shows italic prompt + TextInput + Save reflection button', () => {
    expect(src).toContain('prompt');
    expect(src).toContain("fontStyle: 'italic'");
    expect(src).toContain('TextInput');
    expect(src).toContain('multiline');
    expect(src).toContain('minHeight: 60');
    expect(src).toContain("placeholder=\"Write a few words, or skip...\"");
    expect(src).toContain('Save reflection');
  });

  it('Save button is disabled when text is empty', () => {
    expect(src).toContain('!text.trim()');
    expect(src).toContain('saveBtnDisabled');
    expect(src).toContain('disabled={!text.trim()');
  });

  it('saved state shows reflection text + storage notice', () => {
    expect(src).toContain('savedText');
    expect(src).toContain("color: 'rgba(220,216,205,0.7)'");
    expect(src).toContain('storageNotice');
    expect(src).toContain('Stored privately on this device');
  });

  it('tapping saved text re-enters edit mode', () => {
    expect(src).toContain('setEditing(true)');
    expect(src).toContain('Tap to edit reflection');
  });

  it('uses light card styling', () => {
    expect(src).toContain("rgba(74,107,93,0.06)");
    expect(src).toContain("rgba(74,107,93,0.1)");
    expect(src).toContain('borderRadius: 14');
  });

  it('section header rendered by parent (no internal accent bar)', () => {
    // No internal header — parent renders SectionLabel
    expect(src).not.toContain('accentBar');
    expect(src).not.toContain('headerRow');
    expect(src).not.toContain('headerLabel');
  });

  it('onSave callback receives trimmed text', () => {
    expect(src).toContain('onSave(text.trim())');
  });

  it('props include onDirtyChange', () => {
    expect(src).toContain('onDirtyChange?: (dirty: boolean) => void');
  });

  it('tracks dirty state via handleTextChange', () => {
    expect(src).toContain('handleTextChange');
    expect(src).toContain('onDirtyChange?.(isDirty)');
    expect(src).toContain('onDirtyChange?.(false)');
  });

  it('shows storage hint while editing', () => {
    expect(src).toContain('storageHint');
    expect(src).toContain('saved privately on this device');
  });

  it('encryption: reflection_ prefix in safeStorage', () => {
    const safePath = path.resolve(__dirname, '../../utils/safeStorage.ts');
    const safeSrc = fs.readFileSync(safePath, 'utf-8');
    expect(safeSrc).toContain("'reflection_'");
  });
});
