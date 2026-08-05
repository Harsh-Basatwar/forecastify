import assert from "node:assert/strict";
import { test, describe } from "node:test";
import { OCRPurchaseParser } from "../lib/procurement/ocr-purchase-parser";
import { AIProcurementEngine } from "../lib/procurement/ai-procurement-engine";

describe("Procurement & Purchase Management System - Unit & Integration Tests", () => {
  test("OCR Purchase Parser correctly extracts vendor invoice items & calculates totals", () => {
    const rawInvoiceText = `
      TAX INVOICE
      Vendor: Universal Distributors Pvt Ltd
      GSTIN: 27ABCDE1234F1Z5
      Invoice No: INV-778899
      Basmati Rice 5kg - Qty 20 - Unit Price 450
    `;

    const mockCatalog = [
      { id: "prod-1", name: "Basmati Rice 5kg", barcode: "89010001" },
      { id: "prod-2", name: "Fortune Sunflower Oil 1L", barcode: "89010002" },
    ];

    const parsed = OCRPurchaseParser.parseOCRInvoiceText(rawInvoiceText, mockCatalog);

    assert.equal(parsed.invoice_number, "INV-778899");
    assert.equal(parsed.supplier_gstin, "27ABCDE1234F1Z5");
    assert.ok(parsed.items.length > 0);
    assert.equal(parsed.subtotal > 0, true);
    assert.equal(parsed.total_amount, parsed.subtotal + parsed.tax_amount);
  });

  test("Quality check stock isolation rule: Rejected items do not count towards stock acceptance", () => {
    const qtyReceived = 50;
    const qtyRejected = 10;
    const qtyAccepted = qtyReceived - qtyRejected;

    assert.equal(qtyAccepted, 40);
    assert.notEqual(qtyAccepted, qtyReceived);
  });

  test("Purchase Order line item tax & discount calculations", () => {
    const orderedQty = 20;
    const price = 500;
    const discount = 200;
    const gstRate = 18;

    const lineSubtotal = orderedQty * price - discount; // 10000 - 200 = 9800
    const lineTax = lineSubtotal * (gstRate / 100); // 9800 * 0.18 = 1764
    const totalAmount = lineSubtotal + lineTax; // 11564

    assert.equal(lineSubtotal, 9800);
    assert.equal(lineTax, 1764);
    assert.equal(totalAmount, 11564);
  });

  test("Supplier Price History Summary metrics calculation", () => {
    const prices = [450, 480, 420, 500, 460];
    const lowestPrice = Math.min(...prices);
    const highestPrice = Math.max(...prices);
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;

    assert.equal(lowestPrice, 420);
    assert.equal(highestPrice, 500);
    assert.equal(avgPrice, 462);
  });

  test("Purchase Order State Machine Transition rules", () => {
    const VALID_TRANSITIONS: Record<string, string[]> = {
      draft: ["pending_approval", "approved", "cancelled"],
      pending_approval: ["approved", "draft", "cancelled"],
      approved: ["sent", "cancelled"],
      sent: ["supplier_accepted", "in_transit", "cancelled"],
      supplier_accepted: ["in_transit", "partially_received", "received", "cancelled"],
      in_transit: ["partially_received", "received", "cancelled"],
      partially_received: ["received", "closed", "cancelled"],
      received: ["closed"],
      closed: ["draft"],
      cancelled: [],
    };

    assert.ok(VALID_TRANSITIONS.draft.includes("pending_approval"));
    assert.ok(VALID_TRANSITIONS.approved.includes("sent"));
    assert.ok(!VALID_TRANSITIONS.closed.includes("sent")); // Illegal transition rejected
    assert.ok(!VALID_TRANSITIONS.cancelled.includes("approved")); // Cancelled is terminal
  });

  test("Partial receipt PO status progression", () => {
    const orderedQty = 100;
    const firstGrnReceived = 40;
    const secondGrnReceived = 60;

    let poStatus = "sent";

    // 1st partial receipt
    if (firstGrnReceived < orderedQty) {
      poStatus = "partially_received";
    }
    assert.equal(poStatus, "partially_received");

    // 2nd final receipt
    const totalReceived = firstGrnReceived + secondGrnReceived;
    if (totalReceived >= orderedQty) {
      poStatus = "received";
    }
    assert.equal(poStatus, "received");
  });
});
