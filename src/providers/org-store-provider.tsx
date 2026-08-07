"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { ExecutionContext, OrganizationInfo, StoreInfo, createExecutionContext } from "@/lib/execution-context";
import { getRolePermissions, UserRole } from "@/lib/rbac";

interface OrgStoreContextType {
  organizations: OrganizationInfo[];
  stores: StoreInfo[];
  activeOrg: OrganizationInfo | null;
  activeStore: StoreInfo | null;
  executionContext: ExecutionContext | null;
  loading: boolean;
  switchOrganization: (orgId: string) => Promise<void>;
  switchStore: (storeId: string) => Promise<void>;
  refreshStores: () => Promise<void>;
}

const OrgStoreContext = createContext<OrgStoreContextType>({
  organizations: [],
  stores: [],
  activeOrg: null,
  activeStore: null,
  executionContext: null,
  loading: true,
  switchOrganization: async () => {},
  switchStore: async () => {},
  refreshStores: async () => {},
});

const COOKIE_STORE_KEY = "forecastify_active_store";
const COOKIE_ORG_KEY = "forecastify_active_org";

function setCookie(name: string, value: string, days = 30) {
  if (typeof document === "undefined") return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(?:^|; )" + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + "=([^;]*)"));
  return match ? decodeURIComponent(match[1]) : null;
}

