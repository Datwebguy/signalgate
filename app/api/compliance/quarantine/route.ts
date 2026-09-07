import { NextResponse } from 'next/server';
import { getQuarantinedWallets, releaseQuarantinedWallet } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const quarantined = getQuarantinedWallets();
    return NextResponse.json({ success: true, quarantined });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { address } = body;
    if (!address) {
      return NextResponse.json({ success: false, error: 'Address is required' }, { status: 400 });
    }
    const released = releaseQuarantinedWallet(address);
    return NextResponse.json({ success: true, released });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
