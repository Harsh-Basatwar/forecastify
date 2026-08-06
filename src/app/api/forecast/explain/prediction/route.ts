import { NextResponse } from 'next/server';
import { explanationEngine } from '@/lib/forecast/explainability/explanation-engine';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const predictionId = searchParams.get('predictionId') || 'pred_101';
    const storeId = searchParams.get('storeId') || undefined;

    const explanation = await explanationEngine.generatePredictionExplanation({
      predictionId,
      storeId,
    });

    return NextResponse.json({
      success: true,
      predictionId: explanation.predictionId,
      headline: explanation.headline,
      summary: explanation.summary,
      confidence: explanation.confidenceBreakdown,
      attributions: explanation.featureAttributions,
      explanation,
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
