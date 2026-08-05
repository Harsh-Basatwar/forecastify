import { NextResponse } from "next/server";
import { InventoryDomainService } from "@/lib/inventory/inventory-domain-service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, storeId, productId, variantId, quantity, referenceId, userId } = body;

    if (!action || !storeId || !productId || !quantity) {
      return NextResponse.json({ error: "Missing required fields: action, storeId, productId, quantity" }, { status: 400 });
    }

    const domainService = new InventoryDomainService();
    let result;

    if (action === "reserve") {
      result = await domainService.reserveStock({
        storeId,
        productId,
        variantId,
        quantity: parseFloat(quantity),
        referenceId,
        userId,
      });
    } else if (action === "deduct") {
      result = await domainService.deductReservedStock({
        storeId,
        productId,
        variantId,
        quantity: parseFloat(quantity),
        referenceId,
        userId,
      });
    } else if (action === "release") {
      result = await domainService.releaseReservedStock({
        storeId,
        productId,
        variantId,
        quantity: parseFloat(quantity),
        referenceId,
        userId,
      });
    } else {
      return NextResponse.json({ error: "Invalid action. Must be reserve, deduct, or release" }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
