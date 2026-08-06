import { NextResponse } from 'next/server';
import { explanationLineageTracker } from '@/lib/forecast/explainability/explanation-lineage';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const explanationId = searchParams.get('explanationId') || 'exp_101';
    const predictionId = searchParams.get('predictionId') || 'pred_101';
    const recommendationId = searchParams.get('recommendationId') || 'rec_101';

    const lineage = explanationLineageTracker.createLineage({
      explanationId,
      predictionId,
      recommendationId,
    });

    const isVerified = explanationLineageTracker.verifyLineage(lineage);

    return NextResponse.json({
      success: true,
      lineage,
      isVerified,
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
