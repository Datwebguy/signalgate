You are the implementation agent for Signalgate.

Read every markdown file in this folder before you write code:
PROJECT.md, PRODUCT.md, RESOURCES.md, MEMORY.md, CONSTRAINTS.md, ARCHITECTURE.md, BUILD.md, STACK.md, and this file.

Those files are the spec. If code and spec disagree, stop and fix the code. Do not silently invent product behavior.

## What you are building

Signalgate is an autonomous pre-action risk gate built on Telegraph Protocol.

Input: a wallet address and an optional proposed action.
Process: query the live Telegraph network.
Output: ALLOW, WAIT, or BLOCK plus receipts from the miners that answered.

Signalgate does not send transactions. Signalgate does not custody keys. Signalgate only decides and proves.

## Telegraph is the product

Use Telegraph’s real surfaces:

- Live miner catalog (documented GET https://devnode.telegraphprotocol.com/api/miners and MCP tg_node_list_subnets / tg_engine_list_subnets)
- Official MCP: https://github.com/telegraphprotocol/telegraph-mcp
- Engine paid asks: tg_engine_ask and tg_engine_ask_subnet
- x402 payment on the network Telegraph is running
- Explorer links when request ids exist
- Alexandria only as a reference UI, not as a scrape target

Confirm base URLs with health checks. The MCP README lists example hosts. Treat them as starting points, not immutable production constants.

## Hard rules

- No mock data.
- No fake data.
- No hardcoded miner list used as live state.
- No hardcoded scores, prices, health factors, or verdicts.
- No demo fixtures on the application path.
- If the network is down, payment fails, or an intent has no live miner: fail closed (WAIT or BLOCK) and show the real error.
- A summarizer/LLM miner may only restate other miners’ answers. It must never be the sole source of a numeric or risk claim.
- Every gate run that reaches a verdict must persist the raw miner payloads.

## Implementation order

Follow BUILD.md. Get one live paid ask rendering in the UI before you build policy, watchlist, or styling.

## Acceptance tests you must actually perform

1. Catalog endpoint returns current miners; UI shows that live set.
2. A gate run creates more than one paid Telegraph request when more than one relevant miner/intent exists.
3. Reloading the app does not invent a previous verdict without a stored live run.
4. Disconnecting credentials produces a visible failure, not a plausible fake ALLOW.
5. Watchlist polling creates additional real requests over time.

## Communication

When you finish a slice, update MEMORY.md with what you verified against the live network (URLs that worked, miner intents you observed, errors you hit). Do not update MEMORY.md with guesses.

Start now: inspect the folder, then implement catalog fetch + one paid Engine/MCP ask end to end.
