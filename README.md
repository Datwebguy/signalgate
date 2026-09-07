# Signalgate

Autonomous Pre-Action Risk Gate for Telegraph Protocol.

Transactions and agent actions do not execute until live Telegraph miners verify security, on-chain state, and fraud signals.

## Architecture & Documentation

| File | Purpose |
|---|---|
| PROJECT.md | System overview, design goals, and non-goals |
| PRODUCT.md | UX, operational workflows, and verdict policy |
| RESOURCES.md | Official Telegraph protocol links and API endpoints |
| MEMORY.md | Architectural decisions and live network findings |
| CONSTRAINTS.md | Verification principles (no mocks, no fakes) |
| ARCHITECTURE.md | High-level data flow and system connectivity |
| BUILD.md | Implementation order and deployment guide |
| STACK.md | Core runtime, frameworks, and dependencies |
| PROMPT.md | Agent instructions and protocol verification rules |

## Policy Invariant

If you need intelligence, query live Telegraph miners. If Telegraph does not answer or payment has not settled, **WAIT**. Actions never proceed without cryptographic proof and consensus.
