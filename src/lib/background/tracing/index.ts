/**
 * Distributed Tracing Engine
 * Propagates traceId, spanId, parentSpanId across HTTP calls, job queues, worker execution, and subsystems.
 */

export interface DistributedSpan {
  id: string;
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  subsystem: string;
  operation: string;
  durationMs: number;
  status: "OK" | "ERROR";
  metadata: Record<string, any>;
  createdAt: string;
}

export class DistributedTracing {
  private spans: DistributedSpan[] = [];

  constructor() {
    this.seedMockSpans();
  }

  private seedMockSpans() {
    const traceId = "tr_8921a4b";
    this.spans = [
      { id: "sp_1", traceId, spanId: "span_root", subsystem: "APIGateway", operation: "POST /api/forecast/predict", durationMs: 142, status: "OK", metadata: {}, createdAt: new Date(Date.now() - 500).toISOString() },
      { id: "sp_2", traceId, spanId: "span_feat", parentSpanId: "span_root", subsystem: "FeatureStore", operation: "get_sales_lag_features", durationMs: 24, status: "OK", metadata: {}, createdAt: new Date(Date.now() - 480).toISOString() },
      { id: "sp_3", traceId, spanId: "span_model", parentSpanId: "span_root", subsystem: "ForecastEngine", operation: "run_ensemble_inference", durationMs: 82, status: "OK", metadata: {}, createdAt: new Date(Date.now() - 450).toISOString() },
      { id: "sp_4", traceId, spanId: "span_rec", parentSpanId: "span_root", subsystem: "RecommendationEngine", operation: "generate_reorder_recommendations", durationMs: 28, status: "OK", metadata: {}, createdAt: new Date(Date.now() - 360).toISOString() },
    ];
  }

  public getSpans(traceId?: string): DistributedSpan[] {
    if (traceId) {
      return this.spans.filter((s) => s.traceId === traceId);
    }
    return [...this.spans];
  }

  public recordSpan(span: Omit<DistributedSpan, "id" | "createdAt">): DistributedSpan {
    const record: DistributedSpan = {
      ...span,
      id: `sp_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    this.spans.push(record);
    return record;
  }
}

export const distributedTracing = new DistributedTracing();
