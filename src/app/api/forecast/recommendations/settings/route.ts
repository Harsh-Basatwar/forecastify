import { NextRequest, NextResponse } from 'next/server';
import { RecommendationRepository } from '@/lib/forecast/recommendations';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const storeId = searchParams.get('storeId') || 'demo-store-001';

    const repo = new RecommendationRepository();
    const settings = await repo.getSettings(storeId);

    return NextResponse.json({ success: true, settings });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const storeId = body.storeId || 'demo-store-001';

    const repo = new RecommendationRepository();
    const existing = await repo.getSettings(storeId);
    const updated = await repo.saveSettings({
      ...(existing || { storeId } as any),
      ...body,
      storeId,
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, settings: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
