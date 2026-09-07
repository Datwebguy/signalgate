import type { Miner } from '../telegraph/types';

const RISK_HINTS = ['FRAUD', 'RISK', 'SECURITY', 'ONCHAIN', 'TX', 'WALLET', 'BALANCE'];

export const DEFAULT_INTENT_BUDGET = 3;

export function liveIntentSet(miners: Miner[]): string[] {
  const set = new Set<string>();
  for (const miner of miners) {
    for (const intent of miner.supported_intents || []) {
      if (intent) set.add(intent);
    }
  }
  return Array.from(set).sort();
}

export function discoverGateIntents(miners: Miner[], requested?: string[]): string[] {
  const live = liveIntentSet(miners);

  if (requested && requested.length > 0) {
    const matched: string[] = [];
    for (const req of requested) {
      const upper = req.toUpperCase();
      const exact = live.find((intent) => intent.toUpperCase() === upper);
      if (exact) {
        matched.push(exact);
        continue;
      }
      const partial = live.find(
        (intent) => intent.toUpperCase().includes(upper) || upper.includes(intent.toUpperCase())
      );
      if (partial) matched.push(partial);
    }
    return Array.from(new Set(matched)).slice(0, DEFAULT_INTENT_BUDGET);
  }

  const ranked = live.filter((intent) => {
    const upper = intent.toUpperCase();
    return RISK_HINTS.some((hint) => upper.includes(hint));
  });

  return ranked.slice(0, DEFAULT_INTENT_BUDGET);
}

export function buildEngineQuery(intent: string, address: string, action: string): string {
  return `Intent: ${intent}. Evaluate wallet ${address} for the proposed action: ${action}. Return a risk assessment with an explicit numeric confidence between 0 and 1 and a label (safe, suspicious, or malicious). Do not invent on-chain facts.`;
}
