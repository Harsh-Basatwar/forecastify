import { NextResponse } from 'next/server';
import { explanationGraphBuilder } from '@/lib/forecast/explainability/explanation-graph';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const explanationId = searchParams.get('explanationId') || 'exp_101';
    const predictionId = searchParams.get('predictionId') || 'pred_101';

    const graph = explanationGraphBuilder.buildExplanationGraph({
      explanationId,
      predictionId,
      predictionValue: 120,
    });

    return NextResponse.json({
      success: true,
      graph,
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
