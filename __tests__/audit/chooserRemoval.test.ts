import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const journalSrc = readFileSync(join(ROOT, 'app/(tabs)/journal.tsx'), 'utf8');

describe('Chooser removal — ExportChooserSheet is gone', () => {
  it('ExportChooserSheet.tsx no longer exists', () => {
    expect(existsSync(join(ROOT, 'components/journal/ExportChooserSheet.tsx'))).toBe(false);
  });

  it('journal.tsx does not import ExportChooserSheet', () => {
    expect(journalSrc).not.toMatch(/ExportChooserSheet/);
  });

  it('journal.tsx does not reference exportChooserVisible state', () => {
    expect(journalSrc).not.toMatch(/exportChooserVisible/);
  });

  it('journal.tsx does not have handleShareClinical', () => {
    expect(journalSrc).not.toMatch(/handleShareClinical/);
  });
});

describe('Chooser removal — header Share button is gone', () => {
  it('journal header does not contain a Share pill/button', () => {
    // The headerActions block should not contain a Share TouchableOpacity.
    // HandoffCard "Share summary" at the bottom is the only share action.
    const headerBlock = journalSrc.match(/headerActions[\s\S]{0,500}?<\/View>/);
    if (headerBlock) {
      expect(headerBlock[0]).not.toMatch(/Share/);
    }
    // Or the entire headerActions block may have been removed.
  });
});
