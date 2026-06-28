// ============================================================================
// SDK 54 — expo-file-system /legacy migration guard (Phase 2B).
//
// In expo-file-system 19 (SDK 54) the classic API (documentDirectory,
// cacheDirectory, EncodingType, getInfoAsync, read/writeAsStringAsync,
// move/copy/deleteAsync, makeDirectoryAsync, readDirectoryAsync) was removed
// from the package root and now lives at 'expo-file-system/legacy'. We adopt
// the legacy SHIM (behavior-preserving) rather than migrating to the new
// file-system API — that is future debt, out of scope for this upgrade.
//
// This pins every classic-API call site to the legacy import so a future
// edit can't silently regress back to the (now type-less) root import.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');

const LEGACY_CONSUMERS = [
  'utils/pdfExport.ts',
  'services/visitPrepPdf.ts',
  'services/handoffPdf.ts',
  'utils/cloudBackup.ts',
  'utils/dataExport.ts',
  'utils/photoStorage.ts',
  'utils/deviceIntegrity.ts',
  'app/settings/backup.tsx',
];

describe('expo-file-system /legacy migration (Phase 2B)', () => {
  it.each(LEGACY_CONSUMERS)('%s imports from expo-file-system/legacy', (file) => {
    const src = read(file);
    expect(src).toMatch(/from ['"]expo-file-system\/legacy['"]/);
  });

  it.each(LEGACY_CONSUMERS)('%s does NOT import from the bare expo-file-system root', (file) => {
    const src = read(file);
    // Bare root import (no /legacy or other subpath) is the removed surface.
    expect(src).not.toMatch(/from ['"]expo-file-system['"]/);
  });
});
