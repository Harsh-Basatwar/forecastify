"use client";

import React, { useState, useEffect } from "react";
import {
  Banknote,
  QrCode,
  CreditCard,
  Layers,
  CheckCircle2,
  AlertCircle,
  X,
  Copy,
  Check,
} from "lucide-react";
import Modal from "@/components/ui/Modal";
import { cn } from "@/lib/utils";
import { formatINR, generateUPIPayload, validateSplitPayment } from "@/lib/billing-utils";
import { PaymentMethod, SinglePaymentMethod, PaymentSplit } from "@/lib/types/sales";

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  grandTotal: number;
  onCompleteSale: (
    paymentMethod: PaymentMethod,
    splits?: PaymentSplit[],
    notes?: string
  ) => void;
  processing: boolean;
}

export default function PaymentModal({
  open,
  onClose,
  grandTotal,
  onCompleteSale,
  processing,
}: PaymentModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>("cash");

  // Cash tendered state
  const [cashTendered, setCashTendered] = useState<string>(String(grandTotal));

  // UPI State
  const [copiedUPI, setCopiedUPI] = useState(false);

  // Card reference state
  const [cardRef, setCardRef] = useState("");

  // Split payment state
  const [splits, setSplits] = useState<PaymentSplit[]>([
    { method: "cash", amount: Math.round(grandTotal / 2) },
    { method: "upi", amount: grandTotal - Math.round(grandTotal / 2) },
  ]);

  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  // Sync cash tendered when grandTotal changes
  useEffect(() => {
    setCashTendered(String(grandTotal));
    setSplits([
      { method: "cash", amount: Math.round(grandTotal / 2) },
      { method: "upi", amount: grandTotal - Math.round(grandTotal / 2) },
    ]);
  }, [grandTotal]);

  const upiPayload = generateUPIPayload("forecastify@upi", "Forecastify Store", grandTotal, "POS");

  const cashAmountNum = Number(cashTendered) || 0;
  const changeDue = Math.max(0, cashAmountNum - grandTotal);

  const handleCopyUPI = () => {
    navigator.clipboard.writeText(upiPayload);
    setCopiedUPI(true);
    setTimeout(() => setCopiedUPI(false), 2000);
  };

  const handleSplitAmountChange = (index: number, newAmount: number) => {
    setSplits((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], amount: Math.max(0, newAmount) };
      return copy;
    });
  };

  const handleAddSplitRow = () => {
    if (splits.length >= 3) return;
    const existingMethods = new Set(splits.map((s) => s.method));
    const available: SinglePaymentMethod[] = (["cash", "upi", "card"] as SinglePaymentMethod[]).filter(
      (m) => !existingMethods.has(m)
    );
    if (available.length > 0) {
      setSplits([...splits, { method: available[0], amount: 0 }]);
    }
  };

  const handleRemoveSplitRow = (index: number) => {
    if (splits.length <= 1) return;
    setSplits(splits.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (selectedMethod === "cash") {
      if (cashAmountNum < grandTotal) {
        setError(`Insufficient cash tendered. Total is ${formatINR(grandTotal)}`);
        return;
      }
      onCompleteSale("cash", undefined, notes);
    } else if (selectedMethod === "upi") {
      onCompleteSale("upi", undefined, notes);
    } else if (selectedMethod === "card") {
      onCompleteSale("card", undefined, notes);
    } else if (selectedMethod === "split") {
      const splitVal = validateSplitPayment(grandTotal, splits);
      if (!splitVal.isValid) {
        setError(splitVal.errorMessage || "Split payment amounts do not sum to grand total.");
        return;
      }
      onCompleteSale("split", splits, notes);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Complete Payment Settlement"
      description={`Total Amount Payable: ${formatINR(grandTotal)}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Method Selector Tabs */}
        <div className="grid grid-cols-4 gap-1.5 p-1 bg-secondary/40 rounded-xl border border-border">
          {[
            { id: "cash", label: "Cash", icon: Banknote },
            { id: "upi", label: "UPI QR", icon: QrCode },
            { id: "card", label: "Card", icon: CreditCard },
            { id: "split", label: "Split", icon: Layers },
          ].map((m) => {
            const Icon = m.icon;
            const isSelected = selectedMethod === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  setSelectedMethod(m.id as PaymentMethod);
                  setError("");
                }}
                className={cn(
                  "py-2.5 px-2 rounded-lg text-xs font-semibold flex flex-col items-center gap-1.5 transition-all",
                  isSelected
                    ? "bg-accent text-accent-foreground shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                )}
              >
                <Icon className="w-4 h-4" />
                <span>{m.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab 1: Cash Payment */}
        {selectedMethod === "cash" && (
          <div className="space-y-3.5 p-4 rounded-xl bg-secondary/20 border border-border/60">
            <div>
              <label className="block text-xs font-medium text-secondary-foreground mb-1">
                Tendered Cash Amount (₹)
              </label>
              <input
                type="number"
                step="0.01"
                min={grandTotal}
                value={cashTendered}
                onChange={(e) => setCashTendered(e.target.value)}
                className="fx-input fx-num text-lg font-bold h-11"
                autoFocus
              />
            </div>

            {/* Change Due Box */}
            <div className="p-3 rounded-lg bg-card border border-border flex justify-between items-center">
              <div>
                <p className="text-xs text-muted-foreground">Change to Return Customer</p>
                <p className="text-lg font-extrabold text-success">{formatINR(changeDue)}</p>
              </div>
              <Banknote className="w-8 h-8 text-success/40" />
            </div>
          </div>
        )}

        {/* Tab 2: UPI QR Code */}
        {selectedMethod === "upi" && (
          <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-secondary/20 border border-border/60 text-center space-y-3">
            <div className="p-3 bg-white rounded-xl shadow-md border border-gray-200">
              {/* Dynamic QR Code graphic simulation */}
              <div className="w-36 h-36 bg-gray-900 rounded flex flex-col items-center justify-center text-white p-2 relative">
                <QrCode className="w-24 h-24 text-white" />
                <span className="text-[9px] font-mono mt-1 text-accent">SCAN TO PAY</span>
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-foreground">Scan with Google Pay, PhonePe, Paytm</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Amount: {formatINR(grandTotal)}</p>
            </div>

            <button
              type="button"
              onClick={handleCopyUPI}
              className="fx-btn fx-btn-outline text-xs h-8 px-3 flex items-center gap-1.5"
            >
              {copiedUPI ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedUPI ? "UPI Payload Copied!" : "Copy UPI Payment Link"}
            </button>
          </div>
        )}

        {/* Tab 3: Card Payment */}
        {selectedMethod === "card" && (
          <div className="space-y-3 p-4 rounded-xl bg-secondary/20 border border-border/60">
            <div>
              <label className="block text-xs font-medium text-secondary-foreground mb-1">
                POS Terminal Transaction Ref / RRN (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. TXN-984810294"
                value={cardRef}
                onChange={(e) => setCardRef(e.target.value)}
                className="fx-input h-10 text-xs"
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Swipe/Tap card on EDC POS machine for {formatINR(grandTotal)}, then click Complete below.
            </p>
          </div>
        )}

        {/* Tab 4: Split Payment */}
        {selectedMethod === "split" && (
          <div className="space-y-3 p-3.5 rounded-xl bg-secondary/20 border border-border/60 text-xs">
            <p className="font-semibold text-foreground">Enter Split Payment Amounts</p>
            {splits.map((s, index) => (
              <div key={index} className="flex items-center gap-2">
                <select
                  value={s.method}
                  onChange={(e) => {
                    const copy = [...splits];
                    copy[index].method = e.target.value as SinglePaymentMethod;
                    setSplits(copy);
                  }}
                  className="fx-input h-9 text-xs w-28 uppercase font-bold"
                >
                  <option value="cash">CASH</option>
                  <option value="upi">UPI</option>
                  <option value="card">CARD</option>
                </select>

                <input
                  type="number"
                  step="0.01"
                  value={s.amount}
                  onChange={(e) => handleSplitAmountChange(index, Number(e.target.value))}
                  className="fx-input fx-num h-9 text-xs font-bold flex-1"
                />

                {splits.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveSplitRow(index)}
                    className="p-1 text-muted-foreground hover:text-danger"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}

            {splits.length < 3 && (
              <button
                type="button"
                onClick={handleAddSplitRow}
                className="text-xs text-accent font-semibold hover:underline"
              >
                + Add Another Method
              </button>
            )}
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="block text-xs font-medium text-secondary-foreground mb-1">
            Order Note / Remarks (Optional)
          </label>
          <input
            type="text"
            placeholder="e.g. Home delivery requested"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="fx-input h-9 text-xs"
          />
        </div>

        {error && (
          <div className="p-2.5 rounded-lg bg-danger-soft border border-danger/30 text-danger text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Action Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={processing}
            className="fx-btn fx-btn-accent w-full h-11 text-sm font-bold flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            {processing ? "Processing Sale…" : `Confirm & Finish Sale (${formatINR(grandTotal)})`}
          </button>
        </div>
      </form>
    </Modal>
  );
}
