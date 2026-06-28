// ============================================================================
// JEST GLOBAL SETUP
// Mocks for native modules and global test configuration
// ============================================================================

// Define React Native globals
global.__DEV__ = true;

// Silence console warnings in tests unless we explicitly want them
const originalWarn = console.warn;
const originalError = console.error;

beforeAll(() => {
  // Filter out noisy React Native warnings in tests
  console.warn = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Animated:') ||
        args[0].includes('componentWillReceiveProps') ||
        args[0].includes('componentWillMount'))
    ) {
      return;
    }
    originalWarn.apply(console, args);
  };

  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning:') ||
        args[0].includes('ReactNativeFiberHostComponent'))
    ) {
      return;
    }
    originalError.apply(console, args);
  };
});

afterAll(() => {
  console.warn = originalWarn;
  console.error = originalError;
});

// ============================================================================
// MOCK: @react-native-async-storage/async-storage
// ============================================================================

const mockAsyncStorage = (() => {
  let store = {};

  const impl = {
    setItem: (key, value) => {
      store[key] = value;
      return Promise.resolve();
    },
    getItem: (key) => {
      return Promise.resolve(store[key] !== undefined ? store[key] : null);
    },
    removeItem: (key) => {
      delete store[key];
      return Promise.resolve();
    },
    clear: () => {
      store = {};
      return Promise.resolve();
    },
    getAllKeys: () => {
      return Promise.resolve(Object.keys(store));
    },
    multiGet: (keys) => {
      return Promise.resolve(keys.map((key) => [key, store[key] !== undefined ? store[key] : null]));
    },
    multiSet: (keyValuePairs) => {
      keyValuePairs.forEach(([key, value]) => {
        store[key] = value;
      });
      return Promise.resolve();
    },
    multiRemove: (keys) => {
      keys.forEach((key) => delete store[key]);
      return Promise.resolve();
    },
  };

  return {
    setItem: jest.fn(impl.setItem),
    getItem: jest.fn(impl.getItem),
    removeItem: jest.fn(impl.removeItem),
    clear: jest.fn(impl.clear),
    getAllKeys: jest.fn(impl.getAllKeys),
    multiGet: jest.fn(impl.multiGet),
    multiSet: jest.fn(impl.multiSet),
    multiRemove: jest.fn(impl.multiRemove),
    // Helper for tests to inspect/reset store
    __getStore: () => store,
    __setStore: (newStore) => {
      store = newStore;
    },
    __resetStore: () => {
      store = {};
    },
    // Restore the original implementations
    __restoreImplementations: () => {
      mockAsyncStorage.setItem.mockImplementation(impl.setItem);
      mockAsyncStorage.getItem.mockImplementation(impl.getItem);
      mockAsyncStorage.removeItem.mockImplementation(impl.removeItem);
      mockAsyncStorage.clear.mockImplementation(impl.clear);
      mockAsyncStorage.getAllKeys.mockImplementation(impl.getAllKeys);
      mockAsyncStorage.multiGet.mockImplementation(impl.multiGet);
      mockAsyncStorage.multiSet.mockImplementation(impl.multiSet);
      mockAsyncStorage.multiRemove.mockImplementation(impl.multiRemove);
    },
  };
})();

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

// ============================================================================
// MOCK: expo-font (Phase 33 F3)
// ============================================================================
// Tests proceed as if fonts always loaded immediately. useFonts() returns
// [loaded, error] in production; tests get [true, null] so any consumer
// gated on `fontsLoaded` proceeds straight through (no splash gate stall
// in test context).

jest.mock('expo-font', () => ({
  useFonts: () => [true, null],
  isLoaded: () => true,
  loadAsync: () => Promise.resolve(),
}));

// ============================================================================
// MOCK: @expo-google-fonts/source-serif-4 (Phase 33 F3)
// ============================================================================
// The four weight constants the loader requests. In production these are
// numeric require() identifiers pointing at font assets. In test context
// any non-undefined value works — useFonts() returns [true] anyway.

