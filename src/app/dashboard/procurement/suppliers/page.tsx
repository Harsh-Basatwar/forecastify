"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  Users,
  Plus,
  Star,
  Clock,
  CheckCircle2,
  TrendingUp,
  CreditCard,
  Building,
  Phone,
  Mail,
  ShieldCheck,
} from "lucide-react";
import Modal from "@/components/ui/Modal";

export default function SupplierPortalPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Supplier Form
  const [name, setName] = useState("");
  const [gstin, setGstin] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [leadTimeDays, setLeadTimeDays] = useState(3);
  const [creditLimit, setCreditLimit] = useState(50000);
  const [paymentTerms, setPaymentTerms] = useState("Net 30");

  const fetchSuppliers = () => {
    if (!user) return;
    setLoading(true);
    fetch(`/api/procurement/suppliers?storeId=${user.id}`)
      .then((res) => res.json())
      .then((res) => {
        setSuppliers(res.suppliers || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchSuppliers();
  }, [user]);

  const handleAddSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name) return;

    try {
      const res = await fetch("/api/procurement/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId: user.id,
          name,
          gstin,
          contact_person: contactPerson,
          email,
          phone,
          lead_time_days: leadTimeDays,
          credit_limit: creditLimit,
          payment_terms: paymentTerms,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setIsModalOpen(false);
        fetchSuppliers();
      } else {
        alert(json.error || "Failed to create supplier");
      }
    } catch (err) {
      alert("Error adding supplier");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="fx-display text-2xl tracking-tight">Supplier Performance Portal</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Track vendor reliability scores, fill rates, lead times, credit limits, and banking info.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent text-accent-foreground font-semibold text-sm hover:opacity-90 transition shadow-md shrink-0"
        >
          <Plus className="w-4 h-4" /> Add Vendor / Supplier
        </button>
      </div>

      {/* Supplier Scorecards Grid */}
      {loading ? (
        <div className="p-12 text-center text-xs text-muted-foreground">Loading supplier scorecards...</div>
      ) : suppliers.length === 0 ? (
        <div className="p-12 text-center text-xs text-muted-foreground">No suppliers configured. Add a supplier to begin procurement.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {suppliers.map((s) => (
            <div key={s.id} className="p-6 fx-card shadow-sm backdrop-blur-md space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="fx-display text-lg font-bold">{s.name}</h3>
                    <p className="text-xs text-muted-foreground fx-num">GSTIN: {s.gstin || "N/A"}</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-500 border border-emerald-500/20">
                    ★ {s.reliability_score || 95}% Reliability
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                  <div className="p-2.5 rounded-xl bg-secondary/50">
                    <span className="fx-eyebrow text-[9px]">Lead Time</span>
                    <p className="fx-num text-sm font-bold text-foreground">{s.lead_time_days || s.avg_lead_time || 3} Days</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-secondary/50">
                    <span className="fx-eyebrow text-[9px]">Fill Rate</span>
                    <p className="fx-num text-sm font-bold text-emerald-500">{s.fill_rate || 98}%</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-secondary/50">
                    <span className="fx-eyebrow text-[9px]">Terms</span>
                    <p className="text-sm font-bold text-foreground">{s.payment_terms || "Net 30"}</p>
                  </div>
                </div>

                <div className="mt-4 space-y-1.5 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Building className="w-3.5 h-3.5 text-accent" /> Contact: {s.contact_person || "Manager"}
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-accent" /> Phone: {s.phone || "N/A"}
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-accent" /> Email: {s.email || "N/A"}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-border/60 flex items-center justify-between text-xs font-semibold">
                <span className="text-muted-foreground">Credit Limit: <span className="fx-num">₹{Number(s.credit_limit || 0).toLocaleString("en-IN")}</span></span>
                <span className="text-accent">Active Vendor</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Add Supplier */}
      <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)} title="Register New Vendor / Supplier">
        <form onSubmit={handleAddSupplier} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Company / Supplier Name</label>
            <input
              type="text"
              placeholder="e.g. Global Foods Pvt Ltd"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-background border border-border/80 text-xs text-foreground focus:outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">GSTIN Number</label>
              <input
                type="text"
                placeholder="27AAAAA0000A1Z5"
                value={gstin}
                onChange={(e) => setGstin(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-background border border-border/80 text-xs text-foreground focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Contact Person</label>
              <input
                type="text"
                placeholder="Sales Director"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-background border border-border/80 text-xs text-foreground focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Email Address</label>
              <input
                type="email"
                placeholder="orders@vendor.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-background border border-border/80 text-xs text-foreground focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Phone Number</label>
              <input
                type="tel"
                placeholder="+91 9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-background border border-border/80 text-xs text-foreground focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Avg Lead Time (Days)</label>
              <input
                type="number"
                value={leadTimeDays}
                onChange={(e) => setLeadTimeDays(parseInt(e.target.value) || 3)}
                className="w-full p-2.5 rounded-xl bg-background border border-border/80 text-xs text-foreground focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Credit Limit ₹</label>
              <input
                type="number"
                value={creditLimit}
                onChange={(e) => setCreditLimit(parseFloat(e.target.value) || 0)}
                className="w-full p-2.5 rounded-xl bg-background border border-border/80 text-xs text-foreground focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-secondary text-secondary-foreground"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-accent text-accent-foreground shadow-md"
            >
              Save Supplier
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
