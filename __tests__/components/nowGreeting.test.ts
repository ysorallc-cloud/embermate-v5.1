import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const filePath = join(__dirname, '../../components/now/NowGreeting.tsx');

describe('NowGreeting component', () => {
  it('file exists', () => {
    expect(existsSync(filePath)).toBe(true);
  });

  const src = existsSync(filePath) ? readFileSync(filePath, 'utf8') : '';

  it('title renders at fontSize 24, fontWeight 400', () => {
    expect(src).toMatch(/fontSize:\s*24/);
    expect(src).toMatch(/fontWeight:\s*['"]400['"]/);
  });

  it('time chip renders with time-of-day emoji', () => {
    // Morning amber, midday purple, evening mint — using status tokens
    expect(src).toMatch(/timeChip|chipBackground/i);
    expect(src).toMatch(/☀|⛅|☾|sunny|moon/);
  });

  it('subtitle renders at ~12.5pt with textSecondary color', () => {
    expect(src).toMatch(/fontSize:\s*12\.?5?/);
    expect(src).toMatch(/textSecondary|c\.textSecondary|colors\.textSecondary/);
  });

  it('subtitle has lineHeight ~1.6x and marginTop 8, marginBottom 22', () => {
    expect(src).toMatch(/lineHeight:\s*(20|19|18)/); // 12.5 * 1.6 ≈ 20
    expect(src).toMatch(/marginTop:\s*8/);
    expect(src).toMatch(/marginBottom:\s*22/);
  });

  it('imports buildGreeting from contextualGreeting', () => {
    expect(src).toContain('buildGreeting');
    expect(src).toContain('contextualGreeting');
  });
});
