"use client";

import { useState } from "react";
import {
  Building2,
  Store,
  Users,
  Sliders,
  ShieldCheck,
  Plus,
  Mail,
  Check,
  CheckCircle2,
  Warehouse,
  ShoppingBag,
} from "lucide-react";
import { useOrgStore } from "@/providers/org-store-provider";
import { getRoleLabel } from "@/lib/rbac";

export default function OrganizationSettingsPage() {
  const { activeOrg, stores, refreshStores } = useOrgStore();
  const [activeTab, setActiveTab] = useState<"general" | "stores" | "team" | "rules">("general");

  // Form states
  const [orgName, setOrgName] = useState(activeOrg?.name || "My Retail Organization");
  const [gstin, setGstin] = useState(activeOrg?.slug ? "27AAAAA0000A1Z5" : "");
  const [autoApprovalLimit, setAutoApprovalLimit] = useState(50000);
  const [allowTransfers, setAllowTransfers] = useState(true);

  // Invite modal state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("store_manager");

  // Store creation modal state
  const [showStoreModal, setShowStoreModal] = useState(false);
  const [newStoreName, setNewStoreName] = useState("");
  const [newStoreCode, setNewStoreCode] = useState("");
  const [newStoreType, setNewStoreType] = useState<"retail" | "warehouse" | "dark_store">("retail");

  const membersList = [
    { id: "m-1", name: "Aditya basatwar", email: "aditya@forecastify.ai", role: "organization_owner", status: "ACTIVE", stores: "All Outlets" },
    { id: "m-2", name: "Ramesh Sharma", email: "ramesh@forecastify.ai", role: "regional_manager", status: "ACTIVE", stores: "Store 01, Store 02" },
    { id: "m-3", name: "Anita Desai", email: "anita@forecastify.ai", role: "store_manager", status: "ACTIVE", stores: "Store 01" },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-card border border-border">
        <div>
          <div className="flex items-center gap-2 text-accent text-xs font-bold uppercase tracking-wider mb-1">
            <Building2 className="w-4 h-4" />
            Administrative Settings
          </div>
          <h1 className="text-2xl font-bold text-foreground">Organization Settings</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage branding, store locations, team permissions, approval limits, and security rules
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab("general")}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
            activeTab === "general" ? "bg-accent text-accent-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
          }`}
        >
          <Building2 className="w-3.5 h-3.5" /> General & Branding
        </button>

        <button
          onClick={() => setActiveTab("stores")}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
            activeTab === "stores" ? "bg-accent text-accent-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
          }`}
        >
          <Store className="w-3.5 h-3.5" /> Stores & Outlets ({stores.length})
        </button>

        <button
          onClick={() => setActiveTab("team")}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
            activeTab === "team" ? "bg-accent text-accent-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
          }`}
        >
          <Users className="w-3.5 h-3.5" /> Team & Invitations
        </button>

        <button
          onClick={() => setActiveTab("rules")}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
            activeTab === "rules" ? "bg-accent text-accent-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
          }`}
        >
          <Sliders className="w-3.5 h-3.5" /> Approval Rules & Policy
        </button>
      </div>

      {/* Tab 1: General Settings */}
      {activeTab === "general" && (
        <div className="p-6 rounded-2xl border border-border bg-card space-y-5">
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider text-accent">Organization Profile</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Organization Name</label>
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="w-full h-10 px-3 text-xs bg-secondary/50 border border-border rounded-xl text-foreground focus:outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">GSTIN / Tax ID</label>
              <input
                type="text"
                value={gstin}
                onChange={(e) => setGstin(e.target.value)}
                className="w-full h-10 px-3 text-xs bg-secondary/50 border border-border rounded-xl text-foreground focus:outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Base Currency</label>
              <input
                type="text"
                disabled
                value={activeOrg?.currency || "INR (₹)"}
                className="w-full h-10 px-3 text-xs bg-secondary/30 border border-border rounded-xl text-muted-foreground"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Timezone</label>
              <input
                type="text"
                disabled
                value={activeOrg?.timeZone || "Asia/Kolkata (IST)"}
                className="w-full h-10 px-3 text-xs bg-secondary/30 border border-border rounded-xl text-muted-foreground"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button className="h-10 px-5 rounded-xl bg-accent text-accent-foreground text-xs font-bold hover:bg-accent/90 transition-all fx-press">
              Save Profile Changes
            </button>
          </div>
        </div>
      )}

      {/* Tab 2: Stores & Outlets */}
      {activeTab === "stores" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground">Active Store Outlets & Warehouses</h2>
            <button
              onClick={() => setShowStoreModal(true)}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-accent text-accent-foreground text-xs font-semibold hover:bg-accent/90 transition-all"
            >
              <Plus className="w-3.5 h-3.5" /> Add New Store
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stores.map((store) => (
              <div key={store.id} className="p-5 rounded-2xl border border-border bg-card space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-secondary border border-border">
                      {store.storeType === "warehouse" ? (
                        <Warehouse className="w-4 h-4 text-accent" />
                      ) : (
                        <ShoppingBag className="w-4 h-4 text-sky-500" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">{store.name}</h3>
                      <p className="text-[10px] text-muted-foreground uppercase">{store.code} • {store.storeType}</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    {store.status}
                  </span>
                </div>

                <p className="text-xs text-muted-foreground">{store.city || "Mumbai"}, {store.state || "Maharashtra"}</p>

                <div className="pt-2 border-t border-border flex items-center justify-between text-xs">
                  <span className="text-[11px] text-muted-foreground">Warehouse Features: {store.warehouseEnabled ? "Enabled" : "Disabled"}</span>
                  <button className="text-accent font-semibold hover:underline">Edit Store</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Team Members & Invitations */}
      {activeTab === "team" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground">Organization Members & Roles</h2>
            <button
              onClick={() => setShowInviteModal(true)}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-accent text-accent-foreground text-xs font-semibold hover:bg-accent/90 transition-all"
            >
              <Mail className="w-3.5 h-3.5" /> Invite Employee
            </button>
          </div>

          <div className="p-6 rounded-2xl border border-border bg-card overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4 font-semibold">User</th>
                  <th className="py-3 px-4 font-semibold">Role</th>
                  <th className="py-3 px-4 font-semibold">Store Access</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {membersList.map((m) => (
                  <tr key={m.id} className="hover:bg-secondary/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-foreground">{m.name}</p>
                      <p className="text-[10px] text-muted-foreground">{m.email}</p>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-accent">{getRoleLabel(m.role)}</td>
                    <td className="py-3.5 px-4 text-foreground">{m.stores}</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                        {m.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <button className="text-xs text-muted-foreground hover:text-foreground">Edit Scopes</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Approval Rules */}
      {activeTab === "rules" && (
        <div className="p-6 rounded-2xl border border-border bg-card space-y-5">
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider text-accent">Approval Limits & Transfer Policy</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                Auto Approval Purchase Limit (₹)
              </label>
              <input
                type="number"
                value={autoApprovalLimit}
                onChange={(e) => setAutoApprovalLimit(Number(e.target.value))}
                className="w-full sm:w-80 h-10 px-3 text-xs bg-secondary/50 border border-border rounded-xl text-foreground focus:outline-none focus:border-accent"
              />
              <p className="text-[11px] text-muted-foreground mt-1">Purchase orders below this amount do not require HQ owner manual sign-off.</p>
            </div>

            <div className="flex items-center gap-3 pt-3 border-t border-border">
              <input
                type="checkbox"
                id="allow-transfers"
                checked={allowTransfers}
                onChange={(e) => setAllowTransfers(e.target.checked)}
                className="w-4 h-4 accent-accent rounded"
              />
              <label htmlFor="allow-transfers" className="text-xs font-medium text-foreground">
                Enable Inter-Store Stock Transfers between outlets
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
