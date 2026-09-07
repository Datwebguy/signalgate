# Resources

Use official Telegraph surfaces only. Re-read this file before adding a dependency.

## Product and docs

- Protocol home: https://telegraphprotocol.com/
- Earn / apps: https://telegraphprotocol.com/earn
- Guide: https://guide.telegraphprotocol.com/
- Docs index: https://docs.telegraphprotocol.com/
- Miner overview: https://docs.telegraphprotocol.com/docs/miners/miner-overview

## Live product

- Alexandria (ask the live network): https://alexandria.telegraphprotocol.com/
- Alexandria build: https://alexandria.telegraphprotocol.com/build
- Explorer: https://explorer.telegraphprotocol.com/

## Engineering

- API specs: https://github.com/telegraphprotocol/Telegraph-api-docs
- Official MCP: https://github.com/telegraphprotocol/telegraph-mcp
- Docs source: https://github.com/telegraphprotocol/telegraph-docs
- Live miner catalog (documented): GET https://devnode.telegraphprotocol.com/api/miners

## MCP tools this app may call

Free / discovery

- tg_node_status
- tg_node_list_subnets
- tg_node_subnets_health
- tg_engine_list_subnets
- tg_daemon_health
- tg_daemon_categories
- tg_daemon_questions

Paid / intelligence

- tg_engine_ask
- tg_engine_ask_subnet
- Any dynamic miner tools the live registry exposes at runtime

Do not assume a fixed miner list. Call the catalog on boot and before every gate run.

## MCP environment (from official repo)

- TELEGRAPH_NODE_URL
- TELEGRAPH_ENGINE_URL
- TELEGRAPH_DAEMON_URL
- TELEGRAPH_EVM_PRIVATE_KEY
- Optional: TELEGRAPH_SOLANA_PRIVATE_KEY, EVM_NETWORK, SVM_NETWORK

The official README documents example node hosts. Confirm the current host from Telegraph Discord or docs before shipping. Do not bake a dead IP into production config without a health check.

## Payments

Telegraph gates inference with x402. Unauthorized calls return HTTP 402. Clients retry with a signed payment. Settlement is USDC on Base (network: Base Sepolia unless configured otherwise).

Signalgate must treat an unsettled 402 as failure, not as a skippable step.

## Community

- X: @Telegraphprotoc
- Discord: Official Telegraph Discord

## Out of bounds

- Third-party price APIs used as a substitute for Telegraph miners
- Local JSON fixtures used in the demo path
- Screenshots of Alexandria pasted in as if they were this app's live calls
