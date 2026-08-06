import { NextRequest, NextResponse } from 'next/server';
import { RecommendationEngine } from '@/lib/forecast/recommendations';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const storeId = body.storeId || 'demo-store-001';

    const engine = new RecommendationEngine();
    const graph = await engine.generateStoreRecommendations(storeId);

    return NextResponse.json({
      success: true,
      message: `Generated ${graph.nodes.length} recommendations and decision graph for store ${storeId}`,
      graph,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
