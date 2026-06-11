# Phase 32 Card-Set Corrections

Corrections to the six-card Phase 32 organization brief produced during the EmberMate launch sprint planning session. Cards are banked as-written; corrections apply at paste-time when each card becomes active.

---

## Correction 1 — Card 1 reframe

**Current framing:** Verify Phase 27 (Journal SOAP cards) shipped to HEAD before Cards 3 and 5 can run.

**Corrected framing:** Verify the specific SOAP surfaces that Phase 31 and Phase 32B depend on actually exist in HEAD, not Phase 27 generally.

The two concrete dependencies:

- **Plan Section 4** — Phase 31's consolidated Notes input lives here. ("PLAN: For the next caregiver" — Section 4 of the SOAP card stack.)
- **Assessment card** — Phase 32B's day-bound symptom render lives here. ("WORTH FLAGGING" surface that renders symptom name + time + severity + parent association.)

**Audit instruction:** Confirm both surfaces render in `app/(tabs)/journal.tsx` (or wherever Phase 27 placed them) and verify their component integration points are clean for the new content. Chrome existing elsewhere in the app (e.g., Batch C's wellness subscreen using JournalSection-style chrome) is necessary but not sufficient evidence — the actual SOAP cards must be present as surfaces, not just as a design pattern.

**Why this matters:** "Did Phase 27 ship?" answers a binary; "Do Plan Section 4 and Assessment card exist as render-ready surfaces?" answers what 31 and 32B actually need.

---

## Correction 2 — Card 7 split

**Current state:** Phase 33b bundles four scopes — greeting/subhead architecture, lavender restraint, eyebrow canon reconciliation, surface-layer ladder reconciliation.

**Corrected state:** Split into two phases.

### Phase 33b — Brand-alignment corrections (canon → app)

Three scopes, all the same shape ("app currently deviates from website canon, correct toward canon"):

1. **Greeting + subhead architecture** — Q-33.5 reframe per locked Path 2 decision. F6's italic "Evening, Amber." reverts to regular serif. Subhead component ships empty/null per Path A discipline. NowGreeting reframe pulled from F7 lands here.
2. **Lavender restraint** — Audit lavender-on-patient-lane surfaces against three-tier lane-coherence rule. Post-32A, recheck which lavender callouts remain (Focus banner removed in 32A).
3. **Eyebrow canon reconciliation** — Three eyebrow surfaces (32A section eyebrows + 32C "WHERE THINGS STAND" + F8 SectionEyebrow) must agree on canonical letterSpacing. Website canon 1.5px; Phase 22.2 convention 0.5px. Relock all three at canon.

### Phase 33c — Surface-layer ladder audit (independent)

Single scope with different decision class:

4. **Surface-layer ladder** — Website 4-tier ladder (`#1a1612` → `#221d18` → `#2a2520` → `#322a23`). App skips mid-tier and uses `#363830` at top tier. The app's `#363830` was a deliberate Phase 2.6.2 lift for care-plan flows — flatly migrating to `#2a2520` would re-create the regression Phase 2.6.2 fixed. Audit must reconcile the website canon against the Phase 2.6.2 lift before any token change. Legitimate outcome: app's `#363830` is correct; website's ladder doesn't apply to native RN surface depth perception.

**Why split:**

- Different decision class. 33b is "correct toward canon." 33c is "decide whether canon applies."
- Different revert risk. 33b items revert individually. Surface-layer changes cascade across every elevated surface; revert expensive.
- Different timing pressure. 33b corrects F6 ship-miss before more witness-voice surfaces accumulate. 33c is fidelity question with no ship clock.
- 33b shouldn't be held hostage to 33c's audit complexity.

**Timing:** 33c runs in parallel with or after 33b. Independent.

---

## Correction 3 — Sequencing header

**Add to top of card set:**

```
EXECUTION SEQUENCE (do not run cards out of order):

  In flight:    Phase 33 — F7 currently. F8 → F9 → F10 → F11 ahead.
  Then:         Phase 33b (greeting + lavender + eyebrow, atomic).
  Then:         Card 2 — Phase 28 Batch B.
  Then:         Card 1 — SOAP surface verification (gates Cards 3 + 5).
  Then:         Card 3 — Phase 31.
  Then:         Card 4 — Phase 32A.
  Then:         Card 5 — Phase 32B.
  Then:         Card 6 — Phase 32C.
  Parallel/after: Phase 33c (surface-layer ladder, independent timing).

Cards are paste-ready for SEQUENTIAL execution. Running Card 2 before
Phase 33 ships, or Card 5 before Cards 1 + 4, breaks the audit-first
discipline that produced these cards.
```

**Why:** Without explicit ordering, reader could mistake Card 2 (Phase 28 Batch B) as the immediate next action when Phase 33 still has F7-F11 + 33b ahead.

---

## Correction 4 — Card 4 add Q-32A.1.1

**Add to Phase 32A pre-flight Q-locks:**

**Q-32A.1.1 — Appointments row label honesty.**

After Q-32A.1 resolves to "reminder slice only, subscreen untouched," the toggle's behavior (disable reminders) doesn't match its label ("Appointments"). Caregiver could reasonably interpret the off-state as "appointments off" when appointments still appear on Now tab and in Journal.

**Resolution: Keep label "Appointments" (preserves row-list noun parallelism with Medications / Vitals / Wellness check-ins / Meals / Water / Sleep / Activity). Resolve dishonesty in subtitle text.**

- **Off state subtitle:** "Reminders disabled. Appointments still visible on Now and in Journal."
- **On state subtitle:** "Reminded 1 day ahead. Tap to edit."

**Why this resolution wins over renaming to "Appointment reminders":** The parallel noun structure of the row list matters more than label literal-precision. Renaming one row breaks the visual rhythm of the category list. Subtitle clarity does the disambiguation work without sacrificing the row-list pattern.

**Test discipline addition:** `carePlanInlineReframe32A.test.tsx` pins the Appointments row subtitle text in both states.

---

## Correction 5 — Card 5 add option (d) to Q-32B.1

**Add to Phase 32B pre-flight Q-locks:**

**Q-32B.1 expanded with option (d):**

- (a) Care Plan drawer toggle + wellness check-in surface
- (b) Wellness check-in unconditional (always-visible field)
- (c) Wellness check-in only when ambient evidence exists (last 30 days)
- **(d) Wellness check-in form gains symptoms field; visible in collapsed state with subtle "Any symptoms?" prompt; expands on tap to reveal chips + severity + free-text**

**Resolution: Lock (d) for v1.0. Revisit when beta feedback signals under-recording.**

**Why (d) wins over (b):**

- Witness-voice respect. Wellness check-in is fundamentally about the caregiver's qualitative observation. A flat-affordance symptoms form alongside the witness-voice fields bristles against the surface's purpose.
- Empty-state hygiene. Most wellness check-ins won't have symptoms to record. Empty fields demanding input on every check-in trains caregivers to dismiss them.
- Path A discipline applied to UI. Ship the conservative structure; let usage inform whether to expand.

**Known tradeoff:** Option (d) hides recordability behind a tap. A caregiver who never taps the prompt never learns the field structure (chips + severity + free-text). This is acceptable for v1.0 because the dominant case is "no symptoms today" — the structure being hidden in the dominant case is a feature, not a bug.

**Revisit trigger:** If beta feedback shows caregivers wanting to log symptoms but missing the affordance, promote to (b) in v1.1. Concrete signal: support tickets or beta interviews indicating "I didn't know I could record symptoms here."

**Test discipline addition:** `symptomsAsAttribute32B.test.tsx` pins the collapsed-by-default render, the tap-to-expand interaction, and the empty-state behavior (collapsed prompt visible even when no symptoms exist).

---

## Operating principle (durable, applies beyond Phase 32)

**Claude (chat) operates on description; Claude Code operates on source.**

Recommendations from chat are **hypotheses for audit to test**, not locks. The audit converts hypothesis to lock.

Pattern observed across Phase 33 work this session:

| Chat recommendation | Audit catch |
|---|---|
| `caregiverAccentText` token name | Collision with existing token at `#d4baff`; relock as `caregiverAccentMid` / `caregiverAccentBold` |
| F4+F5+F6 includes Now-tab greeting | Now tab has no greeting; F6 scope corrected to You-tab only |
| Q-33.5 = italic-greeting | Website canon = regular greeting + italic subhead; Q-33.5 reframed Path 2 |
| F7 sweep at 19 sites | 22 sites actual; support.tsx:328 missed by F6 |
| Phase 33b bundle (4 scopes) | Surface-layer creep; split to 33b (3 scopes) + 33c (1 scope) |

The structural cause is description-vs-source asymmetry. Chat's recommendations confidently state defaults; source-level audit catches premise risks chat couldn't see.

**Behavioral implication for chat:**

1. Frame recommendations as hypotheses, not locks. "Recommended: X" not "Lock: X."
2. Surface premise risks even when confident. Audit will catch them anyway; surfacing earlier saves a round trip.
3. When audit catches something, the relocked version is the correct version. Don't re-litigate.
4. Trust the discipline. When the audit pattern keeps producing catches, the answer is to slow down, not to push past.

**Behavioral implication for Claude Code:**

1. Audit-first stays the load-bearing discipline.
2. Surface findings before code; let user lock before edits.
3. The premise-risk catches are the value-add. Don't skip them under time pressure.

---

## Application instructions

These corrections are **paste-time edits**, not regeneration triggers. When a card from the Phase 32 set becomes the active phase:

1. Open the card text as banked.
2. Cross-reference this file for corrections applying to that card.
3. Apply the corrections inline before sending to Claude Code.
4. Card 1 → Correction 1.
5. Card 4 → Correction 4.
6. Card 5 → Correction 5.
7. Card 7 → Correction 2 (split into 33b paste and 33c paste).
8. All cards → Correction 3 (sequencing header) applies to the set as a whole; surface in any session that resumes Phase 32 work.

Do not regenerate the card set. The cards' value is at paste-time; regenerating now edits past their actual use-time. Five corrections, written down once, applied when each card becomes active.

---

**File created:** session continuation from Phase 33 F7 work, after Phase 32 organization audit produced six-card brief with five push-back corrections.