jest.mock('@expo-google-fonts/source-serif-4', () => ({
  SourceSerif4_400Regular: 'SourceSerif4_400Regular',
  SourceSerif4_400Regular_Italic: 'SourceSerif4_400Regular_Italic',
  SourceSerif4_500Medium: 'SourceSerif4_500Medium',
  SourceSerif4_600SemiBold: 'SourceSerif4_600SemiBold',
}));

// ============================================================================
// MOCK: expo-secure-store
// ============================================================================

const mockSecureStore = (() => {
  let store = {};

  return {
    getItemAsync: jest.fn((key) => {
      return Promise.resolve(store[key] || null);
    }),
    setItemAsync: jest.fn((key, value, options) => {
      store[key] = value;
      return Promise.resolve();
    }),
    deleteItemAsync: jest.fn((key) => {
      delete store[key];
      return Promise.resolve();
    }),
    WHEN_UNLOCKED: 'WHEN_UNLOCKED',
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
    AFTER_FIRST_UNLOCK: 'AFTER_FIRST_UNLOCK',
    AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 'AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY',
    // Helper for tests
    __getStore: () => store,
    __setStore: (newStore) => {
      store = newStore;
    },
    __resetStore: () => {
      store = {};
    },
  };
})();

jest.mock('expo-secure-store', () => mockSecureStore);

// ============================================================================
// MOCK: expo-constants
// ============================================================================

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: {
      extra: {
        sentryDsn: 'YOUR_DSN_HERE',
      },
    },
  },
}));

// ============================================================================
// MOCK: expo-crypto
// ============================================================================

let cryptoCallCount = 0;
const mockCrypto = {
  getRandomBytesAsync: jest.fn(async (length) => {
    // Generate different bytes for each call (for uniqueness tests)
    cryptoCallCount++;
    const bytes = [];
    for (let i = 0; i < length; i++) {
      bytes.push((i * 17 + 123 + cryptoCallCount * 7) % 256);
    }
    // Return as Uint8Array which is iterable
    return new Uint8Array(bytes);
  }),
  digestStringAsync: jest.fn((algorithm, data) => {
    // Generate a deterministic hash for testing
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    // Return a hex string that looks like a hash
    const hashHex = Math.abs(hash).toString(16).padStart(64, '0');
    return Promise.resolve(hashHex);
  }),
  CryptoDigestAlgorithm: {
    SHA256: 'SHA-256',
    SHA384: 'SHA-384',
    SHA512: 'SHA-512',
    MD5: 'MD5',
  },
};

jest.mock('expo-crypto', () => mockCrypto);

// ============================================================================
// MOCK: expo-file-system
// ============================================================================

const mockFileSystem = (() => {
  let files = {};

  return {
    documentDirectory: 'file:///mock/documents/',
    cacheDirectory: 'file:///mock/cache/',
    EncodingType: {
      UTF8: 'utf8',
      Base64: 'base64',
    },
    writeAsStringAsync: jest.fn((fileUri, contents, options) => {
      files[fileUri] = contents;
      return Promise.resolve();
    }),
    readAsStringAsync: jest.fn((fileUri, options) => {
      if (files[fileUri]) {
        return Promise.resolve(files[fileUri]);
      }
      return Promise.reject(new Error('File not found'));
    }),
    readDirectoryAsync: jest.fn((dirPath) => {
      // Return all files that start with the directory path
      const dirFiles = Object.keys(files)
        .filter(path => path.startsWith(dirPath))
        .map(path => path.replace(dirPath, '').split('/')[0])
        .filter((v, i, a) => a.indexOf(v) === i); // unique
      return Promise.resolve(dirFiles);
    }),
    deleteAsync: jest.fn((fileUri, options) => {
      delete files[fileUri];
      return Promise.resolve();
    }),
    getInfoAsync: jest.fn((fileUri, options) => {
      const exists = fileUri in files;
      // Check if it's a directory by seeing if any file starts with this path
      const isDir = Object.keys(files).some(path => path.startsWith(fileUri + '/'));
      return Promise.resolve({
        exists: exists || isDir,
        isDirectory: isDir && !exists,
        size: exists ? files[fileUri].length : 0,
        modificationTime: Date.now(),
      });
    }),
    makeDirectoryAsync: jest.fn(() => Promise.resolve()),
    copyAsync: jest.fn(({ from, to }) => {
      files[to] = files[from];
      return Promise.resolve();
    }),
    // Helper for tests
    __getFiles: () => files,
    __setFiles: (newFiles) => {
      files = newFiles;
    },
    __resetFiles: () => {
      files = {};
    },
  };
})();

