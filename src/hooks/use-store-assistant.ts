/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";

export function useStoreAssistant() {
  const { user } = useAuth();
  const storeId = user?.id || "demo-store-id";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const callApi = useCallback(
    async (action: string, params: Record<string, any> = {}) => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/store-assistant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, storeId, ...params }),
        });

        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.error || "Store Assistant API request failed");
        }
        setLoading(false);
        return data.data;
      } catch (err: any) {
        console.error(`Store Assistant action error (${action}):`, err);
        setError(err.message || "An error occurred");
        setLoading(false);
        return null;
      }
    },
    [storeId]
  );

  return { storeId, loading, error, callApi };
}
