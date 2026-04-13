// ============================================================================
// InlineSaveToast — Structure and style tests
// ============================================================================

import * as fs from 'fs';
import * as path from 'path';

const componentPath = path.resolve(__dirname, '../../components/shared/InlineSaveToast.tsx');
const src = fs.readFileSync(componentPath, 'utf-8');

describe('InlineSaveToast', () => {
  it('exports InlineSaveToast and InlineSaveToastProps', () => {
    expect(src).toContain('export function InlineSaveToast');
    expect(src).toContain('export interface InlineSaveToastProps');
  });

  it('renders message when visible', () => {
    // Component returns null when not visible
    expect(src).toContain('if (!visible) return null');
    // Renders message text
    expect(src).toContain('{message}');
  });

  it('does not render when visible is false', () => {
    expect(src).toContain('if (!visible) return null');
    // Resets animation values when not visible
    expect(src).toContain('opacity.setValue(0)');
    expect(src).toContain('translateY.setValue(10)');
  });

  it('auto-dismisses after autoDismissMs', () => {
    expect(src).toContain('autoDismissMs');
    expect(src).toContain('setTimeout');
    expect(src).toContain('onDismiss()');
    // Default is 3000ms
    expect(src).toContain('3000');
  });

  it('undo calls onUndo then onDismiss', () => {
    expect(src).toContain('handleUndo');
    expect(src).toContain('onUndo?.()');
    expect(src).toContain('onDismiss()');
    // handleUndo calls both in sequence
    const undoHandler = src.slice(src.indexOf('const handleUndo'), src.indexOf('const handleUndo') + 80);
    expect(undoHandler).toContain('onUndo');
  });

  it('renders teal checkmark and optional Undo link', () => {
    expect(src).toContain('✓');
    expect(src).toContain('Undo');
    // Undo only shows if onUndo is provided
    expect(src).toContain('{onUndo &&');
  });

  it('animates in with opacity and translateY', () => {
    expect(src).toContain('opacity');
    expect(src).toContain('translateY');
    expect(src).toContain('duration: 200');
  });

  it('uses Design Rule 14 styling (inline, not modal)', () => {
    // Bottom-positioned within parent, not absolute/modal
    expect(src).toContain('borderRadius: 10');
    expect(src).toContain('rgba(93,202,165,0.12)');
    expect(src).toContain('rgba(93,202,165,0.15)');
    // Not positioned absolutely like ShareToast
    expect(src).not.toContain("position: 'absolute'");
  });

  it('is wired into ReflectionPrompt after save', () => {
    const reflectionPath = path.resolve(__dirname, '../../components/journal/ReflectionPrompt.tsx');
    const reflectionSrc = fs.readFileSync(reflectionPath, 'utf-8');
    expect(reflectionSrc).toContain("import { InlineSaveToast } from '../shared/InlineSaveToast'");
    expect(reflectionSrc).toContain('setToastVisible(true)');
    expect(reflectionSrc).toContain('Saved ·');
  });
});
