# EmberMate - Code Cleanup Recommendations

**Audit Date:** January 10, 2026
**Project Size:** 24,101 lines of code across 90 files
**Current Status:** Functional but needs cleanup

---

## 🔴 CRITICAL CLEANUPS (Do These First)

### 1. Delete "app 2/" Duplicate Folder ⚠️

**Location:** `/Users/ambercook/embermate-v5/app 2/`
**Size:** 508 KB
**Status:** Outdated backup from January 4, 2026
**Impact:** Confusing, wasting space, not tracked by git

**Action:**
```bash
cd /Users/ambercook/embermate-v5
rm -rf "app 2"
```

**Verification:** Check that app/ folder has all latest code (it does - modified today)

---

### 2. Remove Unused Components (2 files)

**Unused components identified:**

#### A. SecurityLockScreen.tsx
**Location:** `components/SecurityLockScreen.tsx`
**Size:** 9,935 bytes
**Usage:** 0 imports found
**Reason:** Feature appears to be implemented differently in app

**Action:**
```bash
rm /Users/ambercook/embermate-v5/components/SecurityLockScreen.tsx
```

**Note:** Before deleting, verify security lock functionality works via `app/settings/security.tsx`

#### B. WebLoginScreen.tsx
**Location:** `components/WebLoginScreen.tsx`
**Size:** 3,527 bytes
**Usage:** 0 imports found
**Reason:** Web platform doesn't use authentication

**Action:**
```bash
rm /Users/ambercook/embermate-v5/components/WebLoginScreen.tsx
```

---

### 3. Remove Unused Dependencies (2 packages)

**Packages installed but never imported:**

#### A. react-native-chart-kit
**Package:** `"react-native-chart-kit": "^6.12.0"`
**Usage:** 0 imports found
**Impact:** ~500 KB in node_modules

**Action:**
```bash
npm uninstall react-native-chart-kit
```

**Note:** You're using Timeline for data visualization instead

#### B. react-native-svg (Maybe Needed)
**Package:** `"react-native-svg": "^15.8.0"`
**Usage:** 0 direct imports found
**Impact:** ~2 MB in node_modules

**Caution:** This might be a peer dependency for other packages. Check first:
```bash
npm ls react-native-svg
```

**Action:** Only uninstall if no other packages depend on it

---

### 4. Clean Up .DS_Store Files (6 files)

**Issue:** macOS creates these hidden files, they're in .gitignore but clutter the repo

**Action:**
```bash
cd /Users/ambercook/embermate-v5
find . -name ".DS_Store" -type f -delete
```

**Prevention:** Already in .gitignore, so they won't be committed

---

## 🟡 MODERATE CLEANUPS (Recommended)

### 5. Reduce Console.log Statements (87 total)

**Current:** 87 console.log/console.warn statements across codebase
**Issue:** Should only use console.error for production, remove debugging logs

**High-priority files to clean:**
- `app/onboarding/index.tsx` - Has extensive logging (lines 88, 91, 94, 97, etc.)
- `app/care-brief.tsx` - Many debug logs
- `utils/correlationDetector.ts` - Debug correlation logs

**Action:**
Create a cleanup script or manually remove non-essential logs:

```bash
# Find all console.log statements
grep -rn "console\.log" app/ utils/ --include="*.tsx" --include="*.ts"
```

**Recommended approach:**
1. Keep console.error for actual errors
2. Remove console.log for debugging
3. Consider adding proper logging utility if needed

---

### 6. Complete or Remove Cloud Sync Feature

**Files affected:**
- `utils/cloudSync.ts` - 8 TODO comments, all placeholders
- `app/cloud-sync.tsx` - UI exists but backend incomplete

**TODOs found:**
```typescript
// TODO: Backend integration (appears 3 times)
// TODO: Implement vitals sync
// TODO: Implement symptoms sync
// TODO: Check backend availability
// TODO: Implement client-side encryption
// TODO: Implement client-side decryption
```

**Options:**

#### Option A: Remove Feature (Simpler)
- Delete `app/cloud-sync.tsx`
- Delete `utils/cloudSync.ts`
- Remove link from `app/settings/index.tsx` (line with cloud-sync route)
- Add note in settings: "Cloud sync coming in future update"

#### Option B: Add Backend (Complex)
- Implement Firebase/Supabase integration
- Complete all TODO functions
- Add proper encryption
- Test thoroughly

**Recommendation:** Option A for now, implement properly later with backend

---

### 7. Standardize Button Components

**Issue:** Buttons are styled inconsistently across screens

