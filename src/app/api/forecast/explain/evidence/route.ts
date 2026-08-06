import { NextResponse } from 'next/server';
import { evidenceBuilder } from '@/lib/forecast/explainability/evidence-builder';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const predictionId = searchParams.get('predictionId') || 'pred_101';
    const recommendationId = searchParams.get('recommendationId') || 'rec_101';
    const productId = searchParams.get('productId') || 'prod_101';

    const { evidenceList, evidenceConfidenceMap } = evidenceBuilder.buildEvidenceList({
      predictionId,
      recommendationId,
      productId,
      predictionValue: 120,
    });

    return NextResponse.json({
      success: true,
      evidenceList,
      evidenceConfidenceMap,
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
