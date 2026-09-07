import { NextResponse } from 'next/server';
import { getFlywheelStats } from '@/lib/db';
import { fetchLiveMiners } from '@/lib/telegraph/catalog';
import { askMiner, askEngine } from '@/lib/telegraph/ask';
import { saveGateRun } from '@/lib/db';
import { evaluateGatePolicy } from '@/lib/gate/policy';
import type { MinerReceipt } from '@/lib/telegraph/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const stats = getFlywheelStats();
    return NextResponse.json({ success: true, stats });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const count = Math.min(25, Math.max(1, Number(body.count || 5)));
    const targetAddress = body.address || '0x742d35Cc6634C0532925a3b844Bc454e4438f44e';

    const allMiners = await fetchLiveMiners(true);
    const activeMiners = allMiners.filter((m) => m.activation_status === 'active');

    const dispatchedReceipts: MinerReceipt[] = [];
    const batchSize = Math.min(count, activeMiners.length);

    // Pick diverse active miners across intents
    const selectedMiners = activeMiners.slice(0, batchSize);

    const askPromises = selectedMiners.map(async (miner, idx) => {
      const endpoint = miner.endpoints?.[0] || { path: '/analyze', method: 'POST' };
      const actionText = `Flywheel network demand verification request #${idx + 1}`;
      const params: Record<string, unknown> = {
        wallet: targetAddress,
        address: targetAddress,
        contractAddress: targetAddress,
        action: actionText,
        text: `${targetAddress} ${actionText}`,
      };
      return askMiner(miner, endpoint, params);
    });

    // Also include one Engine query
    const enginePromise = askEngine(
      `Flywheel network demand verification for address ${targetAddress}. Validate security signals across active subnets.`
    );

    const results = await Promise.allSettled([...askPromises, enginePromise]);

    for (const res of results) {
      if (res.status === 'fulfilled') {
        dispatchedReceipts.push(res.value);
      }
    }

    // Evaluate and save gate run to persist traffic receipts
    const verdict = evaluateGatePolicy(
      targetAddress,
      `Batch flywheel demand generation (${dispatchedReceipts.length} live asks)`,
      dispatchedReceipts
    );
    saveGateRun(verdict);

    const updatedStats = getFlywheelStats();

    return NextResponse.json({
      success: true,
      batchDispatched: dispatchedReceipts.length,
      receipts: dispatchedReceipts.map((r) => ({
        minerId: r.minerId,
        minerName: r.minerName,
        intent: r.intent,
        status: r.status,
        latencyMs: r.latencyMs,
        explorerUrl: r.explorerMinerUrl,
      })),
      stats: updatedStats,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
