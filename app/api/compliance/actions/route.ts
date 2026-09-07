import { NextResponse } from 'next/server';
import { getExecutedActions } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const actions = getExecutedActions(50);
    return NextResponse.json({ success: true, actions });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
