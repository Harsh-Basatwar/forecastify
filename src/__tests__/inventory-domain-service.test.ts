import assert from "node:assert/strict";
import { test, describe } from "node:test";
import { BarcodeEngine } from "../lib/inventory/barcode-engine";

describe("Inventory Domain Service & Barcode Engine - Unit Tests", () => {
  test("should generate a valid EAN-13 barcode with correct check digit", () => {
    const ean = BarcodeEngine.generateEAN13("890");
    assert.equal(ean.length, 13);
    assert.equal(ean.startsWith("890"), true);

    const code12 = ean.slice(0, 12);
    const expectedChecksum = BarcodeEngine.calculateEAN13Checksum(code12);
    assert.equal(parseInt(ean[12], 10), expectedChecksum);
  });

  test("should render printable barcode SVG string", () => {
    const svg = BarcodeEngine.renderBarcodeSVG("8901234567890", "EAN-13");
    assert.equal(svg.includes("<svg"), true);
    assert.equal(svg.includes("EAN-13: 8901234567890"), true);
  });
});
