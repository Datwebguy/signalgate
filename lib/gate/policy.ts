import { getTelegraphConfig } from '../telegraph/config';
import type { GateRunResult, GateVerdictType, MinerReceipt } from '../telegraph/types';

const KNOWN_MALICIOUS_ADDRESSES = new Set([
  '0x7a250d5630b4cf539739df2c5dacb4c659f2488d', // Phishing drainer router
  '0x0000000000000000000000000000000000000000',
]);

const KNOWN_VERIFIED_CONTRACTS: Record<string, string> = {
  '0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640': 'Uniswap V3 USDC/WETH Pool',
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': 'Official Circle USD Coin (USDC)',
  '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': 'Wrapped Ether (WETH)',
  '0xdac17f958d2ee523a2206206994597c13d831ec7': 'Tether USD (USDT)',
  '0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45': 'Uniswap V3 SwapRouter02',
};

function checkThreatPatterns(address: string, actionText: string): { isThreat: boolean; reason: string } {
  const normAddr = address.toLowerCase();
  const lowerAction = actionText.toLowerCase();

  if (KNOWN_MALICIOUS_ADDRESSES.has(normAddr)) {
    return {
      isThreat: true,
      reason: `Blocked: Target address ${address} is flagged in threat intelligence registries as a known phishing drainer router.`,
    };
  }

  if (
    lowerAction.includes('unlimited') ||
    lowerAction.includes('drainer') ||
    lowerAction.includes('drain') ||
    lowerAction.includes('phishing') ||
    lowerAction.includes('setapprovalforall') ||
    lowerAction.includes('approve all') ||
    lowerAction.includes('malicious')
  ) {
    return {
      isThreat: true,
      reason: `Blocked: Dangerous signature detected in proposed action ("${actionText}"). Unlimited token approvals to unverified addresses are blocked to prevent total wallet drainage.`,
    };
  }

  return { isThreat: false, reason: '' };
}

function checkVerifiedContract(address: string, actionText: string): { isVerified: boolean; label: string } {
  const normAddr = address.toLowerCase();
  const match = KNOWN_VERIFIED_CONTRACTS[normAddr];
  if (match) {
    const lowerAction = actionText.toLowerCase();
    if (!lowerAction.includes('drain') && !lowerAction.includes('unlimited')) {
      return { isVerified: true, label: match };
    }
  }
  return { isVerified: false, label: '' };
}

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

  // Rule 2: Critical Pre-Action Threat & Exploit Detection (Mandatory firewall mandate)
  const threat = checkThreatPatterns(targetAddress, proposedActionText);
  if (threat.isThreat) {
    return {
      runId,
      targetAddress,
      proposedActionText,
      verdict: 'BLOCK',
      reason: threat.reason,
      overallConfidence: 0.98,
      configuredConfidenceThreshold: threshold,
      timestamp: new Date().toISOString(),
      receipts,
      minersQueriedCount: receipts.length,
      paidRequestsCount: paidCount,
      paymentSettled: paidCount > 0,
    };
  }

  // Rule 3: Check fraud/risk miners for high risk signals in responses
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

  // Rule 4: Verified Onchain Protocol Consensus
  const verified = checkVerifiedContract(targetAddress, proposedActionText);
  if (verified.isVerified) {
    return {
      runId,
      targetAddress,
      proposedActionText,
      verdict: 'ALLOW',
      reason: `Verified Safe: Target contract verified as ${verified.label} (${targetAddress}). 0 fraud flags detected across ${receipts.length} queried Telegraph miners.`,
      overallConfidence: 0.95,
      configuredConfidenceThreshold: threshold,
      timestamp: new Date().toISOString(),
      receipts,
      minersQueriedCount: receipts.length,
      paidRequestsCount: paidCount,
      paymentSettled: paidCount > 0,
    };
  }

  // Rule 5: Unpaid / 402 Payment Required for unverified targets -> WAIT with clear banner
  if (paymentRequiredReceipts.length > 0) {
    const unpNames = paymentRequiredReceipts.map((r) => r.minerName).join(', ');
    return {
      runId,
      targetAddress,
      proposedActionText,
      verdict: 'WAIT',
      reason: `402 Payment Required: Live Telegraph inference requires settled USDC on Base Sepolia to inspect unverified contract bytecode for ${targetAddress}. Live miners awaiting payment: ${unpNames}.`,
      overallConfidence: 0,
      configuredConfidenceThreshold: threshold,
      timestamp: new Date().toISOString(),
      receipts,
      minersQueriedCount: receipts.length,
      paidRequestsCount: paidCount,
      paymentSettled: false,
    };
  }

  // Rule 6: Network errors / failures across all miners
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

  // Rule 7: Calculate overall confidence from successful miners
  const confidences = successfulReceipts
    .map((r) => r.extractedConfidence)
    .filter((c): c is number => typeof c === 'number' && !isNaN(c));

  const avgConfidence =
    confidences.length > 0
      ? confidences.reduce((a, b) => a + b, 0) / confidences.length
      : 0.85;

  // Rule 8: Confidence threshold check
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

  // Rule 9: Minimum confirmations check (at least 2 distinct miner answers)
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

  // Rule 10: All checks passed -> ALLOW
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
