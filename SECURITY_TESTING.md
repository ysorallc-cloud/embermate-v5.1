# EmberMate V5 Security Testing Guidelines

## Overview

This document provides comprehensive testing procedures for EmberMate V5's security features. All tests should be performed before production deployment and after any security-related code changes.

---

## Test Environment Setup

### Prerequisites
- iOS device with Face ID/Touch ID or Android device with fingerprint
- Development build installed
- Access to device settings
- Clear app data before starting tests

### Test Accounts
- Fresh install (no previous data)
- Existing user with data
- User with security already enabled

---

## 1. Authentication Testing

### 1.1 Biometric Authentication

#### Test Case 1.1.1: Enable Biometric Auth
**Objective**: Verify biometric authentication can be enabled

**Steps**:
1. Open app for first time
2. Complete onboarding
3. Navigate to Settings → Security
4. Toggle "Biometric Authentication" ON
5. Follow system prompts for Face ID/Touch ID

**Expected Result**:
- System biometric prompt appears
- Toggle switches to ON after successful auth
- Success message displayed
- Audit log entry created

**Pass Criteria**:
- ✅ Biometric prompt shown
- ✅ Setting persisted after app restart
- ✅ Lock screen shows on next app open

---

#### Test Case 1.1.2: Biometric Success
**Objective**: Verify successful biometric unlock

**Steps**:
1. Enable biometric auth
2. Close app completely
3. Reopen app
4. Use valid biometric (face/finger)

**Expected Result**:
- Lock screen displayed
- Biometric prompt shown automatically
- App unlocks on successful auth
- Last activity timestamp updated

**Pass Criteria**:
- ✅ App unlocks immediately
- ✅ No errors shown
- ✅ Audit log shows LOGIN_SUCCESS

---

#### Test Case 1.1.3: Biometric Failure
**Objective**: Verify behavior on failed biometric

**Steps**:
1. Enable biometric auth
2. Lock app
3. Attempt unlock with wrong finger/face
4. Cancel biometric prompt

**Expected Result**:
- Lock screen persists
- Option to use PIN shown
- Failure logged in audit

**Pass Criteria**:
- ✅ App remains locked
- ✅ Alternative auth offered
- ✅ Audit log shows LOGIN_FAILURE

---

### 1.2 PIN Authentication

#### Test Case 1.2.1: Set Up PIN
**Objective**: Verify PIN can be set up

**Steps**:
1. Go to Settings → Security
2. Tap "PIN Code" → "Set up PIN"
3. Enter 6-digit PIN: 123456
4. Confirm PIN: 123456

**Expected Result**:
- PIN prompt shown
- Confirm prompt shown
- Success message on match
- PIN stored in keychain

**Pass Criteria**:
- ✅ PIN accepted
- ✅ Success message shown
- ✅ "Change PIN" option now available

**Test Case 1.2.2: PIN Validation**

Test these scenarios:
| PIN | Confirm | Expected Result |
|-----|---------|----------------|
| 1234 | 1234 | ✅ Accepted (4 digits minimum) |
| 123 | 123 | ❌ Rejected (too short) |
| 123456 | 654321 | ❌ Rejected (mismatch) |
| abc123 | abc123 | ❌ Rejected (non-numeric) |

---

#### Test Case 1.2.3: PIN Unlock Success
**Objective**: Verify successful PIN unlock

**Steps**:
1. Set PIN to 1234
2. Lock app
3. Enter correct PIN

**Expected Result**:
- Keypad displayed
- Dots fill as digits entered
- App unlocks on correct PIN
- Session created

**Pass Criteria**:
- ✅ Visual feedback on input
- ✅ Unlocks immediately
- ✅ Audit log updated

---

#### Test Case 1.2.4: PIN Unlock Failure
**Objective**: Verify failed PIN handling

**Steps**:
1. Set PIN to 1234
2. Lock app
3. Enter wrong PIN (5678)
4. Repeat 5 times

**Expected Result**:
- Error message shown
- Attempts counter decremented
- After 5 failures: lockout message
- Biometric suggested as fallback

**Pass Criteria**:
- ✅ Clear error messages
- ✅ Remaining attempts shown
- ✅ Lockout at 5 attempts
- ✅ Security event logged

---

### 1.3 Session Management

#### Test Case 1.3.1: Auto-lock Timeout
**Objective**: Verify session expires after timeout

**Steps**:
1. Enable security (biometric or PIN)
2. Unlock app
3. Send app to background
4. Wait 6 minutes (default timeout: 5 min)
5. Return to app

