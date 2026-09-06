# Memory

Durable decisions. Update this file when something changes in production, not when you speculate.

## Locked decisions

- Product name: Signalgate
- Track: Telegraph Hackathon Season I, Track 3
- Shape: pre-action risk gate, not an executor
- Verdicts: ALLOW | WAIT | BLOCK
- Policy: fail closed
- Intelligence source: live Telegraph miners only
- Payment: real x402 on the network Telegraph is running for the hackathon
- Persistence: every run stores raw miner payloads and payment/explorer proof
- Watchlist: required, so usage is continuous

## Locked constraints (User corrections)

1. Catalog is the contract: Do not hardcode intent names as guaranteed. Select miners by what each live record advertises on each request. If an intent string is missing, skip it and WAIT.
2. Empty state is an empty address field: Do not preload any address or verdict as a sample oracle.
3. User action is text, not intelligence: The payload sent to miners is the wallet plus user's text. Telegraph decides risk.
4. Explorer paths confirmed at runtime: Link `https://explorer.telegraphprotocol.com/miners/{miner_id}`. Store tx/request id if present; otherwise display "no explorer id" (never invent).
5. Storage architecture: Cleanly separated SQLite store (using native `node:sqlite` or portable adapter).
6. Configurable thresholds: `GATE_MIN_CONFIDENCE` (default 0.6) and `WATCHLIST_INTERVAL_MS` (default 180000) in env, logged on each run.
7. Two explicit UI banners:
   - Network healthy, catalog live, asks unpaid -> `WAIT` + `402 Payment Required`
   - Network healthy, payment settled, miners answered -> real `ALLOW` / `WAIT` / `BLOCK`
   Never display ALLOW when payment did not settle.

## Verified live network facts

- Node Base URL: `https://devnode.telegraphprotocol.com` (Verified `/status` returns node public key `0xB82E4DE09f1C43BBD9ca4907c01f1EEd65a521B9`)
- Catalog URL: `https://devnode.telegraphprotocol.com/api/miners` (Returns 100+ registered miners)
- Integrations URL: `https://devnode.telegraphprotocol.com/miner-dispatcher/integrations` (434KB live integrations)
- Engine Base URL: `https://devnode.telegraphprotocol.com/engine` (`/v1/subnets` returns 200, `/v1/ask` returns 402 with x402 challenge)
- Daemon Base URL: `https://devnode.telegraphprotocol.com/daemon` (`/health` returns 200, `/api/questions` returns 200)
- Explorer URL: `https://explorer.telegraphprotocol.com/miners/{miner_id}` (e.g. `/miners/1001` returns 200)
- x402 Payment Spec:
  - Network: Base Sepolia (`eip155:84532`)
  - Asset: `0x036CbD53842c5426634e7929541eC2318f3dCF7e` (USDC)
  - Amount: 10000 (0.01 USDC)
  - Scheme: `exact` (EIP-3009 transfer with authorization)
- Active miners by intent on live network:
  - `FRAUD_DETECTION`: Veridex (1001), TrustGate Fraud Detection (8421), Zengawd Transaction Guard (84532), SarzOps Fraud Intelligence (91001), Refut On-Chain Risk (95822412), Sigvora (251), EviPlan (232), Telegraph Sentinel (94217603), ChainSight (302), TxLens (9002), AgentFeed (402)
  - `WALLET_BALANCE_CHECK`: ChainWire (7303), TrustGate (8420), BalancePulse (147116), OnChain Intel Miner (900), AgentFeed (20260829)
  - `ONCHAIN_TX_LOOKUP`: Verity (9001), Truvian (8453), INTERLOCK (9007), Sigil (9010), ChainWire (7307)
  - `GAS_PRICE`: GasWire (7301), GasPulse (147115), Optivis (7313)
  - `CRYPTO_PRICE`: KoinMix (42), Optivis (7311), ProvenancePrice (94217604)

## Remaining open items

- Wallet private key (`TELEGRAPH_EVM_PRIVATE_KEY`) with Base Sepolia USDC for live gate runs
- Required X tags for hackathon judging posts (@Telegraphprotoc #TelegraphHackathon)

## Do not forget

- Track 1 and 2 already closed. Track 3 consumes what they left live.
- If a needed intent has no live miner, WAIT. Do not substitute a made-up number.
- Summarizer miners may rewrite language. They must not be the only source of a numeric claim.
