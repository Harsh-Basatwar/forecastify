"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Store, Building2, ChevronDown, Check, Search, Plus, Warehouse, ShoppingBag } from "lucide-react";
import { useOrgStore } from "@/providers/org-store-provider";

export default function StoreSwitcher() {
  const { organizations, stores, activeOrg, activeStore, switchOrganization, switchStore } = useOrgStore();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [viewingOrgs, setViewingOrgs] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setViewingOrgs(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredStores = stores.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.code.toLowerCase().includes(search.toLowerCase())
  );

  const filteredOrgs = organizations.filter((o) =>
    o.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative" ref={menuRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 h-9 px-3 rounded-[var(--radius-md)] border border-border bg-secondary/40 hover:bg-secondary hover:border-border-strong text-foreground transition-all fx-focus fx-press"
        aria-label="Switch store or organization"
      >
        <div className="w-5 h-5 rounded-md bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shrink-0">
          {activeStore?.storeType === "warehouse" ? (
            <Warehouse className="w-3 h-3" />
          ) : (
            <Store className="w-3 h-3" />
          )}
        </div>
        <div className="flex flex-col text-left truncate max-w-[140px] sm:max-w-[180px]">
          <span className="text-[12px] font-semibold truncate leading-tight">
            {activeStore?.name || "Select Store"}
          </span>
          <span className="text-[10px] text-muted-foreground truncate leading-tight">
            {activeOrg?.name || "Organization"}
          </span>
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0 ml-1" />
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 top-full mt-2 w-72 sm:w-80 rounded-xl border border-border bg-background shadow-xl z-50 overflow-hidden"
          >
            {/* Header Tabs */}
            <div className="flex items-center justify-between border-b border-border p-2 bg-secondary/30">
              <button
                onClick={() => setViewingOrgs(false)}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors text-center ${
                  !viewingOrgs ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Stores ({stores.length})
              </button>
              <button
                onClick={() => setViewingOrgs(true)}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors text-center ${
                  viewingOrgs ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Organizations ({organizations.length})
              </button>
            </div>

            {/* Search Input */}
            <div className="p-2 border-b border-border">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder={viewingOrgs ? "Search organization..." : "Search store name or code..."}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full h-8 pl-8 pr-3 text-xs bg-secondary/50 border border-border rounded-md focus:outline-none focus:border-accent"
                  autoFocus
                />
              </div>
            </div>

            {/* List View */}
            <div className="max-h-60 overflow-y-auto p-1 space-y-0.5">
              {!viewingOrgs ? (
                /* Stores List */
                filteredStores.length > 0 ? (
                  filteredStores.map((store) => {
                    const isSelected = activeStore?.id === store.id;
                    return (
                      <button
                        key={store.id}
                        onClick={async () => {
                          await switchStore(store.id);
                          setIsOpen(false);
                        }}
                        className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-colors text-xs ${
                          isSelected ? "bg-accent/10 text-accent font-medium" : "hover:bg-secondary/70 text-foreground"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <div className="p-1.5 rounded-md bg-secondary border border-border shrink-0">
                            {store.storeType === "warehouse" ? (
                              <Warehouse className="w-3.5 h-3.5 text-muted-foreground" />
                            ) : (
                              <ShoppingBag className="w-3.5 h-3.5 text-muted-foreground" />
                            )}
                          </div>
                          <div className="truncate">
                            <p className="font-semibold leading-tight truncate">{store.name}</p>
                            <p className="text-[10px] text-muted-foreground truncate uppercase">
                              {store.code} • {store.storeType.replace('_', ' ')}
                            </p>
                          </div>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-accent shrink-0" />}
                      </button>
                    );
                  })
                ) : (
                  <p className="p-4 text-xs text-center text-muted-foreground">No stores found</p>
                )
              ) : (
                /* Organizations List */
                filteredOrgs.length > 0 ? (
                  filteredOrgs.map((org) => {
                    const isSelected = activeOrg?.id === org.id;
                    return (
                      <button
                        key={org.id}
                        onClick={async () => {
                          await switchOrganization(org.id);
                          setViewingOrgs(false);
                          setIsOpen(false);
                        }}
                        className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-colors text-xs ${
                          isSelected ? "bg-accent/10 text-accent font-medium" : "hover:bg-secondary/70 text-foreground"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <div className="p-1.5 rounded-md bg-secondary border border-border shrink-0">
                            <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                          </div>
                          <div className="truncate">
                            <p className="font-semibold leading-tight truncate">{org.name}</p>
                            <p className="text-[10px] text-muted-foreground truncate uppercase">
                              {org.plan} Plan
                            </p>
                          </div>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-accent shrink-0" />}
                      </button>
                    );
                  })
                ) : (
                  <p className="p-4 text-xs text-center text-muted-foreground">No organizations found</p>
                )
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
