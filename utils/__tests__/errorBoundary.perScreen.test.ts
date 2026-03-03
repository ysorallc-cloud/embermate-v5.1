// =============================================================================
// Task 5.1: Per-screen error boundaries
// Verify each tab and critical modal screen is wrapped in ErrorBoundary
// and that _layout.tsx installs a global unhandledrejection handler
// =============================================================================

import * as fs from 'fs';
import * as path from 'path';

const appDir = path.resolve(__dirname, '../../app');
const componentsDir = path.resolve(__dirname, '../../components');

describe('Task 5.1: Per-screen error boundaries', () => {
  // Tab screens that must have individual ErrorBoundary wrappers
  const tabScreens = [
    '(tabs)/now.tsx',
    '(tabs)/journal.tsx',
    '(tabs)/understand.tsx',
    '(tabs)/support.tsx',
  ];

  // Critical modal screens
  const criticalScreens = [
    'medication-form.tsx',
    'care-plan/manage.tsx',
    'daily-care-report.tsx',
  ];

  const allScreens = [...tabScreens, ...criticalScreens];

  it.each(allScreens)('%s contains <ErrorBoundary wrapper', (screenPath) => {
    const source = fs.readFileSync(path.join(appDir, screenPath), 'utf8');
    expect(source).toMatch(/import\s+ErrorBoundary/);
    expect(source).toMatch(/<ErrorBoundary[\s>]/);
  });

  it('ErrorBoundary component accepts screenName prop', () => {
    const source = fs.readFileSync(
      path.join(componentsDir, 'ErrorBoundary.tsx'),
      'utf8'
    );
    expect(source).toMatch(/screenName\??:\s*string/);
  });

  it('ErrorBoundary includes screenName in error report metadata', () => {
    const source = fs.readFileSync(
      path.join(componentsDir, 'ErrorBoundary.tsx'),
      'utf8'
    );
    // Should pass screenName to reportError context
    expect(source).toMatch(/screenName/);
    expect(source).toMatch(/reportError/);
  });

  it('_layout.tsx has global unhandledrejection handler', () => {
    const source = fs.readFileSync(path.join(appDir, '_layout.tsx'), 'utf8');
    expect(source).toMatch(/unhandledrejection/i);
  });

  it.each(tabScreens)('tab screen %s passes screenName to ErrorBoundary', (screenPath) => {
    const source = fs.readFileSync(path.join(appDir, screenPath), 'utf8');
    expect(source).toMatch(/<ErrorBoundary\s+screenName=/);
  });

  it.each(criticalScreens)('critical screen %s passes screenName to ErrorBoundary', (screenPath) => {
    const source = fs.readFileSync(path.join(appDir, screenPath), 'utf8');
    expect(source).toMatch(/<ErrorBoundary\s+screenName=/);
  });
});
