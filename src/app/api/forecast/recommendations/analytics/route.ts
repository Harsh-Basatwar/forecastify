import { NextRequest, NextResponse } from 'next/server';
import { RecommendationAnalyticsEngine, RecommendationEngine } from '@/lib/forecast/recommendations';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const storeId = searchParams.get('storeId') || 'demo-store-001';

    const engine = new RecommendationEngine();
    const graph = await engine.generateStoreRecommendations(storeId);

    const analyticsEngine = new RecommendationAnalyticsEngine();
    const analytics = analyticsEngine.generateAnalytics(graph.nodes);

    return NextResponse.json({
      success: true,
      analytics,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
