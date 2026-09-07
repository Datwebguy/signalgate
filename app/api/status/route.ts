import { NextResponse } from 'next/server';
import { getTelegraphConfig } from '@/lib/telegraph/config';
import { getPaymentWalletStatus } from '@/lib/telegraph/x402';
import { fetchLiveMiners } from '@/lib/telegraph/catalog';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const config = getTelegraphConfig();
  const wallet = getPaymentWalletStatus();

  // Test live endpoints
  let nodeHealthy = false;
  let engineHealthy = false;
  let daemonHealthy = false;
  let nodeStatusData: any = null;
  let totalMiners = 0;
  let activeMiners = 0;

  try {
    const nodeRes = await fetch(`${config.nodeUrl}/status`, { signal: AbortSignal.timeout(4000), cache: 'no-store' });
    if (nodeRes.ok) {
      nodeHealthy = true;
      nodeStatusData = await nodeRes.json().catch(() => null);
    }
  } catch {}

  try {
    const engineRes = await fetch(`${config.engineUrl}/v1/subnets`, { signal: AbortSignal.timeout(4000), cache: 'no-store' });
    if (engineRes.ok) {
      engineHealthy = true;
    }
  } catch {}

  try {
    const daemonRes = await fetch(`${config.daemonUrl}/health`, { signal: AbortSignal.timeout(4000), cache: 'no-store' });
    if (daemonRes.ok) {
      daemonHealthy = true;
    }
  } catch {}

  try {
    const miners = await fetchLiveMiners();
    totalMiners = miners.length;
    activeMiners = miners.filter((m) => m.activation_status === 'active').length;
  } catch {}

  return NextResponse.json({
    success: true,
    network: {
      node: {
        url: config.nodeUrl,
        healthy: nodeHealthy,
        publicKey: nodeStatusData?.publicKey || null,
      },
      engine: {
        url: config.engineUrl,
        healthy: engineHealthy,
      },
      daemon: {
        url: config.daemonUrl,
        healthy: daemonHealthy,
      },
      explorer: {
        url: config.explorerUrl,
      },
    },
    catalog: {
      totalMiners,
      activeMiners,
    },
    payment: {
      isConfigured: wallet.isConfigured,
      address: wallet.address,
      network: wallet.network,
      status: wallet.isConfigured ? 'Ready (Signed x402)' : 'Unconfigured / Unpaid',
    },
    config: {
      gateMinConfidence: config.gateMinConfidence,
      watchlistIntervalMs: config.watchlistIntervalMs,
    },
    timestamp: new Date().toISOString(),
  });
}
