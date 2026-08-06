import { NextRequest, NextResponse } from 'next/server';
import { RecommendationRepository, RuleDSLEngine } from '@/lib/forecast/recommendations';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const storeId = searchParams.get('storeId') || 'demo-store-001';

    const repo = new RecommendationRepository();
    const rules = await repo.getRules(storeId);

    if (rules.length === 0) {
      const dslEngine = new RuleDSLEngine();
      const defaults = dslEngine.createDefaultRules(storeId);
      for (const d of defaults) {
        await repo.saveRule(d);
      }
      return NextResponse.json({ success: true, rules: defaults });
    }

    return NextResponse.json({ success: true, rules });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const repo = new RecommendationRepository();

    const newRule = {
      id: `DSL-RULE-${Date.now()}`,
      storeId: body.storeId || 'demo-store-001',
      ruleName: body.ruleName || 'Custom Business Rule',
      category: body.category || 'INVENTORY',
      whenClause: body.whenClause || 'forecast > stock',
      thenAction: body.thenAction || 'ORDER_MORE',
      priority: body.priority || 'MEDIUM',
      enabled: body.enabled ?? true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const saved = await repo.saveRule(newRule as any);
    return NextResponse.json({ success: true, rule: saved });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
