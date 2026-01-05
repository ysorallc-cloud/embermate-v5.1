# EmberMate Web Migration Plan

**Version**: 5.7.0 → 6.0.0 (Web-enabled)
**Created**: January 4, 2026
**Goal**: Full feature parity with mobile app, deployed as static site

---

## Overview

EmberMate will be adapted to work seamlessly on web browsers while maintaining:
- ✅ **Privacy-first**: Local browser storage only, no backend servers
- ✅ **Feature parity**: All mobile features available on web
- ✅ **Security**: Password-based auth + encryption (replacing biometrics)
- ✅ **Performance**: Fast, responsive, works offline
- ✅ **Single codebase**: Shared code between mobile and web

---

## Current State Analysis

### ✅ Already Web-Compatible

Your app.json already has web configuration:
```json
"web": {
  "bundler": "metro",
  "output": "static",
  "favicon": "./assets/favicon.png"
}
```

**What already works on web**:
- ✅ React Native core components
- ✅ Expo Router navigation
- ✅ AsyncStorage (uses localStorage on web)
- ✅ Most UI components
- ✅ Business logic and state management
- ✅ ~80% of your codebase

### ❌ Needs Adaptation for Web

**Platform-specific features that need alternatives**:

1. **Authentication** (expo-local-authentication)
   - Mobile: Face ID/Touch ID/Fingerprint
   - Web: Password-based login + Web Crypto API

2. **Secure Storage** (expo-secure-store)
   - Mobile: iOS Keychain / Android Keystore
   - Web: IndexedDB with Web Crypto API

3. **Notifications** (expo-notifications)
   - Mobile: Native push notifications
   - Web: Browser notifications / Service Workers

4. **File Sharing** (Share API)
   - Mobile: Native share sheet
   - Web: Download as file

5. **UI Components**
   - SafeAreaView → Not needed on web
   - StatusBar → Not applicable
   - Native gestures → Mouse/keyboard events

6. **Biometric Authentication**
   - Mobile: Native biometrics
   - Web: WebAuthn (optional) or password only

---

## Architecture Changes

### 1. Platform Detection Layer

Create utilities to detect platform and adapt behavior:

```typescript
// utils/platform.ts
import { Platform } from 'react-native';

export const isWeb = Platform.OS === 'web';
export const isMobile = Platform.OS === 'ios' || Platform.OS === 'android';
export const isIOS = Platform.OS === 'ios';
export const isAndroid = Platform.OS === 'android';

export const getPlatformName = () => {
  switch (Platform.OS) {
    case 'web': return 'Web';
    case 'ios': return 'iOS';
    case 'android': return 'Android';
    default: return 'Unknown';
  }
};
```

### 2. Storage Abstraction Layer

Create a unified storage interface that works across platforms:

```typescript
// utils/storage.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Mobile: AsyncStorage (SQLite-backed)
// Web: IndexedDB wrapper for better performance

export const storage = {
  getItem: async (key: string) => {
    if (Platform.OS === 'web') {
      return await getFromIndexedDB(key);
    }
    return await AsyncStorage.getItem(key);
  },
  setItem: async (key: string, value: string) => {
    if (Platform.OS === 'web') {
      return await saveToIndexedDB(key, value);
    }
    return await AsyncStorage.setItem(key, value);
  },
  // ... other methods
};
```

### 3. Authentication System Redesign

**Mobile**: Biometric (Face ID/Touch ID) + PIN fallback
**Web**: Password + optional PIN

```
┌─────────────────────────────────────┐
│     Authentication Controller       │
├─────────────────────────────────────┤
│  - Detects platform                 │
│  - Routes to appropriate auth       │
└─────────────────────────────────────┘
         │                    │
         ▼                    ▼
┌──────────────────┐  ┌──────────────────┐
│  Mobile Auth     │  │   Web Auth       │
├──────────────────┤  ├──────────────────┤
│ • Biometric      │  │ • Password       │
│ • PIN fallback   │  │ • Session token  │
│ • Keychain       │  │ • Remember me    │
└──────────────────┘  └──────────────────┘
```

