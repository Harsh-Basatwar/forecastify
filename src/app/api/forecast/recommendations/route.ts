import { NextRequest, NextResponse } from 'next/server';
import { RecommendationEngine } from '@/lib/forecast/recommendations';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const storeId = searchParams.get('storeId') || 'demo-store-001';
    const category = searchParams.get('category') || undefined;
    const priority = searchParams.get('priority') || undefined;
    const status = searchParams.get('status') || undefined;

    const engine = new RecommendationEngine();
    let graph = await engine.generateStoreRecommendations(storeId);

    let recommendations = graph.nodes;
    if (category) recommendations = recommendations.filter(r => r.category === category);
    if (priority) recommendations = recommendations.filter(r => r.priority === priority);
    if (status) recommendations = recommendations.filter(r => r.status === status);

    return NextResponse.json({
      success: true,
      storeId,
      totalCount: recommendations.length,
      recommendations,
      graph: {
        nodes: recommendations,
        edges: graph.edges,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
