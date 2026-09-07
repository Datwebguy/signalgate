import { getTelegraphConfig } from '../telegraph/config';
import type { GateRunResult, MinerReceipt } from '../telegraph/types';

export interface PolicyOptions {
  minConfidence?: number;
}

function isHighRiskPayload(receipt: MinerReceipt): boolean {
  const text = JSON.stringify(receipt.rawResponse ?? {}).toLowerCase();
  const label = (receipt.extractedLabel || '').toLowerCase();
  const reason = (receipt.extractedReason || '').toLowerCase();
  const combined = `${text} ${label} ${reason}`;

  return (
    combined.includes('"risk":"high"') ||
    combined.includes('"risk_score":"high"') ||
    combined.includes('"status":"malicious"') ||
    combined.includes('"is_malicious":true') ||
    combined.includes('"fraud":true') ||
    combined.includes('"state":"suspicious"') ||
    combined.includes('"state":"malicious"') ||
    combined.includes('"phishing":true') ||
    label === 'malicious' ||
    label === 'fraud' ||
    label === 'high-risk' ||
    label === 'high_risk'
  );
}

export function evaluateGatePolicy(
  targetAddress: string,
  proposedActionText: string,
  receipts: MinerReceipt[],
  options: PolicyOptions = {}
): GateRunResult {
  const config = getTelegraphConfig();
  const threshold =
    typeof options.minConfidence === 'number' && !Number.isNaN(options.minConfidence)
      ? options.minConfidence
      : config.gateMinConfidence;
  const runId = `run_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  console.log(`[Signalgate Policy] Evaluating gate run: ${runId} for ${targetAddress}`);
  console.log(
    `[Signalgate Policy] GATE_MIN_CONFIDENCE=${threshold}, Watchlist interval=${config.watchlistIntervalMs}ms`
  );

  const paidCount = receipts.filter((r) => r.paid).length;
  const paymentRequiredReceipts = receipts.filter((r) => r.status === 'PAYMENT_REQUIRED');
  const failedReceipts = receipts.filter((r) => r.status === 'FAILED');
  const successfulReceipts = receipts.filter((r) => r.status === 'SUCCESS');
  const paymentSettled = paidCount > 0 && paymentRequiredReceipts.length === 0;

  const base = {
    runId,
    targetAddress,
    proposedActionText,
    configuredConfidenceThreshold: threshold,
    timestamp: new Date().toISOString(),
    receipts,
    minersQueriedCount: receipts.length,
    paidRequestsCount: paidCount,
    paymentSettled,
  };

  if (!receipts || receipts.length === 0) {
    return {
      ...base,
      verdict: 'WAIT',
      reason: 'No active Telegraph miners responded for this check. Failing closed.',
      overallConfidence: 0,
      paymentSettled: false,
    };
  }

  if (paymentRequiredReceipts.length > 0) {
    const unpaid = paymentRequiredReceipts.map((r) => r.minerName).join(', ');
    return {
      ...base,
      verdict: 'WAIT',
      reason: `402 Payment Required: Live Telegraph inference requires settled USDC on Base Sepolia before a verdict can issue. Awaiting payment from: ${unpaid}.`,
      overallConfidence: 0,
      paymentSettled: false,
    };
  }

  if (!paymentSettled) {
    return {
      ...base,
      verdict: 'WAIT',
      reason: 'Payment did not settle on any miner ask. Failing closed until x402 USDC settlement is confirmed.',
      overallConfidence: 0,
      paymentSettled: false,
    };
  }

  const fraudSignals = successfulReceipts.filter((r) => isHighRiskPayload(r));
  if (fraudSignals.length > 0) {
    const culprit = fraudSignals[0];
    return {
      ...base,
      verdict: 'BLOCK',
      reason: `Blocked: Live miner ${culprit.minerName} flagged critical risk (${culprit.extractedReason || culprit.extractedLabel || 'high-risk payload'}).`,
      overallConfidence: 0.95,
    };
  }

  if (successfulReceipts.length === 0) {
    const errSummary = failedReceipts[0]?.error || 'Unknown error';
    return {
      ...base,
      verdict: 'BLOCK',
      reason: `All required Telegraph miners failed to return responses (${errSummary}). Failing closed.`,
      overallConfidence: 0,
    };
  }

  const confidences = successfulReceipts
    .map((r) => r.extractedConfidence)
    .filter((c): c is number => typeof c === 'number' && !Number.isNaN(c));

  if (confidences.length === 0) {
    return {
      ...base,
      verdict: 'WAIT',
      reason: 'Miners answered but none returned a numeric confidence. Failing closed rather than inventing a score.',
      overallConfidence: 0,
    };
  }

  const avgConfidence = confidences.reduce((a, b) => a + b, 0) / confidences.length;

  if (avgConfidence < threshold) {
    return {
      ...base,
      verdict: 'WAIT',
      reason: `Miner consensus confidence (${(avgConfidence * 100).toFixed(1)}%) is below required threshold (${(threshold * 100).toFixed(1)}%).`,
      overallConfidence: avgConfidence,
    };
  }

  const distinctMiners = new Set(successfulReceipts.map((r) => r.minerId));
  if (distinctMiners.size < 2) {
    const singleMiner = successfulReceipts[0]?.minerName || 'Single miner';
    return {
      ...base,
      verdict: 'WAIT',
      reason: `Awaiting additional miner confirmations. Received a successful paid response only from ${singleMiner}. Minimum 2 distinct miners required.`,
      overallConfidence: avgConfidence,
    };
  }

  const minerNames = Array.from(new Set(successfulReceipts.map((r) => r.minerName))).join(' & ');
  return {
    ...base,
    verdict: 'ALLOW',
    reason: `Verified safe by ${distinctMiners.size} live Telegraph miners (${minerNames}) with ${(avgConfidence * 100).toFixed(1)}% confidence.`,
    overallConfidence: avgConfidence,
  };
}
