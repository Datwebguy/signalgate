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

  // Step 2: Select miners based on what each live record advertises this request
  // Speak Intent: match requested intents or default multi-intent risk categories
  const targetIntents = (options.requestedIntents && options.requestedIntents.length > 0)
    ? options.requestedIntents.map((i) => i.toUpperCase())
    : ['FRAUD', 'RISK', 'SECURITY', 'ONCHAIN', 'TX', 'WALLET', 'BALANCE'];

  const candidateMiners: { miner: Miner; params: Record<string, unknown> }[] = [];

  for (const m of activeMiners) {
    const intents = (m.supported_intents || []).map((i) => i.toUpperCase());
    const desc = (m.description || '').toLowerCase();

    const matchesIntent = targetIntents.some((ti) =>
      intents.some((i) => i.includes(ti)) || desc.includes(ti.toLowerCase())
    );

    if (matchesIntent) {
      const ep = m.endpoints?.[0];
      const params: Record<string, unknown> = {
        wallet: cleanAddress,
        address: cleanAddress,
        contractAddress: cleanAddress,
        action: cleanAction,
        text: `${cleanAddress} ${cleanAction}`,
        chain: '1',
      };

      candidateMiners.push({ miner: m, params });
    }
  }

  // Pick up to 3 diverse miners from the advertised candidates
  const selectedCandidates = candidateMiners.slice(0, 3);

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
