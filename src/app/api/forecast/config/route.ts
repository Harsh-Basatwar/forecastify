import { NextResponse } from 'next/server';
import { ForecastDomainService } from '@/lib/forecast';

/**
 * GET /api/forecast/config?storeId=...
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const storeId = searchParams.get('storeId');

    if (!storeId) {
      return NextResponse.json({ error: 'Missing required storeId query parameter' }, { status: 400 });
    }

    const domainService = ForecastDomainService.createDefault();
    const config = await domainService.getConfiguration(storeId);

    return NextResponse.json({
      success: true,
      storeId,
      config: config.toJSON(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PUT /api/forecast/config
 * Update store forecast settings
 */
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { storeId, ...updates } = body;

    if (!storeId) {
      return NextResponse.json({ error: 'Missing required storeId in body' }, { status: 400 });
    }

    const domainService = ForecastDomainService.createDefault();
    const updatedConfig = await domainService.updateConfiguration(storeId, updates);

    return NextResponse.json({
      success: true,
      storeId,
      config: updatedConfig.toJSON(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
