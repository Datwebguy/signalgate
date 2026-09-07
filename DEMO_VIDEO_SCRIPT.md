# SignalGate Demo Video Script

## Executive Summary

**Video Title**: SignalGate: Autonomous Pre-Action Risk Gate for Telegraph Protocol  
**Duration**: 15 minutes  
**Target Audience**: Web3 developers, AI agent operators, security teams, DeFi protocols  
**Tone**: Professional, technical, security-focused, innovative  

---

## Script Overview

This script provides a comprehensive walkthrough of SignalGate, covering:
- The problem it solves in Web3 and AI agent security
- Telegraph Protocol integration and x402 payments
- Complete feature demonstration (7 main features)
- Technical architecture and implementation
- Developer integration options
- Live demo of all major features

## Actual Features in SignalGate:

1. **Firewall Console** - Main gate check interface for instant risk assessment
2. **Catalog** - Live miner discovery from Telegraph network  
3. **Watchlist** - Continuous monitoring of addresses with background polling
4. **Stream** - Real-time Telegraph signal streaming via Server-Sent Events
5. **Routing** - Routing envelope probe to see who the network actually routes to
6. **Audit** - Historical gate run records and complete audit trail
7. **Halt Ledger (Compliance)** - Quarantined wallets and executed actions pipeline

---

## Video Script

### [0:00-0:45] INTRO: The Problem & Solution

**Visual**: Dark screen with SignalGate logo animating in, then split screen showing:
- Left: Flashing red "BLOCKED" warning
- Right: Green "ALLOWED" checkmark with blockchain hashes

**Narrator**: 
"In Web3 and AI agent autonomy, a single compromised transaction can drain millions. Today's agents sign blindly, relying on stale RPCs or model guesses. But what if every action required cryptographic proof from multiple independent intelligence sources before keys ever touched a transaction?"

**Visual**: SignalGate hero screen with "Actions do not fire until live miners agree" tagline

**Narrator**: 
"Meet SignalGate - an autonomous pre-action risk gate for the Telegraph Protocol. It intercepts wallet actions, dispatches parallel intelligence asks to live Telegraph miners, settles payments via x402, and returns cryptographically proven verdicts before keys sign."

**Visual**: Animated diagram showing action → SignalGate → Telegraph miners → verdict

**Narrator**: 
"Built for Track 3 of Telegraph Hackathon Season I, SignalGate represents a new paradigm: fail-closed security where actions never proceed without paid miner consensus."

---

### [0:45-1:30] SECTION 1: Why We Built SignalGate

**Visual**: Landing page architecture section, highlighting the three-step process

**Narrator**: 
"We built SignalGate to solve a critical gap in Web3 security. Current agents and dashboards act on single APIs, stale RPCs, or AI models that guessed. Telegraph already ranks miners per intent and settles paid answers on-chain, but nothing in the default UX stops an action until those answers agree."

**Visual**: Screen showing "01 Propose Action" card with animated agent preparing transaction

**Narrator**: 
"The job to be done is clear: before increasing risk on a wallet, you want ranked Telegraph miners to score that wallet and the proposed action, so you can allow, wait, or block with a receipt."

**Visual**: "02 Decentralized Consensus" card with miners analyzing in parallel

**Narrator**: 
"Signalgate discovers risk, fraud, on-chain, and wallet intents that miners actually advertise in real-time - not from hardcoded rosters. It then pays for several intent-specific asks through the Telegraph Engine."

**Visual**: "03 Enforced Verdict & Proof" card with ALLOW/WAIT/BLOCK decision

**Narrator**: 
"The fail-closed policy engine computes consensus. If clean, it emits ALLOW with receipts. If danger is found, it immediately emits BLOCK. If payment or miners fail, it defaults to WAIT."

---

### [1:30-2:45] SECTION 2: Telegraph Protocol Integration

**Visual**: Catalog page showing live miners with real-time data

**Narrator**: 
"Let's dive into how SignalGate integrates with the Telegraph Protocol. First, it fetches the live miner catalog from Telegraph's devnode API - this is runtime discovery, not a hardcoded list of 131 miners."

