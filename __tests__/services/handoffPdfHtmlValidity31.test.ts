// ============================================================================
// Phase 31 device-gate A3 — Journal Share PDF HTML well-formedness contract.
//
// The Quick Look preview crashed the host app after the Phase 31 PDF rebuild
// shipped to device. The audit ruled out the floating-pill anchor (expo-
// sharing presents from the root VC, not the pill) and ruled out file
// lifecycle (the PDF is moved to documentDirectory and never unlinked).
// The only remaining testable lever is HTML well-formedness — malformed HTML
// fed to WebKit can yield a PDF that QLPreviewController chokes on.
//
// Jest CANNOT inspect the actual PDF byte stream (expo-print is native, no
// headless renderer in test env). What it CAN do is run __testing.buildHtml
// against seeded payloads and pin invariants:
//
//   1. Starts with <!DOCTYPE html>.
//   2. Balanced root tags: <html>/</html>, <head>/</head>, <body>/</body>,
//      <style>/</style> — each pair exactly once.
//   3. No unsubstituted `${...}` literals leak into the output (template-
//      literal sanity).
//   4. <meta charset="utf-8"> declared (we emit em-dash, middle-dot,
//      subscript-2 — all multi-byte UTF-8).
//   5. Empty-day payload still emits well-formed <body> with H1 + subtitle
//      + provenance + footer.
//   6. Populated payload emits all expected section <h2>s:
//      Summary / What was logged / Worth flagging / Caregiver notes / Coming up.
//   7. Zero-row <table> guard — on empty meds, no <table> tag is emitted.
//      iOS 17 QL has a documented choke point on empty tables.
//   8. Every CSS `font-family` declaration carries a generic fallback
//      (serif / sans-serif).
//   9. No @font-face rule and no external font URL referenced.
//
// All-green = HTML is ruled out as the crash root cause, and the next step
// is the device crash log (localize to WebKit→PDF or QL itself). Any red =
// the construct named is the likely crash trigger.
// ============================================================================

// expo-print / expo-sharing / expo-file-system are native modules; mock so
// the buildHtml-only test path doesn't pull native code into the Jest runner.
// The functions are never invoked by buildHtml — these mocks just satisfy
// module imports.
jest.mock('expo-print', () => ({ printToFileAsync: jest.fn() }));
jest.mock('expo-sharing', () => ({
  shareAsync: jest.fn(),
  isAvailableAsync: jest.fn(() => Promise.resolve(true)),
}));
jest.mock('expo-file-system', () => ({
  documentDirectory: 'file:///mock-documents/',
  moveAsync: jest.fn(),
}));

import { __testing } from '../../services/handoffPdf';
import type { HandoffDayPayload } from '../../utils/handoffDayBuilder';

const { buildHtml } = __testing;

function countOccurrences(haystack: string, needle: string): number {
  let count = 0;
  let i = 0;
  while ((i = haystack.indexOf(needle, i)) !== -1) {
    count += 1;
    i += needle.length;
  }
  return count;
}

// Crude tag-balance — counts opening (`<tag` or `<tag>`) vs closing (`</tag>`)
// occurrences. Good enough for the root tags we control; not a full HTML parser.
function tagBalance(html: string, tag: string): { open: number; close: number } {
  const openRe = new RegExp(`<${tag}\\b`, 'gi');
  const closeRe = new RegExp(`</${tag}>`, 'gi');
  return {
    open: (html.match(openRe) ?? []).length,
    close: (html.match(closeRe) ?? []).length,
  };
}

function emptyPayload(): HandoffDayPayload {
  return {
    date: '2026-05-15',
    patientName: 'Dad',
    gestalt: '',
    medications: [],
    vitals: null,
    worthFlagging: [],
    notes: null,
    nextAppointment: null,
  };
}

