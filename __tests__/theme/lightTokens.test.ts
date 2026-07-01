/**
 * Light-mode token palette — locks in the exact values so they can't
 * drift without a deliberate, reviewed change.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const src = readFileSync(
  join(__dirname, '../../theme/light-tokens.ts'),
  'utf8',
);

// Helper: assert a key: 'value' pair exists in the source
function assertToken(key: string, value: string) {
  // Match `key: 'value'` or `key: "value"` with optional trailing comma
  const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`${key}:\\s*['"]${escaped}['"]`);
  expect(src).toMatch(re);
}

describe('Light-mode token palette', () => {
  describe('Surfaces', () => {
    it('background.app = #dbe5dc (deep parchment cream)', () => {
      assertToken('background', '#dbe5dc');
    });
    it('background.card = #ffffff (warm-tinted white)', () => {
      assertToken('glass', '#ffffff');
    });
    it('background.cardWarm = #ffffff', () => {
      assertToken('warmSurface', '#ffffff');
    });
    it('background.elevated = #ffffff', () => {
      assertToken('surfaceElevated', '#ffffff');
    });
  });

  describe('Text', () => {
    it('text.primary = #26302a', () => {
      assertToken('textPrimary', '#26302a');
    });
    it('text.secondary = #7f8c82', () => {
      assertToken('textSecondary', '#7f8c82');
    });
    it('text.muted = #a8b3aa', () => {
      assertToken('textMuted', '#a8b3aa');
    });
    it('text.inverse = #ffffff', () => {
      assertToken('textInverse', '#ffffff');
    });
  });

  describe('Accent (mint)', () => {
    it('accent.default = #3f7d57', () => {
      assertToken('accent', '#3f7d57');
    });
    it('accent.button = #3f7d57', () => {
      assertToken('accentButton', '#3f7d57');
    });
    it('accent.softBg = #e3ede4', () => {
      assertToken('accentSoftBg', '#e3ede4');
    });
    it('accent.softBorder = rgba(5, 150, 105, 0.4)', () => {
      assertToken('accentSoftBorder', 'rgba(5, 150, 105, 0.4)');
    });
  });

  describe('Status', () => {
    it('status.warning = #b8852f', () => { assertToken('statusWarning', '#b8852f'); });
    it('status.warningSoft = #fef3c7', () => { assertToken('statusWarningSoft', '#fef3c7'); });
    it('status.danger = #c0673f', () => { assertToken('statusDanger', '#c0673f'); });
    it('status.dangerSoft = #fee2e2', () => { assertToken('statusDangerSoft', '#fee2e2'); });
    it('status.success = #3f7d57', () => { assertToken('statusSuccess', '#3f7d57'); });
    it('status.successSoft = #d1fae5', () => { assertToken('statusSuccessSoft', '#d1fae5'); });
  });

  describe('Borders', () => {
    it('border.subtle = rgba(0, 0, 0, 0.10)', () => {
      assertToken('borderSubtle', 'rgba(0, 0, 0, 0.10)');
    });
    it('border.strong = rgba(0, 0, 0, 0.18)', () => {
      assertToken('borderStrong', 'rgba(0, 0, 0, 0.18)');
    });
  });
});
