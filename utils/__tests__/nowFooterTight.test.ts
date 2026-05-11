// ============================================================================
// Phase 15.6 — journal preview tile retired from NowFooter.
//
// Pre-15.6 this file pinned visual contracts on the Today's Journal
// preview card (no borderTop / padding ≤ 16pt / fontSize ≤ 13pt).
// 15.6 retired the entire card + its styles; those contracts are
// obsolete. Replaced with positive retirement pins so the file
// documents the absence — a future re-introduction would also have
// to re-introduce these tests.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

describe('Phase 15.6 — journal preview tile retired from NowFooter', () => {
  const src = readFileSync(join(__dirname, '../../components/now/NowFooter.tsx'), 'utf8');

  test('journalPreviewCard style entry is gone', () => {
    expect(src).not.toMatch(/journalPreviewCard:\s*\{/);
  });

  test('journalPreviewText style entry is gone', () => {
    expect(src).not.toMatch(/journalPreviewText:\s*\{/);
  });

  test('journalPreviewDimmed / journalPreviewDimmedText style entries are gone', () => {
    expect(src).not.toMatch(/journalPreviewDimmed:\s*\{/);
    expect(src).not.toMatch(/journalPreviewDimmedText:\s*\{/);
  });
});
