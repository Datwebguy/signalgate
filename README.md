# SignalGate

Autonomous pre-action risk gate for the [Telegraph Protocol](https://telegraphprotocol.com/). SignalGate ensures that wallet actions do not proceed until live Telegraph miners return paid, ranked answers. The system emits **ALLOW**, **WAIT**, or **BLOCK** verdicts with cryptographically proven miner receipts. Importantly, SignalGate does not custody private keys and does not broadcast transactions—it operates strictly as an advisory gatekeeper that downstream agents can choose to follow.

**Track 3 (Applications)** — Telegraph Hackathon Season I

## Overview

The Web3 ecosystem faces a critical security gap: autonomous agents and dashboards often execute transactions based on single API calls, stale RPC responses, or AI model predictions without cryptographic verification. Telegraph Protocol addresses this by providing a decentralized network of ranked miners who can analyze wallets, contracts, and proposed actions for security risks, fraud indicators, and on-chain state analysis. However, nothing in the default user experience stops an action from proceeding until those miner answers agree.

SignalGate bridges this gap by implementing a fail-closed pre-action verification system. Before any transaction is signed or broadcast, SignalGate intercepts the proposed action, queries live Telegraph miners in parallel, settles payments via the x402 protocol, and applies a deterministic policy engine to return a clear verdict. Only actions that receive **ALLOW** status from multiple distinct paid miners above a configurable confidence threshold may proceed to execution.

## How SignalGate Works with Telegraph Protocol

SignalGate's core loop integrates deeply with the Telegraph Protocol's infrastructure. The system begins by fetching the live miner catalog from Telegraph's devnode API, ensuring runtime discovery rather than relying on hardcoded rosters. It then analyzes which miners currently advertise the relevant intents—such as security analysis, fraud detection, on-chain state queries, or wallet intelligence—and selects appropriate miners for each gate run.

For each risk check, SignalGate declares intents to the Telegraph Engine via POST requests to `/v1/ask`, including query parameters, context information, minimum confidence thresholds, and deadline constraints. The Telegraph Engine routes these requests to the most suitable miners based on their current rankings and capabilities. Signalgate does not manually select miner IDs; it relies on the Engine's intelligent routing to optimize for quality, latency, and cost.

Payment settlement occurs through the x402 protocol (EIP-3009) using USDC on Base Sepolia. Each miner ask requires cryptographic payment before intelligence is returned, creating real economic demand for the Telegraph network while ensuring that miners are compensated for their computational work. The system handles the complete 402 Payment Required flow automatically, settling payments and retrying requests as needed.

The fail-closed policy engine then evaluates the collective miner responses. If any miner returns a high-risk payload indicating fraud, malicious contracts, or other critical threats, the system immediately emits a **BLOCK** verdict. If payment fails to settle, the miner catalog is empty, confidence scores are below threshold, or only a single miner responds, the system defaults to **WAIT**. Only when at least two distinct paid miners return clean results above the confidence threshold does SignalGate emit an **ALLOW** verdict with full cryptographic receipts.

## Features

SignalGate provides seven integrated features that collectively deliver comprehensive pre-action risk management:

### Firewall Console

The Firewall Console serves as the primary interface for instant risk assessment. Users enter any EVM address and optionally describe a proposed transaction action, such as token transfers, contract approvals, DEX swaps, or cross-chain bridges. The console includes quick action templates for common scenarios and advanced options for configuring confidence thresholds and deadline parameters. Notably, the address field is intentionally empty on load—SignalGate does not preload sample wallets or demo data, ensuring that every check represents genuine analysis of user-specified targets.

### Live Catalog

The Catalog feature displays the real-time miner roster directly from Telegraph's network, showing currently active miners with their names, slugs, supported intents, activation status, and endpoint information. This dynamic discovery ensures that the system always works with current network participants rather than cached or hardcoded data. Users can search the catalog by miner name, slug, or intent type, and refresh the catalog to get the latest network state.

### Watchlist Monitoring

For continuous security oversight, SignalGate provides a watchlist feature that monitors specified wallet addresses over time. Users can add multisig wallets, hot wallets, vault contracts, or any addresses of interest with custom labels and proposed actions. A background worker polls these addresses at regular intervals, running automated gate checks and maintaining a historical record of verdicts, confidence scores, and risk assessments. This enables 24/7 monitoring without manual intervention.

### Real-Time Signal Stream

The Stream feature consumes live Telegraph signals via Server-Sent Events (SSE) from the daemon feed, providing real-time visibility into network activity without requiring manual polling. The terminal-style interface displays connected status, heartbeats, live signal bursts from miners, and gate telemetry including quarantined wallet counts and recent run activity. Users can pause the stream temporarily or clear the buffer to manage the display.

### Routing Experiments

The Routing feature allows users to run live paid Engine probes to understand how the Telegraph network routes requests based on different parameters. By specifying wallet addresses, proposed actions, confidence thresholds, and deadlines, users can see exactly which miners the Engine selects for a given routing envelope. This is not a simulated heatmap but actual paid requests that reveal real network routing behavior, helping optimize for latency, cost, or confidence based on specific requirements.

### Audit Ledger

The Audit feature maintains a comprehensive historical record of all gate runs, creating an append-only security audit trail. Users can view complete run history with timestamps, target addresses, proposed actions, verdicts, confidence scores, and detailed miner receipts. The interface supports filtering by all runs, quarantined addresses only, or executed actions only, enabling efficient investigation and compliance reporting.

### Compliance Halt Ledger

The Halt Ledger, also called Compliance, manages wallet quarantines and action execution pipelines. When a gate run returns a **BLOCK** verdict, the target wallet is automatically quarantined with the specific reason and miner evidence that triggered the block. Security teams can review quarantined wallets, examine risk scores and evidence, and manually release wallets from quarantine when investigations conclude. Simultaneously, the executed actions pipeline logs all **ALLOW** verdicts as "APPROVED FOR BROADCAST" with full context, though SignalGate itself never signs or broadcasts transactions—downstream agents must implement the actual execution.

## Technical Architecture

SignalGate consists of four primary components: the web user interface, the server orchestration layer, the Telegraph client integration, and the persistent storage layer. The web interface provides all seven features through a responsive Next.js application with real-time updates and efficient state management. The server layer handles gate execution logic, policy evaluation, watchlist management, and API endpoints for external integration.

The Telegraph client manages all interactions with the Telegraph Protocol, including catalog fetching, Engine asks via HTTP, x402 payment settlement, and MCP server integration where appropriate. This client prefers the official Telegraph MCP server to keep x402 signing centralized and secure, falling back to direct HTTP calls when needed while properly handling 402 payment requirements.

The storage layer uses SQLite for local persistence of gate runs, watchlist entries, quarantined wallets, and executed actions. This append-only ledger ensures comprehensive audit trails while remaining lightweight and portable. For production deployments, the system supports alternative databases through straightforward configuration changes.

The policy engine implements strict fail-closed logic with deterministic evaluation. It checks for high-risk indicators in miner payloads, validates payment settlement, ensures minimum miner participation, enforces confidence thresholds, and requires distinct miner confirmation before allowing actions to proceed. This policy is codified in immutable rules that cannot be bypassed through configuration or UI manipulation.

## Setup and Deployment

Local development requires Node.js 22 or higher due to the use of the native `node:sqlite` module. After cloning the repository, copy the environment template and configure the required Telegraph private key:

```bash
cp .env.example .env
# Set TELEGRAPH_EVM_PRIVATE_KEY to a Base Sepolia key funded with USDC
# USDC contract on Base Sepolia: 0x036CbD53842c5426634e7929541eC2318f3dCF7e
npm install
npm run dev
```

The application will be available at `http://localhost:3000`. Additional commands include unit testing, worker execution, and batch flywheel operations:

```bash
npm run test:unit      # Run policy unit tests
npm run worker         # Start continuous watchlist poller
npm run worker:once    # Run watchlist poller once
npm run flywheel -- --batch 5  # Run batch flywheel operations
```

For containerized deployment, Docker Compose is provided:

```bash
docker compose up --build
```

Production deployment supports multiple platforms. On Railway or Fly.io, set `WATCHLIST_WORKER=1` to enable the in-process watchlist poller. On Vercel, leave this unset and use the provided `vercel.json` configuration, which schedules periodic watchlist polling via cron jobs. Note that Vercel's hobby tier limits cron frequency to daily; use the "Trigger Poll Now" functionality for additional demand. SQLite storage on Vercel resides in `/tmp` and is not durable across instances, so consider external database services for production use.

## API Integration

SignalGate provides a REST API for programmatic integration with external systems, agents, and workflows. The primary endpoint accepts gate check requests and returns comprehensive verdict data:

```bash
curl -X POST $ORIGIN/api/gate/run \
  -H "Content-Type: application/json" \
  -d '{
    "address": "0x7a250d5630b4cf539739df2c5dacb4c659f2488d",
    "action": "Swap 10 ETH on Uniswap",
    "minConfidence": 0.6,
    "deadlineMs": 8000
  }'
```

The response includes the run ID, target address, proposed action, verdict (ALLOW/WAIT/BLOCK), reason, overall confidence, configured threshold, timestamp, and an array of miner receipts with full payment details and explorer links. Past runs can be retrieved via `GET /api/gate/{runId}`, and shareable URLs using the `?run={id}` parameter enable easy distribution of specific verdicts.

Additional API endpoints provide catalog access, watchlist management, compliance operations, and status monitoring. The status endpoint at `/api/status` returns node, engine, and daemon health indicators along with payment configuration status, making it ideal for health checks and monitoring systems.

## Security and Policy

SignalGate operates under a strict security invariant: if intelligence is needed, query live Telegraph miners. If Telegraph does not answer or payment has not settled, default to **WAIT**. Actions never proceed without paid miner consensus. This fail-closed approach ensures that the system never guesses, never falls back to cached data as truth, and never proceeds without cryptographic verification.

The system enforces several critical security constraints. It maintains zero key custody—never requesting or storing signing keys. It uses no mock data, fake results, or hardcoded miner rosters presented as live state. If the Telegraph network is unreachable, the UI shows errors and **WAIT** verdicts rather than falling back to cached information. If payment fails to settle, gate runs fail closed. These constraints are enforced at the code level and considered ship blockers.

The quarantine mechanism provides an additional security layer by automatically blocking addresses that receive **BLOCK** verdicts. Quarantined wallets cannot be used in subsequent operations until explicitly released by authorized personnel, preventing the accidental execution of transactions against known malicious addresses. The executed actions pipeline maintains a complete record of all state transitions for forensic analysis and compliance reporting.

## Development and Testing

The codebase includes comprehensive unit tests for policy logic and acceptance tests for end-to-end workflows. Unit tests cover the fail-closed policy engine with various scenarios including payment failures, miner disagreements, high-risk payloads, and confidence threshold validation. Acceptance tests verify live integration with the Telegraph network, ensuring that catalog fetching, Engine asks, payment settlement, and receipt parsing work correctly in real conditions.

The test suite uses recorded fixtures only in the dedicated `fixtures/` directory and only behind explicit unit-test flags. The application binary never imports fixture data, ensuring that production code always works with live network data. This strict separation prevents accidental contamination of production behavior with test data.

Development follows the constraints outlined in the project, emphasizing boring technology choices to keep the Telegraph integration as the primary focus. The stack uses TypeScript, Next.js with the app router, official Telegraph MCP or Engine HTTP clients, SQLite for storage, and standard deployment platforms. No additional intelligence vendors are integrated, maintaining focus on the Telegraph Protocol as the sole source of security intelligence.

## Telegraph Protocol Integration Details

SignalGate leverages several key Telegraph Protocol capabilities to deliver its security functionality. The live miner catalog provides dynamic discovery of network participants, ensuring that the system always works with currently available miners rather than stale configuration. The Telegraph Engine's intelligent routing optimizes request distribution based on miner rankings, capabilities, and current load, while the x402 payment protocol enables frictionless micropayments that compensate miners for their computational work.

The system integrates with Telegraph's block explorer, providing direct links from miner receipts to on-chain verification. This grounding in explorer hashes eliminates the possibility of hallucinated verdicts and enables independent verification of every claim. The daemon feed via Server-Sent Events provides real-time signal streaming, giving visibility into network activity and miner performance without the overhead of manual polling.

Miner intents form the foundation of SignalGate's intelligence model. By advertising specific capabilities such as fraud detection, security analysis, on-chain state queries, and wallet intelligence, miners enable targeted requests that return relevant, actionable data rather than generic information. SignalGate's intent discovery mechanism automatically matches proposed actions to appropriate miner intents, ensuring that each gate check queries the most suitable miners for the specific use case.

## License and Contribution

SignalGate is built for the Telegraph Hackathon Season I, Track 3 (Applications). The project demonstrates practical application of the Telegraph Protocol for autonomous agent safety and Web3 transaction security. Contributions should maintain the strict security constraints, particularly the fail-closed policy and prohibition of mock data in production paths.

**Contributor:** [Datwebguy](https://github.com/Datwebguy)

The live demo is available at [signalgate-one.vercel.app](https://signalgate-one.vercel.app), where all seven features can be tested with real Telegraph miner integration. The codebase is available for review and extension, with particular emphasis on maintaining the core security invariants while exploring additional miner intents, multi-chain support, and deeper agent framework integration.