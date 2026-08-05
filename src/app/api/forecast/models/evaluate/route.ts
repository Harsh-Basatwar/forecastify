import { NextResponse } from 'next/server';
import { ForecastDomainService, ModelLoader } from '@/lib/forecast';

/**
 * POST /api/forecast/models/evaluate
 * Evaluate model performance against test data
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { storeId, modelId, modelType, evaluationData, config } = body;

    if (!storeId || (!modelId && !modelType)) {
      return NextResponse.json({ error: 'Missing required parameters: storeId, modelId or modelType' }, { status: 400 });
    }

    const domainService = ForecastDomainService.createDefault();
    const manager = domainService.getModelManager();

    let model = modelId ? manager.getModel(modelId) : null;
    if (!model && modelType) {
      model = ModelLoader.createInstance(modelType, modelId || `${modelType}-eval-${Date.now()}`);
      manager.registerModel(model, 'TRAINED');
    }

    if (!model) {
      return NextResponse.json({ error: 'Model instance could not be resolved' }, { status: 400 });
    }

    const defaultData = evaluationData || {
      actuals: [100, 110, 120, 130, 140],
      predictions: [98, 112, 118, 132, 138],
    };

    const report = await manager.evaluateModel(model, defaultData, config);

    return NextResponse.json({
      success: true,
      storeId,
      report,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