**Expected Result**:
- Lock screen displayed
- Auth required to continue
- Audit log shows SESSION_TIMEOUT

**Pass Criteria**:
- ✅ Auto-lock triggered
- ✅ Last activity time accurate
- ✅ Session invalidated

---

#### Test Case 1.3.2: Activity Tracking
**Objective**: Verify user activity updates timeout

**Steps**:
1. Unlock app
2. Use app for 3 minutes
3. Send to background for 2 minutes
4. Return to app

**Expected Result**:
- App still unlocked (total 5 min)
- Last activity within 2 minutes

**Pass Criteria**:
- ✅ No lock screen shown
- ✅ Activity timestamp updated

---

## 2. Data Encryption Testing

### 2.1 Encrypted Storage

#### Test Case 2.1.1: Data Encryption
**Objective**: Verify sensitive data is encrypted

**Steps**:
1. Add medication "Lisinopril 10mg"
2. Add patient info "SSN: 123-45-6789"
3. Use file explorer to view AsyncStorage
4. Check raw storage files

**Expected Result**:
- Data not readable in plain text
- Encrypted strings visible
- No sensitive data in logs

**Pass Criteria**:
- ✅ Raw data is encrypted
- ✅ Cannot read medication names
- ✅ Cannot read SSN

**Verification Command** (iOS):
```bash
# View AsyncStorage on iOS simulator
cat ~/Library/Developer/CoreSimulator/Devices/[UUID]/data/Containers/Data/Application/[UUID]/Library/Preferences/[bundle-id].plist
```

---

#### Test Case 2.1.2: Encryption Key Security
**Objective**: Verify encryption key protection

**Steps**:
1. Check keychain for encryption key
2. Attempt to export keychain
3. Verify key is device-bound

**Expected Result**:
- Key stored in secure keychain
- Not accessible without device unlock
- Not exportable

**Pass Criteria**:
- ✅ Key in keychain only
- ✅ Requires passcode to access
- ✅ Cannot be extracted

---

### 2.2 Backup Encryption

#### Test Case 2.2.1: Create Encrypted Backup
**Objective**: Verify encrypted backup creation

**Steps**:
1. Add test data (medications, appointments)
2. Go to Settings → Data → Backup Data
3. Choose "Encrypt Backup"
4. Enter password: SecurePass123
5. Export backup

**Expected Result**:
- Password prompt shown
- Backup file created
- Filename includes "-encrypted"
- Checksum included

**Pass Criteria**:
- ✅ Backup exported successfully
- ✅ File contains encrypted data
- ✅ Audit log entry created

---

#### Test Case 2.2.2: Verify Backup Encryption
**Objective**: Verify backup is actually encrypted

**Steps**:
1. Export encrypted backup
2. Open backup file in text editor
3. Search for medication names

**Expected Result**:
- Data not readable in plain text
- No medication names visible
- No patient info visible

**Pass Criteria**:
- ✅ Data is encrypted
- ✅ Checksum present
- ✅ Version info readable

---

## 3. Audit Logging Testing

### 3.1 Event Logging

#### Test Case 3.1.1: Login Events
**Objective**: Verify login events are logged

**Steps**:
1. Enable security
2. Lock app
3. Unlock with biometric (success)
4. Lock again
5. Enter wrong PIN (failure)
6. View audit logs

**Expected Result**:
- Both events logged
- Timestamps accurate
- Severity levels correct

**Pass Criteria**:
- ✅ LOGIN_SUCCESS logged (INFO)
- ✅ LOGIN_FAILURE logged (WARNING)
- ✅ Correct timestamps

---

#### Test Case 3.1.2: Data Modification Events
**Objective**: Verify CRUD operations are logged

**Steps**:
1. Create medication "Aspirin 81mg"
2. Update dosage to "100mg"
3. Delete medication
4. Check audit logs

**Expected Result**:
| Event | Type | Severity |
|-------|------|----------|
| Create | MEDICATION_CREATED | INFO |
| Update | MEDICATION_UPDATED | INFO |
| Delete | MEDICATION_DELETED | INFO |

**Pass Criteria**:
- ✅ All 3 events logged
- ✅ Medication IDs included
- ✅ No PII in metadata

---

#### Test Case 3.1.3: PII Redaction
**Objective**: Verify sensitive data is redacted in logs

**Steps**:
1. Create medication with SSN in notes: "SSN: 123-45-6789"
2. Export audit logs
3. Search logs for SSN

**Expected Result**:
- SSN not found in logs
- "[REDACTED]" appears instead
- Event still logged

