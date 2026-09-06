import { fetchLiveMiners } from '../telegraph/catalog';
import { askMiner, askEngine } from '../telegraph/ask';
import { evaluateGatePolicy } from './policy';
import { saveGateRun } from '../db';
import type { GateRunResult, MinerReceipt, Miner } from '../telegraph/types';

export async function executeGateRun(
  targetAddress: string,
  userActionText = 'Standard transaction proposal'
): Promise<GateRunResult> {
  if (!targetAddress || !targetAddress.trim()) {
    throw new Error('Target address is required to execute a gate run.');
  }

  const cleanAddress = targetAddress.trim();
  const cleanAction = userActionText.trim();
  const receipts: MinerReceipt[] = [];

  // Step 1: Query live catalog directly from Telegraph (Constraint: Catalog is the contract)
  const allMiners = await fetchLiveMiners(true);
  const activeMiners = allMiners.filter((m) => m.activation_status === 'active');

  // Step 2: Select miners based on what each live record advertises this request
  // Check advertised intents and descriptions dynamically
  const candidateMiners: { miner: Miner; params: Record<string, unknown> }[] = [];

  for (const m of activeMiners) {
    const intents = (m.supported_intents || []).map((i) => i.toUpperCase());
    const desc = (m.description || '').toLowerCase();
    const slug = (m.slug || '').toLowerCase();

    // Check if this miner advertises fraud, contract risk, transaction verification, or balance check
    const hasFraudIntent = intents.some((i) => i.includes('FRAUD') || i.includes('RISK') || i.includes('SECURITY'));
    const hasOnChainIntent = intents.some((i) => i.includes('ONCHAIN') || i.includes('TX') || i.includes('TRANSACTION'));
    const hasWalletIntent = intents.some((i) => i.includes('WALLET') || i.includes('BALANCE'));

    if (hasFraudIntent || hasOnChainIntent || hasWalletIntent || desc.includes('risk') || desc.includes('fraud')) {
      // Build payload: wallet plus user's text (Correction #3: Telegraph decides risk, not UI dropdown)
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

  // Step 3: Run asks against live miners
  const minerPromises = selectedCandidates.map(async ({ miner, params }) => {
    const endpoint = miner.endpoints?.[0] || { path: '/analyze', method: 'POST' };
    return askMiner(miner, endpoint, params);
  });

  // Step 4: Run ask against Telegraph Engine Auto-Router with wallet + action text
  const engineQuery = `Evaluate pre-action safety for wallet ${cleanAddress}. Proposed action: ${cleanAction}. Check contract risk, fraud flags, and recent activity.`;
  const enginePromise = askEngine(engineQuery);

  const settledResults = await Promise.allSettled([...minerPromises, enginePromise]);

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

  return verdictResult;
}
