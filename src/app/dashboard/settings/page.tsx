"use client";

import { useState, useEffect } from "react";
import { User, Store, Bell, Shield, Save, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@supabase/supabase-js";

/* eslint-disable @typescript-eslint/no-explicit-any */

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function SettingsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const [profile, setProfile] = useState({ fullName: "", email: "", phone: "" });
  const [store, setStore] = useState({ storeName: "", storeCategory: "", storeSize: "", address: "", city: "", state: "", gstNumber: "" });
  const [notifications, setNotifications] = useState({ emailAlerts: true, criticalOnly: false, dailyDigest: true, weeklyReport: true });

  // Load profile from Supabase on mount
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const { data } = await supabase.from("profiles")
          .select("full_name, phone, store_name, store_category, store_size, store_address, city, state, gst_number")
          .eq("id", user.id).single();

        if (data) {
          setProfile({
            fullName: data.full_name || user.user_metadata?.full_name || "",
            email: user.email || "",
            phone: data.phone || user.user_metadata?.phone || "",
          });
          setStore({
            storeName: data.store_name || "",
            storeCategory: data.store_category || "",
            storeSize: data.store_size || "",
            address: data.store_address || "",
            city: data.city || "",
            state: data.state || "",
            gstNumber: data.gst_number || "",
          });
        } else {
          // Fallback to user_metadata
          const meta = user.user_metadata || {};
          setProfile({ fullName: meta.full_name || "", email: user.email || "", phone: meta.phone || "" });
          setStore({
            storeName: meta.store_name || "", storeCategory: meta.store_category || "",
            storeSize: meta.store_size || "", address: meta.store_address || "",
            city: meta.city || "", state: meta.state || "", gstNumber: meta.gst_number || "",
          });
        }
      } catch {} finally { setLoadingProfile(false); }
    })();
  }, [user]);

  const handleSave = async () => {
    if (!user || saving) return;
    setSaving(true);
    try {
      // Upsert into profiles table
      const { error } = await supabase.from("profiles").upsert({
        id: user.id,
        full_name: profile.fullName,
        phone: profile.phone,
        store_name: store.storeName,
        store_category: store.storeCategory,
        store_size: store.storeSize,
        store_address: store.address,
        city: store.city,
        state: store.state,
        gst_number: store.gstNumber,
        updated_at: new Date().toISOString(),
      }, { onConflict: "id" });

      if (error) throw error;
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      alert("Failed to save: " + (err.message || "Unknown error"));
    } finally { setSaving(false); }
  };

  const tabs = [{ id: "profile", label: "Profile", icon: User }, { id: "store", label: "Store", icon: Store }, { id: "notifications", label: "Notifications", icon: Bell }];

  if (loadingProfile) {
    return (
      <div className="space-y-8 max-w-[1400px] mx-auto pb-12" aria-busy="true" aria-label="Loading settings">
        <div className="max-w-3xl space-y-6">
          <div className="skeleton-shimmer h-9 w-72" />
          <div className="fx-card p-6 space-y-5">
            <div className="skeleton-shimmer h-4 w-40" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2"><div className="skeleton-shimmer h-3 w-20" /><div className="skeleton-shimmer h-10 w-full" /></div>
              <div className="space-y-2"><div className="skeleton-shimmer h-3 w-20" /><div className="skeleton-shimmer h-10 w-full" /></div>
            </div>
            <div className="space-y-2"><div className="skeleton-shimmer h-3 w-16" /><div className="skeleton-shimmer h-10 w-full" /></div>
            <div className="skeleton-shimmer h-14 w-full" />
            <div className="flex justify-end"><div className="skeleton-shimmer h-9 w-36" /></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto pb-12">
      <div className="max-w-3xl space-y-6">
        <div>
          <h1 className="fx-display text-[24px] text-foreground">Settings</h1>
          <p className="text-[13px] text-muted-foreground mt-1.5">
            Manage your profile, store details, and notification preferences
          </p>
        </div>

        {/* Segmented tabs */}
        <div className="flex gap-0.5 bg-secondary rounded-[var(--radius-md)] p-0.5" role="tablist" aria-label="Settings sections">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-[calc(var(--radius-md)-2px)] text-xs font-medium transition-all duration-100 cursor-pointer fx-focus ${
                activeTab === tab.id ? "bg-card text-foreground shadow-xs font-semibold" : "text-muted-foreground hover:text-foreground"
              }`}>
              <tab.icon className="w-4 h-4" strokeWidth={1.8} aria-hidden="true" /><span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="fx-card p-5 sm:p-6">
          {activeTab === "profile" && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 mb-1">
                <User className="w-4 h-4 text-muted-foreground" strokeWidth={1.8} aria-hidden="true" />
                <h3 className="fx-display text-[17px] text-foreground">Profile Information</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="settings-full-name" className="fx-eyebrow block mb-1.5">Full Name</label>
                  <input id="settings-full-name" type="text" value={profile.fullName} onChange={(e) => setProfile({ ...profile, fullName: e.target.value })} className="fx-input" />
                </div>
                <div>
                  <label htmlFor="settings-phone" className="fx-eyebrow block mb-1.5">Phone</label>
                  <input id="settings-phone" type="tel" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} className="fx-input" />
                </div>
              </div>
              <div>
                <label htmlFor="settings-email" className="fx-eyebrow block mb-1.5">Email</label>
                <input id="settings-email" type="email" value={profile.email} disabled className="fx-input opacity-60 cursor-not-allowed" />
                <p className="text-xs text-muted-foreground mt-1.5">Email cannot be changed here</p>
              </div>
              <div className="fx-rule pt-4 flex items-start gap-3">
                <Shield className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" strokeWidth={1.8} aria-hidden="true" />
                <div>
                  <p className="text-sm font-medium text-foreground">Password &amp; Security</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Use Supabase dashboard to manage password and 2FA</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "store" && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 mb-1">
                <Store className="w-4 h-4 text-muted-foreground" strokeWidth={1.8} aria-hidden="true" />
                <h3 className="fx-display text-[17px] text-foreground">Store Information</h3>
              </div>
              <div>
                <label htmlFor="settings-store-name" className="fx-eyebrow block mb-1.5">Store Name</label>
                <input id="settings-store-name" type="text" value={store.storeName} onChange={(e) => setStore({ ...store, storeName: e.target.value })} className="fx-input" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="settings-store-category" className="fx-eyebrow block mb-1.5">Category</label>
                  <input id="settings-store-category" type="text" value={store.storeCategory} onChange={(e) => setStore({ ...store, storeCategory: e.target.value })} className="fx-input" />
                </div>
                <div>
                  <label htmlFor="settings-store-size" className="fx-eyebrow block mb-1.5">Size</label>
                  <input id="settings-store-size" type="text" value={store.storeSize} onChange={(e) => setStore({ ...store, storeSize: e.target.value })} className="fx-input" />
                </div>
              </div>
              <div>
                <label htmlFor="settings-store-address" className="fx-eyebrow block mb-1.5">Address</label>
                <input id="settings-store-address" type="text" value={store.address} onChange={(e) => setStore({ ...store, address: e.target.value })} className="fx-input" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="settings-store-city" className="fx-eyebrow block mb-1.5">City</label>
                  <input id="settings-store-city" type="text" value={store.city} onChange={(e) => setStore({ ...store, city: e.target.value })} className="fx-input" />
                </div>
                <div>
                  <label htmlFor="settings-store-state" className="fx-eyebrow block mb-1.5">State</label>
                  <input id="settings-store-state" type="text" value={store.state} onChange={(e) => setStore({ ...store, state: e.target.value })} className="fx-input" />
                </div>
                <div>
                  <label htmlFor="settings-store-gst" className="fx-eyebrow block mb-1.5">GST Number</label>
                  <input id="settings-store-gst" type="text" value={store.gstNumber} onChange={(e) => setStore({ ...store, gstNumber: e.target.value })} className="fx-input" />
                </div>
              </div>
            </div>
          )}

          {activeTab === "notifications" && (
            <div className="space-y-1">
              <div className="flex items-center gap-2 mb-4">
                <Bell className="w-4 h-4 text-muted-foreground" strokeWidth={1.8} aria-hidden="true" />
                <h3 className="fx-display text-[17px] text-foreground">Notification Preferences</h3>
              </div>
              {([
                { key: "emailAlerts" as const, label: "Email Alerts", desc: "Receive alerts via email for inventory events" },
                { key: "criticalOnly" as const, label: "Critical Only", desc: "Only receive notifications for critical alerts" },
                { key: "dailyDigest" as const, label: "Daily Digest", desc: "Get a daily summary of inventory status" },
                { key: "weeklyReport" as const, label: "Weekly Report", desc: "Receive weekly forecast accuracy report" },
              ]).map((item) => (
                <div key={item.key} className="flex items-center justify-between gap-4 py-3.5 border-b border-border last:border-b-0">
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                  </div>
                  <button onClick={() => setNotifications({ ...notifications, [item.key]: !notifications[item.key] })}
                    role="switch"
                    aria-checked={notifications[item.key]}
                    aria-label={item.label}
                    className="relative w-10 h-[22px] rounded-full transition-colors shrink-0 fx-focus cursor-pointer"
                    style={{ background: notifications[item.key] ? "var(--accent)" : "var(--muted)" }}>
                    <span className={`absolute top-0.5 left-0.5 w-[18px] h-[18px] rounded-full bg-elevated transition-transform ${notifications[item.key] ? "translate-x-[18px]" : ""}`} style={{ boxShadow: "var(--shadow-xs)" }} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="fx-rule mt-6 pt-5 flex items-center justify-end gap-3">
            {saved && (
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-success">
                <span className="fx-signal fx-signal-success" aria-hidden="true" /> Settings saved to database!
              </span>
            )}
            <button onClick={handleSave} disabled={saving} className="fx-btn fx-btn-accent">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.8} aria-hidden="true" /> : <Save className="w-4 h-4" strokeWidth={1.8} aria-hidden="true" />}
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
