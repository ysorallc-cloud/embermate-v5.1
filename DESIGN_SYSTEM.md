# EmberMate Design System

Read this file before modifying any UI component or screen file.

## Design rules

1. **Never render more than 3 interactive elements above the fold** — the caregiver's first screen should be scannable in under 2 seconds
2. **Cards do not have Edit/Remove buttons visible** — use swipe or long-press for destructive actions
3. **Section headers use sentence case with left accent bar, never ALL CAPS** — "Today's schedule" not "TODAY'S SCHEDULE"
4. **Empty states show: emoji + title + subtitle + CTA** — never dashes or blank space
5. **Border: one base style everywhere, semantic tints only for state** — no per-card border customization
6. **Never use a grid of large action cards** — prefer lists or compact tiles
7. **Max 3 colors per screen: accent (teal), muted (gray), one semantic** — red for alerts, amber for warnings
8. **Every screen has a clear next action visible without scrolling** — the primary CTA must be above the fold
9. **Never render the same data in two visual formats on the same screen** — pick one representation
10. **Lists collapse by default with summary + count + chevron** — expand on tap
11. **Modals: explicit dismiss (X) + max 2 promoted actions** — never more than 2 buttons
12. **Form fields use placeholder examples, not generic text** — "e.g. Mom, Dad" not "Enter name"
13. **Progress shows number first (4/7), thin bar second, never rings** — fraction is the primary read
14. **Save confirmations are inline toasts with undo, never separate screens** — the undo toast pattern from INLINE_LOGGING
15. **Whitespace hierarchy: 8px within, 12px between, 20px groups, 24px+divider sections** — consistent spacing creates visual rhythm
16. **Tap targets minimum 44x44px with visible press feedback** — activeOpacity or hitSlop for small visual elements
17. **Card backgrounds use opaque hex, never rgba alpha below 0.15 on dark** — translucent cards look muddy on the warm near-black background

## Card color tokens

| Surface | Hex | Usage |
|---|---|---|
| Page background | `#0a0c0a` | Root background for all tabs |
| Standard card | `#131820` | `warmSurface` — default card/section background |
| Standard border | `#1a2230` | `warmSurfaceBorder` — card borders |
| Attention card | `#1a1510` | `warmSurfaceAlert` — overdue meds, heads-up items |
| Attention border | `#2a2018` | `warmSurfaceAlertBorder` |
| Quiet card | `#10140f` | `warmSurfaceQuiet` — patterns, resources |
| Quiet border | `#1a201a` | `warmSurfaceQuietBorder` |
| Green card | `#131a16` | `warmSurfaceGreen` — sage/support surfaces |
| Green border | `#1a2a22` | `warmSurfaceGreenBorder` |
| Purple card | `#131720` | `warmSurfacePurple` — connection/community |
| Purple border | `#1a2030` | `warmSurfacePurpleBorder` |

## Text color tokens

| Token | Hex | Usage |
|---|---|---|
| `textWarmPrimary` | `#e0e8f0` | Primary content text on warm surfaces |
| `textWarmSecondary` | `#b0b8c0` | Secondary content, timeline event text |
| `textWarmMuted` | `#6a7a8a` | Muted labels, inactive state |
| `textWarmHint` | `#4a5a6a` | Context lines, section hints, caption text |
| `textWarmDim` | `#3a4a5a` | Timestamps, privacy notices |
| `textAlertLabel` | `#e0a84e` | Amber alert labels (overdue, heads-up) |
| `textAlertPrimary` | `#e0d8c8` | Primary text on alert surfaces |
| `textAlertSecondary` | `#a09880` | Secondary text on alert surfaces |
| `textAlertHint` | `#8a7a5a` | Hint text on alert surfaces |

## Anti-patterns (do NOT introduce)

- **Card-within-card nesting** — a card inside a card creates visual noise; use dividers instead
- **Bordered tiles that look like buttons** — data-display tiles should be flat inset surfaces, not outlined action targets
- **Separate "loading" screens** — use inline skeleton/shimmer or the existing RefreshControl
- **Multiple save buttons** — one primary action per form; secondary actions are text links
- **Section labels that restate the content** — "What happened" above a timeline is redundant; the timestamps are self-evident
- **Emoji as section headers** — emoji belongs inside content (tiles, badges), not as a section identifier
- **Full-width colored banners for non-critical info** — reserve strong color for genuinely urgent items only
- **Scrolling forms with 10+ visible sections** — use a wizard (step-by-step) or quick/detailed mode toggle
- **Silent catch blocks** — every catch must call `logError` with a descriptive context name
- **Hardcoded hex colors in component files** — use theme tokens from `theme/theme-tokens.ts`

## File references

- Theme tokens: `theme/theme-tokens.ts` (dark) and `theme/light-tokens.ts` (light)
- Category labels: `constants/categoryLabels.ts` — single source of truth for badge vocabulary
- Shared components: `components/ScreenHeader.tsx`, `components/SubScreenHeader.tsx`, `components/shared/ShareToast.tsx`, `components/shared/InlineSaveToast.tsx`