**Current approach:**
- Some screens use inline `TouchableOpacity` with custom styles
- Some use common styles from `theme-tokens.ts`
- No reusable Button component

**Files with most button code:**
- `app/onboarding/index.tsx` - 711 lines, custom button styles
- `app/care-brief.tsx` - 936 lines, mixed button patterns
- `app/(tabs)/today.tsx` - 760 lines, various button implementations

**Recommended:** Create reusable button components:

```typescript
// components/PrimaryButton.tsx
// components/SecondaryButton.tsx
// components/DestructiveButton.tsx
```

**Impact:** Reduces code duplication, easier maintenance

---

### 8. Consolidate Medication-Related Files

**Current structure has 3 medication files:**
- `app/medications.tsx` (440 lines) - List view
- `app/medication-form.tsx` (552 lines) - Add/edit form
- `app/medication-schedule.tsx` (432 lines) - Daily intake

**Issue:** These could potentially be combined or better organized

**Recommendation:** Consider creating:
```
app/medications/
  ├── index.tsx (list view)
  ├── form.tsx (add/edit)
  └── schedule.tsx (daily intake)
```

**Benefit:** Clearer organization, related code together

---

### 9. Add Missing Test Coverage

**Current test files:** 3 files in `utils/__tests__/`
- `notificationIntegration.test.ts`
- `secureStorage.test.ts`
- `notificationService.test.ts`

**Missing tests for:**
- Storage utilities (medicationStorage, appointmentStorage, etc.)
- Correlation detection algorithm
- PDF export functionality
- All UI components
- All app screens

**Recommendation:**
1. Add tests for critical utilities first (storage, correlations)
2. Add integration tests for key workflows
3. Set up test script in package.json:

```json
"scripts": {
  "test": "jest",
  "test:watch": "jest --watch",
  "test:coverage": "jest --coverage"
}
```

---

## 🟢 NICE-TO-HAVE CLEANUPS (Optional)

### 10. Create Shared Type Definitions

**Issue:** Type definitions scattered across files

**Current:**
- Each storage utility defines its own types
- Some types duplicated across files
- No central type registry

**Recommendation:** Create `types/` directory:

```
types/
  ├── medication.ts
  ├── appointment.ts
  ├── caregiver.ts
  ├── vitals.ts
  └── index.ts (re-exports all)
```

**Benefit:** Single source of truth for types, easier to maintain

---

### 11. Add ESLint and Prettier

**Current:** No linting or formatting configuration found

**Recommendation:**
```bash
npm install --save-dev eslint prettier eslint-config-prettier
npx expo install -- --save-dev eslint-config-expo
```

**Create configs:**
- `.eslintrc.js` - Code quality rules
- `.prettierrc` - Formatting rules

**Add scripts:**
```json
"scripts": {
  "lint": "eslint . --ext .ts,.tsx",
  "format": "prettier --write \"**/*.{ts,tsx,json,md}\""
}
```

---

### 12. Optimize Large Files

**Files over 500 lines:**
1. `app/care-brief.tsx` - 936 lines
2. `app/(tabs)/today.tsx` - 760 lines
3. `app/onboarding/index.tsx` - 711 lines
4. `app/settings/index.tsx` - 686 lines
5. `app/settings/security.tsx` - 627 lines

**Recommendation:** Break these into smaller, focused components

**Example for care-brief.tsx:**
```
app/care-brief/
  ├── index.tsx (main screen)
  ├── components/
  │   ├── SummaryCard.tsx
  │   ├── MedicationSection.tsx
  │   ├── AppointmentSection.tsx
  │   └── ExportButton.tsx
```

---

### 13. Add Error Boundary Components

**Current:** No global error boundaries found

**Recommendation:** Add error boundaries to prevent white screens:

```typescript
// components/ErrorBoundary.tsx
import React from 'react';
import { View, Text } from 'react-native';

class ErrorBoundary extends React.Component<Props, State> {
  // Handle errors gracefully
}
```

**Wrap root layout:**
```typescript
// app/_layout.tsx
<ErrorBoundary>
  <Stack>...</Stack>
</ErrorBoundary>
```

---

### 14. Improve Git Hygiene

**Add to .gitignore:**
```
# Build outputs
*.aab
*.apk
*.ipa

# Sensitive files
*.pem
*.key
*.cert

# IDE files
.vscode/
.idea/

# Test coverage
coverage/
```

**Recommendation:** Also add `.gitattributes` for consistent line endings:
```
* text=auto
*.tsx text eol=lf
*.ts text eol=lf
*.json text eol=lf
```