### 4. Encryption Key Management

**Mobile**: Keys stored in Keychain/Keystore
**Web**: Keys derived from password using PBKDF2, stored in IndexedDB (encrypted)

```typescript
// Web encryption workflow:
// 1. User enters password
// 2. Derive encryption key using PBKDF2 (100k iterations)
// 3. Use key to encrypt/decrypt data
// 4. Store encrypted data in IndexedDB
// 5. Never store raw password
```

---

## Implementation Plan

### Phase 1: Core Web Infrastructure ✅ (Week 1)

**1.1 Platform Utilities**
- [x] Create utils/platform.ts (detection)
- [ ] Create utils/webStorage.ts (IndexedDB wrapper)
- [ ] Create utils/webCrypto.ts (Web Crypto API)
- [ ] Update utils/secureStorage.ts (platform-aware)

**1.2 Authentication System**
- [ ] Create utils/webAuth.ts (password-based auth)
- [ ] Create components/WebLoginScreen.tsx
- [ ] Update utils/biometricAuth.ts (platform-aware)
- [ ] Add password management UI

**1.3 Build Configuration**
- [ ] Update app.json with web optimizations
- [ ] Configure web-specific webpack settings
- [ ] Set up PWA manifest
- [ ] Configure service worker

### Phase 2: Component Adaptation ✅ (Week 2)

**2.1 Layout Components**
- [ ] Create web-responsive layouts
- [ ] Replace SafeAreaView with platform-aware wrapper
- [ ] Add desktop navigation (sidebar for large screens)
- [ ] Implement responsive breakpoints

**2.2 UI Components**
- [ ] Adapt forms for web (better keyboard support)
- [ ] Add desktop-specific interactions (hover states)
- [ ] Improve accessibility (ARIA labels, keyboard nav)
- [ ] Test with mouse and keyboard

**2.3 Navigation**
- [ ] Test Expo Router on web
- [ ] Add browser back/forward support
- [ ] Implement breadcrumbs for desktop
- [ ] Add keyboard shortcuts

### Phase 3: Feature Parity ✅ (Week 3)

**3.1 Data Management**
- [ ] Test backup/restore on web
- [ ] Implement file download for exports
- [ ] Add print-friendly views
- [ ] Test with large datasets

**3.2 Notifications**
- [ ] Implement browser notifications
- [ ] Request notification permissions
- [ ] Schedule reminders using Service Worker
- [ ] Add notification preferences

**3.3 File Handling**
- [ ] File picker for imports
- [ ] Download handler for exports
- [ ] Drag-and-drop for file uploads
- [ ] Clipboard API for copying

### Phase 4: Testing & Optimization ✅ (Week 4)

**4.1 Cross-Browser Testing**
- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari
- [ ] Mobile browsers (responsive)

**4.2 Performance**
- [ ] Lighthouse audit (90+ score)
- [ ] Code splitting for faster loads
- [ ] Lazy loading for routes
- [ ] Asset optimization

**4.3 Accessibility**
- [ ] WCAG 2.1 AA compliance
- [ ] Screen reader testing
- [ ] Keyboard navigation
- [ ] Color contrast verification

### Phase 5: Deployment ✅ (Week 5)

**5.1 Build & Deploy**
- [ ] Configure static site generation
- [ ] Set up Netlify/Vercel deployment
- [ ] Configure custom domain
- [ ] Set up SSL certificate

**5.2 Documentation**
- [ ] Web-specific user guide
- [ ] Browser compatibility matrix
- [ ] Troubleshooting guide
- [ ] Migration guide for mobile users

---

## Technical Implementation Details

### Web Storage Strategy

**Why IndexedDB over localStorage?**
- ✅ 50MB+ storage (vs 5-10MB for localStorage)
- ✅ Better performance for large datasets
- ✅ Asynchronous (non-blocking)
- ✅ Transactional (safer)
- ✅ Can store binary data

