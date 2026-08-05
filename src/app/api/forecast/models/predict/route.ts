import { NextResponse } from 'next/server';
import { ForecastDomainService, InferenceContext } from '@/lib/forecast';

/**
 * POST /api/forecast/models/predict
 * Serve inference given an InferenceContext
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { storeId, productId, horizon, modelId, batchContexts } = body;

    if (!storeId) {
      return NextResponse.json({ error: 'Missing required storeId' }, { status: 400 });
    }

    const domainService = ForecastDomainService.createDefault();
    const manager = domainService.getModelManager();

    if (Array.isArray(batchContexts) && batchContexts.length > 0) {
      const results = await manager.predictBatch(batchContexts, modelId);
      return NextResponse.json({
        success: true,
        storeId,
        results,
        count: results.length,
      });
    }

    const context: InferenceContext = {
      storeId,
      productId: productId || 'prod-default',
      horizon: horizon || '7d',
      predictionType: 'point',
      timestamp: new Date().toISOString(),
    };

    const predictionResult = await manager.predict(context, modelId);

    return NextResponse.json({
      success: true,
      storeId,
      result: predictionResult,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
