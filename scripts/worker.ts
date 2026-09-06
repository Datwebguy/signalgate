import { startWatchlistPoller, pollWatchlistOnce } from '../lib/worker/poller';

const args = process.argv.slice(2);
const runOnce = args.includes('--once');

console.log('=== Signalgate Watchlist Worker ===');

if (runOnce) {
  console.log('Mode: Single poll cycle (--once)');
  pollWatchlistOnce()
    .then((summary) => {
      console.log(`Finished single poll cycle. Processed ${summary.polledCount} wallets.`);
      process.exit(0);
    })
    .catch((err) => {
      console.error('Worker run failed:', err);
      process.exit(1);
    });
} else {
  console.log('Mode: Continuous polling background worker');
  startWatchlistPoller();

  process.on('SIGINT', () => {
    console.log('Received SIGINT, shutting down worker...');
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    console.log('Received SIGTERM, shutting down worker...');
    process.exit(0);
  });
}
