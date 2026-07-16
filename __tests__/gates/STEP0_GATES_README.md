# STEP 0 safety gates: how to use these four tests

Drop these four files into the `v7-scope-down` branch. They are written to be
RED against the current code and GREEN only when the gate is truly closed. This
replaces "confirm the gates look handled" with "make these four tests pass."

Each gate has already been shown to reproduce against the archived code:

| Gate | What is red today | Evidence in the code |
|------|-------------------|----------------------|
| A. No committed secret | `embermate-c9fb6c60b1b9.json` is tracked | real `service_account` + PEM key in repo root |
| B. No silent data loss | decrypt failure returns default silently | `utils/secureStorage.ts` `return defaultValue as T` (~L260, L274) |
| C. No interaction safety signal | "High Risk: {count}" is rendered | `app/medication-interactions.tsx` `{highRisk.length}` (~L117-118) |
| D. No clinical verdict | "(N out of range)" / `rangeAbnormal` in summaries | `care-report.tsx` L758/L1213, `visit-prep-preview.tsx` L345 |

## The loop (do NOT skip a step)
For each gate: run the test, confirm it is RED for the documented reason, fix,
show it GREEN. Do not silence or delete a test to make it pass.

## Order
Do Gate A and Gate B first. They are the two that can hurt a real caregiver in
week one of TestFlight (a live-in-history credential; silent loss of logged
health data). C and D can follow in the same sprint.

## Honest limits (say so, do not paper over)
- Gate A guards the WORKING TREE only. It does NOT purge git history and does
  NOT revoke the key in GCP (already revoked). History scrub is a separate
  manual step (git filter-repo / BFG + force-push).
- Gate B proves the decrypt-failure path on the JS/AsyncStorage layer. It does
  NOT prove real-device keychain migration; a physical restore-to-new-device
  pass is still required before launch.
- Gate C proves the flag defaults off and the count is gone from source. It does
  NOT prove the underlying interaction data is safe if you later re-enable it.

## The target APIs some tests reference do not exist yet
Gate B references `getSecureItemResult`, `exportAllData`, `importAllData`.
Gate C references `isFeatureEnabled`. These are the interfaces the fix must
create. The test failing to import IS part of the reproduction: it documents
that the safe API is missing. Reconcile the names with the real tree, but keep
the required BEHAVIOR (surface-not-swallow, preserve ciphertext, backup
round-trips, flag off by default).