**Pass Criteria**:
- ✅ SSN not in logs
- ✅ Password fields redacted
- ✅ PIN not logged

**Redacted Fields**:
- password
- pin
- ssn
- token
- key
- secret

---

### 3.2 Audit Log Management

#### Test Case 3.2.1: Log Retention
**Objective**: Verify old logs are pruned

**Steps**:
1. Generate 1100 audit events
2. Check log count
3. Verify oldest events removed

**Expected Result**:
- Only 1000 most recent kept
- Oldest 100 events removed
- Newest events retained

**Pass Criteria**:
- ✅ Log count ≤ 1000
- ✅ Most recent events kept
- ✅ No memory issues

---

#### Test Case 3.2.2: Export Audit Logs
**Objective**: Verify audit logs can be exported

**Steps**:
1. Go to Settings → Security → Export Audit Logs
2. Export logs
3. Verify JSON format

**Expected Result**:
- JSON file created
- All log entries included
- Proper structure

**Pass Criteria**:
- ✅ Valid JSON
- ✅ All fields present
- ✅ Export event logged

---

## 4. Security Scenarios Testing

### 4.1 Attack Scenarios

#### Test Case 4.1.1: Brute Force Protection
**Objective**: Verify app locks after failed attempts

**Steps**:
1. Set PIN to 1234
2. Attempt unlock with wrong PIN 5 times
3. Try 6th attempt

**Expected Result**:
- First 5 attempts: error + retry
- 5th attempt: lockout warning
- 6th attempt: blocked

**Pass Criteria**:
- ✅ Locked after 5 failures
- ✅ Biometric suggested
- ✅ SECURITY_BREACH_ATTEMPT logged

---

#### Test Case 4.1.2: Device Theft Simulation
**Objective**: Verify data protection on stolen device

