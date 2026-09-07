import { NextResponse } from 'next/server';
import { fetchLiveMiners } from '@/lib/telegraph/catalog';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const refresh = searchParams.get('refresh') === 'true';

    const miners = await fetchLiveMiners(refresh);
    const active = miners.filter((m) => m.activation_status === 'active');

    const intentCounts: Record<string, number> = {};
    for (const m of active) {
      for (const i of m.supported_intents || []) {
        intentCounts[i] = (intentCounts[i] || 0) + 1;
      }
    }

    return NextResponse.json({
      success: true,
      totalMiners: miners.length,
      activeMiners: active.length,
      intentDistribution: intentCounts,
      miners: active.map((m) => ({
        id: m.id,
        name: m.name,
        slug: m.slug,
        intents: m.supported_intents,
        priceUsdc: (m.min_price_usdc || 10000) / 1000000,
        baseUrl: m.base_url,
        activationStatus: m.activation_status,
      })),
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Failed to fetch Telegraph miner catalog',
      },
      { status: 502 }
    );
  }
}
