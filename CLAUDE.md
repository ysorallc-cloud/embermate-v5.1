# Claude Code Instructions for EmberMate

## Project Overview
EmberMate is a React Native/Expo SDK 52 caregiver support app.

## Critical Rules

### Expo Configuration
**Verify Expo config schema before modifying platform settings.** Do not guess at configuration locations. When adding iOS or Android specific settings:
1. Check the correct property path in Expo's config schema
2. `usesNonExemptEncryption` goes directly under `ios`, NOT under `ios.config`
3. If a config change doesn't work on the first try, question the assumption about where the key belongs before trying variations

### When Debugging Build/Submit Failures
- Read error messages carefully - structural clues matter (e.g., `[]` vs `false` indicates wrong config shape)
- After one failed attempt, verify the fix against documentation rather than trying more guesses
- Ask the user for guidance sooner rather than burning through builds

## Project Structure
- Native iOS directory exists at `ios/` - native Info.plist values may take precedence over app.json
- EAS builds use remote version source (`appVersionSource: "remote"` in eas.json)
- Build numbers are auto-incremented by EAS
