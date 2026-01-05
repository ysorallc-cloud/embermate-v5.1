# Android Data Safety Form - EmberMate

**For Google Play Console Data Safety Section**

Last Updated: January 5, 2026

---

## Quick Summary

✅ **All data stored locally on device (encrypted)**
✅ **No data shared with third parties**
✅ **No tracking or advertising**
✅ **User-controlled data sharing only**

---

## Data Collection & Sharing

### Does your app collect or share any of the required user data types?

**YES** - EmberMate collects data for app functionality only

---

## SECTION 1: HEALTH AND FITNESS

### Data types collected:
- ✅ Health info (medications, vitals, symptoms)
- ✅ Fitness info (activity tracking for correlations)

### Is this data collected, shared, or both?
- **Collected:** YES
- **Shared:** ONLY when user explicitly exports/shares

### Is this data processed ephemerally?
- **NO** - Data is stored persistently on device

### Is collection of this data required or optional?
- **REQUIRED** - App functionality depends on health data

### Why is this user data collected?
- ☑️ App functionality - Medication tracking, health monitoring
- ☐ Analytics - NO
- ☐ Developer communications - NO
- ☐ Advertising or marketing - NO
- ☐ Fraud prevention, security, and compliance - NO
- ☐ Personalization - NO
- ☐ Account management - NO

---

## SECTION 2: PHOTOS AND VIDEOS

### Data types collected:
- ✅ Photos (medication photos, wound documentation, medical records)
- ☐ Videos - NO

### Is this data collected, shared, or both?
- **Collected:** YES
- **Shared:** ONLY when user explicitly shares

### Is this data processed ephemerally?
- **NO** - Photos stored persistently

### Is collection of this data required or optional?
- **OPTIONAL** - Photo documentation is optional feature

### Why is this user data collected?
- ☑️ App functionality - Medication documentation, wound tracking

---

## SECTION 3: PERSONAL INFO

### Data types collected:
- ✅ Name (patient name, caregiver names)
- ✅ Email address (for PDF exports, optional)
- ☐ User IDs - NO
- ☐ Address - NO
- ☐ Phone number - NO (emergency contacts stored locally only)
- ☐ Race and ethnicity - NO
- ☐ Political or religious beliefs - NO
- ☐ Sexual orientation or gender identity - NO
- ☐ Other info - NO

### Is this data collected, shared, or both?
- **Collected:** YES (stored locally)
- **Shared:** NO (unless user exports reports)

### Is this data processed ephemerally?
- **NO**

### Is collection of this data required or optional?
- **OPTIONAL** - User can use app without providing name

### Why is this user data collected?
- ☑️ App functionality - Personalized care reports

---

## SECTION 4: APP ACTIVITY

### Data types collected:
- ✅ App interactions (medication taken logs, appointment completion)
- ☐ In-app search history - NO
- ☐ Installed apps - NO
- ☐ Other user-generated content - NO
- ☐ Other actions - NO

### Is this data collected, shared, or both?
- **Collected:** YES
- **Shared:** NO (unless included in user-initiated exports)

### Is this data processed ephemerally?
- **NO**

### Is collection of this data required or optional?
- **REQUIRED** - Core app functionality

### Why is this user data collected?
- ☑️ App functionality - Track medication adherence, appointment attendance

---

## SECTION 5: APP INFO AND PERFORMANCE

### Data types collected:
- ☐ Crash logs - NO (local only, not transmitted)
- ☐ Diagnostics - NO
- ☐ Other app performance data - NO

**Note:** We do NOT collect crash logs or analytics

---

## SECTION 6: DEVICE OR OTHER IDs

### Data types collected:
- ☐ Device or other IDs - NO

---

## DATA SECURITY PRACTICES

### Is all of the user data collected by your app encrypted in transit?

**N/A** - No data transmission (all local storage)

**If cloud sync enabled (future feature):** YES - HTTPS encryption

### Do you provide a way for users to request that their data is deleted?

**YES**
- Users can delete individual entries in-app
- Users can clear all data (Settings → Clear All Data)
- Uninstalling the app deletes all local data

---

## DATA USAGE & HANDLING

### Health and Fitness Data

**Data usage and handling:**
- ☑️ Data is encrypted in transit - N/A (local only) / YES (if cloud sync)
- ☑️ Data is encrypted at rest - YES (AES-256 encryption)
- ☑️ Users can request data deletion - YES
- ☑️ Data is NOT shared with third parties
- ☑️ Data is NOT sold
- ☑️ Data is NOT used for advertising
- ☑️ Data is NOT used for analytics
- ☑️ Collected for app functionality only

### Photos and Videos

**Data usage and handling:**
- ☑️ Data is encrypted at rest - YES (device-level encryption)
- ☑️ Users can request data deletion - YES
- ☑️ Data is NOT shared with third parties
- ☑️ Data is NOT sold
- ☑️ Collected for app functionality only

### Personal Info (Name)

**Data usage and handling:**
- ☑️ Data is encrypted at rest - YES
- ☑️ Users can request data deletion - YES
- ☑️ Data is NOT shared with third parties
- ☑️ Data is NOT sold
- ☑️ Collected for app functionality only

### App Activity

**Data usage and handling:**
- ☑️ Data is encrypted at rest - YES
- ☑️ Users can request data deletion - YES
- ☑️ Data is NOT shared with third parties
- ☑️ Data is NOT sold
- ☑️ Collected for app functionality only

---

## DATA SHARING DISCLOSURE

