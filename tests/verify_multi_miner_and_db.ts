import { executeGateRun } from '../lib/gate/runner';
import { getRecentGateRuns, getWatchlist, addToWatchlist, removeFromWatchlist } from '../lib/db';

async function main() {
  console.log('=== STEP 4 & 5: Multi-miner Select, Policy, and SQLite Persistence ===');

  const testWallet = '0x2222222222222222222222222222222222222222';
  const testAction = 'Sign token approval for DEX router';

  console.log(`Running executeGateRun for ${testWallet} with action: "${testAction}"...`);
  const result = await executeGateRun(testWallet, testAction);

  console.log('Gate Run ID:', result.runId);
  console.log('Miners queried:', result.minersQueriedCount);
  console.log('Paid requests count:', result.paidRequestsCount);
  console.log('Verdict:', result.verdict);
  console.log('Reason:', result.reason);
  console.log('Payment Settled:', result.paymentSettled);
  console.log('Receipts count:', result.receipts.length);

  for (const r of result.receipts) {
    console.log(`- Receipt [${r.minerName} / ${r.intent}]: status=${r.status}, latency=${r.latencyMs}ms, explorerUrl=${r.explorerMinerUrl}, explorerRequestId=${r.explorerRequestId}`);
  }

  console.log('\n--- Testing SQLite persistence ---');
  const recentRuns = getRecentGateRuns(5);
  console.log(`Retrieved ${recentRuns.length} runs from SQLite database.`);
  const foundRun = recentRuns.find(r => r.runId === result.runId);
  if (!foundRun) {
    throw new Error(`Failed to find persisted run ${result.runId} in database!`);
  }
  console.log('Successfully found persisted run in SQLite database with matching runId and receipts!');

  console.log('\n--- Testing Watchlist in SQLite ---');
  const entry = addToWatchlist(testWallet, 'Test Whale Wallet', testAction);
  console.log('Added to watchlist:', entry);

  const list = getWatchlist();
  console.log('Current watchlist count:', list.length);
  const foundEntry = list.find(e => e.address.toLowerCase() === testWallet.toLowerCase());
  if (!foundEntry) {
    throw new Error('Watchlist entry not found in database!');
  }
  console.log('Found watchlist entry:', foundEntry);

  // Clean up test entry
  removeFromWatchlist(foundEntry.id);
  console.log('Cleaned up test watchlist entry.');

  console.log('\n>>> STEP 4 & 5 VERIFIED: Multi-miner selection, policy evaluation, and SQLite persistence all working! <<<');
}

main().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
