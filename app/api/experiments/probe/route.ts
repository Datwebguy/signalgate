import { NextResponse } from 'next/server';
import { executeGateRun } from '@/lib/gate/runner';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const address = typeof body.address === 'string' ? body.address.trim() : '';
    const action =
      typeof body.action === 'string' && body.action.trim()
        ? body.action.trim()
        : 'Routing envelope probe';
    const minConfidence = typeof body.minConfidence === 'number' ? body.minConfidence : 0.6;
    const deadlineMs = typeof body.deadlineMs === 'number' ? body.deadlineMs : 5000;

    if (!address) {
      return NextResponse.json(
        { success: false, error: 'address is required for a live Engine probe' },
        { status: 400 }
      );
    }

    const result = await executeGateRun(address, {
      userActionText: action,
      minConfidence,
      deadlineMs,
    });

    return NextResponse.json({
      success: true,
      live: true,
      envelope: { minConfidence, deadlineMs },
      routedMiners: result.receipts.map((r) => ({
        minerId: r.minerId,
        minerName: r.minerName,
        intent: r.intent,
        status: r.status,
        paid: r.paid,
        latencyMs: r.latencyMs,
        explorerUrl: r.explorerMinerUrl,
      })),
      data: result,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
