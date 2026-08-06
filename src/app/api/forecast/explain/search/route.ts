import { NextResponse } from 'next/server';
import { explanationSearchService } from '@/lib/forecast/explainability/explanation-search';
import { explanationRepository } from '@/lib/forecast/explainability/explanation-repository';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId') || undefined;
    const queryText = searchParams.get('q') || undefined;
    const minConfidence = searchParams.get('minConfidence') ? parseFloat(searchParams.get('minConfidence')!) : undefined;

    const allExplanations = explanationRepository.getAll();
    const results = explanationSearchService.searchExplanations(allExplanations, {
      storeId,
      queryText,
      minConfidence,
    });

    return NextResponse.json({
      success: true,
      totalResults: results.length,
      results,
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
