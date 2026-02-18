/**
 * Navigation User Flow Tests
 *
 * Static analysis tests that verify navigation routes referenced in source code
 * actually exist as screens. Uses fs.readFileSync to read source files and check
 * that destination routes have corresponding screen files.
 */

import * as fs from 'fs';
import * as path from 'path';

const APP_DIR = path.resolve(__dirname, '../../app');

function fileExists(relativePath: string): boolean {
  // Check for .tsx and .ts variants, and also directory/index patterns
  const candidates = [
    path.join(APP_DIR, `${relativePath}.tsx`),
    path.join(APP_DIR, `${relativePath}.ts`),
    path.join(APP_DIR, relativePath, 'index.tsx'),
    path.join(APP_DIR, relativePath, 'index.ts'),
  ];
  return candidates.some(c => fs.existsSync(c));
}

function readSourceFile(relativePath: string): string {
  const fullPath = path.resolve(__dirname, '../../', relativePath);
  return fs.readFileSync(fullPath, 'utf-8');
}

describe('Navigation User Flows', () => {
  test('Journal tab links to valid routes', () => {
    const source = readSourceFile('app/(tabs)/journal.tsx');

    // Journal should link to calendar and care-summary-export
    if (source.includes("'/calendar'")) {
      expect(fileExists('calendar')).toBe(true);
    }
    if (source.includes("'/care-summary-export'")) {
      expect(fileExists('care-summary-export')).toBe(true);
    }
  });

  test('Now tab links to valid routes', () => {
    const source = readSourceFile('app/(tabs)/now.tsx');

    // Now tab links to various logging screens
    if (source.includes("'/log-water'")) {
      expect(fileExists('log-water')).toBe(true);
    }
    if (source.includes("'/care-plan'")) {
      expect(fileExists('care-plan')).toBe(true);
    }
    if (source.includes("'/today-scope'")) {
      expect(fileExists('today-scope')).toBe(true);
    }
  });

  test('Understand tab links to valid routes', () => {
    const source = readSourceFile('app/(tabs)/understand.tsx');

    // Understand links to trends and medication-report
    if (source.includes("'/trends'")) {
      expect(fileExists('trends')).toBe(true);
    }
    if (source.includes("'/medication-report'")) {
      expect(fileExists('medication-report')).toBe(true);
    }
    if (source.includes("'/settings'")) {
      expect(fileExists('settings')).toBe(true);
    }
  });

  test('Support tab links to valid routes', () => {
    const source = readSourceFile('app/(tabs)/support.tsx');

    // Support links to care-summary-export, settings, etc.
    if (source.includes("'/care-summary-export'")) {
      expect(fileExists('care-summary-export')).toBe(true);
    }
    if (source.includes("'/settings'")) {
      expect(fileExists('settings')).toBe(true);
    }
    if (source.includes("'/data-privacy-settings'")) {
      expect(fileExists('data-privacy-settings')).toBe(true);
    }
  });

  test('medication-report screen exists', () => {
    expect(fileExists('medication-report')).toBe(true);
  });

  test('_layout.tsx registers medication-report route', () => {
    const source = readSourceFile('app/_layout.tsx');
    expect(source).toContain('medication-report');
  });
});
