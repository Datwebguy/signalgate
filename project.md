# Signalgate

Signalgate is a Track 3 Telegraph application. It is a pre-action risk gate.

A user (or agent) proposes a wallet action. Signalgate asks live Telegraph miners for wallet risk, fraud, on-chain state, and optional rationale checks. It returns ALLOW, WAIT, or BLOCK only after paid, routed answers come back from the live network.

Signalgate does not custody keys. Signalgate does not broadcast transactions. Signalgate decides whether an action is safe enough to proceed, and it proves which miners produced that decision.

## One-line pitch

Actions do not fire until Telegraph miners agree.

## Non-goals

- Not a trading bot
- Not a wallet
- Not a miner
- Not an evaluation script
- Not a chatbot that invents numbers

## Success for this weekend

1. A public demo that performs real paid Telegraph requests.
2. A watchlist loop that keeps generating live demand.
3. Every verdict stores miner identity, raw answer, payment proof, and explorer link.
4. X progress posts tagged for hackathon judging.
