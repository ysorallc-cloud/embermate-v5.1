# Changelog

## 6.0.0 — UI/UX Redesign

### Design system
- Warm surface tokens across all tabs (`warmSurface`, `warmSurfaceBorder`, `warmSurfaceAlert`, `warmSurfaceQuiet`, plus warm-text variants)
- Emotionally intelligent contextual copy on every section
- Consistent ScreenHeader (32pt title / weight 300, auto-shrink to 28pt for long greetings)
- Background lifted from pure black `#000000` to warm near-black `#0a0c0a`
- Shared 24pt SafeAreaView paddingTop on all tab headers (including the inline Support header) so titles clear the iOS status bar

### Now tab
- "Good morning" / "Good afternoon" / "Good evening" greeting replaces "Now" header
- Quick Pulse status card (dot + fraction + progress bar) wrapped in a warm surface
- Inline medication confirm — one-tap "Confirm" replaces multi-screen Log flow for routine meds
- Long-press a medication to open the full log screen for notes / skip / side effects
- Inline "Logged" quick path for meals (auto meal-type by time of day)
- Undo toast for the inline confirm action (5-second window)
- Batch "Complete all N items" button on the RoutineSheet
- Amber alert surface for the urgent meds-due banner
- Timeline collapsed by default — tap any window row to expand
- Per-window banner taps to expand/collapse individual time groups
- Overdue dot color now reads directly from instance state (no longer gated on legacy stats)
- "Log" replaces "Log Late" everywhere (the time color already conveys urgency)

### Journal tab
- Status-led flat layout with green / amber / muted day status dot as the first read
- Borderless stats strip (Meds / BP / Meals / Check-ins) with thin column dividers
- Chronological "What happened" timeline rendered as flat time + text rows (no card)
- Heads Up items use inline accent-bar rows (no wrapping card)
- Patterns collapse to a single inline sentence; tap to expand
- Compact reflection — italic prompt + slim text field + right-aligned "Save" link
- Removed "AT A GLANCE", "WHAT HAPPENED", "HEADS UP", "PATTERNS", "YOUR REFLECTION" section headers in favor of self-evident structure
- Removed Before Bed section (Journal is a read surface; Now is the action surface)
- Combined "X, Y are overdue" narrative deduplicates per-med "not yet logged" attention items
- Share / Report buttons surface explicit "Loading" + "No Data" alerts instead of failing silently; pills dim while loading

### You tab (formerly Support)
- Warm room design with sage surfaces and breathing-room padding
- Emotionally intelligent section labels ("How are you?" → "Need a reset?" → "Here when you're ready")
- Tappable breathing card with centered concentric rings (72px / 48px / 28px) and a CSS-triangle play glyph in 60% accent
- Mood slider tap targets fixed (sliderTrack now stretches full width)
- Connection card uses purple warm surface
- Resources card uses quiet warm surface
- Footer affirmation: "You're doing something most people never see."

### Insights tab
- "EmberMate noticed" replaces "Correlations Found" — warmer, less clinical
- "Missing data" replaces "Data Gaps"
- "This week's pulse" label above the AI summary
- "Vitals this week" replaces "Vitals · 14 days"
- Visit prep card uses patient name in copy
- Removed standalone "Reports" section label

### Onboarding
- GetStartedScreen prompts for the care recipient's name (caregiver or self mode)
- Skip fallback uses the friendly placeholder ("your loved one") instead of the literal "Patient"
- Patient name persisted via PatientContext + AsyncStorage; downstream tabs filter both legacy placeholders

### Form simplification
- Vitals: smart defaults from last reading + "Same as last time" pill (1 tap for stable patients)
- Morning wellness: 5-step wizard with auto-advance on selection (was a vertical scroll of 5 sections)
- Evening wellness: 3-question quick mode by default; "Expand for detailed check" reveals the full form
- Meal log: time-aware default meal type + "She ate" quick save with collapsible details

### Infrastructure
- Encrypted-at-rest storage for sensitive keys (medications, vitals, appointments, wellness, etc.) via secureStorage v3 (AES-256-CTR + HMAC)
- Production fix: `decryptData` throws on malformed multi-part input instead of returning ciphertext to callers
- Production fix: `testEncryption` tamper probe is now deterministic (was flaky ~1 in 16 runs)
- Production fix: CarePlan auto-creation from config when no regimen exists
- Production fix: Vitals / meals / medication item reactivation in `syncOtherBucketsWithConfig`
- Deterministic DailyCareInstance ids (`inst-<date>-<itemId>-<windowId>`)
- Sentry DSN graceful fallback for builds without crash reporting configured
- Theme tokens centralized in `theme/theme-tokens.ts`
- 134 test suites / 1260+ tests passing
