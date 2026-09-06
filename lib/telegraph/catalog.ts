import { getTelegraphConfig } from './config';
import type { Miner } from './types';

let cachedMiners: Miner[] | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 30000; // 30s cache to stay fresh with live catalog

export async function fetchLiveMiners(forceRefresh = false): Promise<Miner[]> {
  const now = Date.now();
  if (!forceRefresh && cachedMiners && now - lastFetchTime < CACHE_TTL_MS) {
    return cachedMiners;
  }

  const config = getTelegraphConfig();
  const url = `${config.nodeUrl}/api/miners`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
      cache: 'no-store',
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch live miner catalog from Telegraph: ${res.status} ${res.statusText}`);
    }

    const data = (await res.json()) as Miner[];
    if (!Array.isArray(data)) {
      throw new Error('Telegraph miner catalog response is not a list');
    }

    cachedMiners = data;
    lastFetchTime = now;
    return data;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Discovers miners dynamically from the live catalog without assuming fixed intents.
 * Examines each live miner's advertised supported_intents, description, and endpoints.
 */
export async function discoverMinersForAction(
  userText: string
): Promise<{
  activeMiners: Miner[];
  discoveredIntents: string[];
  matchedMiners: Miner[];
}> {
  const allMiners = await fetchLiveMiners();
  const activeMiners = allMiners.filter((m) => m.activation_status === 'active');

  const intentSet = new Set<string>();
  for (const m of activeMiners) {
    for (const i of m.supported_intents || []) {
      intentSet.add(i);
    }
  }

  const queryTerms = userText.toLowerCase();

  // Score miners based on runtime advertised capabilities and text relevance
  const matchedMiners = activeMiners.filter((m) => {
    const intents = (m.supported_intents || []).map((i) => i.toLowerCase()).join(' ');
    const desc = (m.description || '').toLowerCase();
    const name = (m.name || '').toLowerCase();

    // Look for risk/security/fraud/wallet capabilities or matches to user text
    const hasRiskIntent =
      intents.includes('fraud') ||
      intents.includes('risk') ||
      intents.includes('balance') ||
      intents.includes('onchain') ||
      intents.includes('tx');

    const matchesQuery = queryTerms.split(/\s+/).some(
      (term) => term.length > 3 && (desc.includes(term) || name.includes(term) || intents.includes(term))
    );

    return hasRiskIntent || matchesQuery;
  });

  return {
    activeMiners,
    discoveredIntents: Array.from(intentSet).sort(),
    matchedMiners,
  };
}
