import { NextResponse } from 'next/server';
import { pollWatchlistOnce } from '@/lib/worker/poller';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

function unauthorized() {
  return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const auth = request.headers.get('authorization');
  const isVercelCron = request.headers.get('x-vercel-cron') === '1';

  if (cronSecret) {
    if (auth !== `Bearer ${cronSecret}`) return unauthorized();
  } else if (!isVercelCron) {
    return unauthorized();
  }

  try {
    const summary = await pollWatchlistOnce();
    return NextResponse.json({ success: true, source: 'cron', ...summary });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Watchlist poll failed' },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const summary = await pollWatchlistOnce();
    return NextResponse.json({ success: true, source: 'manual', ...summary });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Watchlist poll failed' },
      { status: 500 }
    );
  }
}