jest.mock('expo-file-system', () => mockFileSystem);
// SDK 54 — the classic FileSystem API moved to the 'expo-file-system/legacy'
// subpath. App code imports from there now; mock the same handle so tests
// keep intercepting the identical surface regardless of which specifier the
// source uses.
jest.mock('expo-file-system/legacy', () => mockFileSystem);

// ============================================================================
// MOCK: expo-notifications
// ============================================================================

const mockNotifications = {
  scheduleNotificationAsync: jest.fn(() =>
    Promise.resolve('mock-notification-id')
  ),
  cancelScheduledNotificationAsync: jest.fn(() => Promise.resolve()),
  cancelAllScheduledNotificationsAsync: jest.fn(() => Promise.resolve()),
  getAllScheduledNotificationsAsync: jest.fn(() => Promise.resolve([])),
  getPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: 'granted', canAskAgain: true })
  ),
  requestPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: 'granted', canAskAgain: true })
  ),
  setNotificationHandler: jest.fn(),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({
    remove: jest.fn(),
  })),
  setNotificationCategoryAsync: jest.fn(() => Promise.resolve()),
  AndroidImportance: {
    DEFAULT: 3,
    HIGH: 4,
    LOW: 2,
    MAX: 5,
    MIN: 1,
    UNSPECIFIED: 0,
  },
  SchedulableTriggerInputTypes: {
    CALENDAR: 'calendar',
    DATE: 'date',
    TIME_INTERVAL: 'timeInterval',
    DAILY: 'daily',
    WEEKLY: 'weekly',
  },
  AndroidNotificationPriority: {
    DEFAULT: 'default',
    HIGH: 'high',
    LOW: 'low',
    MAX: 'max',
    MIN: 'min',
  },
};

jest.mock('expo-notifications', () => mockNotifications);

// ============================================================================
// MOCK: @sentry/react-native
// ============================================================================

jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  wrap: jest.fn((component) => component),
  withScope: jest.fn((callback) => callback({
    setLevel: jest.fn(),
    setExtras: jest.fn(),
  })),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  setUser: jest.fn(),
  startTransaction: jest.fn(() => ({
    startChild: jest.fn(() => ({
      setStatus: jest.fn(),
      finish: jest.fn(),
    })),
    finish: jest.fn(),
  })),
}));

// ============================================================================
// MOCK: expo-updates
// ============================================================================

jest.mock('expo-updates', () => ({
  checkForUpdateAsync: jest.fn(() => Promise.resolve({ isAvailable: false })),
  fetchUpdateAsync: jest.fn(() => Promise.resolve({ isNew: false })),
  reloadAsync: jest.fn(() => Promise.resolve()),
}));

// ============================================================================
// MOCK: expo-sharing
// ============================================================================

jest.mock('expo-linking', () => ({
  openURL: jest.fn(() => Promise.resolve()),
  canOpenURL: jest.fn(() => Promise.resolve(true)),
  createURL: jest.fn((path) => `embermate://${path}`),
  parse: jest.fn(() => ({})),
}));

jest.mock('expo-localization', () => ({
  locale: 'en-US',
  locales: ['en-US'],
  timezone: 'America/New_York',
  isRTL: false,
  getLocales: jest.fn(() => [{ languageTag: 'en-US', languageCode: 'en', regionCode: 'US' }]),
}));

jest.mock('expo-store-review', () => ({
  isAvailableAsync: jest.fn(() => Promise.resolve(true)),
  hasAction: jest.fn(() => Promise.resolve(true)),
  requestReview: jest.fn(() => Promise.resolve()),
}));

// ============================================================================
// MOCK: expo-sharing
// ============================================================================

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(() => Promise.resolve(true)),
  shareAsync: jest.fn(() => Promise.resolve()),
}));

