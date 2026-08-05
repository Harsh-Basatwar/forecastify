import { ForecastDomainService } from "@/lib/forecast/forecast-domain-service";

const domainService = ForecastDomainService.createDefault();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get("storeId");
    const productId = searchParams.get("productId") || undefined;
    const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : 50;

    if (!storeId) {
      return Response.json({ error: "storeId is required" }, { status: 400 });
    }

    const history = await domainService.getHistoricalFeatures({ storeId, productId, limit });
    return Response.json({ success: true, count: history.length, featureVectors: history });
  } catch (err: any) {
    return Response.json({ error: err.message || "Failed to fetch historical feature vectors" }, { status: 500 });
  }
}
