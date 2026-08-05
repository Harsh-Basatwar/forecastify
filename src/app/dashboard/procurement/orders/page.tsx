"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import {
  Plus,
  Search,
  Filter,
  ShoppingCart,
  CheckCircle2,
  Clock,
  Truck,
  PackageCheck,
  XCircle,
  ChevronRight,
  Copy,
  Eye,
  Trash2,
} from "lucide-react";
import Modal from "@/components/ui/Modal";

export default function PurchaseOrdersListPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New PO Form state
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState("");
  const [notes, setNotes] = useState("");
  const [poItems, setPoItems] = useState<
    Array<{ productId: string; requestedQty: number; purchasePrice: number; gstRate: number }>
  >([{ productId: "", requestedQty: 10, purchasePrice: 100, gstRate: 18 }]);

  const fetchOrders = () => {
    if (!user) return;
    setLoading(true);
    fetch(`/api/procurement/purchase-orders?storeId=${user.id}&status=${statusFilter}&search=${search}`)
      .then((res) => res.json())
      .then((res) => {
        setOrders(res.orders || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchOrders();
  }, [user, statusFilter]);

  useEffect(() => {
    if (user && isModalOpen) {
      fetch(`/api/procurement/suppliers?storeId=${user.id}`)
        .then((res) => res.json())
        .then((res) => {
          setSuppliers(res.suppliers || []);
          if (res.suppliers?.[0]) setSelectedSupplier(res.suppliers[0].id);
        });

      fetch(`/api/inventory/stock-adjustment?storeId=${user.id}`)
        .then((res) => res.json())

      fetch(`/api/procurement/price-history?storeId=${user.id}`)
        .then((res) => res.json());

      // Fetch products
      fetch(`/api/procurement/analytics?storeId=${user.id}`);
    }
  }, [user, isModalOpen]);

  const handleCreatePo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedSupplier) return;

    const itemsPayload = poItems.filter((i) => i.productId !== "").map((i) => ({
      productId: i.productId,
      requestedQty: i.requestedQty,
      orderedQty: i.requestedQty,
      purchasePrice: i.purchasePrice,
      gstRate: i.gstRate,
    }));

    if (itemsPayload.length === 0) {
      alert("Please select at least one valid product line item.");
      return;
    }

    try {
      const res = await fetch("/api/procurement/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId: user.id,
          supplierId: selectedSupplier,
          items: itemsPayload,
          expectedDeliveryDate,
          notes,
          userId: user.id,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setIsModalOpen(false);
        fetchOrders();
      } else {
        alert(json.error || "Failed to create PO");
      }
    } catch (err) {
      alert("Error creating purchase order");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-500/15 text-gray-400 border border-gray-500/20">Draft</span>;
      case "pending_approval":
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/20">Pending Approval</span>;
      case "approved":
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/20">Approved</span>;
      case "sent":
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/15 text-indigo-400 border border-indigo-500/20">Sent to Supplier</span>;
      case "in_transit":
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/15 text-purple-400 border border-purple-500/20">In Transit</span>;
      case "received":
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">Received</span>;
      case "cancelled":
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/20">Cancelled</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-500/15 text-gray-400">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="fx-display text-2xl tracking-tight">Purchase Orders</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Create, approve, track, and receive vendor purchase orders.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent text-accent-foreground font-semibold text-sm hover:opacity-90 transition shadow-md shrink-0"
        >
          <Plus className="w-4 h-4" /> Create Purchase Order
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 fx-card backdrop-blur-md">
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {["all", "draft", "pending_approval", "approved", "sent", "in_transit", "received", "cancelled"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize whitespace-nowrap transition ${
                statusFilter === st
                  ? "bg-accent text-accent-foreground shadow-sm"
                  : "bg-secondary/50 text-muted-foreground hover:text-foreground"
              }`}
            >
              {st.replace("_", " ")}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search PO Number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchOrders()}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-background border border-border/80 text-xs text-foreground focus:outline-none focus:border-accent"
          />
        </div>
      </div>

      {/* PO Table */}
      <div className="fx-card overflow-hidden shadow-sm backdrop-blur-md">
        {loading ? (
          <div className="p-12 text-center text-xs text-muted-foreground">Loading purchase orders...</div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center text-xs text-muted-foreground">No purchase orders found matching current filter.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-foreground">
              <thead className="bg-secondary/60 border-b border-border fx-eyebrow">
                <tr>
                  <th className="p-4">PO Number</th>
                  <th className="p-4">Supplier</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Items</th>
                  <th className="p-4">Expected Delivery</th>
                  <th className="p-4 text-right">Total Amount</th>
                  <th className="p-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {orders.map((po) => (
                  <tr key={po.id} className="hover:bg-secondary/30 transition">
                    <td className="p-4 font-bold text-accent">
                      <Link href={`/dashboard/procurement/orders/${po.id}`} className="hover:underline">
                        {po.po_number}
                      </Link>
                    </td>
                    <td className="p-4">
                      <div className="font-semibold text-foreground">{po.supplier?.name || "Supplier"}</div>
                      <div className="text-[10px] text-muted-foreground">{po.supplier?.gstin || "GSTIN N/A"}</div>
                    </td>
                    <td className="p-4">{getStatusBadge(po.status)}</td>
                    <td className="p-4 font-medium">{po.items?.length || 0} Line Items</td>
                    <td className="p-4 text-muted-foreground">
                      {po.expected_delivery_date ? new Date(po.expected_delivery_date).toLocaleDateString("en-IN") : "N/A"}
                    </td>
                    <td className="p-4 text-right fx-num font-bold text-foreground">
                      ₹{Number(po.total_amount || 0).toLocaleString("en-IN")}
                    </td>
                    <td className="p-4 text-center">
                      <Link
                        href={`/dashboard/procurement/orders/${po.id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline"
                      >
                        View <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Create New Purchase Order */}
      <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)} title="Draft New Purchase Order">
        <form onSubmit={handleCreatePo} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Select Supplier</label>
            <select
              value={selectedSupplier}
              onChange={(e) => setSelectedSupplier(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-background border border-border/80 text-xs text-foreground focus:outline-none"
              required
            >
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.payment_terms || "Net 30"})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Expected Delivery Date</label>
            <input
              type="date"
              value={expectedDeliveryDate}
              onChange={(e) => setExpectedDeliveryDate(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-background border border-border/80 text-xs text-foreground focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Order Line Items</label>
            <div className="space-y-2">
              {poItems.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Product Name / ID"
                    value={item.productId}
                    onChange={(e) => {
                      const next = [...poItems];
                      next[idx].productId = e.target.value;
                      setPoItems(next);
                    }}
                    className="flex-1 p-2 rounded-lg bg-background border border-border text-xs text-foreground"
                    required
                  />
                  <input
                    type="number"
                    placeholder="Qty"
                    value={item.requestedQty}
                    onChange={(e) => {
                      const next = [...poItems];
                      next[idx].requestedQty = parseInt(e.target.value) || 1;
                      setPoItems(next);
                    }}
                    className="w-20 p-2 rounded-lg bg-background border border-border text-xs text-foreground"
                  />
                  <input
                    type="number"
                    placeholder="Price ₹"
                    value={item.purchasePrice}
                    onChange={(e) => {
                      const next = [...poItems];
                      next[idx].purchasePrice = parseFloat(e.target.value) || 0;
                      setPoItems(next);
                    }}
                    className="w-24 p-2 rounded-lg bg-background border border-border text-xs text-foreground"
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={() => setPoItems([...poItems, { productId: "", requestedQty: 10, purchasePrice: 100, gstRate: 18 }])}
                className="text-xs text-accent font-semibold hover:underline"
              >
                + Add Line Item
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Notes & Terms</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Special delivery instructions..."
              className="w-full p-2.5 rounded-xl bg-background border border-border/80 text-xs text-foreground focus:outline-none"
              rows={2}
            />
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
              Save & Create PO
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
