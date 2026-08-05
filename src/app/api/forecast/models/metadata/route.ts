import { NextResponse } from 'next/server';
import { ForecastDomainService } from '@/lib/forecast';

/**
 * GET /api/forecast/models/metadata?modelId=...
 * Fetch model metadata, resource requirements, capabilities, and health status
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const modelId = searchParams.get('modelId');

    if (!modelId) {
      return NextResponse.json({ error: 'Missing required query parameter modelId' }, { status: 400 });
    }

    const domainService = ForecastDomainService.createDefault();
    const manager = domainService.getModelManager();

    const model = manager.getModel(modelId);
    if (!model) {
      return NextResponse.json({ error: `Model ${modelId} not found` }, { status: 404 });
    }

    const metadata = model.getMetadata();
    const capabilities = model.getCapabilities();
    const health = manager.getModelHealth(modelId);

    return NextResponse.json({
      success: true,
      modelId,
      metadata,
      capabilities,
      health,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
