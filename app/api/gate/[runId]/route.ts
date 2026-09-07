import { NextResponse } from 'next/server';
import { getGateRunById } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  _request: Request,
  { params }: { params: { runId: string } }
) {
  try {
    const run = getGateRunById(params.runId);
    if (!run) {
      return NextResponse.json({ success: false, error: 'Run not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: run });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to fetch gate run' },
      { status: 500 }
    );
  }
}
