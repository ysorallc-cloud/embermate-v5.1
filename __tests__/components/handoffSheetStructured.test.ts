import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const sheetSrc = readFileSync(join(ROOT, 'components/journal/HandoffSheet.tsx'), 'utf8');

describe('HandoffSheet — structured section cards', () => {
  it('renders section cards keyed off the section type (todo, headsup, etc.)', () => {
    // The structured-card renderer drives styling from a section-type
    // map (SECTION_CARD_STYLES) — each section.type becomes a styled card.
    expect(sheetSrc).toMatch(/SECTION_CARD_STYLES|sectionCardBase|todoCard|sectionCard.*todo|stillToDo/i);
    expect(sheetSrc).toMatch(/headsup|HeadsUp|stillToDo|sectionCard/i);
  });

  it('does not render canonicalText as a single Text block', () => {
    // The old <Text style={styles.canonicalBody}>{canonicalText}</Text> is gone.
    // Content is now parsed into structured sections.
    expect(sheetSrc).not.toMatch(/<Text[^>]*style=\{styles\.canonicalBody\}[^>]*>\s*\{canonicalText\}/);
  });

  it('has a primary Send via Messages button', () => {
    expect(sheetSrc).toMatch(/primaryAction[\s\S]{0,300}?Send via Messages|Send via Messages[\s\S]{0,80}?primaryAction/);
  });

  it('title font size is at least 18', () => {
    const titleStyle = sheetSrc.match(/title:\s*\{[^}]+\}/);
    expect(titleStyle).toBeTruthy();
    const size = titleStyle![0].match(/fontSize:\s*(\d+)/);
    expect(Number(size![1])).toBeGreaterThanOrEqual(18);
  });

  it('has include-notes toggle state', () => {
    expect(sheetSrc).toMatch(/\[\s*includeNotes\s*,\s*setIncludeNotes\s*\][\s\S]{0,40}useState/);
  });

  it('has edit mode state', () => {
    expect(sheetSrc).toMatch(/useState[\s\S]{0,40}?editing|isEditing|editMode|\[\s*isEditing\s*,/);
  });

  it('does not use monospace font in any style', () => {
    const lower = sheetSrc.toLowerCase();
    expect(lower).not.toMatch(/menlo/);
    // Allow 'monospace' only in comments, not in style objects.
    const styleSection = sheetSrc.match(/StyleSheet\.create\([\s\S]+$/);
    if (styleSection) {
      expect(styleSection[0].toLowerCase()).not.toMatch(/monospace/);
    }
  });
});

describe('HandoffSheet — canonical text parser', () => {
  const utilSrc = (() => {
    try {
      return readFileSync(join(ROOT, 'utils/handoffSectionParser.ts'), 'utf8');
    } catch {
      return '';
    }
  })();

  it('parseCanonicalSections helper exists', () => {
    expect(utilSrc.length).toBeGreaterThan(0);
    expect(utilSrc).toMatch(/parseCanonicalSections|parseHandoffSections/);
  });

  it('handles all five section types', () => {
    expect(utilSrc).toMatch(/todo/);
    expect(utilSrc).toMatch(/headsup|headsUp/);
    expect(utilSrc).toMatch(/upcoming/);
    expect(utilSrc).toMatch(/notes/);
    expect(utilSrc).toMatch(/done/);
  });
});
