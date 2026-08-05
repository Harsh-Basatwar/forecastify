import { NextResponse } from "next/server";
import { InventoryDomainService } from "@/lib/inventory/inventory-domain-service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { storeId, productId, variantId, batchId, locationId, adjustmentType, quantityChange, reason, userId } = body;

    if (!storeId || !productId || !adjustmentType || quantityChange === undefined) {
      return NextResponse.json({ error: "Missing required fields: storeId, productId, adjustmentType, quantityChange" }, { status: 400 });
    }

    const domainService = new InventoryDomainService();
    const result = await domainService.adjustStock({
      storeId,
      productId,
      variantId,
      batchId,
      locationId,
      adjustmentType,
      quantityChange: parseFloat(quantityChange),
      reason: reason || `Manual ${adjustmentType} adjustment`,
      userId,
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
