import { NextResponse } from 'next/server';
import { ForecastDomainService } from '@/lib/forecast';

/**
 * POST /api/forecast/models/deploy
 * Validate and promote candidate model to DEPLOYED state
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { storeId, modelId, notes } = body;

    if (!storeId || !modelId) {
      return NextResponse.json({ error: 'Missing required parameters: storeId, modelId' }, { status: 400 });
    }

    const domainService = ForecastDomainService.createDefault();
    const manager = domainService.getModelManager();

    const deploymentResult = await manager.deployModel(storeId, modelId, notes);

    return NextResponse.json({
      success: deploymentResult.status === 'SUCCESS',
      deploymentResult,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
