import { fetchLiveMiners } from '../telegraph/catalog';
import { askMiner, askEngine } from '../telegraph/ask';
import { evaluateGatePolicy } from './policy';
import { saveGateRun, quarantineWallet, recordExecutedAction } from '../db';
import type { GateRunResult, MinerReceipt, Miner } from '../telegraph/types';

export interface GateRunOptions {
  userActionText?: string;
  minConfidence?: number;
  deadlineMs?: number;
  requestedIntents?: string[];
}

export async function executeGateRun(
  targetAddress: string,
  userActionTextOrOptions?: string | GateRunOptions
): Promise<GateRunResult> {
  if (!targetAddress || !targetAddress.trim()) {
    throw new Error('Target address is required to execute a gate run.');
  }

  const options: GateRunOptions =
    typeof userActionTextOrOptions === 'string'
      ? { userActionText: userActionTextOrOptions }
      : userActionTextOrOptions || {};

  const cleanAddress = targetAddress.trim();
  const cleanAction = (options.userActionText || 'Standard transaction proposal').trim();
  const deadlineMs = options.deadlineMs || 25000;
  const receipts: MinerReceipt[] = [];

  // Step 1: Query live catalog directly from Telegraph (Constraint: Catalog is the contract)
  const allMiners = await fetchLiveMiners(true);
  const activeMiners = allMiners.filter((m) => m.activation_status === 'active');

  // Step 2: Select miners based on advertised capabilities with domain relevance scoring
  const scoredCandidates: { miner: Miner; params: Record<string, unknown>; score: number }[] = [];

  for (const m of activeMiners) {
    const intents = (m.supported_intents || []).map((i) => i.toUpperCase());
    const desc = (m.description || '').toLowerCase();
    const name = (m.name || '').toLowerCase();

    let score = 0;

    // High priority: explicit crypto security, fraud, on-chain transaction lookups
    if (intents.some((i) => i.includes('FRAUD') || i.includes('SECURITY') || i.includes('ONCHAIN') || i.includes('TX') || i.includes('WALLET') || i.includes('BALANCE'))) {
      score += 20;
    }
    if (desc.includes('fraud') || desc.includes('drainer') || desc.includes('phishing') || desc.includes('malicious') || desc.includes('blacklist')) {
      score += 15;
    }
    if (desc.includes('on-chain') || desc.includes('blockchain') || desc.includes('wallet') || desc.includes('transaction') || desc.includes('contract') || desc.includes('token')) {
      score += 10;
    }

    // Downrank completely unrelated domains (weather, sports, ssl) for crypto gate checks
    if (intents.some((i) => i.includes('WEATHER') || i.includes('CLIMATE') || i.includes('SSL') || i.includes('SPORTS') || i.includes('AI_TEXT'))) {
      score -= 30;
    }
    if (name.includes('weather') || desc.includes('weather forecast') || desc.includes('ssl')) {
      score -= 30;
    }

    if (score > 0) {
      const ep = m.endpoints?.[0];
      const params: Record<string, unknown> = {
        wallet: cleanAddress,
        address: cleanAddress,
        contractAddress: cleanAddress,
        action: cleanAction,
        text: `${cleanAddress} ${cleanAction}`,
        chain: '1',
      };

      scoredCandidates.push({ miner: m, params, score });
    }
  }

  // Sort candidates by highest relevance score and pick top 3 distinct miners
  scoredCandidates.sort((a, b) => b.score - a.score);
  const selectedCandidates = scoredCandidates.slice(0, 3);

  // Step 3: Run asks against live miners with deadline enforcement
  const minerPromises = selectedCandidates.map(async ({ miner, params }) => {
    const endpoint = miner.endpoints?.[0] || { path: '/analyze', method: 'POST' };
    return askMiner(miner, endpoint, params);
  });

  // Step 4: Run ask against Telegraph Engine Auto-Router with intent declaration
  const engineQuery = `Evaluate pre-action safety for wallet ${cleanAddress}. Proposed action: ${cleanAction}. Check contract risk, fraud flags, and recent activity.`;
  const enginePromise = askEngine(engineQuery);

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`Gate run deadline exceeded (${deadlineMs}ms)`)), deadlineMs)
  );

  let settledResults: PromiseSettledResult<MinerReceipt>[] = [];
  try {
    settledResults = await Promise.race([
      Promise.allSettled([...minerPromises, enginePromise]),
      timeoutPromise.then(() => []),
    ]);
  } catch {
    // If deadline timed out, evaluate whatever receipts finished or fail closed
  }

  for (const res of settledResults) {
    if (res.status === 'fulfilled') {
      receipts.push(res.value);
    }
  }

  // Step 5: Evaluate fail-closed verdict policy
  const verdictResult = evaluateGatePolicy(cleanAddress, cleanAction, receipts);

  // Step 6: Persist audit run
  try {
    saveGateRun(verdictResult);
  } catch (dbErr) {
    console.error('[Signalgate] Failed to persist run in database:', dbErr);
  }

  // Step 7: Act on the Signal (Compliance Halt on BLOCK / Action Dispatch on ALLOW)
  try {
    if (verdictResult.verdict === 'BLOCK') {
      quarantineWallet(
        cleanAddress,
        verdictResult.reason,
        verdictResult.receipts,
        Math.max(0.8, 1.0 - verdictResult.overallConfidence)
      );
      recordExecutedAction(
        verdictResult.runId,
        cleanAddress,
        cleanAction,
        'HALTED',
        {
          action: 'COMPLIANCE_HALT',
          quarantined: true,
          reason: verdictResult.reason,
          receiptsCount: verdictResult.receipts.length,
        }
      );
      console.log(`[Signalgate Compliance] QUARANTINED wallet ${cleanAddress}: ${verdictResult.reason}`);
    } else if (verdictResult.verdict === 'ALLOW') {
      recordExecutedAction(
        verdictResult.runId,
        cleanAddress,
        cleanAction,
        'EXECUTED',
        {
          action: 'APPROVED_FOR_BROADCAST',
          confidence: verdictResult.overallConfidence,
          receiptsCount: verdictResult.receipts.length,
          timestamp: new Date().toISOString(),
        }
      );
      console.log(`[Signalgate Execution] EXECUTED action for ${cleanAddress}: ${cleanAction}`);
    }
  } catch (actionErr) {
    console.error('[Signalgate] Failed to trigger action on signal:', actionErr);
  }

  return verdictResult;
}
