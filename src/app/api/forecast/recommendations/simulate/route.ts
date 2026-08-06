import { NextRequest, NextResponse } from 'next/server';
import { ImpactSimulator } from '@/lib/forecast/recommendations';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const type = body.type || 'ORDER_MORE';
    const input = body.input || {
      storeId: 'demo-store-001',
      productId: 'PROD-001',
      productName: 'Sample Item',
      currentStock: 15,
      safetyStock: 30,
      reorderPoint: 40,
      forecastDemand: 80,
      unitCost: 100,
      unitPrice: 150,
    };
    const impact = body.financialImpact || {
      expectedProfit: 4000,
      expectedSavings: 500,
      expectedRevenue: 12000,
      expectedCost: 8000,
      expectedInventoryReduction: 0,
      blockedCapitalReleased: 0,
    };

    const simulator = new ImpactSimulator();
    const simulation = simulator.simulateImpact(type, input, impact);

    return NextResponse.json({
      success: true,
      simulation,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
