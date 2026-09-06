import { NextResponse } from 'next/server';
import { executeGateRun } from '@/lib/gate/runner';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { address, action } = body;

    if (!address || typeof address !== 'string' || !address.trim()) {
      return NextResponse.json(
        { success: false, error: 'Address is required to run gate check.' },
        { status: 400 }
      );
    }

    const actionText = typeof action === 'string' && action.trim() ? action.trim() : 'Standard transaction proposal';

    const result = await executeGateRun(address.trim(), actionText);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Gate execution failed',
      },
      { status: 500 }
    );
  }
}
