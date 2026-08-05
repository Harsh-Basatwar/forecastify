import { NextResponse } from 'next/server';
import { ForecastDomainService, ModelLifecycleStatus } from '@/lib/forecast';

/**
 * GET /api/forecast/models/registry?status=...
 * Query models in registry filtered by 8 lifecycle states
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') as ModelLifecycleStatus | null;

    const domainService = ForecastDomainService.createDefault();
    const manager = domainService.getModelManager();

    const models = manager.listAvailableModels(status || undefined);

    return NextResponse.json({
      success: true,
      models,
      count: models.length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
