/**
 * CareCircleTeaser component — structural tests.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const src = readFileSync(
  join(__dirname, '../../components/CareCircleTeaser.tsx'),
  'utf8',
);

describe('CareCircleTeaser component', () => {
  it('header eyebrow reads "COMING IN V7"', () => {
    expect(src).toContain('COMING IN V7');
  });

  it('title reads "Care Circle"', () => {
    expect(src).toContain('>Care Circle<');
  });

  it('body describes the feature with privacy framing', () => {
    expect(src).toContain('Invite siblings and other caregivers to share the load');
    expect(src).toContain('end-to-end encrypted');
    expect(src).toContain('your data still never leaves your phones');
  });

  it('CTA reads "Join early access"', () => {
    expect(src).toMatch(/Join early access/);
  });

  it('tapping the CTA triggers the email-capture handler', () => {
    expect(src).toMatch(/onPress=\{.*onJoin|onPress=\{.*handleJoin/);
  });

  it('has a dismiss affordance (x button) that calls onDismiss', () => {
    expect(src).toMatch(/onDismiss/);
    // The dismiss button should be a small touchable in the corner
    expect(src).toMatch(/dismiss|close/i);
  });

  it('uses purple tokens for dark mode styling', () => {
    expect(src).toContain('#b794f4');
    expect(src).toContain('rgba(159, 122, 234,');
  });
});
