import { NextResponse } from 'next/server';
import { explanationAnalyticsService } from '@/lib/forecast/explainability/explanation-analytics';
import { explanationRepository } from '@/lib/forecast/explainability/explanation-repository';

export async function GET() {
  try {
    const explanations = explanationRepository.getAll();
    const analytics = explanationAnalyticsService.computeAnalytics(explanations);

    return NextResponse.json({
      success: true,
      analytics,
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
