import { getWatchlist, updateWatchlistVerdict } from '../db';
import { executeGateRun } from '../gate/runner';
import { getTelegraphConfig } from '../telegraph/config';

let isRunning = false;
let timerId: NodeJS.Timeout | null = null;

export async function pollWatchlistOnce(): Promise<{
  polledCount: number;
  results: { address: string; verdict: string; reason: string }[];
}> {
  const watchlist = getWatchlist().filter((e) => e.active);
  console.log(`[Watchlist Worker] Starting poll cycle for ${watchlist.length} active watched wallets...`);

  const results: { address: string; verdict: string; reason: string }[] = [];

  for (const entry of watchlist) {
    try {
      console.log(`[Watchlist Worker] Querying live Telegraph network for: ${entry.address} (${entry.label})...`);
      const gateResult = await executeGateRun(entry.address, entry.proposedActionText);

      updateWatchlistVerdict(entry.id, gateResult.verdict, gateResult.reason);
      results.push({
        address: entry.address,
        verdict: gateResult.verdict,
        reason: gateResult.reason,
      });

      console.log(`[Watchlist Worker] Result for ${entry.address}: [${gateResult.verdict}] ${gateResult.reason}`);
    } catch (err: any) {
      console.error(`[Watchlist Worker] Error polling ${entry.address}:`, err.message);
    }
  }

  return {
    polledCount: watchlist.length,
    results,
  };
}

export function startWatchlistPoller(): void {
  if (isRunning) {
    console.log('[Watchlist Worker] Poller is already running.');
    return;
  }

  const config = getTelegraphConfig();
  const intervalMs = config.watchlistIntervalMs;

  isRunning = true;
  console.log(`[Watchlist Worker] Started continuous poller every ${intervalMs}ms (${intervalMs / 1000}s)...`);

  // Run initial poll
  pollWatchlistOnce().catch((err) => {
    console.error('[Watchlist Worker] Initial poll error:', err);
  });

  timerId = setInterval(() => {
    pollWatchlistOnce().catch((err) => {
      console.error('[Watchlist Worker] Periodic poll error:', err);
    });
  }, intervalMs);
}

export function stopWatchlistPoller(): void {
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
  isRunning = false;
  console.log('[Watchlist Worker] Stopped continuous poller.');
}
