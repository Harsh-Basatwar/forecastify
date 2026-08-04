"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard Overview",
  "/dashboard/jarvis": "J.A.R.V.I.S.",
  "/dashboard/demand-analysis": "Demand Spike Analysis",
  "/dashboard/product-analysis": "Product Analysis",
  "/dashboard/category-analysis": "Category Analysis",
  "/dashboard/purchase-list": "Smart Purchase List",
  "/dashboard/news": "News",
  "/dashboard/promotions": "Promotions",
  "/dashboard/market-insights": "Offers & Deals",
  "/dashboard/what-if": "What-If Simulator",
  "/dashboard/federated-intelligence": "Federated Intelligence",
  "/dashboard/model-accuracy": "AI Model Accuracy",
  "/dashboard/expiry-risk": "Expiry & Waste Risk",
  "/dashboard/inventory-health": "Inventory Health Score",
  "/dashboard/reorder-planner": "Reorder Planner",
  "/dashboard/inventory": "Inventory Management",
  "/dashboard/alerts": "Alerts & Risks",
  "/dashboard/extension": "Smart Procurement Extension",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigated = useRef(false);

  useEffect(() => {
    if (!loading && !user && !navigated.current) {
      navigated.current = true;
      router.replace("/auth/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-5">
          <div className="w-8 h-8 border-2 border-border-strong border-t-accent rounded-full animate-spin" aria-hidden="true" />
          <p className="fx-eyebrow">Preparing your store</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="h-screen overflow-hidden flex bg-background">
      <Sidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header onMenuClick={() => setMobileOpen(true)} title={pageTitles[pathname] || "Dashboard"} />
        <main className="flex-1 px-4 py-6 sm:px-8 sm:py-8 overflow-y-auto">
          <div key={pathname} className="fx-page">{children}</div>
        </main>
      </div>
    </div>
  );
}