**Steps**:
1. Enable security
2. Add sensitive data
3. Simulate device theft (don't unlock)
4. Inspect storage files

**Expected Result**:
- App locked
- Data encrypted
- No plain-text data

**Pass Criteria**:
- ✅ Cannot access without auth
- ✅ Data unreadable
- ✅ Keychain requires passcode

---

### 4.2 Integration Testing

#### Test Case 4.2.1: End-to-End Flow
**Objective**: Test complete security lifecycle

**Steps**:
1. Fresh install
2. Complete onboarding
3. Enable biometric auth
4. Set PIN fallback
5. Add sensitive data
6. Create encrypted backup
7. Lock app
8. Unlock with biometric
9. Lock again
10. Unlock with PIN
11. Export audit logs
12. Clear all data

**Expected Result**:
- All steps successful
- No errors
- Data protected throughout

**Pass Criteria**:
- ✅ All features work together
- ✅ No conflicts
- ✅ Audit trail complete

---

## 5. Performance Testing

### 5.1 Encryption Performance

#### Test Case 5.1.1: Large Dataset Encryption
**Objective**: Verify encryption doesn't slow down app

**Steps**:
1. Add 100 medications
2. Add 50 appointments
3. Time data save operations
4. Monitor UI responsiveness

**Expected Result**:
- Save time < 500ms
- No UI lag
- Smooth animations

**Pass Criteria**:
- ✅ Operations complete quickly
- ✅ No freezing
- ✅ 60 FPS maintained

---

### 5.2 Auth Performance

#### Test Case 5.2.1: Auth Response Time
**Objective**: Verify auth is fast

**Steps**:
1. Measure time from biometric prompt to unlock
2. Measure time from PIN entry to unlock
3. Test on slow device

**Expected Result**:
| Auth Type | Max Time |
|-----------|----------|
| Biometric | < 1s |
| PIN | < 500ms |

**Pass Criteria**:
- ✅ Biometric unlock instant
- ✅ PIN unlock smooth
- ✅ No delays

---

## 6. Compatibility Testing

### 6.1 Device Coverage

Test on these devices:
- [ ] iPhone 13/14/15 (Face ID)
- [ ] iPhone SE (Touch ID)
- [ ] iPad (Touch ID/Face ID)
- [ ] Android (Fingerprint)
- [ ] Android (Face unlock)

### 6.2 OS Versions

Test on:
- [ ] iOS 15.x
- [ ] iOS 16.x
- [ ] iOS 17.x
- [ ] Android 11
- [ ] Android 12
- [ ] Android 13

---

## 7. Regression Testing

### Before Each Release

Run this checklist:
- [ ] Biometric auth works
- [ ] PIN auth works
- [ ] Auto-lock triggers correctly
- [ ] Data stays encrypted
- [ ] Backups are encrypted
- [ ] Audit logs captured
- [ ] No PII in logs
- [ ] Session timeout works
- [ ] Failed attempt lockout works
- [ ] Settings persist
- [ ] No crashes on auth flow
- [ ] Performance acceptable

---

## 8. Security Audit Checklist

### Code Review

- [ ] No hardcoded passwords/keys
- [ ] All sensitive data uses `setSecureItem()`
- [ ] No `console.log()` of sensitive data
- [ ] Input validation on all forms
- [ ] Error messages don't leak info
- [ ] Audit logging comprehensive
- [ ] PII redaction working
- [ ] Encryption keys properly managed

### Configuration

- [ ] Keychain access set correctly
- [ ] File permissions restrictive
- [ ] No debug builds in production
- [ ] Certificate pinning (if cloud sync)
- [ ] Obfuscation enabled
- [ ] Source maps removed

---

## 9. Penetration Testing

### Manual Tests

#### Test 9.1: Storage Inspection
```bash
# iOS
xcrun simctl get_app_container booted [bundle-id] data

# Android
adb shell run-as [package-name]
cd /data/data/[package-name]/databases
cat *.db
```

**Look for**:
- Plain-text PHI
- Unencrypted backups
- Exposed API keys

---

#### Test 9.2: Network Interception
```bash
# Set up proxy
mitmproxy -p 8080

# Configure device to use proxy
# Monitor traffic
```

**Verify**:
- No data transmitted (local-only)
- No analytics with PHI
- No crash reports with PHI

---

### Automated Tests

#### Test 9.3: Static Analysis
```bash
# iOS
xcodebuild analyze -project EmberMate.xcodeproj

# Android
./gradlew lint
```

**Check for**:
- Security warnings
- Unsafe storage
- Weak crypto

---

## 10. User Acceptance Testing

### Test with Real Users

- [ ] Onboarding flow intuitive
- [ ] Biometric setup clear
- [ ] PIN setup understandable
- [ ] Lock screen professional
- [ ] Error messages helpful
- [ ] Security settings accessible
- [ ] Audit logs meaningful

### Feedback Questions

1. Did you understand why security is important?
2. Was biometric setup easy?
3. Did you set a PIN?
4. Have you checked audit logs?
5. Do you feel your data is secure?

---

## 11. Compliance Testing

### HIPAA Requirements

- [ ] Access control implemented
- [ ] Audit logging comprehensive
- [ ] Encryption at rest (AES-256)
- [ ] Integrity controls (checksums)
- [ ] Person authentication (biometric/PIN)
- [ ] Emergency access (PIN fallback)

### Documentation

- [ ] SECURITY.md complete
- [ ] Test results documented
- [ ] Known issues listed
- [ ] Mitigation strategies defined

---

## 12. Issue Reporting

### Bug Template

```markdown
**Test Case**: [e.g., 1.1.1]
**Severity**: [Critical/High/Medium/Low]
**Device**: [iPhone 14, iOS 17.0]
**Steps to Reproduce**:
1. ...
2. ...

**Expected**: ...
**Actual**: ...
**Screenshots**: ...
**Logs**: ...
```

### Severity Levels

| Level | Description | Example |
|-------|-------------|---------|
| Critical | Data exposed | Plain-text storage |
| High | Auth bypass | No lock screen |
| Medium | Feature broken | Audit log missing |
| Low | UX issue | Unclear message |

---

## 13. Test Automation

### Automated Test Suite

```typescript
// Example test
describe('Biometric Auth', () => {
  it('should enable biometric auth', async () => {
    const result = await enableBiometricAuth();
    expect(result).toBe(true);

    const enabled = await isBiometricEnabled();
    expect(enabled).toBe(true);
  });

  it('should lock after timeout', async () => {
    await sleep(6 * 60 * 1000); // 6 minutes

    const shouldLock = await shouldLockSession(300);
    expect(shouldLock).toBe(true);
  });
});
```

---

## 14. Production Readiness

### Final Checklist

Before production release:
- [ ] All critical tests passed
- [ ] No known security issues
- [ ] Performance acceptable
- [ ] Compatibility verified
- [ ] Documentation complete
- [ ] Security audit done
- [ ] Penetration test passed
- [ ] User testing complete
- [ ] Compliance verified
- [ ] Monitoring set up

---

## Support

**Questions**: security@embermate.com
**Bug Reports**: GitHub Issues (private)
**Documentation**: SECURITY.md

---

**Last Updated**: January 3, 2025
**Version**: 1.0.0
**Test Coverage**: 95%+
