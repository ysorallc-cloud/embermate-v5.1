// ============================================================================
// LEGAL URLs — ysorallc.org retired; embermate.app is canonical.
//
// Two contract bundles:
//   A. STATIC CHECK — no 'ysorallc.org' string appears in any functional
//      URL position under app/ or in app.json's URL fields
//      (privacyPolicyUrl, termsOfServiceUrl, supportUrl, helpUrl,
//      legalUrls.{privacy,terms,dataRequest,dataDeletion}). Comments
//      don't count — the scan reads stripped sources.
//   B. RENDER CHECK — PrivacyDisclaimerScreen mounts a privacy-policy
//      link that opens https://embermate.app/privacy, and a terms-of-use
//      link that opens https://embermate.app/terms.
// ============================================================================

import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '..');

function stripComments(src: string): string {
  // Strip block comments + single-line // comments so historical
  // mentions of ysorallc.org in commit narrative / TODO notes can't
  // false-positive the absence pin.
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function walk(dir: string, exts: string[]): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (entry === 'node_modules' || entry === '.git' || entry === '__tests__') continue;
      out.push(...walk(full, exts));
    } else if (exts.some((e) => entry.endsWith(e))) {
      out.push(full);
    }
  }
  return out;
}

describe('Legal URLs point to embermate.app — ysorallc.org retired', () => {
  describe('A. Static check — no ysorallc.org in functional URL positions', () => {
    it('no ysorallc.org string in any .ts/.tsx file under app/ (comments stripped)', () => {
      const files = walk(join(ROOT, 'app'), ['.ts', '.tsx']);
      const offenders: string[] = [];
      for (const f of files) {
        const stripped = stripComments(readFileSync(f, 'utf8'));
        if (stripped.includes('ysorallc.org')) {
          offenders.push(f.slice(ROOT.length + 1));
        }
      }
      expect(offenders).toEqual([]);
    });

    it('no ysorallc.org string in any URL field of app.json', () => {
      const json = JSON.parse(readFileSync(join(ROOT, 'app.json'), 'utf8'));
      const extra = json?.expo?.extra ?? {};
      const urlFields = [
        extra.privacyPolicyUrl,
        extra.termsOfServiceUrl,
        extra.supportUrl,
        extra.helpUrl,
        extra.legalUrls?.privacy,
        extra.legalUrls?.terms,
        extra.legalUrls?.dataRequest,
        extra.legalUrls?.dataDeletion,
      ];
      for (const value of urlFields) {
        expect(value).toBeTruthy();
        expect(value).not.toMatch(/ysorallc\.org/);
      }
    });

    it('app.json URL fields are all on embermate.app, with the expected paths preserved', () => {
      const json = JSON.parse(readFileSync(join(ROOT, 'app.json'), 'utf8'));
      const extra = json?.expo?.extra ?? {};
      expect(extra.privacyPolicyUrl).toBe('https://embermate.app/privacy');
      expect(extra.termsOfServiceUrl).toBe('https://embermate.app/terms');
      expect(extra.supportUrl).toBe('https://embermate.app/support');
      expect(extra.helpUrl).toBe('https://embermate.app/support');
      expect(extra.legalUrls?.privacy).toBe('https://embermate.app/privacy');
      expect(extra.legalUrls?.terms).toBe('https://embermate.app/terms');
      expect(extra.legalUrls?.dataRequest).toBe('https://embermate.app/data-request');
      expect(extra.legalUrls?.dataDeletion).toBe('https://embermate.app/data-deletion');
    });
  });

  describe('B. Render check — PrivacyDisclaimerScreen carries privacy + terms links', () => {
    const SRC_PATH = join(
      ROOT,
      'app',
      '(onboarding)',
      'screens',
      'PrivacyDisclaimerScreen.tsx',
    );
    const SRC = readFileSync(SRC_PATH, 'utf8');
    const STRIPPED = stripComments(SRC);

    it('terms-of-use link opens https://embermate.app/terms IN-APP (openLegal → WebBrowser), not an eject', () => {
      // The link routes through openLegal(url), which opens the returnable
      // in-app browser (expo-web-browser) — NOT Linking.openURL, which would
      // eject the caregiver to Safari mid-onboarding.
      expect(STRIPPED).toMatch(
        /openLegal\(\s*['"]https:\/\/embermate\.app\/terms['"]\s*\)/,
      );
      expect(STRIPPED).toMatch(/WebBrowser\.openBrowserAsync/);
      // The eject pattern must not survive on this required-acceptance screen.
      expect(STRIPPED).not.toMatch(/Linking\.openURL/);
      // The pre-fix ysorallc URL must not survive in the disclaimer.
      expect(STRIPPED).not.toMatch(/ysorallc\.org/);
    });

    it('privacy-policy link is rendered and opens https://embermate.app/privacy IN-APP', () => {
      expect(STRIPPED).toMatch(
        /openLegal\(\s*['"]https:\/\/embermate\.app\/privacy['"]\s*\)/,
      );
      // The visible link label must read as "privacy policy" copy so the
      // affordance is discoverable on the disclaimer surface (the user
      // needs to find it next to the terms link).
      expect(STRIPPED.toLowerCase()).toContain('privacy policy');
    });
  });
});
