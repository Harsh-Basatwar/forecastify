import { NextResponse } from 'next/server';
import { explanationHistoryTracker } from '@/lib/forecast/explainability/explanation-history';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const explanationId = searchParams.get('explanationId') || 'exp_default';

    const history = explanationHistoryTracker.getHistory(explanationId);

    return NextResponse.json({
      success: true,
      explanationId,
      history,
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
