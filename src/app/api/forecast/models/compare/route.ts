import { NextResponse } from 'next/server';
import { ForecastDomainService } from '@/lib/forecast';

/**
 * POST /api/forecast/models/compare
 * Compare evaluation reports across models and select the best strategy winner
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { reports, strategy } = body;

    if (!Array.isArray(reports) || reports.length === 0) {
      return NextResponse.json({ error: 'Missing required reports array' }, { status: 400 });
    }

    const domainService = ForecastDomainService.createDefault();
    const manager = domainService.getModelManager();
    const comparison = manager.compareModels(reports, strategy || 'LowestMAPE');

    return NextResponse.json({
      success: true,
      comparison,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