// ============================================================================
// MOCK: expo-linear-gradient
// ============================================================================
// expo-linear-gradient ships as ESM (`import { Component } from 'react'`) and
// Jest's default transformIgnorePatterns excludes node_modules from
// transformation, so any test that transitively imports a component using
// LinearGradient was failing to parse. Phase 29 F3 (BreathingOrbCard) made
// this transitive load reach many existing tests via support.tsx → orb
// card → expo-linear-gradient. Single global mock here unblocks all of
// them; individual tests that need richer behavior (animation specifics,
// gradient color assertions) can still override via per-test jest.mock.

jest.mock('expo-linear-gradient', () => ({
  __esModule: true,
  LinearGradient: 'LinearGradient',
}));

// ============================================================================
// MOCK: react-native-svg
// ============================================================================
// react-native-svg ships TypeScript source that Jest's default transform
// doesn't process under transformIgnorePatterns. Same transitive-load issue
// as expo-linear-gradient — BreathingOrbCard uses Svg/Circle/Defs/
// RadialGradient/Stop, Sparkline (Phase 28) uses Svg/Polyline. Map every
// surface that consumers import here to a string-type component so the
// test renderer can mount it without parse errors.

// ============================================================================
// MOCK: react-native-reanimated
// ============================================================================
// Reanimated 3 uses worklets that need a UI-thread runtime not available
// in the Node test environment, so registering worklets during jest
// module load would throw. Inline mock rather than the official
// `react-native-reanimated/mock` because the latter ships as ESM
// (`import type {` syntax in mock.ts) that Jest can't parse under the
// default transformIgnorePatterns.
//
// API surface covered:
//   • useSharedValue → returns a plain { value } object. Works for both
//     direct access (`sv.value = X`) and the optional-chain pattern
//     (`sv?.value ?? fallback`) used by OrbRings.
//   • useAnimatedProps / useAnimatedStyle → evaluates the worklet once
//     on each call and returns its props object. Static in tests; no
//     UI-thread animation runs.
//   • withTiming / withSpring / etc → returns the target value
//     synchronously. Optional callback fires with `true` (animation
//     "completed").
//   • createAnimatedComponent → identity function. Animated.View etc.
//     resolve to the wrapped component unchanged, preserving rendered-
//     tree assertions (e.g. `type === 'Circle'`).
//   • Easing — every variant returns a no-op fn so curve composition
//     (`Easing.inOut(Easing.sin)`) doesn't crash.
//
// Production app code uses real Reanimated via the babel plugin
// (`react-native-reanimated/plugin` in babel.config.js); tests use this
// mock universally.

jest.mock('react-native-reanimated', () => {
  const noop = () => undefined;
  const easeFn = () => 0;
  const Easing = {
    sin: easeFn,
    ease: easeFn,
    linear: easeFn,
    quad: easeFn,
    cubic: easeFn,
    inOut: (_fn) => easeFn,
    in: (_fn) => easeFn,
    out: (_fn) => easeFn,
    bezier: () => easeFn,
  };
  const useSharedValue = (initial) => ({ value: initial });
  const useAnimatedProps = (workletFn) => {
    try { return workletFn(); } catch { return {}; }
  };
  const useAnimatedStyle = useAnimatedProps;
  const withTiming = (target, _opts, callback) => {
    if (callback) callback(true);
    return target;
  };
  const withSpring = withTiming;
  const withRepeat = (anim) => anim;
  const withSequence = (...anims) => anims[anims.length - 1];
  const withDelay = (_d, anim) => anim;
  const cancelAnimation = noop;
  const runOnJS = (fn) => fn;
  const runOnUI = (fn) => fn;
  const createAnimatedComponent = (Component) => Component;
  const useAnimatedScrollHandler = () => ({});
  const useAnimatedRef = () => ({ current: null });
  const useDerivedValue = (fn) => ({ value: fn() });

  return {
    __esModule: true,
    default: { createAnimatedComponent, View: 'AnimatedView' },
    Easing,
    useSharedValue,
    useAnimatedProps,
    useAnimatedStyle,
    useAnimatedScrollHandler,
    useAnimatedRef,
    useDerivedValue,
    withTiming,
    withSpring,
    withRepeat,
    withSequence,
    withDelay,
    cancelAnimation,
    runOnJS,
    runOnUI,
    createAnimatedComponent,
  };
});

