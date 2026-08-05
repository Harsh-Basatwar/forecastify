"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ScrollProgress } from "@/lib/motion-primitives";

import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";

import { SidebarProvider, useSidebar } from "@/providers/sidebar-provider";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const navigated = useRef(false);

  useEffect(() => {
    if (!loading && !user && !navigated.current) {
      navigated.current = true;
      router.replace("/auth/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div
        className="min-h-[100dvh] flex items-center justify-center bg-background"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <div className="flex flex-col items-center gap-5">
          <div className="w-8 h-8 border-2 border-border-strong border-t-accent rounded-full animate-spin" aria-hidden="true" />
          <p className="fx-eyebrow">Preparing your store</p>
        </div>
      </div>
    );
  }

  // Redirect is already in flight; say so rather than flashing a blank page.
  if (!user) {
    return (
      <div
        className="min-h-[100dvh] flex items-center justify-center bg-background px-6"
        role="status"
        aria-live="polite"
      >
        <p className="text-sm text-muted-foreground text-center">
          Taking you to sign in…
        </p>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </SidebarProvider>
  );
}

const PAGE_NAMES: Record<string, string> = {
  "/dashboard": "Overview",
  "/dashboard/jarvis": "Jarvis",
  "/dashboard/demand-analysis": "Demand Spikes",
  "/dashboard/product-analysis": "Product Analysis",
  "/dashboard/category-analysis": "Category Analysis",
  "/dashboard/what-if": "What-If Simulator",
  "/dashboard/news": "News",
  "/dashboard/promotions": "Promotions",
  "/dashboard/market-insights": "Offers & Deals",
  "/dashboard/purchase-list": "Purchase List",
  "/dashboard/inventory": "Inventory",
  "/dashboard/expiry-risk": "Expiry & Waste",
  "/dashboard/alerts": "Alerts",
  "/dashboard/extension": "Extension",
  "/dashboard/settings": "Settings",
  "/dashboard/forecasts": "Forecasts",
  "/dashboard/inventory-health": "Health Score",
  "/dashboard/model-accuracy": "Model Accuracy",
  "/dashboard/reorder-planner": "Reorder Planner",
  "/dashboard/federated-intelligence": "Peer Intelligence",
};

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { toggleMobile } = useSidebar();
  const mainRef = useRef<HTMLElement>(null);
  const firstRender = useRef(true);
  const reduceMotion = useReducedMotion();

  // A client-side route change swaps the content without moving focus, which
  // leaves keyboard and screen-reader users stranded on the old nav item.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    mainRef.current?.focus();
  }, [pathname]);

  return (
    <div className="min-h-[100dvh] h-[100dvh] overflow-hidden flex bg-background">
      <a href="#main-content" className="fx-skip-link">Skip to main content</a>
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <div className="relative">
          <Header onMenuClick={toggleMobile} />
          {/* Reading position for the scrolling content area. */}
          <ScrollProgress target={mainRef} className="fx-scroll-rail" />
        </div>
        <main
          id="main-content"
          ref={mainRef}
          tabIndex={-1}
          className="flex-1 px-4 py-6 sm:px-8 sm:py-8 overflow-y-auto focus:outline-none"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={pathname}
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -4 }}
              transition={{ duration: reduceMotion ? 0 : 0.24, ease: [0.16, 1, 0.3, 1] }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      {/* Announces the destination after a client-side navigation. */}
      <p aria-live="polite" className="fx-sr-only">
        {PAGE_NAMES[pathname] ? `${PAGE_NAMES[pathname]} page loaded` : ""}
      </p>
    </div>
  );
}