**Storage Structure**:
```javascript
Database: embermate_db
  Store: medications
  Store: appointments
  Store: patients
  Store: vitals
  Store: symptoms
  Store: settings
  Store: encryption_keys (encrypted with password)
```

### Web Crypto API for Encryption

**Replace expo-secure-store with Web Crypto API**:

```typescript
// Generate encryption key from password
async function deriveKey(password: string, salt: Uint8Array) {
  const encoder = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  return await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

// Encrypt data
async function encryptData(data: string, key: CryptoKey) {
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const encryptedData = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    encoder.encode(data)
  );

  return {
    iv: Array.from(iv),
    data: Array.from(new Uint8Array(encryptedData))
  };
}
```

**Security Benefits**:
- ✅ AES-256-GCM encryption (same as mobile)
- ✅ PBKDF2 with 100k iterations (resistant to brute force)
- ✅ Unique salt per user
- ✅ Random IV per encryption
- ✅ Keys never stored in plaintext

### Web Authentication Flow

**First-time Setup**:
```
1. User visits web app
2. Onboarding screen (same as mobile)
3. Security setup: Create password (8+ chars, complexity requirements)
4. Generate encryption key from password
5. Encrypt and store key material in IndexedDB
6. Create session token (expires after timeout)
```

**Login Flow**:
```
1. User enters password
2. Derive encryption key from password + stored salt
3. Verify by attempting to decrypt test data
4. If successful: Create session, unlock app
5. If failed: Show error, track attempts (max 5)
6. Session expires after 30 minutes of inactivity
```

**Remember Me** (optional):
```
1. Store encrypted session token in localStorage
2. Auto-login on next visit (if not expired)
3. Still requires password after long periods (7 days)
4. Clear on explicit logout
```

### Responsive Design Breakpoints

```typescript
export const breakpoints = {
  mobile: 0,      // 0-639px
  tablet: 640,    // 640-1023px
  desktop: 1024,  // 1024-1535px
  wide: 1536,     // 1536px+
};

// Usage
const isMobile = width < breakpoints.tablet;
const isTablet = width >= breakpoints.tablet && width < breakpoints.desktop;
const isDesktop = width >= breakpoints.desktop;
```

**Layout Adaptations**:

**Mobile (0-639px)**:
- Stack navigation (same as mobile app)
- Full-width content
- Bottom tabs
- Touch-optimized buttons

**Tablet (640-1023px)**:
- Side navigation (collapsible)
- Two-column layouts
- Larger cards
- Hover states

**Desktop (1024px+)**:
- Permanent sidebar navigation
- Multi-column layouts
- Data tables for lists
- Keyboard shortcuts
- Context menus

### Browser Notifications

**Request Permission**:
```typescript
async function requestNotificationPermission() {
  if ('Notification' in window) {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  return false;
}
```

**Show Notification**:
```typescript
function showNotification(title: string, options: NotificationOptions) {
  if (Notification.permission === 'granted') {
    const notification = new Notification(title, {
      body: options.body,
      icon: '/icon-192.png',
      badge: '/badge-72.png',
      tag: options.tag,
      requireInteraction: true,
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  }
}
```

**Service Worker for Scheduled Notifications**:
```typescript
// Register service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js');
}

// In sw.js - schedule alarms
self.addEventListener('alarm', (event) => {
  event.waitUntil(
    self.registration.showNotification('Medication Reminder', {
      body: 'Time to take your medication',
      icon: '/icon-192.png',
      badge: '/badge-72.png',
    })
  );
});
```

### File Download/Export

**Replace native Share with download**:

```typescript
function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Usage
downloadFile(
  JSON.stringify(backupData),
  `embermate-backup-${timestamp}.json`,
  'application/json'
);
```

---

## Progressive Web App (PWA) Configuration

