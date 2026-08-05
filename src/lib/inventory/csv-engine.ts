import { CsvDryRunResult } from "./types";

export class CsvEngine {
  /**
   * Parse CSV text content into array of key-value objects
   */
  public static parseCsv(csvContent: string): Array<Record<string, string>> {
    const lines = csvContent
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) return [];

    const headers = lines[0].split(",").map((h) => h.replace(/^["']|["']$/g, "").trim().toLowerCase());
    const results: Array<Record<string, string>> = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => v.replace(/^["']|["']$/g, "").trim());
      const row: Record<string, string> = {};
      headers.forEach((h, index) => {
        row[h] = values[index] || "";
      });
      results.push(row);
    }

    return results;
  }

  /**
   * Dry-run validation of parsed CSV rows before commit
   */
  public static dryRunValidate(rows: Array<Record<string, string>>): CsvDryRunResult {
    let validCount = 0;
    let invalidCount = 0;
    let warningCount = 0;

    const seenBarcodes = new Set<string>();

    const previews: CsvDryRunResult["previews"] = rows.map((row, idx) => {
      const warnings: string[] = [];
      const errors: string[] = [];

      const productName = row["product_name"] || row["name"] || row["product"] || "";
      const stockStr = row["stock"] || row["current_stock"] || row["quantity"] || "0";
      const priceStr = row["price"] || row["selling_price"] || row["mrp"] || "0";
      const barcode = row["barcode"] || row["upc"] || row["ean"] || "";
      const category = row["category"] || "General";

      const stock = parseFloat(stockStr);
      const price = parseFloat(priceStr);

      if (!productName) {
        errors.push("Missing required Product Name.");
      }

      if (isNaN(price) || price < 0) {
        errors.push("Invalid or negative price value.");
      }

      if (isNaN(stock) || stock < 0) {
        errors.push("Invalid or negative stock quantity.");
      }

      if (barcode) {
        if (seenBarcodes.has(barcode)) {
          warnings.push(`Duplicate barcode detected in file: ${barcode}`);
        } else {
          seenBarcodes.add(barcode);
        }
      } else {
        warnings.push("No barcode specified. A system barcode will be auto-generated.");
      }

      if (errors.length > 0) {
        invalidCount++;
      } else if (warnings.length > 0) {
        validCount++;
        warningCount++;
      } else {
        validCount++;
      }

      return {
        row_index: idx + 1,
        action: errors.length > 0 ? "SKIP" : "CREATE",
        product_name: productName || "Unnamed Item",
        barcode,
        category,
        stock: isNaN(stock) ? 0 : stock,
        price: isNaN(price) ? 0 : price,
        warnings,
        errors,
      };
    });

    return {
      valid_rows_count: validCount,
      invalid_rows_count: invalidCount,
      warning_rows_count: warningCount,
      previews,
    };
  }

  /**
   * Generates formatted CSV string for download
   */
  public static exportToCsv(data: Array<Record<string, unknown>>): string {
    if (!data || data.length === 0) return "";
    const headers = Object.keys(data[0]);
    const headerLine = headers.join(",");
    const bodyLines = data.map((row) =>
      headers
        .map((h) => {
          const val = row[h];
          if (val === null || val === undefined) return '""';
          const str = String(val).replace(/"/g, '""');
          return `"${str}"`;
        })
        .join(",")
    );

    return [headerLine, ...bodyLines].join("\n");
  }
}
