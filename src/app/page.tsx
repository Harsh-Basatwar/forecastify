"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const navigated = useRef(false);

  useEffect(() => {
    if (!loading && !navigated.current) {
      if (user) {
        navigated.current = true;
        router.replace("/dashboard");
      } else {
        navigated.current = true;
        router.replace("/auth/login");
      }
    }
  }, [user, loading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-5">
        <div className="w-8 h-8 border-2 border-border-strong border-t-accent rounded-full animate-spin" aria-hidden="true" />
        <p className="fx-eyebrow">Loading Forecastify</p>
      </div>
    </div>
  );
}