function fullPayload(): HandoffDayPayload {
  return {
    date: '2026-05-15',
    patientName: 'Dad',
    gestalt: 'All meds taken. Vitals recorded. Wellness pending.',
    medications: [
      {
        name: 'Lisinopril',
        dosage: '10mg',
        status: 'completed',
        scheduledTime: '2026-05-15T08:00:00Z',
        takenAt: '2026-05-15T08:12:00Z',
      },
      {
        name: 'Metformin',
        dosage: '500mg',
        status: 'pending',
        scheduledTime: '2026-05-15T18:00:00Z',
      },
    ],
    vitals: {
      scheduled: true,
      recorded: true,
      scheduledTime: '2026-05-15T08:00:00Z',
      recordedAt: '2026-05-15T16:49:00Z',
      readings: {
        systolic: 158,
        diastolic: 95,
        heartRate: 72,
        oxygen: 96,
      },
    },
    worthFlagging: [
      { text: 'BP 158/95 — 12 points above week\'s avg.', category: 'bp' },
    ],
    notes: {
      text: 'Dad seemed off this morning — flagging it.',
      savedAt: '2026-05-15T20:30:00Z',
    },
    nextAppointment: { provider: 'Dr. Torres', specialty: 'Cardiology', date: '2026-05-22' },
  };
}

function build(payload: HandoffDayPayload): string {
  return buildHtml({
    payload,
    dateLabel: 'Friday, May 15',
    timeLabel: '10:30 PM',
  });
}

