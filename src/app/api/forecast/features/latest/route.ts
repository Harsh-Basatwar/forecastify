import { ForecastDomainService } from "@/lib/forecast/forecast-domain-service";

const domainService = ForecastDomainService.createDefault();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get("storeId");
    const productId = searchParams.get("productId");
    const variantId = searchParams.get("variantId") || undefined;

    if (!storeId || !productId) {
      return Response.json({ error: "storeId and productId are required" }, { status: 400 });
    }

    const vector = await domainService.getFeatureVector({ storeId, productId, variantId });
    if (!vector) {
      return Response.json({ message: "Latest feature vector not found" }, { status: 404 });
    }

    return Response.json({ success: true, featureVector: vector });
  } catch (err: any) {
    return Response.json({ error: err.message || "Failed to fetch latest features" }, { status: 500 });
  }
}
