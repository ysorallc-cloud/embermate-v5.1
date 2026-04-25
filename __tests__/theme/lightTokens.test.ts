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
    it('background.app = #e8dcbe (deep parchment cream)', () => {
      assertToken('background', '#e8dcbe');
    });
    it('background.card = #fdfaf0 (warm-tinted white)', () => {
      assertToken('glass', '#fdfaf0');
    });
    it('background.cardWarm = #fdf8ec', () => {
      assertToken('warmSurface', '#fdf8ec');
    });
    it('background.elevated = #ffffff', () => {
      assertToken('surfaceElevated', '#ffffff');
    });
  });

  describe('Text', () => {
    it('text.primary = #0f172a', () => {
      assertToken('textPrimary', '#0f172a');
    });
    it('text.secondary = #374151', () => {
      assertToken('textSecondary', '#374151');
    });
    it('text.muted = #6b7280', () => {
      assertToken('textMuted', '#6b7280');
    });
    it('text.inverse = #ffffff', () => {
      assertToken('textInverse', '#ffffff');
    });
  });

  describe('Accent (mint)', () => {
    it('accent.default = #047857', () => {
      assertToken('accent', '#047857');
    });
    it('accent.button = #059669', () => {
      assertToken('accentButton', '#059669');
    });
    it('accent.softBg = #ecfdf5', () => {
      assertToken('accentSoftBg', '#ecfdf5');
    });
    it('accent.softBorder = rgba(5, 150, 105, 0.4)', () => {
      assertToken('accentSoftBorder', 'rgba(5, 150, 105, 0.4)');
    });
  });

  describe('Status', () => {
    it('status.warning = #b45309', () => { assertToken('statusWarning', '#b45309'); });
    it('status.warningSoft = #fef3c7', () => { assertToken('statusWarningSoft', '#fef3c7'); });
    it('status.danger = #b91c1c', () => { assertToken('statusDanger', '#b91c1c'); });
    it('status.dangerSoft = #fee2e2', () => { assertToken('statusDangerSoft', '#fee2e2'); });
    it('status.success = #047857', () => { assertToken('statusSuccess', '#047857'); });
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