export function OrgStoreProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [organizations, setOrganizations] = useState<OrganizationInfo[]>([]);
  const [stores, setStores] = useState<StoreInfo[]>([]);
  const [activeOrg, setActiveOrg] = useState<OrganizationInfo | null>(null);
  const [activeStore, setActiveStore] = useState<StoreInfo | null>(null);
  const [memberInfo, setMemberInfo] = useState<{ id: string; role: UserRole } | null>(null);
  const [loading, setLoading] = useState(true);

  // Load user organizations & memberships
  useEffect(() => {
    if (!user) {
      setOrganizations([]);
      setStores([]);
      setActiveOrg(null);
      setActiveStore(null);
      setLoading(false);
      return;
    }

    let active = true;

    async function loadOrgData() {
      setLoading(true);
      try {
        // Fetch organization memberships
        const { data: memberData } = await supabase
          .from("organization_members")
          .select("id, organization_id, role, status, last_active_store_id, organizations(*)")
          .eq("user_id", user!.id)
          .eq("status", "ACTIVE");

        if (!active) return;

        if (!memberData || memberData.length === 0) {
          // Fallback single-store mock organization for unmigrated or single user
          const defaultOrg: OrganizationInfo = {
            id: user!.id,
            name: "My Retail Store",
            slug: "my-store",
            currency: "INR",
            timeZone: "Asia/Kolkata",
            plan: "growth",
            subscriptionStatus: "active",
            maxStores: 5,
            maxUsers: 25,
          };
          const defaultStore: StoreInfo = {
            id: user!.id,
            organizationId: user!.id,
            code: "STORE-01",
            name: "Main Outlet",
            storeType: "retail",
            status: "ACTIVE",
            warehouseEnabled: false,
          };
          setOrganizations([defaultOrg]);
          setStores([defaultStore]);
          setActiveOrg(defaultOrg);
          setActiveStore(defaultStore);
          setMemberInfo({ id: user!.id, role: "organization_owner" });
          setLoading(false);
          return;
        }

        const orgList: OrganizationInfo[] = memberData.map((m: any) => ({
          id: m.organizations.id,
          name: m.organizations.name,
          slug: m.organizations.slug,
          logoUrl: m.organizations.logo_url,
          currency: m.organizations.currency || "INR",
          timeZone: m.organizations.time_zone || "Asia/Kolkata",
          plan: m.organizations.plan || "growth",
          subscriptionStatus: m.organizations.subscription_status || "active",
          maxStores: m.organizations.max_stores || 5,
          maxUsers: m.organizations.max_users || 25,
        }));

        setOrganizations(orgList);

        // Determine active organization (Cookie -> LocalStorage -> First Org)
        const savedOrgId = getCookie(COOKIE_ORG_KEY) || (typeof window !== "undefined" ? localStorage.getItem(COOKIE_ORG_KEY) : null);
        const initialOrg = orgList.find((o) => o.id === savedOrgId) || orgList[0];
        setActiveOrg(initialOrg);

        const currentMember = memberData.find((m: any) => m.organization_id === initialOrg.id);
        if (currentMember) {
          setMemberInfo({ id: currentMember.id, role: currentMember.role as UserRole });
        }

        // Fetch stores in active organization
        const { data: storeData } = await supabase
          .from("stores")
          .select("*")
          .eq("organization_id", initialOrg.id)
          .eq("status", "ACTIVE");

        const storeList: StoreInfo[] = (storeData || []).map((s: any) => ({
          id: s.id,
          organizationId: s.organization_id,
          code: s.code,
          name: s.name,
          storeType: s.store_type || "retail",
          status: s.status || "ACTIVE",
          warehouseEnabled: s.warehouse_enabled || false,
          city: s.city,
          state: s.state,
          address: s.address,
        }));

        setStores(storeList);

        // Determine active store (DB last_active -> Cookie -> LocalStorage -> First Store)
        const dbLastActive = currentMember?.last_active_store_id;
        const savedStoreId = dbLastActive || getCookie(COOKIE_STORE_KEY) || (typeof window !== "undefined" ? localStorage.getItem(COOKIE_STORE_KEY) : null);
        const initialStore = storeList.find((s) => s.id === savedStoreId) || storeList[0] || null;

        setActiveStore(initialStore);
      } catch (err) {
        console.error("Error loading Org/Store context:", err);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadOrgData();

    return () => {
      active = false;
    };
  }, [user]);

  const switchOrganization = async (orgId: string) => {
    const targetOrg = organizations.find((o) => o.id === orgId);
    if (!targetOrg) return;

    setActiveOrg(targetOrg);
    setCookie(COOKIE_ORG_KEY, orgId);
    if (typeof window !== "undefined") {
      localStorage.setItem(COOKIE_ORG_KEY, orgId);
    }

    // Refresh stores for target org
    const { data: storeData } = await supabase
      .from("stores")
      .select("*")
      .eq("organization_id", orgId)
      .eq("status", "ACTIVE");

    const storeList: StoreInfo[] = (storeData || []).map((s: any) => ({
      id: s.id,
      organizationId: s.organization_id,
      code: s.code,
      name: s.name,
      storeType: s.store_type || "retail",
      status: s.status || "ACTIVE",
      warehouseEnabled: s.warehouse_enabled || false,
      city: s.city,
      state: s.state,
    }));

    setStores(storeList);
    if (storeList.length > 0) {
      await switchStore(storeList[0].id);
    }
  };

  const switchStore = async (storeId: string) => {
    const targetStore = stores.find((s) => s.id === storeId);
    if (!targetStore) return;

    setActiveStore(targetStore);
    setCookie(COOKIE_STORE_KEY, storeId);
    if (typeof window !== "undefined") {
      localStorage.setItem(COOKIE_STORE_KEY, storeId);
    }

    // Update DB last_active_store_id preference asynchronously
    if (memberInfo) {
      try {
        await supabase
          .from("organization_members")
          .update({ last_active_store_id: storeId })
          .eq("id", memberInfo.id);
      } catch {
        // Silently ignore background preference update errors
      }
    }
  };

  const refreshStores = async () => {
    if (!activeOrg) return;
    const { data: storeData } = await supabase
      .from("stores")
      .select("*")
      .eq("organization_id", activeOrg.id);

    const storeList: StoreInfo[] = (storeData || []).map((s: any) => ({
      id: s.id,
      organizationId: s.organization_id,
      code: s.code,
      name: s.name,
      storeType: s.store_type || "retail",
      status: s.status || "ACTIVE",
      warehouseEnabled: s.warehouse_enabled || false,
      city: s.city,
      state: s.state,
    }));
    setStores(storeList);
  };

  const executionContext: ExecutionContext | null =
    user && activeOrg && activeStore
      ? createExecutionContext({
          organizationId: activeOrg.id,
          storeId: activeStore.id,
          userId: user.id,
          memberId: memberInfo?.id || user.id,
          role: memberInfo?.role || "organization_owner",
          permissions: getRolePermissions(memberInfo?.role || "organization_owner"),
          timezone: activeOrg.timeZone,
          currency: activeOrg.currency,
        })
      : null;

  return (
    <OrgStoreContext.Provider
      value={{
        organizations,
        stores,
        activeOrg,
        activeStore,
        executionContext,
        loading,
        switchOrganization,
        switchStore,
        refreshStores,
      }}
    >
      {children}
    </OrgStoreContext.Provider>
  );
}

export const useOrgStore = () => useContext(OrgStoreContext);
