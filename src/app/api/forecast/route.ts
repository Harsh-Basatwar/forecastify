import { NextResponse } from 'next/server';
import { ForecastDomainService } from '@/lib/forecast';

/**
 * GET /api/forecast?storeId=...&horizon=...
 * Delegates exclusively to ForecastDomainService
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const storeId = searchParams.get('storeId');
    const horizon = searchParams.get('horizon') || undefined;

    if (!storeId) {
      return NextResponse.json({ error: 'Missing required storeId query parameter' }, { status: 400 });
    }

    const domainService = ForecastDomainService.createDefault();
    const result = await domainService.generateForecast({ storeId, horizon });

    return NextResponse.json({
      success: true,
      storeId,
      horizon: horizon || '7d',
      predictions: result.predictions,
      recommendations: result.recommendations,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/forecast
 * Body: { storeId, horizon }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { storeId, horizon } = body;

    if (!storeId) {
      return NextResponse.json({ error: 'Missing required storeId in request body' }, { status: 400 });
    }

    const domainService = ForecastDomainService.createDefault();
    const result = await domainService.generateForecast({ storeId, horizon });

    return NextResponse.json({
      success: true,
      storeId,
      horizon: horizon || '7d',
      predictions: result.predictions,
      recommendations: result.recommendations,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
