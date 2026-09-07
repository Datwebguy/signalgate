import { fetchLiveMiners } from '../lib/telegraph/catalog';
import { askMiner, askEngine } from '../lib/telegraph/ask';
import { saveGateRun, getFlywheelStats } from '../lib/db';
import { evaluateGatePolicy } from '../lib/gate/policy';
import type { MinerReceipt } from '../lib/telegraph/types';

async function runFlywheel() {
  const args = process.argv.slice(2);
  let batchSize = 10;
  const batchIdx = args.indexOf('--batch');
  if (batchIdx !== -1 && args[batchIdx + 1]) {
    batchSize = parseInt(args[batchIdx + 1], 10) || 10;
  }

  console.log('===============================================================');
  console.log('       SIGNALGATE FLYWHEEL REAL DEMAND GENERATOR               ');
  console.log('===============================================================');
  console.log(`- Target batch size: ${batchSize} requests across live miners`);

  const initialStats = getFlywheelStats();
  console.log(`- Current total live asks dispatched: ${initialStats.totalAsksDispatched}`);
  console.log(`- Current total gate runs: ${initialStats.totalGateRuns}`);
  console.log(`- Target flywheel goal: ${initialStats.targetFlywheelGoal} requests`);

  console.log('\n[1/3] Fetching live Telegraph miner catalog...');
  const allMiners = await fetchLiveMiners(true);
  const activeMiners = allMiners.filter((m) => m.activation_status === 'active');
  console.log(`- Discovered ${activeMiners.length} active miners on the network`);

  if (activeMiners.length === 0) {
    console.error('No active miners found. Exiting.');
    process.exit(1);
  }

  const sampleWallets = [
    '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', // vitalik.eth
    '0xBE0eB53F46cd790Cd13851d5EFf43D12404d33E8', // Binance 7
    '0x742d35Cc6634C0532925a3b844Bc454e4438f44e', // Bitfinex
    '0x28C6c06298d514Db089934071355E5743bf21d60', // Binance 14
    '0x1111111254fb6c44bac0bed2854e76f90643097d', // 1inch router
  ];

  console.log('\n[2/3] Dispatching real asks to live miners...');
  const receipts: MinerReceipt[] = [];

  const asksToDispatch = Math.min(batchSize, activeMiners.length);
  const shuffled = [...activeMiners].sort(() => 0.5 - Math.random());
  const selected = shuffled.slice(0, asksToDispatch);

  const promises = selected.map(async (miner, i) => {
    const targetAddr = sampleWallets[i % sampleWallets.length];
    const endpoint = miner.endpoints?.[0] || { path: '/analyze', method: 'POST' };
    const actionText = `Flywheel verification check #${i + 1}`;
    const params: Record<string, unknown> = {
      wallet: targetAddr,
      address: targetAddr,
      contractAddress: targetAddr,
      action: actionText,
      text: `${targetAddr} ${actionText}`,
      chain: '1',
    };

    console.log(`  -> Dispatching live ask to: ${miner.name} (${miner.id}) [${miner.supported_intents?.[0] || 'GENERAL'}]`);
    const r = await askMiner(miner, endpoint, params);
    console.log(`     ✓ Received: status=${r.status}, latency=${r.latencyMs}ms, explorer=${r.explorerMinerUrl}`);
    return r;
  });

  // Also query Telegraph Engine Router
  const engineQuery = 'Flywheel live demand batch evaluation across active subnets.';
  console.log('  -> Dispatching live ask to: Telegraph Engine Router (/v1/ask)');
  const enginePromise = askEngine(engineQuery).then((r) => {
    console.log(`     ✓ Received Engine response: status=${r.status}, latency=${r.latencyMs}ms`);
    return r;
  });

  const results = await Promise.allSettled([...promises, enginePromise]);

  for (const res of results) {
    if (res.status === 'fulfilled') {
      receipts.push(res.value);
    }
  }

  console.log('\n[3/3] Evaluating policy and recording receipts in SQLite...');
  const verdict = evaluateGatePolicy(
    sampleWallets[0],
    `Flywheel batch run (${receipts.length} real asks)`,
    receipts
  );
  saveGateRun(verdict);

  const finalStats = getFlywheelStats();
  console.log('===============================================================');
  console.log('       FLYWHEEL BATCH RUN COMPLETED                            ');
  console.log('===============================================================');
  console.log(`- New asks dispatched: ${receipts.length}`);
  console.log(`- Total live asks dispatched: ${finalStats.totalAsksDispatched}`);
  console.log(`- Total gate runs recorded: ${finalStats.totalGateRuns}`);
  console.log(`- Progress toward 100 live miner request target: ${Math.min(100, Math.round((finalStats.totalAsksDispatched / 100) * 100))}% (${finalStats.totalAsksDispatched}/100)`);
  console.log('===============================================================');
}

runFlywheel().catch((err) => {
  console.error('Flywheel error:', err);
  process.exit(1);
});