### manifest.json

```json
{
  "name": "EmberMate - Health Manager",
  "short_name": "EmberMate",
  "description": "Secure personal health companion",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#051614",
  "theme_color": "#FF8C94",
  "orientation": "portrait-primary",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ],
  "categories": ["health", "medical", "productivity"],
  "screenshots": [
    {
      "src": "/screenshots/mobile-1.png",
      "sizes": "540x960",
      "type": "image/png"
    }
  ]
}
```

### Service Worker (sw.js)

**Offline Support**:
```javascript
const CACHE_NAME = 'embermate-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/static/js/main.js',
  '/static/css/main.css',
  '/icon-192.png',
];

// Install
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

// Fetch
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => response || fetch(event.request))
  );
});
```

---

## Deployment Strategy

### Option 1: Netlify (Recommended)

**Pros**:
- ✅ Free tier available
- ✅ Automatic HTTPS
- ✅ Global CDN
- ✅ Easy custom domain
- ✅ Automatic deployments from Git
- ✅ Built-in analytics

**Setup**:
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Build web version
npx expo export:web

# Deploy
netlify deploy --prod --dir=dist
```

**netlify.toml**:
```toml
[build]
  command = "npx expo export:web"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
```

### Option 2: Vercel

**Pros**:
- ✅ Free tier available
- ✅ Excellent performance
- ✅ Edge network
- ✅ Built-in analytics

**Setup**:
```bash
# Install Vercel CLI
npm install -g vercel

# Build and deploy
vercel
```

### Option 3: GitHub Pages

**Pros**:
- ✅ Completely free
- ✅ Easy setup
- ✅ Version controlled

**Cons**:
- ❌ No automatic HTTPS for custom domains
- ❌ Slower than Netlify/Vercel

---

## Code Changes Required

### 1. Update biometricAuth.ts

```typescript
// utils/biometricAuth.ts
import { Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { webAuth } from './webAuth'; // NEW

export async function authenticateUser(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return await webAuth.authenticate();
  }

  // Existing biometric code
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Unlock EmberMate',
  });

  return result.success;
}
```

### 2. Update secureStorage.ts

```typescript
// utils/secureStorage.ts
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { webCrypto } from './webCrypto'; // NEW

export async function setSecureItem(key: string, value: any): Promise<boolean> {
  const stringValue = typeof value === 'string' ? value : JSON.stringify(value);

  if (Platform.OS === 'web') {
    return await webCrypto.setItem(key, stringValue);
  }

  // Existing mobile code
  const encrypted = await encryptData(stringValue);
  await SecureStore.setItemAsync(key, encrypted);
  return true;
}
```

### 3. Update _layout.tsx

```typescript
// app/_layout.tsx
import { Platform } from 'react-native';
import SecurityLockScreen from '../components/SecurityLockScreen';
import WebLoginScreen from '../components/WebLoginScreen'; // NEW

export default function RootLayout() {
  // ...

  if (isSecurityEnabled && isLocked && !isCheckingLock) {
    if (Platform.OS === 'web') {
      return <WebLoginScreen onUnlock={handleUnlock} />;
    }
    return <SecurityLockScreen onUnlock={handleUnlock} />;
  }

  // ...
}
```

### 4. Create Responsive Container

```typescript
// components/ResponsiveContainer.tsx
import { View, useWindowDimensions, Platform } from 'react-native';

