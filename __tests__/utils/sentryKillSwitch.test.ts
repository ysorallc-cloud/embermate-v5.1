// ============================================================================
// Phase 13.5.1 — Sentry kill-switch runtime verification
// ============================================================================
//
// Pins the v1.0 "Data Not Collected" privacy posture by asserting at runtime
// that no Sentry network-side function ever fires, even when a real-looking
// DSN is configured in expo-constants. Mock-call counts beat source patterns
// because they survive call-site renames and refactors.
// ============================================================================

const sentryInit = jest.fn();
const sentryWithScope = jest.fn((cb: (scope: { setLevel: jest.Mock; setExtras: jest.Mock }) => void) =>
  cb({ setLevel: jest.fn(), setExtras: jest.fn() }),
);
const sentryCaptureException = jest.fn();
const sentryCaptureMessage = jest.fn();
const sentrySetUser = jest.fn();

jest.mock('@sentry/react-native', () => ({
  init: sentryInit,
  withScope: sentryWithScope,
  captureException: sentryCaptureException,
  captureMessage: sentryCaptureMessage,
  setUser: sentrySetUser,
  wrap: jest.fn((c: unknown) => c),
}));

// Configure a real-looking DSN so we prove the kill switch (not the
// empty-DSN guard) is what prevents init.
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: {
      extra: {
        sentryDsn: 'https://deadbeefcafe@o000000.ingest.us.sentry.io/1234567',
      },
    },
  },
}));

describe('Sentry kill switch — v1.0 "Data Not Collected" guarantee', () => {
  beforeEach(() => {
    jest.resetModules();
    sentryInit.mockClear();
    sentryWithScope.mockClear();
    sentryCaptureException.mockClear();
    sentryCaptureMessage.mockClear();
    sentrySetUser.mockClear();
    // Force production code path through report functions
    (global as unknown as { __DEV__: boolean }).__DEV__ = false;
  });

  afterEach(() => {
    (global as unknown as { __DEV__: boolean }).__DEV__ = true;
  });

  it('initErrorReporting() never calls Sentry.init even with a real DSN', () => {
    const { initErrorReporting } = require('../../utils/errorReporting');
    initErrorReporting();
    initErrorReporting(); // idempotent — second call must also not init
    expect(sentryInit).toHaveBeenCalledTimes(0);
  });

  it('reportError() never calls Sentry.captureException in production', () => {
    const { initErrorReporting, reportError } = require('../../utils/errorReporting');
    initErrorReporting();
    reportError(new Error('boom'), { operation: 'test' });
    expect(sentryCaptureException).toHaveBeenCalledTimes(0);
  });

  it('reportWarning() never calls Sentry.captureMessage in production', () => {
    const { initErrorReporting, reportWarning } = require('../../utils/errorReporting');
    initErrorReporting();
    reportWarning('something off', { code: 'X' });
    expect(sentryCaptureMessage).toHaveBeenCalledTimes(0);
  });

  it('setUserContext() never calls Sentry.setUser', () => {
    const { initErrorReporting, setUserContext } = require('../../utils/errorReporting');
    initErrorReporting();
    setUserContext('plus', 1);
    expect(sentrySetUser).toHaveBeenCalledTimes(0);
  });

  it('reportError() works without crashing when init was skipped', () => {
    // Don't call initErrorReporting at all — ensures report functions
    // are safe even if startup order changes.
    const { reportError } = require('../../utils/errorReporting');
    expect(() => reportError(new Error('pre-init'))).not.toThrow();
    expect(sentryCaptureException).toHaveBeenCalledTimes(0);
  });
});
