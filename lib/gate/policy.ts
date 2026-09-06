import { getTelegraphConfig } from '../telegraph/config';
import type { GateRunResult, GateVerdictType, MinerReceipt } from '../telegraph/types';

export function evaluateGatePolicy(
  targetAddress: string,
  proposedActionText: string,
  receipts: MinerReceipt[]
): GateRunResult {
  const config = getTelegraphConfig();
  const threshold = config.gateMinConfidence;
  const runId = `run_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  console.log(`[Signalgate Policy] Evaluating gate run: ${runId} for ${targetAddress}`);
  console.log(`[Signalgate Policy] Configured threshold: GATE_MIN_CONFIDENCE=${threshold}, Watchlist interval=${config.watchlistIntervalMs}ms`);

  // Fail closed rule 1: Zero miners or empty receipts
  if (!receipts || receipts.length === 0) {
    return {
      runId,
      targetAddress,
      proposedActionText,
      verdict: 'WAIT',
      reason: 'No active Telegraph miners responded for this check. Failing closed.',
      overallConfidence: 0,
      configuredConfidenceThreshold: threshold,
      timestamp: new Date().toISOString(),
      receipts: [],
      minersQueriedCount: 0,
      paidRequestsCount: 0,
      paymentSettled: false,
    };
  }

  const paidCount = receipts.filter((r) => r.paid).length;
  const paymentRequiredReceipts = receipts.filter((r) => r.status === 'PAYMENT_REQUIRED');
  const failedReceipts = receipts.filter((r) => r.status === 'FAILED');
  const successfulReceipts = receipts.filter((r) => r.status === 'SUCCESS');

  // Rule 2: Unpaid / 402 Payment Required -> WAIT with clear payment requirement banner
  if (paymentRequiredReceipts.length > 0) {
    const unpNames = paymentRequiredReceipts.map((r) => r.minerName).join(', ');
    return {
      runId,
      targetAddress,
      proposedActionText,
      verdict: 'WAIT',
      reason: `402 Payment Required: Live Telegraph inference requires settled USDC on Base Sepolia for miners: ${unpNames}.`,
      overallConfidence: 0,
      configuredConfidenceThreshold: threshold,
      timestamp: new Date().toISOString(),
      receipts,
      minersQueriedCount: receipts.length,
      paidRequestsCount: paidCount,
      paymentSettled: false,
    };
  }

  // Rule 3: Network errors / failures across all miners
  if (successfulReceipts.length === 0) {
    const errSummary = failedReceipts[0]?.error || 'Unknown error';
    return {
      runId,
      targetAddress,
      proposedActionText,
      verdict: 'BLOCK',
      reason: `All required Telegraph miners failed to return responses (${errSummary}). Failing closed.`,
      overallConfidence: 0,
      configuredConfidenceThreshold: threshold,
      timestamp: new Date().toISOString(),
      receipts,
      minersQueriedCount: receipts.length,
      paidRequestsCount: paidCount,
      paymentSettled: paidCount > 0,
    };
  }

  // Rule 4: Check fraud/risk miners for high risk signals
  const fraudRiskSignals: {
    miner: string;
    isRisk: boolean;
    reason?: string;
  }[] = [];

  for (const r of successfulReceipts) {
    const text = JSON.stringify(r.rawResponse).toLowerCase();
    const isRisk =
      text.includes('"risk":"high"') ||
      text.includes('"risk_score":"high"') ||
      text.includes('"status":"malicious"') ||
      text.includes('"is_malicious":true') ||
      text.includes('"fraud":true') ||
      text.includes('"state":"suspicious"') ||
      text.includes('"phishing":true');

    if (isRisk) {
      fraudRiskSignals.push({
        miner: r.minerName,
        isRisk: true,
        reason: r.extractedReason || r.extractedLabel || 'Flagged as high risk',
      });
    }
  }

  if (fraudRiskSignals.length > 0) {
    const culprit = fraudRiskSignals[0];
    return {
      runId,
      targetAddress,
      proposedActionText,
      verdict: 'BLOCK',
      reason: `Blocked: Live miner ${culprit.miner} flagged critical risk (${culprit.reason}).`,
      overallConfidence: 0.95,
      configuredConfidenceThreshold: threshold,
      timestamp: new Date().toISOString(),
      receipts,
      minersQueriedCount: receipts.length,
      paidRequestsCount: paidCount,
      paymentSettled: true,
    };
  }

  // Rule 5: Calculate overall confidence from successful miners
  const confidences = successfulReceipts
    .map((r) => r.extractedConfidence)
    .filter((c): c is number => typeof c === 'number' && !isNaN(c));

  const avgConfidence =
    confidences.length > 0
      ? confidences.reduce((a, b) => a + b, 0) / confidences.length
      : 0.8;

  // Rule 6: Confidence threshold check
  if (avgConfidence < threshold) {
    return {
      runId,
      targetAddress,
      proposedActionText,
      verdict: 'WAIT',
      reason: `Miner consensus confidence (${(avgConfidence * 100).toFixed(1)}%) is below required threshold (${(threshold * 100).toFixed(1)}%).`,
      overallConfidence: avgConfidence,
      configuredConfidenceThreshold: threshold,
      timestamp: new Date().toISOString(),
      receipts,
      minersQueriedCount: receipts.length,
      paidRequestsCount: paidCount,
      paymentSettled: true,
    };
  }

  // Rule 7: Minimum confirmations check (at least 2 distinct miner answers)
  const distinctMiners = new Set(successfulReceipts.map((r) => r.minerId));
  if (distinctMiners.size < 2) {
    const singleMiner = successfulReceipts[0]?.minerName || 'Single miner';
    return {
      runId,
      targetAddress,
      proposedActionText,
      verdict: 'WAIT',
      reason: `Awaiting additional miner confirmations. Received response only from ${singleMiner}. Minimum 2 required.`,
      overallConfidence: avgConfidence,
      configuredConfidenceThreshold: threshold,
      timestamp: new Date().toISOString(),
      receipts,
      minersQueriedCount: receipts.length,
      paidRequestsCount: paidCount,
      paymentSettled: true,
    };
  }

  // Rule 8: All checks passed -> ALLOW
  const minerNames = Array.from(new Set(successfulReceipts.map((r) => r.minerName))).join(' & ');
  return {
    runId,
    targetAddress,
    proposedActionText,
    verdict: 'ALLOW',
    reason: `Verified safe by ${distinctMiners.size} live Telegraph miners (${minerNames}) with ${(avgConfidence * 100).toFixed(1)}% confidence.`,
    overallConfidence: avgConfidence,
    configuredConfidenceThreshold: threshold,
    timestamp: new Date().toISOString(),
    receipts,
    minersQueriedCount: receipts.length,
    paidRequestsCount: paidCount,
    paymentSettled: true,
  };
}
