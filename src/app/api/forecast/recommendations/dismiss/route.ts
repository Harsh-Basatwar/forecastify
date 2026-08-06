import { NextRequest, NextResponse } from 'next/server';
import { RecommendationRepository, RecommendationStatus } from '@/lib/forecast/recommendations';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const recommendationId = body.recommendationId;

    if (!recommendationId) {
      return NextResponse.json({ success: false, error: 'Missing recommendationId' }, { status: 400 });
    }

    const repo = new RecommendationRepository();
    const updated = await repo.updateStatus(recommendationId, RecommendationStatus.CANCELLED);

    return NextResponse.json({
      success: true,
      recommendation: updated,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
