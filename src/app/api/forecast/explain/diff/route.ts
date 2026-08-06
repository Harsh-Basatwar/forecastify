import { NextResponse } from 'next/server';
import { explanationEngine } from '@/lib/forecast/explainability/explanation-engine';
import { explanationDiffEngine } from '@/lib/forecast/explainability/explanation-diff';

export async function GET(request: Request) {
  try {
    const v1 = await explanationEngine.generatePredictionExplanation({ predictionId: 'pred_101', predictionValue: 120 });
    const v2 = await explanationEngine.generatePredictionExplanation({ predictionId: 'pred_101', predictionValue: 135 });
    v2.metadata.version = 2;

    const diff = explanationDiffEngine.computeDiff(v1, v2);

    return NextResponse.json({
      success: true,
      diff,
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
