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
      return Response.json({ message: "No feature vector found for given store and product" }, { status: 404 });
    }

    return Response.json({ success: true, featureVector: vector });
  } catch (err: any) {
    return Response.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { storeId, productId, variantId, rawInput, normalizationMethod } = body;

    if (!storeId || !productId) {
      return Response.json({ error: "storeId and productId are required" }, { status: 400 });
    }

    const featureVector = await domainService.generateFeatures({
      storeId,
      productId,
      variantId,
      rawInput,
    });

    return Response.json({ success: true, featureVector });
  } catch (err: any) {
    return Response.json({ error: err.message || "Failed to generate features" }, { status: 500 });
  }
}
