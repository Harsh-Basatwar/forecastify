/**
 * GSTIN (Goods and Services Tax Identification Number) validation.
 *
 * A GSTIN is 15 characters: a 2-digit state code, the holder's 10-character
 * PAN, a 1-character entity number, a fixed 'Z', and a checksum character.
 * The checksum makes most typos detectable, which matters because this number
 * is printed on tax invoices — a wrong one is worse than a blank field.
 */

const CHARSET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/** State codes 01–38 are assigned; 97 is "Other Territory", 99 is Centre Jurisdiction. */
const VALID_STATE_CODES = new Set(
  Array.from({ length: 38 }, (_, i) => String(i + 1).padStart(2, "0")).concat("97", "99")
);

const GSTIN_SHAPE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[0-9A-Z]{1}Z[0-9A-Z]{1}$/;

/**
 * The official modulus-36 check: each of the first 14 characters is weighted
 * alternately 1 and 2, and the digit-sum of each product is accumulated.
 */
export function gstinChecksumChar(first14: string): string {
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const value = CHARSET.indexOf(first14[i]);
    if (value < 0) return "";
    const product = value * (i % 2 === 0 ? 1 : 2);
    sum += Math.floor(product / 36) + (product % 36);
  }
  return CHARSET[(36 - (sum % 36)) % 36];
}

export function isValidGstin(raw: string): boolean {
  return validateGstin(raw) === null;
}

/**
 * Returns a human-readable problem, or null when the value is acceptable.
 * An empty value is acceptable — GST registration is optional below the
 * turnover threshold, and most kirana stores are unregistered.
 */
export function validateGstin(raw: string): string | null {
  const gstin = String(raw ?? "").trim().toUpperCase();
  if (!gstin) return null;

  if (gstin.length !== 15) {
    return `GST number must be 15 characters (this one has ${gstin.length}).`;
  }
  if (!GSTIN_SHAPE.test(gstin)) {
    return "GST number format looks wrong. Expected 2 digits, 5 letters, 4 digits, 1 letter, 1 character, 'Z', then 1 character.";
  }
  if (!VALID_STATE_CODES.has(gstin.slice(0, 2))) {
    return `"${gstin.slice(0, 2)}" is not a valid state code. The first two digits identify your state.`;
  }
  if (gstinChecksumChar(gstin.slice(0, 14)) !== gstin[14]) {
    return "GST number failed its checksum — please re-check for a typo.";
  }
  return null;
}
