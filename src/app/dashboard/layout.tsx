"use client";

import { useEffect, useRef } from "react";
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
    <SidebarProvider>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </SidebarProvider>
  );
}

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { toggleMobile } = useSidebar();

  return (
    <div className="h-screen overflow-hidden flex bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header onMenuClick={toggleMobile} />
        <main className="flex-1 px-4 py-6 sm:px-8 sm:py-8 overflow-y-auto">
          <div key={pathname} className="fx-page">{children}</div>
        </main>
      </div>
    </div>
  );
}