// ============================================================================
// MOCK: @expo/vector-icons
// ============================================================================
// The icon-set families (AntDesign, Ionicons, MaterialIcons, etc.) ship as
// ESM that Jest can't parse under default transformIgnorePatterns. Phase
// 29 Batch B F1 added Ionicons to ResourcesList — any test that
// transitively loads ResourcesList (or any of the 4 existing Ionicons
// consumers: medication-form, emergency, medication-interactions,
// settings/security) would otherwise crash on import.
//
// Each family resolves to a string-named "component" so rendered-tree
// assertions can find it by type + read its props (name / size / color).
// Mirrors the react-native-svg mock pattern below.

jest.mock('@expo/vector-icons', () => ({
  __esModule: true,
  AntDesign: 'AntDesign',
  Entypo: 'Entypo',
  EvilIcons: 'EvilIcons',
  Feather: 'Feather',
  FontAwesome: 'FontAwesome',
  FontAwesome5: 'FontAwesome5',
  FontAwesome6: 'FontAwesome6',
  Fontisto: 'Fontisto',
  Foundation: 'Foundation',
  Ionicons: 'Ionicons',
  MaterialCommunityIcons: 'MaterialCommunityIcons',
  MaterialIcons: 'MaterialIcons',
  Octicons: 'Octicons',
  SimpleLineIcons: 'SimpleLineIcons',
  Zocial: 'Zocial',
}));

jest.mock('react-native-svg', () => ({
  __esModule: true,
  default: 'Svg',
  Svg: 'Svg',
  Circle: 'Circle',
  Polyline: 'Polyline',
  Defs: 'Defs',
  RadialGradient: 'RadialGradient',
  LinearGradient: 'SvgLinearGradient',
  Stop: 'Stop',
  Path: 'Path',
  Rect: 'Rect',
  G: 'G',
  Text: 'SvgText',
  Line: 'Line',
  Ellipse: 'Ellipse',
  Polygon: 'Polygon',
}));

// ============================================================================
// MOCK: expo-document-picker
// ============================================================================

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(() =>
    Promise.resolve({
      canceled: true,
      assets: null,
    })
  ),
}));

// ============================================================================
// MOCK: react-native
// ============================================================================

jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    select: jest.fn((obj) => obj.ios || obj.default),
  },
  Alert: {
    alert: jest.fn(),
  },
  AppState: {
    currentState: 'active',
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  },
  // Phase 29 Batch A.2 F4 — AccessibilityInfo is the source of truth
  // for the Reduce Motion preference. The hooks/useReduceMotion hook
  // reads isReduceMotionEnabled on mount and subscribes to live changes
  // via reduceMotionChanged. The mock defaults to false (motion enabled)
  // — tests that need to exercise the reduced-motion branch can override
  // via jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').
  AccessibilityInfo: {
    isReduceMotionEnabled: jest.fn(() => Promise.resolve(false)),
    isScreenReaderEnabled: jest.fn(() => Promise.resolve(false)),
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    announceForAccessibility: jest.fn(),
  },
  Dimensions: {
    get: jest.fn(() => ({ width: 375, height: 812 })),
  },
  StyleSheet: {
    create: (styles) => styles,
    flatten: jest.fn((style) => style),
  },
}));

// ============================================================================
// Global test helpers
// ============================================================================

global.resetAllMockStores = () => {
  mockAsyncStorage.__resetStore();
  mockAsyncStorage.__restoreImplementations();
  mockSecureStore.__resetStore();
  mockFileSystem.__resetFiles();
};

// Reset stores before each test
beforeEach(() => {
  global.resetAllMockStores();
});

// ============================================================================
// Date mocking utilities
// ============================================================================

global.mockDate = (dateString) => {
  const mockDate = new Date(dateString);
  jest.useFakeTimers().setSystemTime(mockDate);
  return mockDate;
};

global.restoreDate = () => {
  jest.useRealTimers();
};
