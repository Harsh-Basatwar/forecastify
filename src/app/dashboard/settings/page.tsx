"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { User, Store, Bell, Shield, Save, Loader2, Receipt, Puzzle, Sliders, ArrowRight } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { validateGstin } from "@/lib/gstin";
import { createClient } from "@supabase/supabase-js";

/* eslint-disable @typescript-eslint/no-explicit-any */

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/** PostgREST reports an unknown column as PGRST204 rather than a PG error code. */
function isMissingColumn(error: any, column: string): boolean {
  return error?.code === "PGRST204" || String(error?.message || "").includes(`'${column}' column`);
}

export default function SettingsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(true);

  const [profile, setProfile] = useState({ fullName: "", email: "", phone: "" });
  const [store, setStore] = useState({ storeName: "", storeCategory: "", storeSize: "", address: "", city: "", state: "", gstNumber: "" });
  const [notifications, setNotifications] = useState({ emailAlerts: true, criticalOnly: false, dailyDigest: true, weeklyReport: true });
  // Validate GSTIN on blur rather than per keystroke, so a half-typed number
  // is not flagged as wrong while the user is still entering it.
  const [gstTouched, setGstTouched] = useState(false);
  const gstFieldError = validateGstin(store.gstNumber);
  /* Profiles created before validation existed can hold a malformed GSTIN.
     Blocking on that would hold the whole form hostage over a field the user
     did not touch, so only a value they actually edited stops the save. */
  const [initialGst, setInitialGst] = useState("");
  const gstBlocksSave = !!gstFieldError && store.gstNumber.trim() !== initialGst.trim();
  // Set when the save succeeded but notification prefs could not be stored.
  const [notifyWarning, setNotifyWarning] = useState("");

  // Load profile from Supabase on mount
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        /* Select every column rather than an explicit list: naming a column
           the database does not have yet fails the whole read, which would
           silently fall back to user_metadata and then overwrite the stored
           profile on the next save. */
        const { data } = await supabase.from("profiles")
          .select("*")
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
          setInitialGst(data.gst_number || "");
          // Column is nullable for rows created before it existed.
          if (data.notifications) {
            setNotifications((prev) => ({ ...prev, ...data.notifications }));
          }
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

    // Reject a newly-entered malformed GSTIN before it reaches the database —
    // it is used on tax documents, where a wrong number is worse than a
    // missing one.
    if (gstBlocksSave) {
      setActiveTab("store");
      setGstTouched(true);
      setSaveError(gstFieldError!);
      return;
    }

    setSaving(true);
    setSaveError("");
    setNotifyWarning("");
    try {
      const base = {
        id: user.id,
        full_name: profile.fullName,
        phone: profile.phone,
        store_name: store.storeName,
        store_category: store.storeCategory,
        store_size: store.storeSize,
        store_address: store.address,
        city: store.city,
        state: store.state,
        gst_number: store.gstNumber.toUpperCase().trim(),
        updated_at: new Date().toISOString(),
      };

      // Upsert into profiles table
      let { error } = await supabase.from("profiles")
        .upsert({ ...base, notifications }, { onConflict: "id" });

      /* profiles.notifications arrived in a later migration. Where that has
         not been applied yet, save everything else rather than losing the
         whole form, and say plainly that the toggles did not persist. */
      if (error && isMissingColumn(error, "notifications")) {
        ({ error } = await supabase.from("profiles").upsert(base, { onConflict: "id" }));
        if (!error) {
          setNotifyWarning(
            "Profile and store details saved. Notification preferences were not stored — the database is missing the 'notifications' column; apply the latest migration in supabase/migrations."
          );
        }
      }

      if (error) throw error;
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setSaveError("Failed to save: " + (err.message || "Unknown error"));
    } finally { setSaving(false); }
  };

  const tabs = [
    { id: "profile", label: "Profile", icon: User },
    { id: "store", label: "Store", icon: Store },
    { id: "billing", label: "Billing & Plan", icon: Receipt },
    { id: "extension", label: "Extension & Integrations", icon: Puzzle },
    { id: "systemConfig", label: "System Config", icon: Sliders },
    { id: "notifications", label: "Notifications", icon: Bell },
  ];

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

        {/* Segmented control, not a half-built tablist: a group of toggle
            buttons needs no aria-controls / roving tabIndex / arrow keys, and
            aria-label keeps a name below 640px where the text label hides. */}
        <div className="fx-segment w-full" role="group" aria-label="Settings sections">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              aria-pressed={activeTab === tab.id}
              aria-label={tab.label}
              className="flex-1 flex items-center justify-center gap-2"
            >
              <tab.icon className="w-4 h-4" strokeWidth={1.8} aria-hidden="true" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="fx-card p-5 sm:p-6">
          {activeTab === "profile" && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 mb-1">
                <User className="w-4 h-4 text-muted-foreground" strokeWidth={1.8} aria-hidden="true" />
                <h2 className="fx-display text-[17px] text-foreground">Profile Information</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="settings-full-name" className="fx-eyebrow block mb-1.5">Full Name</label>
                  <input id="settings-full-name" type="text" autoComplete="name" value={profile.fullName} onChange={(e) => setProfile({ ...profile, fullName: e.target.value })} className="fx-input" />
                </div>
                <div>
                  <label htmlFor="settings-phone" className="fx-eyebrow block mb-1.5">Phone</label>
                  <input id="settings-phone" type="tel" autoComplete="tel" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} className="fx-input" />
                </div>
              </div>
              <div>
                <label htmlFor="settings-email" className="fx-eyebrow block mb-1.5">Email</label>
                {/* .fx-input:disabled already carries the disabled treatment.
                    A blanket opacity would also fade the border below 3:1. */}
                <input
                  id="settings-email"
                  type="email"
                  autoComplete="email"
                  value={profile.email}
                  disabled
                  aria-describedby="settings-email-note"
                  className="fx-input"
                />
                <p id="settings-email-note" className="text-xs text-muted-foreground mt-1.5">Email cannot be changed here</p>
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
                <h2 className="fx-display text-[17px] text-foreground">Store Information</h2>
              </div>
              <div>
                <label htmlFor="settings-store-name" className="fx-eyebrow block mb-1.5">Store Name</label>
                <input id="settings-store-name" type="text" autoComplete="organization" value={store.storeName} onChange={(e) => setStore({ ...store, storeName: e.target.value })} className="fx-input" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="settings-store-category" className="fx-eyebrow block mb-1.5">Category</label>
                  <input id="settings-store-category" type="text" autoComplete="off" value={store.storeCategory} onChange={(e) => setStore({ ...store, storeCategory: e.target.value })} className="fx-input" />
                </div>
                <div>
                  <label htmlFor="settings-store-size" className="fx-eyebrow block mb-1.5">Size</label>
                  <input id="settings-store-size" type="text" autoComplete="off" value={store.storeSize} onChange={(e) => setStore({ ...store, storeSize: e.target.value })} className="fx-input" />
                </div>
              </div>
              <div>
                <label htmlFor="settings-store-address" className="fx-eyebrow block mb-1.5">Address</label>
                <input id="settings-store-address" type="text" autoComplete="street-address" value={store.address} onChange={(e) => setStore({ ...store, address: e.target.value })} className="fx-input" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="settings-store-city" className="fx-eyebrow block mb-1.5">City</label>
                  <input id="settings-store-city" type="text" autoComplete="address-level2" value={store.city} onChange={(e) => setStore({ ...store, city: e.target.value })} className="fx-input" />
                </div>
                <div>
                  <label htmlFor="settings-store-state" className="fx-eyebrow block mb-1.5">State</label>
                  <input id="settings-store-state" type="text" autoComplete="address-level1" value={store.state} onChange={(e) => setStore({ ...store, state: e.target.value })} className="fx-input" />
                </div>
                <div>
                  <label htmlFor="settings-store-gst" className="fx-eyebrow block mb-1.5">GST Number</label>
                  <input
                    id="settings-store-gst"
                    type="text"
                    autoComplete="off"
                    inputMode="text"
                    maxLength={15}
                    spellCheck={false}
                    placeholder="27AAPFU0939F1ZV"
                    value={store.gstNumber}
                    /* Stored and validated uppercase; typing lowercase is common. */
                    onChange={(e) => setStore({ ...store, gstNumber: e.target.value.toUpperCase() })}
                    onBlur={() => setGstTouched(true)}
                    aria-invalid={!!gstFieldError}
                    aria-describedby={gstFieldError ? "settings-store-gst-error" : "settings-store-gst-hint"}
                    className="fx-input uppercase"
                  />
                  {gstFieldError && (gstTouched || store.gstNumber.trim() === initialGst.trim()) ? (
                    <p id="settings-store-gst-error" role="alert" className="text-xs text-danger mt-1.5">
                      {gstFieldError}
                      {!gstBlocksSave && " This was already on your profile — correct it or clear the field."}
                    </p>
                  ) : (
                    <p id="settings-store-gst-hint" className="text-xs text-muted-foreground mt-1.5">
                      {store.gstNumber.trim()
                        ? "Checksum verified."
                        : "Optional — leave blank if your store is not GST registered."}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "billing" && (
            <div className="space-y-5">
              <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-muted-foreground" strokeWidth={1.8} aria-hidden="true" />
                  <h2 className="fx-display text-[17px] text-foreground">Billing &amp; Subscription Summary</h2>
                </div>
                <Link href="/dashboard/billing" className="fx-btn text-xs gap-1.5 fx-press">
                  <span>Open Full Billing Hub</span>
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </Link>
              </div>

              <div className="bg-secondary/40 border border-border rounded-lg p-5 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <span className="text-[11px] font-mono uppercase text-accent font-semibold tracking-wider px-2 py-0.5 rounded bg-accent/10">Active Tier</span>
                    <h3 className="text-lg font-bold text-foreground mt-1">Enterprise Autopilot</h3>
                  </div>
                  <span className="text-sm font-semibold text-foreground bg-card px-3 py-1.5 rounded-md border border-border">₹4,999 / month</span>
                </div>
                <p className="text-xs text-muted-foreground">Includes unlimited AI forecasts, automated reorder plans, multi-store POS sync, and 24/7 Jarvis Copilot access.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 border border-border rounded-lg bg-card">
                  <p className="text-xs text-muted-foreground font-medium">SKUs Monitored</p>
                  <p className="text-base font-semibold text-foreground mt-1">1,240 / 5,000</p>
                </div>
                <div className="p-3.5 border border-border rounded-lg bg-card">
                  <p className="text-xs text-muted-foreground font-medium">AI Forecast Engine</p>
                  <p className="text-base font-semibold text-accent mt-1">Active (Unlimited)</p>
                </div>
                <div className="p-3.5 border border-border rounded-lg bg-card">
                  <p className="text-xs text-muted-foreground font-medium">Next Renewal</p>
                  <p className="text-base font-semibold text-foreground mt-1">Sep 01, 2026</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "extension" && (
            <div className="space-y-5">
              <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Puzzle className="w-4 h-4 text-muted-foreground" strokeWidth={1.8} aria-hidden="true" />
                  <h2 className="fx-display text-[17px] text-foreground">Browser Extension &amp; POS Sync</h2>
                </div>
                <Link href="/dashboard/extension" className="fx-btn text-xs gap-1.5 fx-press">
                  <span>Open Extension Hub</span>
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </Link>
              </div>

              <div className="border border-border rounded-lg p-5 bg-card space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shrink-0">
                      <Puzzle className="w-5 h-5" aria-hidden="true" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">Forecastify Chrome Extension</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">Overlay AI reorder signals directly onto wholesale supplier portals</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-success bg-success-soft border border-success/30 px-3 py-1 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-success"></span> Connected (v2.4.0)
                  </span>
                </div>
              </div>
            </div>
          )}

          {activeTab === "systemConfig" && (
            <div className="space-y-5">
              <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-muted-foreground" strokeWidth={1.8} aria-hidden="true" />
                  <h2 className="fx-display text-[17px] text-foreground">System Parameters</h2>
                </div>
                <Link href="/dashboard/system/configuration" className="fx-btn text-xs gap-1.5 fx-press">
                  <span>Open System Configuration</span>
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </Link>
              </div>

              <div className="p-5 border border-border rounded-lg bg-card space-y-4">
                <h3 className="text-sm font-semibold text-foreground">Store &amp; Inventory Default Thresholds</h3>
                <p className="text-xs text-muted-foreground">Adjust default lead time and safety stock thresholds for automated reordering.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div>
                    <label className="fx-eyebrow block mb-1.5">Default Supplier Lead Time (Days)</label>
                    <input type="number" defaultValue={3} className="fx-input fx-num" />
                  </div>
                  <div>
                    <label className="fx-eyebrow block mb-1.5">Expiry Risk Horizon (Days)</label>
                    <input type="number" defaultValue={30} className="fx-input fx-num" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "notifications" && (
            <div className="space-y-1">
              <div className="flex items-center gap-2 mb-4">
                <Bell className="w-4 h-4 text-muted-foreground" strokeWidth={1.8} aria-hidden="true" />
                <h2 className="fx-display text-[17px] text-foreground">Notification Preferences</h2>
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
                  {/* Off-state track uses --control-track: --muted sits at
                      ~1.1:1 on --card, well under the 3:1 non-text minimum. */}
                  <button
                    type="button"
                    onClick={() => setNotifications({ ...notifications, [item.key]: !notifications[item.key] })}
                    role="switch"
                    aria-checked={notifications[item.key]}
                    aria-label={item.label}
                    className="relative w-10 h-[22px] rounded-full transition-colors shrink-0 fx-focus cursor-pointer"
                    style={{ background: notifications[item.key] ? "var(--accent)" : "var(--control-track)" }}>
                    <span className={`absolute top-0.5 left-0.5 w-[18px] h-[18px] rounded-full bg-elevated transition-transform ${notifications[item.key] ? "translate-x-[18px]" : ""}`} style={{ boxShadow: "var(--shadow-xs)" }} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="fx-rule mt-6 pt-5 space-y-3">
            {/* Failure is inline and announced assertively — never an alert()
                dialog, which cannot be styled, deferred, or re-read. */}
            {saveError && (
              <div role="alert" className="bg-danger-soft border border-danger/25 rounded-[var(--radius-md)] px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
                <span className="text-sm text-danger">{saveError}</span>
                <button type="button" onClick={handleSave} className="fx-btn">Retry</button>
              </div>
            )}
            {/* A partial save must not read as a clean one. */}
            {notifyWarning && !saveError && (
              <div role="status" className="bg-warning-soft border border-warning/25 rounded-[var(--radius-md)] px-4 py-3">
                <span className="text-sm text-warning">{notifyWarning}</span>
              </div>
            )}
            <div className="flex items-center justify-end gap-3">
              <p role="status" aria-live="polite" className="text-sm font-medium text-success">
                {saved && !notifyWarning && (
                  <span className="inline-flex items-center gap-1.5">
                    <span className="fx-signal fx-signal-success" aria-hidden="true" /> Settings saved to database!
                  </span>
                )}
              </p>
              <button type="button" onClick={handleSave} disabled={saving} className="fx-btn fx-btn-accent">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.8} aria-hidden="true" /> : <Save className="w-4 h-4" strokeWidth={1.8} aria-hidden="true" />}
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
