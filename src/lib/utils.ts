import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Escape a value for interpolation into an HTML string.
 *
 * The print/PDF report builders assemble markup with template literals and
 * hand it to `document.write`. Product names, AI narrative text and API
 * fields all flow through there, so anything containing `<` or `"` could
 * otherwise inject markup into the report window.
 */
export function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
