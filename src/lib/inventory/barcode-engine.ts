export type BarcodeSymbology = 'EAN-13' | 'EAN-8' | 'UPC-A' | 'UPC-E' | 'CODE128' | 'QR';

export class BarcodeEngine {
  /**
   * Generates a valid EAN-13 barcode checksum digit
   */
  public static calculateEAN13Checksum(code12: string): number {
    if (code12.length !== 12 || !/^\d+$/.test(code12)) {
      throw new Error("Input for EAN-13 checksum must be exactly 12 numeric digits.");
    }
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      const digit = parseInt(code12[i], 10);
      sum += i % 2 === 0 ? digit : digit * 3;
    }
    const remainder = sum % 10;
    return remainder === 0 ? 0 : 10 - remainder;
  }

  /**
   * Generates a random valid EAN-13 barcode with store prefix
   */
  public static generateEAN13(prefix = "890"): string {
    // 890 is India EAN country code prefix
    const random12 = (prefix + Math.floor(100000000 + Math.random() * 900000000).toString()).slice(0, 12);
    const checksum = this.calculateEAN13Checksum(random12);
    return `${random12}${checksum}`;
  }

  /**
   * Generates an SVG representation for printable barcode labels
   */
  public static renderBarcodeSVG(code: string, symbology: BarcodeSymbology = "EAN-13"): string {
    const cleanCode = code.trim();
    // Render clean SVG bars pattern
    const width = 220;
    const height = 80;
    
    // Generate deterministic bar widths from characters
    let barRects = "";
    let posX = 15;
    const barWidth = 2;

    for (let i = 0; i < cleanCode.length; i++) {
      const charCode = cleanCode.charCodeAt(i);
      const isThick = charCode % 2 === 0;
      const w = isThick ? barWidth * 2 : barWidth;
      
      barRects += `<rect x="${posX}" y="10" width="${w}" height="45" fill="#0f172a" />`;
      posX += w + barWidth;
    }

    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" class="w-full h-auto">
        <rect width="100%" height="100%" fill="#ffffff" rx="4"/>
        <g>${barRects}</g>
        <text x="${width / 2}" y="70" font-family="monospace" font-size="11" font-weight="bold" fill="#0f172a" text-anchor="middle">
          ${symbology}: ${cleanCode}
        </text>
      </svg>
    `;
  }
}
