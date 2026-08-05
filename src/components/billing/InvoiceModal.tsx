"use client";

import React, { useRef } from "react";
import { Printer, Download, CheckCircle, Store, X, QrCode } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { formatINR, generateUPIPayload } from "@/lib/billing-utils";
import { SaleTransaction } from "@/lib/types/sales";

interface InvoiceModalProps {
  open: boolean;
  onClose: () => void;
  sale: SaleTransaction | null;
  storeDetails?: {
    store_name?: string;
    store_address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    gstin?: string;
  };
}

export default function InvoiceModal({
  open,
  onClose,
  sale,
  storeDetails,
}: InvoiceModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  if (!sale) return null;

  const storeName = storeDetails?.store_name || "Grovy Grocery Store";
  const storeAddress =
    storeDetails?.store_address || "FC Road, Shivajinagar, Pune, Maharashtra 411005";
  const storeGSTIN = storeDetails?.gstin || "27AAAAA0000A1Z5";

  const handlePrint = () => {
    window.print();
  };

  const createdDate = new Date(sale.created_at || Date.now());
  const formattedDate = createdDate.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const formattedTime = createdDate.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Tax Invoice - ${sale.invoice_number}`}
      description="Thermal print friendly & A4 compliant tax invoice"
    >
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #thermal-printable-receipt,
          #thermal-printable-receipt * {
            visibility: visible;
          }
          #thermal-printable-receipt {
            position: absolute;
            left: 0;
            top: 0;
            width: 80mm;
            padding: 10px;
            font-size: 11px;
            color: #000 !important;
            background: #fff !important;
          }
        }
      `}</style>

      <div className="space-y-4">
        {/* Invoice Body Printable Container */}
        <div
          ref={printRef}
          id="thermal-printable-receipt"
          className="p-4 rounded-xl bg-card border border-border space-y-4 text-xs font-sans text-foreground"
        >
          {/* Header */}
          <div className="text-center pb-3 border-b border-border/80 space-y-1">
            <div className="flex items-center justify-center gap-1.5 font-bold text-sm text-foreground">
              <Store className="w-4 h-4 text-accent" />
              <span>{storeName}</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-tight">{storeAddress}</p>
            <p className="text-[10px] text-muted-foreground font-mono">GSTIN: {storeGSTIN}</p>
          </div>

          {/* Invoice Meta */}
          <div className="flex justify-between items-start text-[11px] py-1 border-b border-border/60">
            <div>
              <p className="font-bold text-foreground">Invoice #{sale.invoice_number}</p>
              <p className="text-muted-foreground">
                Date: {formattedDate} at {formattedTime}
              </p>
              <p className="text-muted-foreground capitalize">
                Status: <span className="font-semibold text-success">{sale.status}</span>
              </p>
            </div>
            {sale.customer && (
              <div className="text-right">
                <p className="font-bold text-foreground">Customer:</p>
                <p className="text-muted-foreground">{sale.customer.name}</p>
                {sale.customer.phone && (
                  <p className="text-[10px] text-muted-foreground">{sale.customer.phone}</p>
                )}
              </div>
            )}
          </div>

          {/* Items Table */}
          <div className="space-y-2">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="py-1">Item</th>
                  <th className="py-1 text-center">Qty</th>
                  <th className="py-1 text-right">Price</th>
                  <th className="py-1 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {sale.items?.map((item, idx) => (
                  <tr key={idx} className="py-1.5">
                    <td className="py-1 font-medium text-foreground">
                      {item.product_name}
                      {item.sku && <span className="block text-[9.5px] text-muted-foreground">{item.sku}</span>}
                    </td>
                    <td className="py-1 text-center font-bold">
                      {item.quantity} {item.unit}
                    </td>
                    <td className="py-1 text-right">{formatINR(item.unit_price)}</td>
                    <td className="py-1 text-right font-bold">{formatINR(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals & Tax Breakdown */}
          <div className="pt-2 border-t border-border/80 space-y-1 text-[11px]">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span>{formatINR(sale.subtotal)}</span>
            </div>

            {sale.discount_amount > 0 && (
              <div className="flex justify-between text-success font-medium">
                <span>Discount</span>
                <span>-{formatINR(sale.discount_amount)}</span>
              </div>
            )}

            <div className="flex justify-between text-muted-foreground">
              <span>CGST (9%) + SGST (9%)</span>
              <span>+{formatINR(sale.tax_amount)}</span>
            </div>

            {sale.round_off !== 0 && (
              <div className="flex justify-between text-muted-foreground/80 text-[10px]">
                <span>Round Off</span>
                <span>{sale.round_off}</span>
              </div>
            )}

            <div className="flex justify-between items-baseline pt-2 border-t border-border font-extrabold text-sm text-foreground">
              <span>Grand Total</span>
              <span className="text-accent">{formatINR(sale.grand_total)}</span>
            </div>
          </div>

          {/* Payment Method Footer */}
          <div className="pt-2 border-t border-border/60 flex items-center justify-between text-[10.5px] text-muted-foreground">
            <span>
              Payment Method: <strong className="uppercase text-foreground">{sale.payment_method}</strong>
            </span>
            <span className="text-success font-semibold flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> Paid
            </span>
          </div>

          <div className="text-center pt-2 text-[10px] text-muted-foreground border-t border-dashed border-border/60">
            Thank you for shopping with us! Powered by Forecastify POS.
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={handlePrint}
            className="fx-btn fx-btn-accent flex-1 h-10 text-xs font-bold flex items-center justify-center gap-2"
          >
            <Printer className="w-4 h-4" /> Thermal Print Receipt
          </button>
          <button
            type="button"
            onClick={onClose}
            className="fx-btn fx-btn-outline h-10 text-xs px-4"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}
