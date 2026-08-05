import { ForecastDomainService } from "@/lib/forecast/forecast-domain-service";

const domainService = ForecastDomainService.createDefault();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { storeId, productId, variantId } = body;

    if (!storeId || !productId) {
      return Response.json({ error: "storeId and productId are required" }, { status: 400 });
    }

    const refreshedVector = await domainService.refreshFeatures({ storeId, productId, variantId });
    return Response.json({ success: true, featureVector: refreshedVector, regeneratedAt: new Date().toISOString() });
  } catch (err: any) {
    return Response.json({ error: err.message || "Failed to regenerate features" }, { status: 500 });
  }
}
