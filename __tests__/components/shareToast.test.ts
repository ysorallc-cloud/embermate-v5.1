// ============================================================================
// ShareToast — Structure tests
// ============================================================================

import * as fs from 'fs';
import * as path from 'path';
import { SHARE_TOAST_DURATION } from '../../components/shared/ShareToast';

const toastPath = path.resolve(__dirname, '../../components/shared/ShareToast.tsx');
const toastSrc = fs.readFileSync(toastPath, 'utf-8');

describe('ShareToast', () => {
  it('toast renders with message', () => {
    expect(toastSrc).toContain('message');
    expect(toastSrc).toContain('Report ready to share');
    expect(toastSrc).toContain('subtitle');
  });

  it('toast auto-dismisses after timeout', () => {
    expect(SHARE_TOAST_DURATION).toBe(3000);
    expect(toastSrc).toContain('setTimeout');
    expect(toastSrc).toContain('onDismiss');
  });

  it('toast animates in from top', () => {
    expect(toastSrc).toContain('translateY');
    expect(toastSrc).toContain('Animated.spring');
    expect(toastSrc).toContain('-80');
  });
});
