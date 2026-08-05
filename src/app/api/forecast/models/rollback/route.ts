import { NextResponse } from 'next/server';
import { ForecastDomainService } from '@/lib/forecast';

/**
 * POST /api/forecast/models/rollback
 * Atomic rollback to previously DEPLOYED model for a store
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { storeId } = body;

    if (!storeId) {
      return NextResponse.json({ error: 'Missing required storeId parameter' }, { status: 400 });
    }

    const domainService = ForecastDomainService.createDefault();
    const manager = domainService.getModelManager();

    const rollbackResult = await manager.rollbackModel(storeId);

    return NextResponse.json({
      success: rollbackResult.status === 'SUCCESS',
      rollbackResult,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
