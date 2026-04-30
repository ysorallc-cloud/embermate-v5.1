// ============================================================================
// 3_POLISH_AND_TESTING Fix 18 — Data backup / restore / delete
// ============================================================================
//
// 18A (export creates valid file via share sheet), 18B (restore round-trip),
// 18C (delete-all wipes every store) all require runtime device file I/O.
//
// What we lock here are the safety guarantees that the manual checklist
// depends on:
//
//   * exportBackup writes JSON, logs an audit event, and shares via the
//     iOS share sheet (with a graceful Alert fallback when sharing is
//     unavailable)
//   * exportDataAsJSON returns user data (skipping system_/app_ keys)
//   * deleteAllUserData clears AsyncStorage AND keychain items
//   * The Settings screen Delete-Data flow requires a TWO-STEP destructive
//     confirmation before invoking deleteAllUserData
//   * createEncryptedBackup + restoreEncryptedBackup round-trip exists
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
function read(rel: string): string {
  return readFileSync(join(ROOT, rel), 'utf8');
}

function getFunctionBody(src: string, name: string): string {
  const start = src.indexOf(`export async function ${name}`);
  if (start === -1) {
    throw new Error(`Could not find export async function ${name}`);
  }
  const open = src.indexOf('{', start);
  let depth = 0;
  let i = open;
  for (; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') {
      depth--;
      if (depth === 0) break;
    }
  }
  return src.slice(open, i + 1);
}

describe('cloudBackup — exportBackup safety', () => {
  const src = read('utils/cloudBackup.ts');
  const body = getFunctionBody(src, 'exportBackup');

  it('wraps the entire flow in try/catch (no uncaught crash on filesystem failure)', () => {
    expect(body).toMatch(/try \{[\s\S]*?\} catch/);
  });

  it('writes the backup as JSON to the documents directory', () => {
    expect(body).toMatch(/FileSystem\.documentDirectory/);
    expect(body).toMatch(/writeAsStringAsync/);
    expect(body).toMatch(/JSON\.stringify\(backup/);
  });

  it('logs an audit event with the export metadata', () => {
    expect(body).toMatch(/logAuditEvent/);
    expect(body).toMatch(/AuditEventType\.DATA_BACKUP_CREATED/);
  });

  it('triggers the iOS share sheet when sharing is available', () => {
    expect(body).toMatch(/Sharing\.isAvailableAsync\(\)/);
    expect(body).toMatch(/Sharing\.shareAsync/);
  });

  it('falls back to an Alert when sharing is unavailable (no silent drop)', () => {
    expect(body).toMatch(/Alert\.alert\(\s*['"]Backup Created['"]/);
  });

  it('returns false on error rather than throwing', () => {
    expect(body).toMatch(/catch \(error\)[\s\S]*?return false/);
  });
});

describe('dataExport — exportDataAsJSON safety', () => {
  const src = read('utils/dataExport.ts');
  const body = getFunctionBody(src, 'exportDataAsJSON');

  it('filters out internal system_/app_ keys (only user data exports)', () => {
    expect(body).toMatch(/!key\.startsWith\('system_'\)/);
    expect(body).toMatch(/!key\.startsWith\('app_'\)/);
  });

  it('wraps each value parse in try/catch (handles non-JSON legacy values)', () => {
    expect(body).toMatch(/JSON\.parse/);
    expect(body).toMatch(/} catch \{/);
  });

  it('embeds export metadata: exportDate, appVersion, dataCount', () => {
    expect(body).toMatch(/exportDate:/);
    expect(body).toMatch(/appVersion/);
    expect(body).toMatch(/dataCount/);
  });

  it('writes the file with a deterministic timestamped filename', () => {
    expect(body).toMatch(/embermate-export-\$\{timestamp\}\.json/);
    expect(body).toMatch(/FileSystem\.writeAsStringAsync/);
  });

  it('alerts on failure rather than failing silently', () => {
    expect(body).toMatch(/Alert\.alert\(\s*['"]Export Failed['"]/);
  });
});

describe('cloudBackup — restoreEncryptedBackup exists (round-trip support)', () => {
  const src = read('utils/cloudBackup.ts');

  it('exports createEncryptedBackup AND restoreEncryptedBackup', () => {
    expect(src).toMatch(/export async function createEncryptedBackup\(/);
    expect(src).toMatch(/export async function restoreEncryptedBackup\(/);
  });

  it('exports loadBackupFromFile and saveBackupToFile', () => {
    expect(src).toMatch(/export async function saveBackupToFile\(/);
    expect(src).toMatch(/export async function loadBackupFromFile\(/);
  });
});

describe('privacyUtils — deleteAllUserData safety', () => {
  const src = read('utils/privacyUtils.ts');
  const body = getFunctionBody(src, 'deleteAllUserData');

  it('clears all AsyncStorage', () => {
    expect(body).toMatch(/AsyncStorage\.clear\(\)/);
  });

  it('also wipes keychain items (PIN, salt, session token, master key)', () => {
    expect(body).toContain('embermate_pin_hash');
    expect(body).toContain('embermate_pin_salt');
    expect(body).toContain('embermate_session_token');
    expect(body).toContain('embermate_master_key');
    expect(body).toMatch(/SecureStore\.deleteItemAsync/);
  });

  it('tolerates missing keychain entries (per-key try/catch)', () => {
    // Some keychain entries may not exist on a fresh install — the
    // delete loop must not crash if a key is absent.
    expect(body).toMatch(/for \(const key of keychainKeys\)[\s\S]*?try \{[\s\S]*?\} catch/);
  });

  it('throws on the outer catch path (caller can show an error toast)', () => {
    // The outer catch logs and re-throws so the Settings screen's catch
    // can surface "Could not delete data" to the user.
    expect(body).toMatch(/catch \(error\)[\s\S]*?throw error/);
  });
});

describe('Settings — Delete My Data flow requires two-step confirmation', () => {
  const src = read('app/settings/index.tsx');

  it('imports deleteAllUserData', () => {
    expect(src).toContain("import { deleteAllUserData } from '../../utils/privacyUtils'");
  });

  it('handleDeleteAllData fires the destructive Alert', () => {
    // v6.7: handler renamed in the consolidated settings; copy is now
    // sentence-case ("Delete all data") to match the row label.
    expect(src).toMatch(/handleDeleteAllData/);
    expect(src).toMatch(/Alert\.alert\(\s*['"]Delete all data['"]/);
  });

  it('shows an explicit second-step confirmation before invoking deleteAllUserData', () => {
    // Two-step flow — single-tap delete is too easy to misfire on a
    // destructive action. Second alert title is "Final confirmation"
    // (sentence case in v6.7).
    expect(src).toContain("'Final confirmation'");
    expect(src).toMatch(/Final confirmation[\s\S]*?deleteAllUserData\(\)/);
  });

  it('navigates back to onboarding after successful deletion', () => {
    expect(src).toMatch(/deleteAllUserData\(\)[\s\S]*?navigateReplace\(['"]\/\(onboarding\)['"]\)/);
  });

  it('first alert uses destructive style on the proceed button', () => {
    // v6.7: copy is sentence-case ("Delete all data").
    const firstAlert = src.indexOf("'Delete all data'");
    expect(firstAlert).toBeGreaterThan(-1);
    const block = src.slice(firstAlert, firstAlert + 800);
    expect(block).toMatch(/style:\s*['"]destructive['"]/);
  });
});
