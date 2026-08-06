import { NextResponse } from 'next/server';
import { explanationEngine } from '@/lib/forecast/explainability/explanation-engine';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const recommendationId = searchParams.get('recommendationId') || 'rec_101';
    const storeId = searchParams.get('storeId') || undefined;

    const explanation = await explanationEngine.generateRecommendationExplanation({
      recommendationId,
      storeId,
    });

    return NextResponse.json({
      success: true,
      recommendationId: explanation.recommendationId,
      rationale: explanation.detailedRationale,
      alternatives: explanation.alternatives,
      comparison: explanation.recommendationComparison,
      explanation,
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