**Visual**: Screen recording of catalog page refreshing, showing miner count changing

**Narrator**: 
"Each miner advertises specific intents: security analysis, fraud detection, on-chain state queries, wallet intelligence. Signalgate automatically discovers which miners support the required intents for each gate run."

**Visual**: Code snippet showing x402 payment integration

**Narrator**: 
"Signalgate uses the x402 payment protocol - EIP-3009 - to settle USDC micropayments on Base Sepolia. Every ask to Telegraph miners is a paid transaction, creating real economic demand for the network."

**Visual**: Telegraph Explorer page showing transaction hashes

**Narrator**: 
"Each paid request generates a cryptographically proven receipt with explorer hashes. This means every verdict can be verified on-chain - no hallucinated scores, no fake risk assessments."

**Visual**: Flow diagram showing x402 payment flow: wallet → x402 → Telegraph Engine → miner

**Narrator**: 
"The integration handles the full 402 Payment Required flow: when miners require payment, Signalgate automatically settles via x402, then retries the request. If payment doesn't settle, the gate fails closed with a WAIT verdict."

---

### [2:45-4:00] SECTION 3: Core Feature Demonstration - Firewall Console

**Visual**: Navigate to Firewall console, showing the gate check interface

**Narrator**: 
"Let's start with the core feature - the Firewall console. This is where you run instant risk checks on any wallet address before executing an action. Notice the empty address field - this is intentional. Signalgate does not preload sample oracles; it scores whatever wallet you type."

**Visual**: Enter a real EVM address (e.g., vitalik.eth or a known DeFi wallet)

**Narrator**: 
"Enter any EVM address in the target field. Then describe the proposed action - you can use quick templates like Transfer, Approval, Swap, or Bridge, or type your own action description."

**Visual**: Show the action templates (Transfer, Approval, Swap, Bridge buttons)

**Narrator**: 
"These quick templates help describe common actions: 'Transfer 1,000 USDC to counterparty', 'Sign unlimited ERC-20 token approval for Uniswap Router', 'Execute swap 5 ETH for PEPE via DEX contract', or 'Bridge 10 ETH to Layer 2 Arbitrum Bridge'."

**Visual**: Show advanced options (min confidence slider, deadline settings)

**Narrator**: 
"In advanced options, you can set the minimum confidence threshold (default 0.6) and deadline in milliseconds. Signalgate uses these parameters when asking the Telegraph Engine."

**Visual**: Click "Run Gate Check" button, show loading state

**Narrator**: 
"When you run a gate check, Signalgate: queries the live miner catalog from Telegraph (not hardcoded), selects miners by advertised intent, dispatches paid asks to the Telegraph Engine, parses answers and confidence, and applies the fail-closed policy."

**Visual**: Show results coming in with miner receipts, payment status, and final verdict

**Narrator**: 
"Here you can see the results: each miner card shows the name, intent queried, latency, answer excerpt, and payment status. The verdict banner shows ALLOW, WAIT, or BLOCK with a specific reason grounded only in miner text."

**Visual**: Click on a miner receipt to expand it, showing raw payload and explorer link

**Narrator**: 
"Each receipt is expandable to show the raw miner payload, payment details, and a direct link to the Telegraph Explorer for verification. This transparency is crucial - you can verify every claim independently."

**Visual**: Show the shareable URL feature with ?run= parameter

**Narrator**: 
"Every gate run generates a shareable URL with the run ID parameter, so you can share specific verdicts with team members or audit them later without re-running the check."

---

### [4:00-5:15] SECTION 4: Catalog - Live Miner Discovery

**Visual**: Navigate to Catalog page, showing live miners with real-time data

**Narrator**: 
"The Catalog page shows the live miner roster directly from Telegraph's devnode API. This is runtime discovery, not a hardcoded list. You can see the current count of active miners - right now we have 286 miners online."

**Visual**: Show catalog with miner names, slugs, intents, and activation status

**Narrator**: 
"Each miner card shows the name, slug, activation status, supported intents, and base URL. The miners advertise specific capabilities like security analysis, fraud detection, on-chain state queries, and wallet intelligence."

