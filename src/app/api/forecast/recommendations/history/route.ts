import { NextRequest, NextResponse } from 'next/server';
import { RecommendationEngine } from '@/lib/forecast/recommendations';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const storeId = searchParams.get('storeId') || 'demo-store-001';

    const engine = new RecommendationEngine();
    const eventStore = engine.getEventStore();
    const events = eventStore.getEventsForStore(storeId);

    // Mock initial event history if empty
    if (events.length === 0) {
      eventStore.appendEvent(storeId, 'REC-DEMO-1', 'RecommendationCreated', { type: 'ORDER_MORE', priority: 'HIGH' });
      eventStore.appendEvent(storeId, 'REC-DEMO-1', 'RecommendationAccepted', { user: 'Manager' });
      eventStore.appendEvent(storeId, 'REC-DEMO-1', 'RecommendationExecuted', { downstreamRef: 'PO-10023' });
    }

    return NextResponse.json({
      success: true,
      events: eventStore.getEventsForStore(storeId),
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
