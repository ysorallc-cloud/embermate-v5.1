# Phase 9 follow-ups — final tracking after 9.6 closeout

Phase 9 closed on 2026-05-09. The migration covered 12 `app/log-*.tsx`
screens, the `LogScreen` primitive, the `silent-vitals` surface, and a
final pattern audit. This document records what survived 9.6 closeout
vs. what got resolved.

## Resolved by Phase 9.6

- **`Colors.orange` token (deletion)** — Pre-deletion grep surfaced
  `app/log-pain.tsx:56` as a load-bearing consumer (clinical severity
  gradient: green → amber → orange → red → rose). Per spec direction
  ("If grep returns hits in log-pain.tsx … severity gradients, stop
  and surface before deleting"), the token was retained as a semantic
  clinical-severity token. Closed as a docs commit
  (theme/theme-tokens.ts:129) clarifying the legitimate use and
  pointing future maintainers at the `logScreenPattern` audit. The
  legacy decorative use (log-meal saveButton) was already retired in
  Phase 9.3.

- **`SilentVitalsCapture` relocation** — Moved from `components/now/`
  to `components/logging/`, alongside the `LogScreen` primitive.
  `components/now/` was a legacy folder location from an inline-Now
  intent that never materialized. The component is now correctly
  located with the rest of the logging family.

- **Pattern audit** — `__tests__/audit/logScreenPattern.test.ts`
  added with six contracts and 83 assertions. Catches drift on every
  future log-* screen addition or modification.

## Deferred (with reasoning)

- **KAV at LogScreen primitive level** — Currently each migrated
  screen places `KeyboardAvoidingView` inside its `LogScreen`
  children. Sub-optimal for tall keyboards on small phones, but
  audit + behavior are acceptable. Defer to a dedicated primitive
  pass when keyboard occlusion surfaces in device review.

- **Inline DateTimePicker for "Earlier" pill** — log-vitals and
  log-meal currently use a 60-min-ago placeholder when the user
  picks "Earlier" on the time-taken row. `DateTimePicker` exists in
  `app/appointment-form.tsx` and could be lifted into a shared
  primitive. Defer to a dedicated time-input pass.

- **`getTodayProgress` deletion** — Closed in 9.6.2.B as a docs
  commit. `app/medication-confirm.tsx` is the sole remaining
  consumer; that screen is outside Phase 9's log-* scope. Once
  medication-confirm migrates to the `listDailyInstances` pattern,
  delete `getTodayProgress` + the `TodayProgress` type. Diagnostic
  context for that future migration is documented inline at
  `utils/rhythmStorage.ts:190–215`.

- **Portion picker for log-meal** — Phase 9.3 explicitly skipped
  this (Q2 option C). The meal data model has no portion field;
  adding the picker as a UI-only stub or as description-text
  workaround was rejected as confusing. Revisit when a proper
  data model exists.

- **`now.tsx:506` pain-name-match route investigation** — Fragile
  case-insensitive `itemName.includes('pain')` instance routing.
  Documented in `app/log-pain.tsx` exception comment header.
  Worth investigating before any change to Now-tab routing logic;
  not Phase 9 scope.

- **5.13.1.f wizard discoverability post-sample-load** — Stalled
  carry-over from Phase 5.13. Not blocking; check status separately
  when wizard work resumes.

- **Three Group C exception screens** — Each carries its own
  `// LogScreen exception:` comment with a three-part template
  (pattern that doesn't fit / why migration would degrade UX /
  Revisit when:). The audit (Contract 2) keeps the templates
  honest:
  - **`app/log-morning-wellness.tsx`** — wizard pattern. Revisit
    when LogScreen primitive grows step-indicator support, OR when
    a dedicated wizard primitive is established.
  - **`app/log-evening-wellness.tsx`** — multi-section form +
    load-bearing fallback for unknown itemTypes. Revisit when the
    fallback-route refactor lands.
  - **`app/log-medication-plan-item.tsx`** — dual-mode confirm/skip
    with skip-reason picker and side-effects multi-select. Revisit
    when medication-confirm flow gets product review, OR when
    LogScreen primitive grows multi-action support.

## Phase 9 stats

- 12 `app/log-*.tsx` screens audited
- 9 screens migrated to `LogScreen` (5 simple + 2 multi-step + 2 from earlier phases)
- 3 screens deferred with structured exception comments
- 1 vestigial screen deleted (log-bathroom in Phase 9.0)
- 1 pattern audit added (`__tests__/audit/logScreenPattern.test.ts`)
- 1 component relocated (SilentVitalsCapture)
- 0 token deletions (one survived as semantic clinical-severity, one deferred to medication-confirm migration)
- Final test count: 4286 passing
