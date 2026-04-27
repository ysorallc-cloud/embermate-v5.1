// ============================================================================
// NowGreeting — Option A header (time as metadata, not a chip)
// Asserts the new layout: greeting title + smaller patient pill on row 1,
// metadata line (emoji • time • subtitle) below the title.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const greetingSrc = readFileSync(
  join(__dirname, '../../components/now/NowGreeting.tsx'),
  'utf8',
);
const headerSrc = readFileSync(
  join(__dirname, '../../components/now/NowHeader.tsx'),
  'utf8',
);

function styleBlock(src: string, name: string): string {
  const re = new RegExp(`\\b${name}:\\s*\\{([^}]*)\\}`, 's');
  const m = src.match(re);
  return m ? m[1] : '';
}

function readNumberProp(block: string, prop: string): number | null {
  const m = block.match(new RegExp(`${prop}:\\s*(-?\\d+(?:\\.\\d+)?)`));
  return m ? Number(m[1]) : null;
}

describe('NowGreeting — Option A layout', () => {
  it('does NOT render a filled time chip with rgba purple background', () => {
    // The previous design used a filled chip behind the time. Option A drops
    // the chip — time is plain text on a metadata line.
    expect(greetingSrc).not.toMatch(/rgba\(180,\s*148,\s*244,\s*0\.15\)/);
    expect(greetingSrc).not.toMatch(/timeChip:\s*\{[^}]*backgroundColor/);
  });

  it('renders a metadata line below the title (not adjacent to it)', () => {
    // The metadata line should be a flexDirection:'row' container with
    // marginTop > 0 — clearly below the title.
    const metadataBlock = styleBlock(greetingSrc, 'metadataRow')
      || styleBlock(greetingSrc, 'metadata')
      || styleBlock(greetingSrc, 'subtitleRow');
    expect(metadataBlock).not.toBe('');
    expect(metadataBlock).toMatch(/flexDirection:\s*['"]row['"]/);
    const mt = readNumberProp(metadataBlock, 'marginTop');
    expect(mt).not.toBeNull();
    expect(mt as number).toBeGreaterThanOrEqual(4);
  });

  it('time text uses caregiverAccent color (not a filled chip)', () => {
    // Time should be styled text in the caregiver purple accent, not on a
    // filled chip background.
    expect(greetingSrc).toMatch(/caregiverAccent\b/);
  });

  it('subtitle text uses textSecondary on the metadata line', () => {
    expect(greetingSrc).toMatch(/textSecondary/);
  });

  it('time, separator dot, and subtitle all sit on the same metadata row', () => {
    // The metadata row JSX should contain emoji + time + dot + subtitle —
    // i.e. multiple text/view children inside one flex row.
    const block = greetingSrc.match(/<View[^>]*style=\{(?:s|styles)\.metadataRow\}[\s\S]*?<\/View>/);
    expect(block).toBeTruthy();
    // Three child texts: time, separator-dot, subtitle (emoji is fine inline)
    const textChildren = (block![0].match(/<Text\b/g) || []).length;
    expect(textChildren).toBeGreaterThanOrEqual(2);
  });
});

describe('NowGreeting — patient pill (smaller variant)', () => {
  // The patient pill lives in NowHeader, not NowGreeting. Assert the
  // smaller variant per Option A spec (height ~22pt, font 10pt).
  it('patientChip has reduced font size (10pt)', () => {
    const nameBlock = styleBlock(headerSrc, 'patientChipName');
    const fs = readNumberProp(nameBlock, 'fontSize');
    expect(fs).not.toBeNull();
    expect(fs as number).toBeLessThanOrEqual(10);
  });

  it('patientChip avatar is 16pt (smaller variant)', () => {
    const avatarBlock = styleBlock(headerSrc, 'patientAvatar');
    const w = readNumberProp(avatarBlock, 'width');
    const h = readNumberProp(avatarBlock, 'height');
    expect(w).toBe(16);
    expect(h).toBe(16);
  });

  it('patientChip uses accentBorder + accentTint (subtle, not filled accentLight)', () => {
    const chipBlock = styleBlock(headerSrc, 'patientChip');
    expect(chipBlock).toMatch(/accentBorder/);
    expect(chipBlock).toMatch(/accentTint/);
  });

  it('patientChip border is 0.5px hairline (not full 1px)', () => {
    const chipBlock = styleBlock(headerSrc, 'patientChip');
    const bw = readNumberProp(chipBlock, 'borderWidth');
    expect(bw).toBe(0.5);
  });
});

describe('NowGreeting — title row gives the title room', () => {
  it('title sits on a row that gives it flex: 1 + paddingRight to avoid clipping', () => {
    // The titleRow or its title child should reserve flex room and pad
    // the right side so the patient pill doesn't crowd the greeting.
    const titleRowBlock = styleBlock(greetingSrc, 'titleRow');
    const titleBlock = styleBlock(greetingSrc, 'title');
    const reservesFlex = /flex:\s*1/.test(titleBlock) || /flex:\s*1/.test(titleRowBlock);
    expect(reservesFlex).toBe(true);
    const padR = readNumberProp(titleBlock, 'paddingRight')
      ?? readNumberProp(titleRowBlock, 'paddingRight');
    if (padR !== null) {
      expect(padR).toBeGreaterThanOrEqual(8);
    }
  });
});
