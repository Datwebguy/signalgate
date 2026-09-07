import { NextResponse } from 'next/server';
import { getRecentGateRuns } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const runs = getRecentGateRuns(30);
    return NextResponse.json({
      success: true,
      data: runs,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Failed to fetch gate run history',
      },
      { status: 500 }
    );
  }
}
