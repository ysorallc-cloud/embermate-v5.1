// ============================================================================
// Notification-bell redundancy audit — when a bell icon sits next to a
// toggle that controls THAT SAME notification, the bell is redundant. The
// toggle alone communicates state. This locks in: in the three reminder-
// toggle patterns audited (medication-form, appointment-form, ReminderSection),
// the bell icon next to the Switch is removed.
//
// Out of scope (legitimate uses): section icons in the Settings categories,
// the SubScreenHeader emoji on /notification-settings, and the bell on the
// "Turn on notifications" CTA prompt — those don't sit beside their own
// toggle, so they're not the redundancy this fix targets.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');

const targets: Array<{ rel: string; reason: string }> = [
  {
    rel: 'app/medication-form.tsx',
    reason: 'Reminders toggle row had a 🔔 next to the Switch — bell removed.',
  },
  {
    rel: 'app/appointment-form.tsx',
    reason: 'Appointment Reminder toggle row — bell removed.',
  },
  {
    rel: 'components/medication/ReminderSection.tsx',
    reason: 'Shared ReminderSection toggle — bell removed.',
  },
];

describe.each(targets)('Notification-bell redundancy — $rel ($reason)', ({ rel }) => {
  const src = read(rel);

  it('reminder toggle row no longer renders a 🔔 emoji adjacent to its Switch', () => {
    // The bell-adjacent-to-Switch pattern was always within a row that also
    // wires the Switch's value/onValueChange. Verify the bell text is gone.
    expect(src).not.toMatch(/style=\{styles\.reminderIcon\}>🔔/);
  });

  it('reminderIcon style is no longer applied in JSX (orphan-style ok)', () => {
    expect(src).not.toMatch(/style=\{styles\.reminderIcon\}/);
  });

  it('the toggle Switch still controls reminderEnabled state', () => {
    // The toggle stays — only the redundant icon next to it is removed.
    expect(src).toMatch(/<Switch[\s\S]{0,400}?reminderEnabled/);
  });
});
