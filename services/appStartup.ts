// ============================================================================
// APP STARTUP
// Orchestrated app startup with error isolation per phase
// Each phase runs independently — a failure in one doesn't block others.
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { resetDailyMedicationStatus } from '../utils/medicationStorage';
import { initializeSampleData } from '../utils/sampleDataGenerator';
import { ensureDailySnapshot, pruneOldOverrides } from '../utils/carePlanStorage';
import { logError } from '../utils/devLog';
import { runMigrations } from './migrationService';
import { loadCustomThresholds } from '../utils/vitalThresholds';
import { purgeIfNeeded } from '../utils/dataRetention';
import { initErrorReporting, reportError, reportWarning } from '../utils/errorReporting';
import { checkForUpdates } from '../utils/updateChecker';

interface StartupResult {
  success: boolean;
  phases: { name: string; ok: boolean; ms: number; error?: string }[];
  totalMs: number;
}

/**
 * Run all app startup tasks in order with error isolation.
 * Each phase runs independently — a failure in one doesn't block others.
 * Returns a result object for debugging/reporting.
 */
export async function runStartupSequence(): Promise<StartupResult> {
  const startTotal = Date.now();
  const phases: StartupResult['phases'] = [];

  // Phase 0: Error reporting — MUST succeed, everything else depends on it
  await runPhase(
    'errorReporting',
    async () => {
      initErrorReporting();
    },
    phases,
    true,
  ); // critical = true

  // Phase 1: OTA update check (non-blocking, fire-and-forget)
  checkForUpdates();

  // Phase 2: Data migrations (must run before any data reads)
  await runPhase(
    'migrations',
    async () => {
      await runMigrations();
    },
    phases,
    true,
  );

  // Phase 3: Daily reset + snapshot (order matters)
  await runPhase(
    'dailyReset',
    async () => {
      const lastReset = await AsyncStorage.getItem('@embermate_last_reset_date');
      const today = new Date().toISOString().split('T')[0];
      if (lastReset !== today) {
        await resetDailyMedicationStatus();
        await AsyncStorage.setItem('@embermate_last_reset_date', today);
      }
    },
    phases,
  );

  await runPhase(
    'dailySnapshot',
    async () => {
      await ensureDailySnapshot();
    },
    phases,
  );

  // Phase 4: Cleanup (safe to fail)
  await runPhase('pruneOverrides', () => pruneOldOverrides(), phases);
  await runPhase('purgeOldData', () => purgeIfNeeded(), phases);

  // Phase 5: Cache warming (safe to fail)
  await runPhase('loadThresholds', () => loadCustomThresholds(), phases);

  // Phase 6: Sample data (safe to fail, dev-oriented)
  await runPhase('sampleData', () => initializeSampleData(), phases);

  const totalMs = Date.now() - startTotal;
  const success = phases.filter((p) => !p.ok).length === 0;

  if (!success) {
    const failures = phases
      .filter((p) => !p.ok)
      .map((p) => p.name)
      .join(', ');
    reportWarning(`Startup completed with failures: ${failures}`, {
      totalMs: String(totalMs),
      failedPhases: failures,
    });
  }

  if (__DEV__) {
    console.log(`[Startup] Completed in ${totalMs}ms`);
    phases.forEach((p) => {
      console.log(
        `  ${p.ok ? 'OK' : 'FAIL'} ${p.name} (${p.ms}ms)${p.error ? ` — ${p.error}` : ''}`,
      );
    });
  }

  return { success, phases, totalMs };
}

async function runPhase(
  name: string,
  fn: () => void | Promise<void>,
  phases: StartupResult['phases'],
  critical: boolean = false,
): Promise<void> {
  const start = Date.now();
  try {
    await fn();
    phases.push({ name, ok: true, ms: Date.now() - start });
  } catch (error) {
    const ms = Date.now() - start;
    const message = error instanceof Error ? error.message : String(error);
    phases.push({ name, ok: false, ms, error: message });

    reportError(error instanceof Error ? error : new Error(message), {
      phase: name,
      critical: String(critical),
    });

    if (critical) {
      logError(`appStartup.runPhase:${name}`, error);
    }
  }
}
