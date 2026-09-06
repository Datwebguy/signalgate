# Constraints

These rules override convenience.

1. No mock data.
2. No fake data.
3. No hardcoded miner roster presented as live state.
4. No hardcoded prices, health factors, fraud scores, or verdicts.
5. No fixture JSON on the demo or production path.
6. No “sample wallet result” shipped as if it came from Telegraph.
7. If Telegraph is unreachable, the UI shows an error and WAIT/BLOCK. It does not fall back to cache-as-truth.
8. If payment does not settle, the run fails.
9. If the live catalog has zero miners for a required intent, skip that intent and WAIT.
10. Tests may use recorded fixtures only in a folder named `fixtures/` and only behind an explicit unit-test flag. The app binary must not import that folder.

Violation of 1–9 is a ship blocker.
