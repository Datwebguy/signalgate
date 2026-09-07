import { NextResponse } from 'next/server';
import { fetchLiveMiners } from '@/lib/telegraph/catalog';
import { getTelegraphConfig } from '@/lib/telegraph/config';
import { getRecentGateRuns } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function observedLatencyByMiner(): Map<string, number> {
  const map = new Map<string, number>();
  const runs = getRecentGateRuns(50);
  for (const run of runs) {
    for (const receipt of run.receipts || []) {
      if (typeof receipt.latencyMs === 'number' && receipt.latencyMs > 0) {
        const prev = map.get(receipt.minerId);
        map.set(receipt.minerId, prev ? Math.round((prev + receipt.latencyMs) / 2) : receipt.latencyMs);
      }
    }
  }
  return map;
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const confidenceSteps: number[] = body.confidenceSteps || [0.3, 0.5, 0.6, 0.75, 0.9];
    const deadlineStepsMs: number[] = body.deadlineStepsMs || [1500, 3000, 5000, 8000];

    const allMiners = await fetchLiveMiners(true);
    const activeMiners = allMiners.filter((m) => m.activation_status === 'active');
    const config = getTelegraphConfig();
    const latencies = observedLatencyByMiner();

    const categorized = activeMiners.map((m) => {
      const intents = (m.supported_intents || []).map((i) => i.toUpperCase());
      const hasSecurity = intents.some((i) => i.includes('FRAUD') || i.includes('RISK') || i.includes('SECURITY'));
      const hasOnchain = intents.some((i) => i.includes('ONCHAIN') || i.includes('TX'));
      const hasState = intents.some((i) => i.includes('WALLET') || i.includes('BALANCE'));
      const score = m.scores?.[0]?.score;
      const observedLatency = latencies.get(m.id);

      return {
        id: m.id,
        name: m.name,
        intents: m.supported_intents || [],
        primaryIntent: m.supported_intents?.[0] || 'GENERAL',
        hasSecurity,
        hasOnchain,
        hasState,
        score: typeof score === 'number' ? score : null,
        observedLatencyMs: observedLatency ?? null,
      };
    });

    const sweepGrid: any[] = [];

    for (const conf of confidenceSteps) {
      for (const deadline of deadlineStepsMs) {
        const qualifiedMiners = categorized.filter((m) => {
          const meetsScore = m.score === null || m.score >= conf;
          const meetsDeadline = m.observedLatencyMs === null || m.observedLatencyMs <= deadline;
          return (m.hasSecurity || m.hasOnchain || m.hasState) && meetsScore && meetsDeadline;
        });

        const securityMiners = qualifiedMiners.filter((m) => m.hasSecurity);
        const onchainMiners = qualifiedMiners.filter((m) => m.hasOnchain);
        const hasMultiIntentCoverage = securityMiners.length > 0 && (onchainMiners.length > 0 || qualifiedMiners.length >= 2);

        let projectedVerdict: 'ALLOW' | 'WAIT' | 'BLOCK' = 'WAIT';
        let routingStatus = 'INSUFFICIENT_CONSENSUS';

        if (qualifiedMiners.length < 2) {
          projectedVerdict = 'WAIT';
          routingStatus = 'DEADLINE_OR_CONFIDENCE_STARVATION';
        } else if (!hasMultiIntentCoverage) {
          projectedVerdict = 'WAIT';
          routingStatus = 'LACK_MULTI_INTENT_COVERAGE';
        } else {
          projectedVerdict = 'ALLOW';
          routingStatus = 'LIVE_CATALOG_CONSENSUS_AVAILABLE';
        }

        sweepGrid.push({
          confidenceThreshold: conf,
          deadlineMs: deadline,
          qualifiedMinersCount: qualifiedMiners.length,
          securityMinersCount: securityMiners.length,
          multiIntentCoverage: hasMultiIntentCoverage,
          projectedVerdict,
          routingStatus,
          projectionNote:
            'Projected from the live catalog and observed receipt latencies. This cell does not dispatch paid asks.',
          topQualifiedMiners: qualifiedMiners.slice(0, 3).map((m) => ({
            id: m.id,
            name: m.name,
            intent: m.primaryIntent,
          })),
        });
      }
    }

    const optimalCell =
      sweepGrid.find(
        (c) => c.projectedVerdict === 'ALLOW' && c.confidenceThreshold >= config.gateMinConfidence
      ) || sweepGrid[0];

    return NextResponse.json({
      success: true,
      liveProjection: true,
      totalActiveMiners: activeMiners.length,
      currentConfigThreshold: config.gateMinConfidence,
      grid: sweepGrid,
      optimalEnvelope: {
        recommendedConfidence: optimalCell.confidenceThreshold,
        recommendedDeadlineMs: optimalCell.deadlineMs,
        expectedQualifiedMiners: optimalCell.qualifiedMinersCount,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
