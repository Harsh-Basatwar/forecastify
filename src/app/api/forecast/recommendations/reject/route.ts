import { NextRequest, NextResponse } from 'next/server';
import { RecommendationFeedbackLoop, RecommendationRepository, RecommendationStatus } from '@/lib/forecast/recommendations';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const recommendationId = body.recommendationId;
    const reason = body.reason || 'User rejected action';
    const storeId = body.storeId || 'demo-store-001';

    if (!recommendationId) {
      return NextResponse.json({ success: false, error: 'Missing recommendationId' }, { status: 400 });
    }

    const repo = new RecommendationRepository();
    const updated = await repo.updateStatus(recommendationId, RecommendationStatus.REJECTED, reason);

    const feedbackLoop = new RecommendationFeedbackLoop();
    feedbackLoop.logFeedback({
      storeId,
      recommendationId,
      action: 'REJECTED',
      reason,
    });

    return NextResponse.json({
      success: true,
      recommendation: updated,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