export function ResponsiveContainer({ children }) {
  const { width } = useWindowDimensions();

  if (Platform.OS !== 'web') {
    return <>{children}</>;
  }

  // Desktop: Max width with padding
  if (width > 1024) {
    return (
      <View style={{ maxWidth: 1200, marginHorizontal: 'auto', padding: 24 }}>
        {children}
      </View>
    );
  }

  // Tablet/Mobile: Full width
  return <>{children}</>;
}
```

---

## Testing Plan

### Browser Compatibility Matrix

| Browser | Version | Features to Test |
|---------|---------|------------------|
| Chrome | Latest | Full functionality |
| Firefox | Latest | Web Crypto, IndexedDB |
| Safari | Latest | Service Worker, Notifications |
| Edge | Latest | Full functionality |
| Mobile Safari | iOS 15+ | Responsive design |
| Mobile Chrome | Android 11+ | Responsive design |

### Test Cases

**Authentication**:
- [ ] Create account with password
- [ ] Login with correct password
- [ ] Login failure handling
- [ ] Session timeout
- [ ] Remember me
- [ ] Logout

**Data Management**:
- [ ] Add/edit/delete medications
- [ ] Add/edit/delete appointments
- [ ] Backup data
- [ ] Restore data
- [ ] Large dataset performance (100+ items)

**Encryption**:
- [ ] Data encrypted in IndexedDB
- [ ] Cannot read data without password
- [ ] Encryption key derived correctly
- [ ] Backup encryption works

**Responsive Design**:
- [ ] Mobile view (< 640px)
- [ ] Tablet view (640-1023px)
- [ ] Desktop view (1024px+)
- [ ] Wide screen (1536px+)

**Offline Support**:
- [ ] App loads offline
- [ ] Data accessible offline
- [ ] Service worker caches assets
- [ ] Notifications work offline

---

## Performance Targets

### Lighthouse Scores (Target: 90+)

- **Performance**: 90+
  - First Contentful Paint: < 1.5s
  - Largest Contentful Paint: < 2.5s
  - Time to Interactive: < 3.5s
  - Total Blocking Time: < 200ms

- **Accessibility**: 95+
  - WCAG 2.1 AA compliance
  - ARIA labels
  - Keyboard navigation

- **Best Practices**: 95+
  - HTTPS only
  - No console errors
  - Proper image formats

- **SEO**: 90+
  - Meta tags
  - Structured data
  - Mobile-friendly

---

## Migration Timeline

### Week 1: Foundation
- Platform utilities
- Web authentication
- Web storage layer

### Week 2: Components
- Responsive layouts
- UI adaptations
- Navigation improvements

### Week 3: Features
- Notifications
- File handling
- Testing

### Week 4: Polish
- Performance optimization
- Accessibility
- Cross-browser testing

### Week 5: Launch
- Deployment
- Documentation
- Monitoring

---

## Risk Mitigation

### Potential Issues

**Issue 1: Browser Storage Limits**
- **Risk**: IndexedDB quota exceeded
- **Mitigation**: Monitor storage usage, warn at 80%, provide cleanup tools

**Issue 2: Password Management**
- **Risk**: Users forget password, lose all data
- **Mitigation**: Strong password requirements, password recovery hints, export reminders

**Issue 3: Cross-Browser Inconsistencies**
- **Risk**: Features work differently in browsers
- **Mitigation**: Extensive testing, polyfills, graceful degradation

**Issue 4: Performance on Low-End Devices**
- **Risk**: Slow performance on older computers
- **Mitigation**: Code splitting, lazy loading, performance monitoring

---

## Success Metrics

**Launch Goals**:
- [ ] 90+ Lighthouse performance score
- [ ] < 3s page load time
- [ ] Works in all major browsers
- [ ] 0 critical security issues
- [ ] Passes WCAG 2.1 AA accessibility

**User Experience**:
- [ ] < 1% error rate
- [ ] 90%+ feature parity with mobile
- [ ] Positive user feedback
- [ ] No data loss incidents

---

## Next Steps

1. **Review this plan** and approve approach
2. **Implement Phase 1** (web infrastructure)
3. **Test on one feature** (e.g., medications) end-to-end
4. **Iterate** based on feedback
5. **Complete remaining features**
6. **Deploy to staging** for testing
7. **Launch** production web app

---

**Questions or Changes?**

Contact: technical@embermate.com

**Document Version**: 1.0
**Last Updated**: January 4, 2026
**Status**: Ready for Implementation