---

### 15. Document Utils and Complex Functions

**Files needing JSDoc comments:**
- `utils/correlationDetector.ts` - Complex algorithm
- `utils/drugInteractions.ts` - Medical logic
- `utils/medicationStorage.ts` - Critical data operations

**Example:**
```typescript
/**
 * Detects correlations between health metrics using Pearson coefficient
 * @returns Array of detected patterns with confidence levels
 * @throws Error if insufficient data (< 14 days)
 */
export async function detectCorrelations(): Promise<DetectedPattern[]>
```

---

## 📋 QUICK ACTION CHECKLIST

**Immediate (< 30 minutes):**
- [ ] Delete "app 2/" folder
- [ ] Remove unused components (2 files)
- [ ] Uninstall react-native-chart-kit
- [ ] Delete .DS_Store files
- [ ] Review and remove cloud-sync feature or add disclaimer

**Short-term (< 2 hours):**
- [ ] Clean up console.log statements (keep only errors)
- [ ] Add ESLint and Prettier
- [ ] Create basic test coverage for storage utils
- [ ] Standardize button components

**Long-term (Future sprint):**
- [ ] Refactor large files into smaller components
- [ ] Add comprehensive test coverage
- [ ] Create shared type definitions
- [ ] Add error boundaries
- [ ] Document complex utilities

---

## 🎯 PRIORITY SCORING

| Task | Impact | Effort | Priority | Score |
|------|--------|--------|----------|-------|
| Delete "app 2" | High | Low | 🔴 Critical | 10/10 |
| Remove unused components | Medium | Low | 🔴 Critical | 9/10 |
| Uninstall unused deps | Medium | Low | 🔴 Critical | 9/10 |
| Clean console.logs | Medium | Medium | 🟡 High | 7/10 |
| Cloud sync decision | Medium | High | 🟡 High | 6/10 |
| Add linting | High | Medium | 🟡 High | 8/10 |
| Refactor large files | High | High | 🟢 Medium | 6/10 |
| Add tests | High | High | 🟢 Medium | 7/10 |
| Create button components | Low | Medium | 🟢 Low | 4/10 |
| Document functions | Low | Medium | 🟢 Low | 3/10 |

---

## 🚀 AUTOMATED CLEANUP SCRIPT

Create this file to automate the critical cleanups:

**File: `scripts/cleanup.sh`**
```bash
#!/bin/bash
echo "🧹 Starting EmberMate cleanup..."

# 1. Remove duplicate app folder
echo "Removing 'app 2' duplicate..."
rm -rf "app 2"

# 2. Remove .DS_Store files
echo "Removing .DS_Store files..."
find . -name ".DS_Store" -type f -delete

# 3. Uninstall unused dependencies
echo "Removing unused dependencies..."
npm uninstall react-native-chart-kit

# 4. Remove unused components
echo "Removing unused components..."
rm components/SecurityLockScreen.tsx
rm components/WebLoginScreen.tsx

echo "✅ Critical cleanup complete!"
echo ""
echo "⚠️  Manual steps remaining:"
echo "  1. Review and clean console.log statements"
echo "  2. Decide on cloud-sync feature (remove or complete)"
echo "  3. Consider adding ESLint/Prettier"
```

**Run:**
```bash
chmod +x scripts/cleanup.sh
./scripts/cleanup.sh
```

---

## 📊 EXPECTED IMPROVEMENTS

After completing all critical cleanups:

**Code Quality:**
- ✅ 508 KB less duplicate code
- ✅ ~3 MB smaller node_modules
- ✅ Cleaner git status
- ✅ Faster builds (less to process)

**Maintainability:**
- ✅ Clearer project structure
- ✅ Less confusion from unused files
- ✅ Easier onboarding for new developers

**Performance:**
- ✅ Slightly faster app startup (fewer unused imports)
- ✅ Smaller production bundle size

---

## ❓ QUESTIONS TO ANSWER

Before proceeding with some cleanups, decide:

1. **Cloud Sync:** Keep feature as placeholder or remove entirely?
2. **Chart Library:** Will you add charts in future? (If yes, keep react-native-svg)
3. **Security Lock:** Is this feature actually needed? (Check user requirements)
4. **Testing:** What's your target test coverage? (Recommend 60%+)

---

**Summary:** Implementing the critical cleanups will remove ~4 MB of unused code and dependencies, making your codebase cleaner and more maintainable. The moderate cleanups will improve code quality and developer experience significantly.

Ready to start cleaning? Begin with the automated script above!