describe('Phase 31 — Journal Share PDF HTML well-formedness', () => {
  describe('contract 1: starts with <!DOCTYPE html>', () => {
    it('populated payload', () => {
      const html = build(fullPayload());
      expect(html.startsWith('<!DOCTYPE html>')).toBe(true);
    });
    it('empty payload', () => {
      const html = build(emptyPayload());
      expect(html.startsWith('<!DOCTYPE html>')).toBe(true);
    });
  });

  describe('contract 2: balanced root tags (exactly one open + one close)', () => {
    it.each([
      ['populated', fullPayload()],
      ['empty', emptyPayload()],
    ] as const)('%s — html/head/body/style each balanced', (_label, payload) => {
      const html = build(payload);
      for (const tag of ['html', 'head', 'body', 'style']) {
        const { open, close } = tagBalance(html, tag);
        expect({ tag, open, close }).toEqual({ tag, open: 1, close: 1 });
      }
    });
  });

  describe('contract 3: no unsubstituted ${...} literals', () => {
    it.each([
      ['populated', fullPayload()],
      ['empty', emptyPayload()],
    ] as const)('%s — no template-literal leakage', (_label, payload) => {
      const html = build(payload);
      // Forbid literal `${` anywhere — every interpolation must have resolved.
      expect(html).not.toMatch(/\$\{[^}]*\}/);
      expect(html).not.toContain('${');
    });
  });

  describe('contract 4: <meta charset="utf-8"> declared', () => {
    it('populated payload', () => {
      const html = build(fullPayload());
      // Accept both `charset="utf-8"` and `charset=utf-8` (with or without quotes).
      expect(html).toMatch(/<meta\s+charset=["']?utf-8["']?\s*\/?>/i);
    });
    it('empty payload also declares charset (header chrome always present)', () => {
      const html = build(emptyPayload());
      expect(html).toMatch(/<meta\s+charset=["']?utf-8["']?\s*\/?>/i);
    });
  });

  describe('contract 5: empty-day payload emits well-formed body with header + footer', () => {
    it('renders H1 + subtitle + provenance + footer', () => {
      const html = build(emptyPayload());
      // H1 always carries patientName + "— Handoff" label.
      expect(html).toMatch(/<h1>[\s\S]*?Dad[\s\S]*?Handoff[\s\S]*?<\/h1>/);
      // Subtitle pair-renders dateLabel + timeLabel.
      expect(html).toMatch(/<div class="subtitle">[\s\S]*?Friday, May 15[\s\S]*?10:30 PM[\s\S]*?<\/div>/);
      // Provenance line.
      expect(html).toMatch(/<div class="provenance">[\s\S]*?Caregiver-reported[\s\S]*?<\/div>/);
      // Footer.
      expect(html).toMatch(/<div class="footer">[\s\S]*?EmberMate[\s\S]*?<\/div>/);
    });

    it('emits no section <h2>s when payload is empty (no orphaned eyebrows)', () => {
      const html = build(emptyPayload());
      const expectedAbsent = [
        '<h2>Summary</h2>',
        '<h2>What was logged</h2>',
        '<h2>Worth flagging</h2>',
        '<h2>Caregiver notes</h2>',
        '<h2>Coming up</h2>',
      ];
      for (const tag of expectedAbsent) {
        expect(html).not.toContain(tag);
      }
    });
  });

  describe('contract 6: populated payload emits all expected section <h2>s', () => {
    it('renders Summary / What was logged / Worth flagging / Caregiver notes / Coming up', () => {
      const html = build(fullPayload());
      expect(html).toContain('<h2>Summary</h2>');
      expect(html).toContain('<h2>What was logged</h2>');
      expect(html).toContain('Worth flagging'); // inside callout-redflag
      expect(html).toContain('<h2>Caregiver notes</h2>');
      expect(html).toContain('<h2>Coming up</h2>');
    });
  });

  describe('contract 7: zero-row <table> guard (iOS 17 QL choke point)', () => {
    it('empty meds → no <table> at all', () => {
      const html = build(emptyPayload());
      expect(html).not.toContain('<table>');
      expect(html).not.toContain('<table ');
    });

    it('populated meds → exactly one <table> with body rows', () => {
      const html = build(fullPayload());
      const tableOpens = countOccurrences(html, '<table>');
      expect(tableOpens).toBe(1);
      const tableCloses = countOccurrences(html, '</table>');
      expect(tableCloses).toBe(1);
      // Body rows present (excluding the header row); each med becomes a <tr>.
      // The full payload has 2 meds → 3 <tr> total (1 header + 2 body).
      const trCount = countOccurrences(html, '<tr>');
      expect(trCount).toBeGreaterThanOrEqual(3);
    });

    it('payload with vitals but no meds → no <table> (vitals renders inline <p>, not a table)', () => {
      const p: HandoffDayPayload = {
        ...emptyPayload(),
        vitals: {
          scheduled: true,
          recorded: true,
          readings: { systolic: 120, diastolic: 80 },
        },
      };
      const html = build(p);
      expect(html).not.toContain('<table>');
    });
  });

  describe('contract 8: every font-family declaration has a generic fallback', () => {
    it('populated HTML — every font-family CSS declaration ends in serif or sans-serif', () => {
      const html = build(fullPayload());
      // Capture every `font-family: ...;` declaration; terminator is `;` or `}`.
      const matches = html.match(/font-family\s*:\s*[^;}]+/gi) ?? [];
      expect(matches.length).toBeGreaterThan(0);
      for (const decl of matches) {
        // Strip the `font-family:` prefix to look at the value side.
        const value = decl.replace(/^font-family\s*:\s*/i, '').trim();
        // Must contain a generic family keyword.
        const hasGeneric = /\b(serif|sans-serif|monospace|cursive|fantasy|system-ui)\b/i.test(value);
        expect({ decl, hasGeneric }).toEqual({ decl, hasGeneric: true });
      }
    });
  });

  describe('contract 9: no @font-face / external font URL references', () => {
    it.each([
      ['populated', fullPayload()],
      ['empty', emptyPayload()],
    ] as const)('%s — no @font-face rule', (_label, payload) => {
      const html = build(payload);
      expect(html).not.toMatch(/@font-face\b/i);
    });

    it.each([
      ['populated', fullPayload()],
      ['empty', emptyPayload()],
    ] as const)('%s — no external font URL (fonts.googleapis.com / .ttf / .woff / .otf)', (_label, payload) => {
      const html = build(payload);
      expect(html).not.toMatch(/fonts\.googleapis\.com/i);
      expect(html).not.toMatch(/fonts\.gstatic\.com/i);
      expect(html).not.toMatch(/\.(ttf|woff2?|otf|eot)\b/i);
      // url("...") with a remote scheme — local file:// paths aren't expected
      // here either, but block https:// / http:// specifically.
      expect(html).not.toMatch(/url\(\s*["']?https?:\/\//i);
    });
  });
});
