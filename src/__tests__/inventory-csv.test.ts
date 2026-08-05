import assert from "node:assert/strict";
import { test, describe } from "node:test";
import { CsvEngine } from "../lib/inventory/csv-engine";

describe("CSV Engine - Unit Tests", () => {
  test("should parse CSV string into key-value objects", () => {
    const csv = `product_name,stock,price,barcode\nAashirvaad Atta 5kg,50,320,8901000111222\nFortune Oil 1L,30,160,8901000333444`;
    const parsed = CsvEngine.parseCsv(csv);

    assert.equal(parsed.length, 2);
    assert.equal(parsed[0].product_name, "Aashirvaad Atta 5kg");
    assert.equal(parsed[0].stock, "50");
    assert.equal(parsed[1].price, "160");
  });

  test("should dry-run validate valid rows and flag missing fields or duplicate barcodes", () => {
    const rows = [
      { product_name: "Atta 5kg", stock: "10", price: "300", barcode: "8900000000001" },
      { product_name: "Oil 1L", stock: "-5", price: "150", barcode: "8900000000002" }, // Error: negative stock
      { product_name: "Rice 1kg", stock: "20", price: "80", barcode: "8900000000001" }, // Warning: duplicate barcode
    ];

    const result = CsvEngine.dryRunValidate(rows);

    assert.equal(result.valid_rows_count, 2);
    assert.equal(result.invalid_rows_count, 1);
    assert.equal(result.warning_rows_count, 1);
    assert.equal(result.previews[1].action, "SKIP");
    assert.equal(result.previews[2].warnings[0].includes("Duplicate barcode"), true);
  });

  test("should export array of objects to CSV string", () => {
    const data = [
      { name: "Product A", price: 100 },
      { name: "Product B", price: 200 },
    ];
    const csv = CsvEngine.exportToCsv(data);

    assert.equal(csv.includes("name,price"), true);
    assert.equal(csv.includes('"Product A","100"'), true);
  });
});