**Visual**: Use the search function to filter miners by name, slug, or intent

**Narrator**: 
"You can search the catalog by miner name, slug, or supported intents. This helps you understand which miners are available for specific types of analysis."

**Visual**: Click refresh button to get the latest catalog

**Narrator**: 
"The refresh button fetches the latest catalog from Telegraph, ensuring you're always working with current miner information rather than cached data."

### [5:15-6:30] SECTION 5: Watchlist & Continuous Monitoring

**Visual**: Navigate to Watchlist page, showing monitored addresses

**Narrator**: 
"For ongoing security, Signalgate provides a watchlist feature. Add any wallet address - multisigs, hot wallets, vault contracts - with custom labels and proposed actions."

**Visual**: Add a new watchlist entry with form (address, label, action)

**Narrator**: 
"Once added, the background worker polls these addresses continuously, running gate checks at regular intervals. This means you have 24/7 monitoring without manual intervention."

**Visual**: Show watchlist with last verdict, confidence scores, and timestamps

**Narrator**: 
"The watchlist shows the last verdict, reason, confidence score, and when the last check occurred. You can see at a glance which wallets are safe, which need attention, and which are blocked."

**Visual**: Click "Poll Now" to trigger immediate watchlist check

**Narrator**: 
"You can trigger immediate polls manually or rely on the automated worker. On Railway or Fly, set WATCHLIST_WORKER=1 to run the poller in-process. On Vercel, it uses cron jobs for scheduled polling."

---

### [6:30-7:30] SECTION 6: Stream - Real-Time Telegraph Signal Streaming

**Visual**: Navigate to Stream page, showing live signal streaming interface

**Narrator**: 
"The Stream page provides real-time consumption of live Telegraph signals via Server-Sent Events. It connects to the Telegraph daemon feed and shows continuous streaming without click-based polling."

**Visual**: Show the terminal-style interface with live events coming in

**Narrator**: 
"This terminal-style interface shows different event types: connected status, heartbeats, live signal bursts from the daemon feed, and gate telemetry. Each event is timestamped and shows relevant data."

**Visual**: Show live signal bursts with subnet information, duration, cost, and status

**Narrator**: 
"Live signal bursts show subnet information, miner names, intents, duration in milliseconds, cost in USDC, and status. This demonstrates real-time verification without manual polling."

**Visual**: Show gate telemetry with quarantined wallet counts and recent runs

**Narrator**: 
"Gate telemetry shows monitored wallets and active runs, including quarantined wallet counts and recent runs recorded in the SQLite ledger."

**Visual**: Demonstrate pause/resume and clear functionality

**Narrator**: 
"You can pause the stream to stop receiving new events temporarily, or clear the buffer to start fresh. The signal counter tracks total signals received during the session."

### [7:30-8:30] SECTION 7: Routing - Telegraph Engine Routing Experiments

**Visual**: Navigate to Routing page, showing routing envelope probe interface

**Narrator**: 
"The Routing page runs live paid Engine probes to see who the Telegraph network actually routes to. Telegraph routes by intent, minimum confidence, and deadline - the app does not pick a miner."

**Visual**: Show the probe form with address, action, confidence slider, and deadline slider

**Narrator**: 
"Enter a wallet address to probe, describe the proposed action, set minimum confidence and deadline parameters, then run one live paid Engine ask."

**Visual**: Run a probe and show the results

**Narrator**: 
"The results show the verdict, payment status, reason, and which miners the network actually routed to with their intents, status, payment confirmation, and latency."

**Visual**: Explain this is not a simulated heatmap

**Narrator**: 
"This is not a simulated heatmap - it's a real paid Engine ask that shows you exactly which miners the Telegraph Engine selected based on your parameters."

### [8:30-9:30] SECTION 8: Audit - Historical Gate Run Records

**Visual**: Navigate to Audit page, showing historical gate runs

**Narrator**: 
"The Audit page provides a complete historical record of all gate runs, with timestamps, target addresses, proposed actions, verdicts, and confidence scores."

**Visual**: Show the audit ledger with tabbed interface (all, quarantined, executed)

