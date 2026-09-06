import { addToWatchlist, getWatchlist, removeFromWatchlist } from '../lib/db';
import { pollWatchlistOnce } from '../lib/worker/poller';

async function main() {
  console.log('=== STEP 6: Watchlist Worker Verification ===');

  const testAddress = '0x3333333333333333333333333333333333333333';
  const entry = addToWatchlist(testAddress, 'Treasury Multisig Candidate', 'Bridge 50 ETH to Arbitrum');
  console.log('Added entry to watchlist:', entry.address);

  console.log('Triggering pollWatchlistOnce against live network...');
  const pollSummary = await pollWatchlistOnce();
  console.log('Poll summary:', pollSummary);

  const updatedList = getWatchlist();
  const updatedEntry = updatedList.find(e => e.address.toLowerCase() === testAddress.toLowerCase());

  console.log('Updated entry after poll:', {
    address: updatedEntry?.address,
    verdict: updatedEntry?.lastVerdict,
    reason: updatedEntry?.lastReason,
    lastRunAt: updatedEntry?.lastRunAt,
  });

  if (!updatedEntry?.lastVerdict || !updatedEntry?.lastRunAt) {
    throw new Error('Watchlist entry was not updated by poller cycle!');
  }

  // Clean up
  removeFromWatchlist(entry.id);
  console.log('Cleaned up test watchlist entry.');

  console.log('>>> STEP 6 VERIFIED: Watchlist worker polled live Telegraph network & updated database! <<<');
}

main().catch(err => {
  console.error('Worker test failed:', err);
  process.exit(1);
});
