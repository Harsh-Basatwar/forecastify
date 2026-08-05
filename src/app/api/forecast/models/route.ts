import { NextResponse } from 'next/server';
import { ForecastDomainService, ModelLoader } from '@/lib/forecast';

/**
 * GET /api/forecast/models?storeId=...
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const storeId = searchParams.get('storeId');

    if (!storeId) {
      return NextResponse.json({ error: 'Missing required storeId query parameter' }, { status: 400 });
    }

    const domainService = ForecastDomainService.createDefault();
    const manager = domainService.getModelManager();
    const models = manager.listAvailableModels();

    return NextResponse.json({
      success: true,
      storeId,
      models,
      count: models.length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/forecast/models
 * Register a model
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { storeId, name, modelType, id } = body;

    if (!storeId || !name || !modelType) {
      return NextResponse.json({ error: 'Missing required fields: storeId, name, modelType' }, { status: 400 });
    }

    const domainService = ForecastDomainService.createDefault();
    const manager = domainService.getModelManager();

    const modelInstance = ModelLoader.createInstance(modelType, id || `model-${Date.now()}`);
    const metadata = manager.registerModel(modelInstance, 'DRAFT');

    return NextResponse.json({
      success: true,
      storeId,
      model: metadata,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