**Narrator**: 
"You can filter by all runs, quarantined addresses only, or executed actions only. This creates a comprehensive security audit trail for compliance and investigation."

**Visual**: Show detailed run information with miner receipts

**Narrator**: 
"Each run shows the target address, proposed action, verdict, reason, confidence score, and timestamp. You can drill down into miner receipts for detailed evidence."

### [9:30-10:30] SECTION 9: Halt Ledger - Compliance Quarantine & Action Execution

**Visual**: Navigate to Halt Ledger page, showing compliance quarantine interface

**Narrator**: 
"The Halt Ledger, also called Compliance, manages quarantined wallets and executed actions. When a gate run returns BLOCK, the wallet is automatically quarantined with specific reason and miner evidence."

**Visual**: Show quarantined wallets table with address, trigger evidence, risk score, and halt time

**Narrator**: 
"Quarantined wallets show the target address, halt trigger or evidence, risk score percentage, and when they were halted. Downstream broadcasts are halted on BLOCK verdicts."

**Visual**: Show release quarantine functionality

**Narrator**: 
"Security teams can release wallets from quarantine when investigations complete, but this requires explicit manual action - the system defaults to safety."

**Visual**: Show executed actions pipeline with approved-for-broadcast and compliance halt statuses

**Narrator**: 
"The executed actions pipeline shows all actions with their status: 'APPROVED FOR BROADCAST' for ALLOW verdicts or 'COMPLIANCE HALT' for BLOCK verdicts. Signalgate never signs transactions - it only approves them for downstream agents to execute."

---

### [10:30-11:30] SECTION 10: Developer Integration

**Visual**: Navigate to Developer Integration section on landing page

**Narrator**: 
"Signalgate is designed for easy integration into existing systems. The REST API allows any application to run gate checks programmatically."

**Visual**: Show cURL example with API endpoint

**Narrator**: 
"Simply POST to the gate run endpoint with the address, action, confidence threshold, and deadline. The response includes the full verdict, reason, confidence, and raw miner payloads."

**Visual**: Show TypeScript SDK example

**Narrator**: 
"For TypeScript applications, we provide a typed SDK that makes integration seamless. The types match the Telegraph protocol exactly, ensuring type safety throughout."

**Visual**: Show Python agent integration example

**Narrator**: 
"Python agents can integrate via simple HTTP requests or the official Telegraph MCP server. This means LangChain, ElizaOS, Claude Desktop, and custom agents can all use Signalgate as a pre-action safety check."

**Visual**: Show architecture diagram with agent integration

**Narrator**: 
"The integration pattern is consistent: before signing any transaction, route through Signalgate. Only proceed with the actual action if you receive an ALLOW verdict with satisfactory confidence."

---

### [11:30-12:30] SECTION 11: Technical Architecture & Security

**Visual**: Show architecture diagram with components

**Narrator**: 
"Let's look at the technical architecture. Signalgate consists of four main components: the web UI for watchlist and receipt display, the server for gate orchestration, the Telegraph client for catalog and Engine integration, and the store for run logging."

**Visual**: Show policy engine logic flowchart

**Narrator**: 
"The policy engine implements strict fail-closed logic: BLOCK if any miner returns high-risk flags, WAIT if miners disagree or confidence is below threshold, ALLOW only if two or more distinct paid miners return clean results above threshold."

**Visual**: Show security features list

**Narrator**: 
"Security is paramount: Signalgate has zero key custody - it never requests or stores signing keys. It operates strictly as an advisory gatekeeper. The fail-closed policy means actions never proceed without positive consensus."

**Visual**: Show constraint list from constraints.md

**Narrator**: 
"We built Signalgate with strict constraints: no mock data, no fake results, no hardcoded miner rosters presented as live state. If Telegraph is unreachable, the UI shows error and WAIT - it never falls back to cache as truth."

**Visual**: Show deployment options

**Narrator**: 
"Deployment is flexible: Next.js for the web framework, SQLite for local storage, with options for Vercel, Fly, or Railway hosting. The watchlist worker can run in-process or via cron jobs depending on your platform."

---

