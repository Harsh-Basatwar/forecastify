import { NextResponse } from 'next/server';
import { ForecastDomainService, ModelLoader } from '@/lib/forecast';

/**
 * POST /api/forecast/models/train
 * Trigger training pipeline for a model
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { storeId, modelId, modelType, trainingData, config } = body;

    if (!storeId || (!modelId && !modelType)) {
      return NextResponse.json({ error: 'Missing required parameters: storeId, modelId or modelType' }, { status: 400 });
    }

    const domainService = ForecastDomainService.createDefault();
    const manager = domainService.getModelManager();

    let model = modelId ? manager.getModel(modelId) : null;
    if (!model && modelType) {
      model = ModelLoader.createInstance(modelType, modelId || `${modelType}-trained-${Date.now()}`);
      manager.registerModel(model, 'DRAFT');
    }

    if (!model) {
      return NextResponse.json({ error: 'Model instance could not be resolved for training' }, { status: 400 });
    }

    const defaultData = trainingData || {
      storeId,
      datasetVersion: '1.0.0',
      timeSeries: [
        { date: '2026-08-01', target: 100 },
        { date: '2026-08-02', target: 110 },
        { date: '2026-08-03', target: 120 },
      ],
    };

    const defaultConfig = config || {
      datasetVersion: '1.0.0',
      trainingWindow: '90d',
    };

    const trainingResult = await manager.trainModel(model, defaultData, defaultConfig);

    return NextResponse.json({
      success: true,
      storeId,
      result: trainingResult,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
