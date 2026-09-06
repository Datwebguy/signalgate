# Product

## Name

Signalgate

## Problem

Agents and dashboards act on a single API, a stale RPC, or a model that guessed. Telegraph already ranks miners per intent and settles paid answers on-chain. Nothing in the default UX stops an action until those answers agree.

## Job to be done

Before I increase risk on a wallet, I want ranked Telegraph miners to score that wallet and the proposed action, so I can allow, wait, or block with a receipt.

## Primary user

A builder or agent operator who is about to sign or trigger an on-chain action and needs a live, paid intelligence check.

## Core flow

1. User adds a wallet and an optional proposed action.
2. Signalgate reads the live miner catalog from Telegraph.
3. Signalgate pays for several intent-specific asks through the Engine and/or named miners.
4. Signalgate parses miner answers and confidence.
5. Signalgate emits ALLOW, WAIT, or BLOCK.
6. Signalgate stores and displays receipts: miner, intent, raw payload, payment proof, explorer URL, time.

## Verdict policy

Fail closed.

- BLOCK if any live risk or fraud miner returns a high-risk flag, or if required miners error after payment.
- WAIT if miners disagree, if confidence is below the configured threshold, if an intent has no live miner, or if freshness is missing.
- ALLOW only if at least two distinct paid miner answers return, risk/fraud is clean, and confidence meets threshold.

Never ALLOW on an empty catalog, a timeout, a 402 that did not settle, or a summarizer-only response.

## Surfaces

- Web app: watchlist, run gate, verdict banner, miner receipt cards
- API route: POST a wallet + action, get a verdict JSON that includes raw miner payloads
- Worker: poll watchlist on an interval so demand is continuous
- Optional agent path: same logic through official Telegraph MCP tools

## What the user sees

- Live miner list used for this run (from catalog, not a hardcoded roster)
- Each miner card: name/id, intent, latency, answer excerpt, pay status
- Verdict + one-sentence reason grounded only in miner text
- Link to Telegraph Explorer for the request if available

## What the user never sees as truth

- Cached demo wallets presented as live results
- Invented health factors
- Hardcoded miner names presented as the current network
