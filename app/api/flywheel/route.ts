import { NextResponse } from 'next/server';
import { getFlywheelStats } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const stats = getFlywheelStats();
    return NextResponse.json({ success: true, stats });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error:
        'Batch demand dispatch is disabled. Telegraph Track 3 forbids artificial request inflation. Use the risk firewall or watchlist for real user/agent asks.',
    },
    { status: 410 }
  );
}
