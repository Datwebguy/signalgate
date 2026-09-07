# Build & Operational Sequence

## Implementation Order

1. Fund a Base Sepolia wallet with USDC for x402 payment flow.
2. Confirm Node, Engine, Daemon health and query live miner catalog.
3. Implement live catalog fetch + display in the management interface.
4. Implement paid Engine / Miner asks with full EIP-3009 authorization handling.
5. Add fraud/risk/on-chain asks dynamically selected from live registered miners.
6. Enforce fail-closed gate policy (ALLOW, WAIT, BLOCK).
7. Persist audit receipts and execution traces in SQLite.
8. Run continuous background watchlist worker.
9. Link Explorer URLs for all valid miners and request receipts.
10. Deploy to production environment.

## Definition of Done

A client or agent can submit a target wallet and proposed action, execute live queries across the Telegraph miner network, and receive an ALLOW, WAIT, or BLOCK verdict backed by cryptographically verifiable receipts and explorer links.
