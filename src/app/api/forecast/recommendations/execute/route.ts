import { NextRequest, NextResponse } from 'next/server';
import { RecommendationEngine, RecommendationExecutor } from '@/lib/forecast/recommendations';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const recommendationId = body.recommendationId;
    const storeId = body.storeId || 'demo-store-001';

    const engine = new RecommendationEngine();
    const repo = engine.getRepository();
    const eventStore = engine.getEventStore();

    let rec = await repo.getRecommendationById(recommendationId);
    if (!rec) {
      // Build dummy recommendation if not stored yet
      const graph = await engine.generateStoreRecommendations(storeId);
      rec = graph.nodes.find(n => n.id === recommendationId) || graph.nodes[0];
    }

    const executor = new RecommendationExecutor(repo, eventStore);
    const result = await executor.executeRecommendation(rec);

    return NextResponse.json({
      success: result.status === 'SUCCESS',
      result,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
