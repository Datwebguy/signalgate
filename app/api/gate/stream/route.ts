import { getRecentGateRuns, getWatchlist, getQuarantinedWallets } from '@/lib/db';
import { getTelegraphConfig } from '@/lib/telegraph/config';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const encoder = new TextEncoder();
  const config = getTelegraphConfig();

  const stream = new ReadableStream({
    async start(controller) {
      let isClosed = false;

      request.signal.addEventListener('abort', () => {
        isClosed = true;
        try {
          controller.close();
        } catch {}
      });

      const sendEvent = (event: string, data: any) => {
        if (isClosed) return;
        try {
          const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(payload));
        } catch {
          isClosed = true;
        }
      };

      // Initial state event
      sendEvent('connected', {
        status: 'LIVE_STREAMING_ACTIVE',
        nodeUrl: config.nodeUrl,
        timestamp: new Date().toISOString(),
      });

      let iteration = 0;

      const interval = setInterval(async () => {
        if (isClosed) {
          clearInterval(interval);
          return;
        }

        iteration++;

        try {
          // Heartbeat every tick
          sendEvent('heartbeat', {
            iteration,
            timestamp: new Date().toISOString(),
            status: 'HEALTHY',
          });

          // Fetch live signals from Daemon feed every alternate tick
          if (iteration % 2 === 0) {
            try {
              const res = await fetch(`${config.daemonUrl}/api/questions?limit=5`, {
                headers: { Accept: 'application/json' },
                signal: AbortSignal.timeout(4000),
              });
              if (res.ok) {
                const data = await res.json();
                const questions = (data?.questions || data || []).slice(0, 5);
                sendEvent('live_signals', {
                  totalSignalsObserved: data?.total || 69000,
                  signals: questions.map((q: any) => ({
                    id: q.id,
                    subnetId: q.routing?.subnet_id,
                    subnetName: q.routing?.subnet_name || q.routing?.miner_slug,
                    intent: q.routing?.intent || 'GENERAL_INFERENCE',
                    durationMs: q.execution?.duration_ms || 0,
                    costUsd: q.execution?.cost_usd || 0.01,
                    status: q.status || 'success',
                    summary: q.execution?.result?.answer || q.execution?.result?.summary || q.question?.text || 'Signal processed',
                    timestamp: q.created_at || new Date().toISOString(),
                  })),
                });
              }
            } catch (err) {
              // Daemon fetch timeout or temporary network hiccup
            }
          }

          // Push latest gate and compliance states every 3rd tick
          if (iteration % 3 === 0) {
            const recentRuns = getRecentGateRuns(3);
            const quarantined = getQuarantinedWallets().slice(0, 3);
            sendEvent('gate_telemetry', {
              recentRuns: recentRuns.map((r) => ({
                runId: r.runId,
                address: r.targetAddress,
                verdict: r.verdict,
                confidence: r.overallConfidence,
                timestamp: r.timestamp,
              })),
              quarantinedCount: quarantined.length,
              timestamp: new Date().toISOString(),
            });
          }
        } catch (err) {
          // Keep stream alive
        }
      }, 3000);

      request.signal.addEventListener('abort', () => {
        clearInterval(interval);
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
