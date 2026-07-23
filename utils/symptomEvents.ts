// ============================================================================
// symptomEvents — live-store bridge for symptom readers.
//
// DECISION (see project_eventrepo_redundant_mirror_decision): eventRepo is a
// redundant mirror; `symptom_reported` events are NEVER written there — symptoms
// live in symptomStorage (SYMPTOMS key, via saveSymptom from log-symptom/log-pain).
//
// The timeline / narrative / functional-issue readers already switch on
// CareEvent.type === 'symptom_reported' + metadata.symptomName. Rather than
// rewrite each reader's symptom branch (five chances to mis-point), this ONE
// adapter reads the live symptom store and maps records into the CareEvent shape
// those readers expect — surfacing real symptoms WITHOUT wiring anything back into
// the event pipeline (no new eventRepo writes). Retire when the pipeline is
// retired.
// ============================================================================

import type { CareEvent } from '../types/event';
import { getSymptoms } from './symptomStorage';

/**
 * Symptoms in [start, end] (YYYY-MM-DD, inclusive) as synthetic symptom_reported
 * CareEvents. metadata.symptomName / .severity mirror what the readers consume.
 */
export async function getSymptomEventsInRange(
  patientId: string,
  start: string,
  end: string,
): Promise<CareEvent[]> {
  let logs: Array<{ id?: string; symptom?: string; severity?: number; date?: string; timestamp?: string }>;
  try {
    logs = await getSymptoms(patientId);
  } catch {
    return [];
  }
  return logs
    .filter((l) => {
      const day = (l.date || l.timestamp || '').slice(0, 10);
      return !!day && day >= start && day <= end;
    })
    .map((l) => {
      const ts = l.timestamp || `${l.date}T12:00:00`;
      return {
        id: l.id ?? `sym-${ts}-${l.symptom}`,
        type: 'symptom_reported',
        timestamp: ts,
        patientId,
        value: l.severity,
        metadata: { symptomName: l.symptom, severity: l.severity },
        source: 'dedicated_screen',
        createdAt: ts,
      } as CareEvent;
    });
}
