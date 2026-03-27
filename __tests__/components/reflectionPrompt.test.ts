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

  it('unsaved state shows italic prompt + TextInput + Save button', () => {
    expect(src).toContain('prompt');
    expect(src).toContain("fontStyle: 'italic'");
    expect(src).toContain('TextInput');
    expect(src).toContain('multiline');
    expect(src).toContain('minHeight: 60');
    expect(src).toContain("placeholder=\"Write a few words, or skip...\"");
    expect(src).toContain('Save');
  });

  it('Save button is disabled when text is empty', () => {
    expect(src).toContain('!text.trim()');
    expect(src).toContain('saveBtnDisabled');
    expect(src).toContain('disabled={!text.trim()');
  });

  it('saved state shows reflection text (14px, rgba(220,216,205,0.7)) + timestamp', () => {
    expect(src).toContain('savedText');
    expect(src).toContain("color: 'rgba(220,216,205,0.7)'");
    expect(src).toContain('timestamp');
    expect(src).toContain('Saved at');
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

  it('has accent bar header with "Reflection" label', () => {
    expect(src).toContain('accentBar');
    expect(src).toContain('Reflection');
    expect(src).toContain("backgroundColor: 'rgba(200,195,180,0.15)'");
  });

  it('onSave callback receives trimmed text', () => {
    expect(src).toContain('onSave(text.trim())');
  });

  it('props include date, prompt, savedText, savedAt, onSave', () => {
    expect(src).toContain('date: string');
    expect(src).toContain('prompt: string');
    expect(src).toContain('savedText?: string');
    expect(src).toContain('savedAt?: string');
    expect(src).toContain('onSave: (text: string) => Promise<void>');
  });
});