### Do you share any of the collected data with third parties?

**NO** - With the following exceptions:

**User-Initiated Sharing Only:**
1. **PDF Exports** - User generates and shares care reports
2. **Family Sharing** - User invites caregivers with access codes
3. **Photo Sharing** - User shares medication/wound photos

**Important:** All sharing is explicit, user-initiated, and controlled by the user.

---

## APP CATEGORY

**Primary Category:** Medical
**Secondary Category:** Health & Fitness

---

## TARGET AUDIENCE

**Age Range:** 18+
**Content Rating:** Everyone

**Target Users:**
- Family caregivers managing patient care
- Adult children caring for aging parents
- Patients managing their own health
- Professional caregivers (non-HIPAA context)

---

## MEDICAL DISCLAIMER FOR PLAY STORE

**App Description Disclaimer Text:**

```
MEDICAL DISCLAIMER: EmberMate is a personal health tracking tool,
not a medical device. Not FDA-approved. Not HIPAA-compliant. Not a
substitute for professional medical advice. For informational purposes
only. Always consult healthcare professionals for medical decisions.
```

---

## PERMISSIONS JUSTIFICATION

### Camera (android.permission.CAMERA)

**Why requested:** Capture photos of medication bottles, wound documentation, medical records

**When requested:** Only when user taps "Take Photo" button

**Can user decline:** YES - Photo feature is optional

### Read External Storage (android.permission.READ_EXTERNAL_STORAGE)

**Why requested:** Select existing photos from device gallery

**When requested:** Only when user taps "Choose from Library"

**Can user decline:** YES - Photo feature is optional

### Write External Storage (android.permission.WRITE_EXTERNAL_STORAGE)

**Why requested:** Save medication photos locally

**When requested:** Only when user saves photos

**Can user decline:** YES - Photo feature is optional

### Biometric (android.permission.USE_BIOMETRIC)

**Why requested:** Secure app access with fingerprint/face unlock

**When requested:** When user enables biometric security in settings

**Can user decline:** YES - Can use PIN instead or no security

### Vibrate (android.permission.VIBRATE)

**Why requested:** Haptic feedback for medication confirmations

**When requested:** On app interactions (if enabled)

**Can user decline:** YES - Vibration can be disabled in settings

### Post Notifications (android.permission.POST_NOTIFICATIONS)

**Why requested:** Send local medication reminders

**When requested:** On first app launch

**Can user decline:** YES - Can use app without notifications

---

## THIRD-PARTY LIBRARIES

**List of third-party SDKs/libraries:**

1. **Expo SDK** (expo.dev)
   - Purpose: React Native framework
   - Data shared: None (runs locally)
   - Privacy policy: https://expo.dev/privacy

2. **React Native** (Meta/Facebook)
   - Purpose: UI framework
   - Data shared: None
   - Privacy policy: https://reactnative.dev/

3. **crypto-js** (npm package)
   - Purpose: AES-256 encryption
   - Data shared: None (client-side only)
   - Open source: https://github.com/brix/crypto-js

**We do NOT use:**
- ❌ Google Analytics
- ❌ Firebase Analytics
- ❌ Facebook SDK
- ❌ Advertising networks
- ❌ Crash reporting with personal data

---

## COMPLIANCE CERTIFICATIONS

- ☐ HIPAA - NO (not applicable for personal use app)
- ☐ SOC 2 - NO
- ☐ ISO 27001 - NO
- ☑️ GDPR - YES (compliant with data rights)
- ☑️ CCPA - YES (compliant with California privacy law)

---

## DATA RETENTION POLICY

**How long is data retained?**

- **User Control:** Data retained until user deletes it
- **App Uninstall:** All local data permanently deleted
- **No Server Storage:** We do not store data on servers (local-only)

---

## SECURITY MEASURES

### Encryption
- ✅ AES-256 encryption for all sensitive health data
- ✅ HMAC-SHA256 authentication for data integrity
- ✅ Secure keychain storage for encryption keys
- ✅ Biometric authentication (fingerprint/face unlock)
- ✅ 4-6 digit PIN fallback

### Access Control
- ✅ Auto-lock after 5 minutes inactivity
- ✅ Session management with secure tokens
- ✅ Granular permissions for family caregivers
- ✅ Activity logging for all caregiver actions

### Code Security
- ✅ No hardcoded secrets
- ✅ Input validation on all forms
- ✅ SQL injection prevention (using AsyncStorage, not SQL)
- ✅ XSS prevention (React Native safe by default)

---

## PLAY STORE QUESTIONNAIRE ANSWERS

**Q: Does your app access, collect, use, or share user data?**
A: YES

**Q: Is all of the user data collected by your app encrypted in transit?**
A: N/A (no data transmission) / YES (if cloud sync enabled)

**Q: Do you provide a way for users to request their data be deleted?**
A: YES

**Q: Does your app use location?**
A: NO

**Q: Does your app contain ads?**
A: NO

**Q: Does your app offer in-app purchases?**
A: NO (free app, no monetization)

**Q: Is your app designed for children?**
A: NO (ages 18+)

---

## CONTACT FOR DATA SAFETY INQUIRIES

**Data Protection Officer:** privacy@embermate.app
**Website:** https://embermate.app/privacy
**Response Time:** 7 business days

---

**Last Updated:** January 5, 2026
**Version:** 1.0

**Privacy-First Commitment:** Your health data belongs to you. We will never sell, share, or monetize your personal information. EmberMate is built with privacy as the foundation, not an afterthought.
