import { NextResponse } from 'next/server';
import { featureAttributionEngine } from '@/lib/forecast/explainability/feature-attribution';
import { AttributionStrategyType } from '@/lib/forecast/explainability/explanation-types';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const strategyParam = (searchParams.get('strategy')?.toUpperCase() as AttributionStrategyType) || AttributionStrategyType.COEFFICIENT;

    const featureInput = {
      lagSales7d: parseFloat(searchParams.get('lag7') || '95'),
      promotionActive: searchParams.get('promo') === 'true',
      inventoryLevel: parseFloat(searchParams.get('stock') || '45'),
      supplierLeadTimeDays: parseFloat(searchParams.get('lead') || '3'),
      temperatureCelsius: parseFloat(searchParams.get('temp') || '28'),
    };

    const attributions = featureAttributionEngine.calculateAttribution(featureInput, 120, 100, strategyParam);
    const positive = featureAttributionEngine.getPositiveContributors(attributions);
    const negative = featureAttributionEngine.getNegativeContributors(attributions);
    const topDrivers = featureAttributionEngine.getTopDrivers(attributions, 3);

    return NextResponse.json({
      success: true,
      strategy: strategyParam,
      attributions,
      positive,
      negative,
      topDrivers,
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
