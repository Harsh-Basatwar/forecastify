import { NextResponse } from 'next/server';
import { explanationEngine } from '@/lib/forecast/explainability/explanation-engine';
import { ExplanationAudience, AttributionStrategyType } from '@/lib/forecast/explainability/explanation-types';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const predictionId = searchParams.get('predictionId') || undefined;
    const recommendationId = searchParams.get('recommendationId') || undefined;
    const storeId = searchParams.get('storeId') || undefined;
    const audienceParam = (searchParams.get('audience')?.toUpperCase() as ExplanationAudience) || ExplanationAudience.ANALYST;
    const strategyParam = (searchParams.get('strategy')?.toUpperCase() as AttributionStrategyType) || AttributionStrategyType.COEFFICIENT;

    const explanation = await explanationEngine.generatePredictionExplanation({
      predictionId,
      recommendationId,
      storeId,
      audience: audienceParam,
      attributionStrategy: strategyParam,
    });

    return NextResponse.json({
      success: true,
      explanation,
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
