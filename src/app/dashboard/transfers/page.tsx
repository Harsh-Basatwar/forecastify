"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeftRight,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Truck,
  Box,
  AlertCircle,
  Building2,
  Warehouse,
  Store,
} from "lucide-react";
import { useOrgStore } from "@/providers/org-store-provider";

export default function StockTransfersPage() {
  const { stores, activeOrg } = useOrgStore();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const mockTransfers = [
    {
      id: "tr-1",
      transferNumber: "TR-8920",
      sourceStore: "Central Logistics Warehouse",
      destinationStore: "Downtown Express Store",
      status: "in_transit",
      totalItems: 4,
      totalQty: 180,
      requestedBy: "Ramesh Sharma",
      shippedAt: "2026-08-07 09:30 AM",
    },
    {
      id: "tr-2",
      transferNumber: "TR-8919",
      sourceStore: "Main Supermarket Outlet",
      destinationStore: "Downtown Express Store",
      status: "requested",
      totalItems: 2,
      totalQty: 50,
      requestedBy: "Anita Desai",
      shippedAt: null,
    },
    {
      id: "tr-3",
      transferNumber: "TR-8918",
      sourceStore: "Central Logistics Warehouse",
      destinationStore: "Main Supermarket Outlet",
      status: "verified",
      totalItems: 12,
      totalQty: 600,
      requestedBy: "Vikram Mehta",
      shippedAt: "2026-08-06 04:15 PM",
    },
  ];

  const filteredTransfers = mockTransfers.filter((t) => {
    const matchesSearch =
      t.transferNumber.toLowerCase().includes(search.toLowerCase()) ||
      t.sourceStore.toLowerCase().includes(search.toLowerCase()) ||
      t.destinationStore.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "requested":
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center gap-1 w-max">
            <Clock className="w-3 h-3" /> Requested
          </span>
        );
      case "in_transit":
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-sky-500/10 text-sky-500 border border-sky-500/20 flex items-center gap-1 w-max">
            <Truck className="w-3 h-3" /> In Transit
          </span>
        );
      case "verified":
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center gap-1 w-max">
            <CheckCircle2 className="w-3 h-3" /> Verified & Closed
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-secondary text-muted-foreground border border-border">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-card border border-border">
        <div>
          <div className="flex items-center gap-2 text-accent text-xs font-bold uppercase tracking-wider mb-1">
            <ArrowLeftRight className="w-4 h-4" />
            Operations Hub • Inter-Store Transfers
          </div>
          <h1 className="text-2xl font-bold text-foreground">Stock Transfers</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Move inventory seamlessly between stores and central warehouses with full batch tracking & verification
          </p>
        </div>

        <Link
          href="/dashboard/transfers/new"
          className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-accent text-accent-foreground font-semibold text-xs hover:bg-accent/90 transition-all fx-press shadow-md shadow-accent/10 shrink-0"
        >
          <Plus className="w-4 h-4" />
          Request New Transfer
        </Link>
      </div>

      {/* Workflow Stage Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-border bg-card">
          <p className="text-[11px] text-muted-foreground font-medium uppercase">Pending Approval</p>
          <p className="text-xl font-bold text-amber-500 mt-1">1 Request</p>
        </div>
        <div className="p-4 rounded-xl border border-border bg-card">
          <p className="text-[11px] text-muted-foreground font-medium uppercase">In Transit</p>
          <p className="text-xl font-bold text-sky-500 mt-1">1 Shipment</p>
        </div>
        <div className="p-4 rounded-xl border border-border bg-card">
          <p className="text-[11px] text-muted-foreground font-medium uppercase">Verified Today</p>
          <p className="text-xl font-bold text-emerald-500 mt-1">12 Transfers</p>
        </div>
        <div className="p-4 rounded-xl border border-border bg-card">
          <p className="text-[11px] text-muted-foreground font-medium uppercase">Damaged / Mismatched</p>
          <p className="text-xl font-bold text-rose-500 mt-1">0 Items</p>
        </div>
      </div>

      {/* Filter & Search Controls */}
      <div className="p-4 rounded-xl border border-border bg-card flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search transfer # or store..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-4 text-xs bg-secondary/50 border border-border rounded-lg focus:outline-none focus:border-accent"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-muted-foreground" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 px-3 text-xs bg-secondary/50 border border-border rounded-lg text-foreground focus:outline-none focus:border-accent"
          >
            <option value="all">All Transfer Statuses</option>
            <option value="requested">Requested</option>
            <option value="in_transit">In Transit</option>
            <option value="verified">Verified & Closed</option>
          </select>
        </div>
      </div>

      {/* Transfers Table */}
      <div className="p-6 rounded-2xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border text-muted-foreground uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4 font-semibold">Transfer #</th>
                <th className="py-3 px-4 font-semibold">Source Store</th>
                <th className="py-3 px-4 font-semibold">Destination Store</th>
                <th className="py-3 px-4 font-semibold">Items</th>
                <th className="py-3 px-4 font-semibold">Requested By</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredTransfers.map((tr) => (
                <tr key={tr.id} className="hover:bg-secondary/40 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-accent">{tr.transferNumber}</td>
                  <td className="py-3.5 px-4 text-foreground font-medium">{tr.sourceStore}</td>
                  <td className="py-3.5 px-4 text-foreground font-medium">{tr.destinationStore}</td>
                  <td className="py-3.5 px-4 font-semibold text-foreground">
                    {tr.totalItems} SKUs ({tr.totalQty} units)
                  </td>
                  <td className="py-3.5 px-4 text-muted-foreground">{tr.requestedBy}</td>
                  <td className="py-3.5 px-4">{getStatusBadge(tr.status)}</td>
                  <td className="py-3.5 px-4">
                    <button className="px-3 py-1 rounded-md bg-secondary border border-border hover:bg-secondary/80 font-medium text-xs text-foreground transition-colors">
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
