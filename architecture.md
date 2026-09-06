# Architecture

## Pieces

- `web` — watchlist and receipt UI
- `server` — gate orchestration
- `telegraph` — client for catalog, Engine asks, MCP, x402
- `store` — run log (sqlite or postgres; append-only runs)
- `worker` — interval poller over watchlist rows

## Gate run

wallet + action
    → GET live miner catalog
    → select miners by advertised intent (runtime, not constants)
    → paid asks (engine auto-route and/or named miner)
    → parse answers
    → verdict policy
    → persist run + receipts
    → return JSON to UI

## Client rules

Prefer the official MCP server so x402 signing stays in one place.

If calling HTTP directly, use Telegraph’s Engine / node as documented in Telegraph-api-docs and handle 402 → pay → retry. Do not swallow 402.

## Data that may be local

- Watchlist addresses the user typed
- Policy thresholds the user configured
- Run history that originated from live calls

## Data that may not be local-as-source

- Miner identities
- Answers
- Prices
- Rankings