### [12:30-13:30] SECTION 12: Live Demo Scenarios

**Visual**: Return to Firewall console with fresh address

**Narrator**: 
"Let's run through some live scenarios. First, let's check a well-known DeFi wallet - this should return ALLOW with high confidence from multiple miners."

**Visual**: Run gate check on known safe address, show ALLOW result

**Narrator**: 
"As expected, we get ALLOW with receipts from multiple miners showing clean risk assessments and high confidence scores. The explorer links let us verify each claim."

**Visual**: Test with a suspicious or newly created address

**Narrator**: 
"Now let's test with a newer, less established address. This might return WAIT if miners disagree or confidence is below threshold."

**Visual**: Show WAIT result with explanation

**Narrator**: 
"Here we get WAIT because miner confidence is below our threshold. This is the fail-closed policy working - rather than guessing, Signalgate waits for clearer signals."

**Visual**: Show status page with payment configuration

**Narrator**: 
"If the wallet isn't funded with USDC on Base Sepolia, you'll see a 402 Payment Required error. This is expected - Signalgate requires real payment to generate real miner demand."

**Visual**: Show funded wallet running successful paid checks

**Narrator**: 
"Once funded, every gate run generates real economic activity on the Telegraph network, supporting the miners while getting actionable intelligence."

---

### [13:30-14:30] SECTION 13: Use Cases & Applications

**Visual**: Show use case icons and descriptions

**Narrator**: 
"SignalGate enables several critical use cases: AI agent safety checks before autonomous trading, DeFi protocol pre-transaction validation, multisig proposal screening, cross-chain bridge security, and wallet drainer detection."

**Visual**: Show AI agent integration diagram

**Narrator**: 
"For AI agents, Signalgate provides the safety layer that autonomous systems need. Before an agent executes any on-chain action, it routes through Signalgate for risk assessment."

**Visual**: Show DeFi protocol integration

**Narrator**: 
"DeFi protocols can integrate Signalgate into their frontend or backend to warn users about risky transactions before they sign, reducing support tickets and improving user safety."

**Visual**: Show enterprise security workflow

**Narrator**: 
"Enterprise security teams can use the watchlist and compliance ledger for continuous monitoring of treasury wallets, with automated quarantining of threats and comprehensive audit trails."

---

### [14:30-15:00] CONCLUSION: Future & Call to Action

**Visual**: Show all 7 features in a grid summary

**Narrator**: 
"SignalGate provides a complete pre-action risk solution with 7 integrated features: the Firewall Console for instant checks, live Catalog discovery, continuous Watchlist monitoring, real-time Stream signal consumption, Routing envelope experiments, comprehensive Audit trails, and Compliance quarantine management."

**Visual**: Show call-to-action with live site link

**Narrator**: 
"Try the live demo at signalgate-one.vercel.app to see all these features in action. Each feature demonstrates real integration with the Telegraph Protocol - from live miner discovery to x402 payment settlement to cryptographically proven verdicts."

**Visual**: Final screen with logo and tagline

**Narrator**: 
"Built for Telegraph Hackathon Season I, Track 3. Actions do not fire until live miners agree - that's the SignalGate promise. Autonomous pre-action intelligence, powered by decentralized miner consensus."

---

## Production Guide

### Visual Elements Needed

1. **Screen Recordings**:
   - Landing page navigation
   - Catalog page with live miners
   - Firewall console gate checks
   - Watchlist management
   - Compliance ledger
   - Routing experiments
   - Live signal stream
   - API integration examples

2. **Animations**:
   - Logo intro
   - Architecture diagrams
   - Payment flow visualization
   - Verdict decision trees
   - Network topology

3. **Graphics**:
   - Feature icons
   - Use case illustrations
   - Security badges
   - Integration diagrams

### Audio Production Notes

- **Voice Tone**: Professional, authoritative but accessible, technical precision
- **Pacing**: Moderate - allow time for complex concepts to land
- **Emphasis**: Highlight security benefits and Telegraph integration
- **Background Music**: Subtle, tech-focused, not distracting

### Technical Setup for Recording

