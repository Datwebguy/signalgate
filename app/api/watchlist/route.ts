import { NextResponse } from 'next/server';
import { getWatchlist, addToWatchlist, removeFromWatchlist } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const list = getWatchlist();
    return NextResponse.json({
      success: true,
      data: list,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to fetch watchlist' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { address, label, action } = body;

    if (!address || typeof address !== 'string' || !address.trim()) {
      return NextResponse.json(
        { success: false, error: 'Address is required for watchlist entry.' },
        { status: 400 }
      );
    }

    const actionText = typeof action === 'string' && action.trim() ? action.trim() : 'Standard transaction proposal';
    const labelText = typeof label === 'string' && label.trim() ? label.trim() : 'Watched Wallet';

    const entry = addToWatchlist(address.trim(), labelText, actionText);

    return NextResponse.json({
      success: true,
      data: entry,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to add to watchlist' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const idParam = searchParams.get('id');

    if (!idParam) {
      return NextResponse.json(
        { success: false, error: 'Watchlist ID required' },
        { status: 400 }
      );
    }

    const id = parseInt(idParam, 10);
    const removed = removeFromWatchlist(id);

    return NextResponse.json({
      success: true,
      removed,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to remove from watchlist' },
      { status: 500 }
    );
  }
}
