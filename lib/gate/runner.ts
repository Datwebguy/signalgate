import { fetchLiveMiners } from '../telegraph/catalog';
import { askEngine } from '../telegraph/ask';
import { evaluateGatePolicy } from './policy';
import { buildEngineQuery, discoverGateIntents } from './intents';
import { saveGateRun, quarantineWallet, recordExecutedAction } from '../db';
import type { GateRunResult, MinerReceipt } from '../telegraph/types';

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
  const perAskTimeout = Math.max(8000, Math.min(deadlineMs || 25000, 20000));

  const allMiners = await fetchLiveMiners(true);
  const activeMiners = allMiners.filter((m) => m.activation_status === 'active');
  const intents = discoverGateIntents(activeMiners, options.requestedIntents);

  if (intents.length === 0) {
    const empty = evaluateGatePolicy(cleanAddress, cleanAction, [], {
      minConfidence: options.minConfidence,
    });
    empty.reason =
      'No live Telegraph miners currently advertise a fraud, risk, on-chain, or wallet intent. Failing closed.';
    try {
      saveGateRun(empty);
    } catch (dbErr) {
      console.error('[Signalgate] Failed to persist run in database:', dbErr);
    }
    return empty;
  }

  const askPromises: Promise<MinerReceipt>[] = intents.map((intent) =>
    askEngine(buildEngineQuery(intent, cleanAddress, cleanAction), {
      intent,
      context: {
        intent,
        wallet: cleanAddress,
        action: cleanAction,
        min_confidence: options.minConfidence,
        deadline_ms: deadlineMs,
      },
      timeoutMs: perAskTimeout,
    })
  );

  const receipts: MinerReceipt[] = [];
  const results = await Promise.allSettled(askPromises);
  for (const result of results) {
    if (result.status === 'fulfilled') receipts.push(result.value);
    else {
      receipts.push({
        minerId: 'engine-auto-router',
        minerName: 'Telegraph Engine Router',
        slug: 'engine-ask',
        intent: 'AUTO_ROUTER',
        endpoint: '/v1/ask',
        method: 'POST',
        paid: false,
        priceUsdc: 0.01,
        status: 'FAILED',
        latencyMs: perAskTimeout,
        timestamp: new Date().toISOString(),
        rawResponse: null,
        explorerMinerUrl: 'https://explorer.telegraphprotocol.com/signals',
        explorerRequestId: 'no explorer id',
        error: result.reason?.message || String(result.reason || 'Engine ask rejected'),
      });
    }
  }

  const verdictResult = evaluateGatePolicy(cleanAddress, cleanAction, receipts, {
    minConfidence: options.minConfidence,
  });

  try {
    saveGateRun(verdictResult);
  } catch (dbErr) {
    console.error('[Signalgate] Failed to persist run in database:', dbErr);
  }

  try {
    if (verdictResult.verdict === 'BLOCK') {
      quarantineWallet(
        cleanAddress,
        verdictResult.reason,
        verdictResult.receipts,
        Math.max(0.8, 1.0 - verdictResult.overallConfidence)
      );
      recordExecutedAction(verdictResult.runId, cleanAddress, cleanAction, 'HALTED', {
        action: 'COMPLIANCE_HALT',
        quarantined: true,
        reason: verdictResult.reason,
        receiptsCount: verdictResult.receipts.length,
        broadcast: false,
      });
    } else if (verdictResult.verdict === 'ALLOW') {
      recordExecutedAction(verdictResult.runId, cleanAddress, cleanAction, 'EXECUTED', {
        action: 'APPROVED_FOR_BROADCAST',
        confidence: verdictResult.overallConfidence,
        receiptsCount: verdictResult.receipts.length,
        timestamp: new Date().toISOString(),
        broadcast: false,
        note: 'Signalgate does not sign or broadcast transactions. Downstream agents may proceed only after this ALLOW.',
      });
    }
  } catch (actionErr) {
    console.error('[Signalgate] Failed to record signal action:', actionErr);
  }

  return verdictResult;
}