1. **Browser**: Chrome with DevTools open for network requests
2. **Screen Resolution**: 1920x1080 minimum
3. **Network**: Stable connection for live Telegraph API calls
4. **Wallet**: Funded Base Sepolia wallet with USDC for live demos
5. **Test Addresses**: Prepare safe and risky test addresses

### Key Demo Scenarios to Prepare

1. **ALLOW Scenario**: Known safe wallet (vitalik.eth, Coinbase hot wallet)
2. **WAIT Scenario**: New wallet, low confidence, miner disagreement
3. **BLOCK Scenario**: Known malicious wallet (if available in test data)
4. **Payment Required**: Unfunded wallet showing 402 error
5. **Share URL**: Demonstrate ?run= parameter functionality

### Post-Production Elements

1. **Captions**: Professional captions for accessibility
2. **Callouts**: Highlight key UI elements during demos
3. **Zoom Effects**: Emphasize important data points
4. **Transitions**: Smooth section transitions
5. **Progress Indicators**: Show time remaining per section

### Distribution Strategy

1. **Primary**: YouTube with detailed description and timestamps
2. **Secondary**: Twitter/X threads with key clips
3. **Documentation**: Embed in GitHub README
4. **Hackathon**: Submit as part of Telegraph Hackathon
5. **Community**: Share in Web3 security and AI agent forums

### Success Metrics

- View-through rate (completion of 8+ minute video)
- Engagement with live demo site
- GitHub stars and forks
- Hackathon judge feedback
- Community questions and integration attempts

---

## Script Appendices

### A. Technical Terms Glossary

- **Telegraph Protocol**: Decentralized intelligence network with ranked miners
- **x402**: Payment protocol for API monetization (EIP-3009)
- **Base Sepolia**: Testnet for Base L2 chain
- **Fail-Closed**: Security policy that defaults to denial
- **Miner Intent**: Specific capability advertised by Telegraph miners
- **Gate Run**: Single risk check execution
- **Verdict**: Final decision (ALLOW/WAIT/BLOCK)
- **Receipt**: Cryptographic proof of miner response
- **Server-Sent Events (SSE)**: Real-time streaming protocol used in Stream feature
- **Routing Envelope**: Telegraph Engine parameters (intent, confidence, deadline) that determine miner selection
- **Quarantine**: Compliance halt mechanism for BLOCK verdicts
- **Watchlist Worker**: Background polling mechanism for continuous monitoring

### B. Key UI Elements Reference

- **Firewall Console**: Main gate check interface with address input, action templates, and advanced options
- **Catalog**: Live miner discovery from Telegraph devnode API with search and refresh
- **Watchlist**: Continuous monitoring management with background polling
- **Stream**: Real-time Telegraph signal streaming via Server-Sent Events from daemon feed
- **Routing**: Telegraph Engine routing envelope probe to see actual network routing
- **Audit**: Historical gate run records with tabbed filtering (all/quarantined/executed)
- **Halt Ledger (Compliance)**: Quarantined wallets management and executed actions pipeline

### C. API Integration Quick Reference

```bash
# Basic gate check
curl -X POST https://signalgate-one.vercel.app/api/gate/run \
  -H "Content-Type: application/json" \
  -d '{
    "address": "0x7a250d5630b4cf539739df2c5dacb4c659f2488d",
    "action": "Swap 10 ETH on Uniswap",
    "minConfidence": 0.6,
    "deadlineMs": 8000
  }'

# Retrieve past run
curl https://signalgate-one.vercel.app/api/gate/{runId}
```

### D. Troubleshooting Demo Issues

1. **Payment Errors**: Ensure Base Sepolia USDC is funded
2. **Empty Catalog**: Telegraph network may be temporarily down
3. **Timeouts**: Increase deadlineMs for complex queries
4. **CORS Issues**: Use proper CORS headers for API calls
5. **Rate Limiting**: Telegraph may rate limit - add delays between runs

---

## Conclusion

This script provides a comprehensive, professional demonstration of SignalGate that highlights its innovative integration with the Telegraph Protocol, practical security benefits, and technical sophistication. The accompanying production guide ensures smooth execution of the video creation process.