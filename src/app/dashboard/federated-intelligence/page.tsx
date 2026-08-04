"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  Network, Users, Plus, LogIn, Copy, Check, ArrowLeft,
  Package, ShoppingCart, Tag, Store, Send, Loader2,
  CheckCircle2, Clock, X, Crown, MapPin, ChevronRight,
  Handshake, Search,
} from "lucide-react";

/* eslint-disable @typescript-eslint/no-explicit-any */

type View = "lobby" | "group";

const modalPanelStyle = { boxShadow: "var(--shadow-lg)" } as const;

// Skeleton mirroring the lobby group grid
function LobbySkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading groups">
      <div className="skeleton-shimmer h-3.5 w-32" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="fx-card p-5 space-y-3">
            <div className="skeleton-shimmer h-4 w-40" />
            <div className="skeleton-shimmer h-3 w-28" />
            <div className="skeleton-shimmer h-10 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

// Skeleton mirroring the group detail layout
function GroupSkeleton() {
  return (
    <div className="space-y-8 max-w-[1400px] mx-auto pb-12" aria-busy="true" aria-label="Loading group">
      <div className="fx-card p-5 space-y-3">
        <div className="skeleton-shimmer h-5 w-56" />
        <div className="skeleton-shimmer h-3 w-72" />
      </div>
      <div className="skeleton-shimmer h-9 w-full max-w-md" />
      <div className="fx-card px-5">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="py-4 border-b border-border last:border-b-0 space-y-2">
            <div className="skeleton-shimmer h-4 w-1/3" />
            <div className="skeleton-shimmer h-3 w-2/3" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function FederatedIntelligencePage() {
  const { user } = useAuth();
  const [view, setView] = useState<View>("lobby");
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);

  // ── Lobby state ────────────────────────────────────────────────────
  const [myGroups, setMyGroups] = useState<any[]>([]);
  const [discoverable, setDiscoverable] = useState<any[]>([]);
  const [storeName, setStoreName] = useState("");
  const [lobbyLoading, setLobbyLoading] = useState(true);

  // ── Create / Join modals ───────────────────────────────────────────
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [createName, setCreateName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [createdCode, setCreatedCode] = useState("");
  const [copied, setCopied] = useState(false);

  // ── Group detail state ─────────────────────────────────────────────
  const [groupData, setGroupData] = useState<any>(null);
  const [groupLoading, setGroupLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"requests" | "offers" | "members">("requests");

  // ── Post request/offer forms ───────────────────────────────────────
  const [showPostReq, setShowPostReq] = useState(false);
  const [showPostOffer, setShowPostOffer] = useState(false);
  const [postForm, setPostForm] = useState({ productName: "", category: "", quantity: "", unit: "pcs", price: "", message: "" });
  const [postLoading, setPostLoading] = useState(false);

  const api = useCallback(async (body: any) => {
    const res = await fetch("/api/federated-intelligence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, userId: user?.id }),
    });
    return res.json();
  }, [user]);

  // ── Load lobby ─────────────────────────────────────────────────────
  const loadLobby = useCallback(async () => {
    if (!user) return;
    setLobbyLoading(true);
    const data = await api({ action: "get_groups" });
    setMyGroups(data.myGroups || []);
    setDiscoverable(data.discoverable || []);
    setStoreName(data.storeName || "");
    setLobbyLoading(false);
  }, [user, api]);

  useEffect(() => { loadLobby(); }, [loadLobby]);

  // ── Create group ───────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!createName.trim()) return;
    setFormLoading(true);
    setFormError("");
    const data = await api({ action: "create_group", groupName: createName.trim() });
    setFormLoading(false);
    if (data.error) { setFormError(data.error); return; }
    setCreatedCode(data.inviteCode);
    loadLobby();
  };

  // ── Join group ─────────────────────────────────────────────────────
  const handleJoin = async () => {
    if (!joinCode.trim()) return;
    setFormLoading(true);
    setFormError("");
    const data = await api({ action: "join_group", inviteCode: joinCode.trim() });
    setFormLoading(false);
    if (data.error) { setFormError(data.error); return; }
    setShowJoin(false);
    setJoinCode("");
    loadLobby();
  };

  // ── Open group detail ──────────────────────────────────────────────
  const openGroup = async (groupId: string) => {
    setActiveGroupId(groupId);
    setView("group");
    setGroupLoading(true);
    const data = await api({ action: "get_group_detail", groupId });
    setGroupData(data);
    setGroupLoading(false);
  };

  const refreshGroup = () => { if (activeGroupId) openGroup(activeGroupId); };

  // ── Leave group ────────────────────────────────────────────────────
  const leaveGroup = async () => {
    if (!activeGroupId) return;
    await api({ action: "leave_group", groupId: activeGroupId });
    setView("lobby");
    setActiveGroupId(null);
    loadLobby();
  };

  // ── Post request / offer ───────────────────────────────────────────
  const submitPost = async (type: "request" | "offer") => {
    if (!postForm.productName.trim() || !postForm.quantity) return;
    setPostLoading(true);
    if (type === "request") {
      await api({
        action: "post_request",
        groupId: activeGroupId,
        productName: postForm.productName.trim(),
        category: postForm.category || null,
        quantity: Number(postForm.quantity),
        unit: postForm.unit,
        message: postForm.message || null,
      });
    } else {
      await api({
        action: "post_offer",
        groupId: activeGroupId,
        productName: postForm.productName.trim(),
        category: postForm.category || null,
        quantity: Number(postForm.quantity),
        unit: postForm.unit,
        price: Number(postForm.price) || 0,
        message: postForm.message || null,
      });
    }
    setPostLoading(false);
    setShowPostReq(false);
    setShowPostOffer(false);
    setPostForm({ productName: "", category: "", quantity: "", unit: "pcs", price: "", message: "" });
    refreshGroup();
  };

  // ── Fulfill / Claim ────────────────────────────────────────────────
  const fulfillRequest = async (requestId: string) => {
    await api({ action: "fulfill_request", requestId });
    refreshGroup();
  };

  const claimOffer = async (offerId: string) => {
    await api({ action: "claim_offer", offerId });
    refreshGroup();
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const inputCls = "fx-input";

  // ═══════════════════════════════════════════════════════════════════
  // ── LOBBY VIEW ─────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════
  if (view === "lobby") {
    return (
      <div className="space-y-8 max-w-[1400px] mx-auto pb-12">
        {/* ── Page lead · editorial, no card ─────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-5">
          <div className="min-w-0">
            <p className="fx-eyebrow flex items-center gap-1.5">
              <Network className="w-3.5 h-3.5" aria-hidden="true" strokeWidth={1.8} /> Federated Intelligence
            </p>
            <h1 className="fx-display text-[26px] sm:text-[30px] leading-tight text-foreground mt-2">Peer Intelligence Network</h1>
            <p className="text-[13px] text-muted-foreground mt-1.5">Connect with similar stores, share stock, and help each other</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => { setShowJoin(true); setFormError(""); setJoinCode(""); }} className="fx-btn">
              <LogIn className="w-3.5 h-3.5" aria-hidden="true" strokeWidth={1.8} /> Join Group
            </button>
            <button onClick={() => { setShowCreate(true); setFormError(""); setCreateName(""); setCreatedCode(""); }} className="fx-btn fx-btn-accent">
              <Plus className="w-3.5 h-3.5" aria-hidden="true" strokeWidth={1.8} /> Create Group
            </button>
          </div>
        </div>

        {lobbyLoading ? (
          <LobbySkeleton />
        ) : (
          <>
            {/* My Groups */}
            <section aria-label="My groups">
              <h2 className="fx-display text-[17px] text-foreground flex items-center gap-2 mb-4">
                <Users className="w-4 h-4 text-muted-foreground" aria-hidden="true" strokeWidth={1.8} /> My Groups
                {myGroups.length > 0 && <span className="fx-num text-xs text-muted-foreground font-normal">({myGroups.length})</span>}
              </h2>

              {myGroups.length === 0 ? (
                <div className="fx-card text-center py-10 px-6">
                  <Network className="w-5 h-5 text-muted-foreground mx-auto mb-3 opacity-50" aria-hidden="true" strokeWidth={1.8} />
                  <p className="text-sm text-secondary-foreground font-medium">You haven&apos;t joined any group yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Create a new group or join with an invite code</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {myGroups.map((g) => (
                    <button key={g.id} onClick={() => openGroup(g.id)}
                      className="fx-card fx-card-interactive p-5 text-left cursor-pointer fx-focus group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <Store className="w-4 h-4 text-accent mt-0.5 shrink-0" aria-hidden="true" strokeWidth={1.8} />
                          <div className="min-w-0">
                            <h3 className="text-sm font-semibold text-foreground truncate">{g.name}</h3>
                            <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1 truncate">
                              <MapPin className="w-2.5 h-2.5 shrink-0" aria-hidden="true" strokeWidth={1.8} /> {g.city || g.state || "India"} · {g.category}
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-accent transition-colors shrink-0" aria-hidden="true" strokeWidth={1.8} />
                      </div>
                      <div className="fx-rule mt-4 pt-3 grid grid-cols-3 gap-2">
                        <div>
                          <p className="fx-num text-base font-semibold text-foreground">{g.memberCount}</p>
                          <p className="fx-eyebrow text-[9px] mt-0.5">Stores</p>
                        </div>
                        <div>
                          <p className="fx-num text-base font-semibold text-foreground">{g.openRequests}</p>
                          <p className="fx-eyebrow text-[9px] mt-0.5">Requests</p>
                        </div>
                        <div>
                          <p className="fx-num text-base font-semibold text-foreground">{g.openOffers}</p>
                          <p className="fx-eyebrow text-[9px] mt-0.5">Offers</p>
                        </div>
                      </div>
                      {g.isOwner && (
                        <p className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <Crown className="w-3 h-3" aria-hidden="true" strokeWidth={1.8} /> You created this group
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </section>

            {/* Discoverable Groups */}
            {discoverable.length > 0 && (
              <section aria-label="Discoverable groups">
                <h2 className="fx-display text-[17px] text-foreground flex items-center gap-2 mb-4">
                  <Search className="w-4 h-4 text-muted-foreground" aria-hidden="true" strokeWidth={1.8} /> Discover Groups in Your Category
                </h2>
                <div className="fx-card px-5">
                  {discoverable.map((g) => (
                    <div key={g.id} className="flex items-center justify-between gap-3 py-3.5 border-b border-border last:border-b-0">
                      <div className="min-w-0">
                        <h3 className="text-sm font-medium text-foreground truncate">{g.name}</h3>
                        <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{g.city || g.state} · {g.category}</p>
                      </div>
                      <p className="text-xs text-muted-foreground shrink-0">Ask owner for invite code</p>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {/* ── Create Group Modal ────────────────────────────────────── */}
        {showCreate && (
          <div className="fixed inset-0 bg-foreground/25 backdrop-blur-[2px] z-[60] flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
            <div className="bg-elevated border border-border rounded-[var(--radius-lg)] w-full max-w-md" style={modalPanelStyle} onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <h2 className="fx-display text-[17px] text-foreground flex items-center gap-2">
                  <Plus className="w-4 h-4 text-accent" aria-hidden="true" strokeWidth={1.8} /> Create Group
                </h2>
                <button onClick={() => setShowCreate(false)} aria-label="Close" className="fx-btn-ghost fx-btn p-1.5">
                  <X className="w-4 h-4" aria-hidden="true" strokeWidth={1.8} />
                </button>
              </div>

              {createdCode ? (
                <div className="text-center space-y-4 p-6">
                  <CheckCircle2 className="w-5 h-5 text-success mx-auto" aria-hidden="true" strokeWidth={1.8} />
                  <p className="text-sm text-foreground font-semibold">Group Created!</p>
                  <p className="text-xs text-muted-foreground">Share this invite code with other store owners</p>
                  <div className="flex items-center justify-center gap-2">
                    <div className="fx-num px-6 py-3 bg-secondary rounded-[var(--radius-md)] text-2xl font-semibold tracking-[0.3em] text-foreground">
                      {createdCode}
                    </div>
                    <button onClick={() => copyCode(createdCode)} aria-label="Copy invite code" className="fx-btn p-2.5">
                      {copied ? <Check className="w-4 h-4 text-success" aria-hidden="true" strokeWidth={1.8} /> : <Copy className="w-4 h-4" aria-hidden="true" strokeWidth={1.8} />}
                    </button>
                  </div>
                  <button onClick={() => { setShowCreate(false); setCreatedCode(""); }} className="fx-btn fx-btn-accent w-full">
                    Done
                  </button>
                </div>
              ) : (
                <div className="space-y-4 p-6">
                  <div>
                    <label htmlFor="create-group-name" className="fx-eyebrow mb-1.5 block">Group Name</label>
                    <input id="create-group-name" value={createName} onChange={(e) => setCreateName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                      placeholder="e.g. Pune Grocery Network" className={inputCls} />
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Your store category (<strong className="text-secondary-foreground">{storeName}</strong>) and city will be auto-tagged. An invite code will be generated to share with other stores.
                  </p>
                  {formError && <p role="alert" className="text-xs text-danger">{formError}</p>}
                  <button onClick={handleCreate} disabled={formLoading || !createName.trim()} className="fx-btn fx-btn-accent w-full">
                    {formLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> : <Plus className="w-3.5 h-3.5" aria-hidden="true" strokeWidth={1.8} />}
                    Create Group
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Join Group Modal ──────────────────────────────────────── */}
        {showJoin && (
          <div className="fixed inset-0 bg-foreground/25 backdrop-blur-[2px] z-[60] flex items-center justify-center p-4" onClick={() => setShowJoin(false)}>
            <div className="bg-elevated border border-border rounded-[var(--radius-lg)] w-full max-w-md" style={modalPanelStyle} onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <h2 className="fx-display text-[17px] text-foreground flex items-center gap-2">
                  <LogIn className="w-4 h-4 text-accent" aria-hidden="true" strokeWidth={1.8} /> Join Group
                </h2>
                <button onClick={() => setShowJoin(false)} aria-label="Close" className="fx-btn-ghost fx-btn p-1.5">
                  <X className="w-4 h-4" aria-hidden="true" strokeWidth={1.8} />
                </button>
              </div>
              <div className="space-y-4 p-6">
                <div>
                  <label htmlFor="join-invite-code" className="fx-eyebrow mb-1.5 block">Invite Code</label>
                  <input id="join-invite-code" value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                    placeholder="e.g. ABC123" maxLength={6}
                    className={`${inputCls} fx-num text-center text-xl tracking-[0.3em] uppercase`} />
                </div>
                <p className="text-xs text-muted-foreground">Enter the 6-character code shared by the group owner</p>
                {formError && <p role="alert" className="text-xs text-danger">{formError}</p>}
                <button onClick={handleJoin} disabled={formLoading || joinCode.trim().length < 4} className="fx-btn fx-btn-accent w-full">
                  {formLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> : <LogIn className="w-3.5 h-3.5" aria-hidden="true" strokeWidth={1.8} />}
                  Join Group
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // ── GROUP DETAIL VIEW ──────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════
  if (groupLoading || !groupData) {
    return <GroupSkeleton />;
  }

  const group = groupData.group;
  const members = groupData.members || [];
  const requests = groupData.requests || [];
  const offers = groupData.offers || [];

  const openRequests = requests.filter((r: any) => r.status === "open");
  const openOffers = offers.filter((o: any) => o.status === "available");

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto pb-12">
      {/* Group Header */}
      <div className="fx-card p-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => { setView("lobby"); setActiveGroupId(null); loadLobby(); }}
              aria-label="Back to groups" className="fx-btn fx-btn-ghost p-2 shrink-0">
              <ArrowLeft className="w-4 h-4" aria-hidden="true" strokeWidth={1.8} />
            </button>
            <div className="min-w-0">
              <h1 className="fx-display text-[19px] text-foreground truncate">{group.name}</h1>
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" aria-hidden="true" strokeWidth={1.8} /> {group.city || group.state}</span>
                <span aria-hidden="true">·</span>
                <span className="flex items-center gap-1"><Tag className="w-3 h-3" aria-hidden="true" strokeWidth={1.8} /> {group.category}</span>
                <span aria-hidden="true">·</span>
                <span className="flex items-center gap-1"><Users className="w-3 h-3" aria-hidden="true" strokeWidth={1.8} /> <span className="fx-num">{members.length}</span> stores</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-secondary rounded-[var(--radius-sm)]">
              <span className="text-xs text-muted-foreground">Code:</span>
              <span className="fx-num text-sm font-semibold text-foreground tracking-wider">{group.invite_code}</span>
              <button onClick={() => copyCode(group.invite_code)} aria-label="Copy invite code" className="p-1 rounded-[var(--radius-xs)] hover:bg-card transition-colors fx-focus">
                {copied ? <Check className="w-3.5 h-3.5 text-success" aria-hidden="true" strokeWidth={1.8} /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" strokeWidth={1.8} />}
              </button>
            </div>
            <button onClick={leaveGroup} className="px-3 py-1.5 rounded-[var(--radius-md)] text-xs font-medium text-danger hover:bg-danger/8 transition-colors fx-focus">
              Leave
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0.5 bg-secondary rounded-[var(--radius-md)] p-0.5" role="tablist" aria-label="Group sections">
        {[
          { key: "requests" as const, label: "Requests", count: openRequests.length, icon: ShoppingCart },
          { key: "offers" as const, label: "Offers", count: openOffers.length, icon: Package },
          { key: "members" as const, label: "Members", count: members.length, icon: Users },
        ].map((tab) => (
          <button key={tab.key} role="tab" aria-selected={activeTab === tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-[calc(var(--radius-md)-2px)] text-xs font-medium transition-all duration-100 cursor-pointer fx-focus ${
              activeTab === tab.key ? "bg-card text-foreground shadow-xs font-semibold" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" aria-hidden="true" strokeWidth={1.8} />
            {tab.label}
            {tab.count > 0 && <span className="fx-num text-[11px] text-muted-foreground">{tab.count}</span>}
          </button>
        ))}
      </div>

      {/* ── Requests Tab ───────────────────────────────────────────── */}
      {activeTab === "requests" && (
        <section aria-label="Requests" className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-xs text-muted-foreground">
              <span className="fx-num font-semibold text-foreground">{openRequests.length}</span> open requests from stores needing products
            </p>
            <button onClick={() => { setShowPostReq(true); setPostForm({ productName: "", category: "", quantity: "", unit: "pcs", price: "", message: "" }); }}
              className="fx-btn fx-btn-accent">
              <Plus className="w-3.5 h-3.5" aria-hidden="true" strokeWidth={1.8} /> Request Product
            </button>
          </div>

          {requests.length === 0 ? (
            <div className="fx-card text-center py-10 px-6">
              <ShoppingCart className="w-5 h-5 text-muted-foreground mx-auto mb-3 opacity-50" aria-hidden="true" strokeWidth={1.8} />
              <p className="text-sm text-secondary-foreground font-medium">No requests yet</p>
              <p className="text-xs text-muted-foreground mt-1">Need a product? Post a request!</p>
            </div>
          ) : (
            <div className="fx-card px-5">
              {requests.map((r: any) => {
                const isOpen = r.status === "open";
                const isMine = r.requester_id === user?.id;
                return (
                  <div key={r.id} className={`flex items-start justify-between gap-3 py-4 border-b border-border last:border-b-0 ${isOpen ? "" : "opacity-60"}`}>
                    <div className="flex items-start gap-2.5 min-w-0">
                      <span className={`fx-signal ${isOpen ? "fx-signal-warning" : "fx-signal-success"} mt-1.5`} aria-hidden="true" />
                      <div className="min-w-0">
                        <h3 className="text-sm font-medium text-foreground">{r.product_name}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          <span className="font-medium text-secondary-foreground">{r.requester_store}</span> needs <span className="fx-num font-semibold text-foreground">{r.quantity_needed} {r.unit}</span>
                          {r.category && <span> · {r.category}</span>}
                        </p>
                        {r.message && <p className="text-xs text-muted-foreground mt-1 italic">&quot;{r.message}&quot;</p>}
                        <p className="fx-num text-[11px] text-muted-foreground mt-1.5 flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" aria-hidden="true" strokeWidth={1.8} /> {new Date(r.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0 ml-3">
                      {isOpen && !isMine ? (
                        <button onClick={() => fulfillRequest(r.id)} className="fx-btn">
                          <Handshake className="w-3.5 h-3.5" aria-hidden="true" strokeWidth={1.8} /> I Can Supply
                        </button>
                      ) : isOpen && isMine ? (
                        <span className="fx-badge fx-badge-warning">YOUR REQUEST</span>
                      ) : (
                        <span className="fx-badge fx-badge-success">Fulfilled by {r.fulfiller_store}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ── Offers Tab ─────────────────────────────────────────────── */}
      {activeTab === "offers" && (
        <section aria-label="Offers" className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-xs text-muted-foreground">
              <span className="fx-num font-semibold text-foreground">{openOffers.length}</span> products available from peer stores
            </p>
            <button onClick={() => { setShowPostOffer(true); setPostForm({ productName: "", category: "", quantity: "", unit: "pcs", price: "", message: "" }); }}
              className="fx-btn fx-btn-accent">
              <Plus className="w-3.5 h-3.5" aria-hidden="true" strokeWidth={1.8} /> Offer Product
            </button>
          </div>

          {offers.length === 0 ? (
            <div className="fx-card text-center py-10 px-6">
              <Package className="w-5 h-5 text-muted-foreground mx-auto mb-3 opacity-50" aria-hidden="true" strokeWidth={1.8} />
              <p className="text-sm text-secondary-foreground font-medium">No offers yet</p>
              <p className="text-xs text-muted-foreground mt-1">Have excess stock? Post an offer!</p>
            </div>
          ) : (
            <div className="fx-card px-5">
              {offers.map((o: any) => {
                const isAvailable = o.status === "available";
                const isMine = o.offerer_id === user?.id;
                return (
                  <div key={o.id} className={`flex items-start justify-between gap-3 py-4 border-b border-border last:border-b-0 ${isAvailable ? "" : "opacity-60"}`}>
                    <div className="flex items-start gap-2.5 min-w-0">
                      <span className={`fx-signal ${isAvailable ? "fx-signal-success" : ""} mt-1.5`} aria-hidden="true" />
                      <div className="min-w-0">
                        <h3 className="text-sm font-medium text-foreground">{o.product_name}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          from <span className="font-medium text-secondary-foreground">{o.offerer_store}</span>
                          {o.category && <span> · {o.category}</span>}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          <span className="fx-num font-semibold text-foreground">{o.quantity_available} {o.unit}</span>
                          {o.price > 0 && <span> · <span className="fx-num font-semibold text-foreground">₹{o.price}</span>/{o.unit}</span>}
                        </p>
                        {o.message && <p className="text-xs text-muted-foreground mt-1 italic">&quot;{o.message}&quot;</p>}
                        <p className="fx-num text-[11px] text-muted-foreground mt-1.5 flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" aria-hidden="true" strokeWidth={1.8} /> {new Date(o.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0 ml-3 flex flex-col items-end gap-2">
                      {!isAvailable && (
                        <span className="fx-badge">Claimed by {o.claimer_store}</span>
                      )}
                      {isAvailable && !isMine && (
                        <button onClick={() => claimOffer(o.id)} className="fx-btn">
                          <ShoppingCart className="w-3.5 h-3.5" aria-hidden="true" strokeWidth={1.8} /> Claim
                        </button>
                      )}
                      {isMine && isAvailable && (
                        <span className="fx-badge fx-badge-success">YOUR OFFER</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ── Members Tab ────────────────────────────────────────────── */}
      {activeTab === "members" && (
        <section aria-label="Members" className="fx-card px-5">
          {members.map((m: any) => (
            <div key={m.id} className="flex items-center justify-between gap-3 py-3.5 border-b border-border last:border-b-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-sm font-semibold text-secondary-foreground shrink-0" aria-hidden="true">
                  {m.store_name?.charAt(0)?.toUpperCase() || "S"}
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-medium text-foreground flex items-center gap-1.5 truncate">
                    {m.store_name}
                    {m.store_id === group.created_by && <Crown className="w-3.5 h-3.5 text-warning shrink-0" aria-label="Group owner" strokeWidth={1.8} />}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                    <MapPin className="w-2.5 h-2.5" aria-hidden="true" strokeWidth={1.8} /> {m.city || "India"}
                  </p>
                </div>
              </div>
              <p className="fx-num text-[11px] text-muted-foreground shrink-0">Joined {new Date(m.joined_at).toLocaleDateString("en-IN")}</p>
            </div>
          ))}
        </section>
      )}

      {/* ── Post Request Modal ─────────────────────────────────────── */}
      {showPostReq && (
        <div className="fixed inset-0 bg-foreground/25 backdrop-blur-[2px] z-[60] flex items-center justify-center p-4" onClick={() => setShowPostReq(false)}>
          <div className="bg-elevated border border-border rounded-[var(--radius-lg)] w-full max-w-md" style={modalPanelStyle} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="fx-display text-[17px] text-foreground flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-accent" aria-hidden="true" strokeWidth={1.8} /> Request a Product
              </h2>
              <button onClick={() => setShowPostReq(false)} aria-label="Close" className="fx-btn-ghost fx-btn p-1.5">
                <X className="w-4 h-4" aria-hidden="true" strokeWidth={1.8} />
              </button>
            </div>
            <div className="space-y-4 p-6">
              <div>
                <label htmlFor="req-product-name" className="fx-eyebrow mb-1.5 block">Product Name *</label>
                <input id="req-product-name" value={postForm.productName} onChange={(e) => setPostForm({ ...postForm, productName: e.target.value })}
                  placeholder="e.g. Amul Butter 100g" className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="req-quantity" className="fx-eyebrow mb-1.5 block">Quantity *</label>
                  <input id="req-quantity" type="number" min="1" value={postForm.quantity} onChange={(e) => setPostForm({ ...postForm, quantity: e.target.value })}
                    placeholder="e.g. 50" className={`${inputCls} fx-num`} />
                </div>
                <div>
                  <label htmlFor="req-unit" className="fx-eyebrow mb-1.5 block">Unit</label>
                  <select id="req-unit" value={postForm.unit} onChange={(e) => setPostForm({ ...postForm, unit: e.target.value })} className={inputCls}>
                    {["pcs", "kg", "g", "L", "ml", "box", "pack", "dozen"].map((u) => <option key={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label htmlFor="req-category" className="fx-eyebrow mb-1.5 block">Category</label>
                <input id="req-category" value={postForm.category} onChange={(e) => setPostForm({ ...postForm, category: e.target.value })}
                  placeholder="e.g. Dairy" className={inputCls} />
              </div>
              <div>
                <label htmlFor="req-message" className="fx-eyebrow mb-1.5 block">Message (optional)</label>
                <input id="req-message" value={postForm.message} onChange={(e) => setPostForm({ ...postForm, message: e.target.value })}
                  placeholder="e.g. Need urgently by tomorrow" className={inputCls} />
              </div>
              <button onClick={() => submitPost("request")} disabled={postLoading || !postForm.productName.trim() || !postForm.quantity}
                className="fx-btn fx-btn-accent w-full">
                {postLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> : <Send className="w-3.5 h-3.5" aria-hidden="true" strokeWidth={1.8} />}
                Post Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Post Offer Modal ───────────────────────────────────────── */}
      {showPostOffer && (
        <div className="fixed inset-0 bg-foreground/25 backdrop-blur-[2px] z-[60] flex items-center justify-center p-4" onClick={() => setShowPostOffer(false)}>
          <div className="bg-elevated border border-border rounded-[var(--radius-lg)] w-full max-w-md" style={modalPanelStyle} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="fx-display text-[17px] text-foreground flex items-center gap-2">
                <Package className="w-4 h-4 text-accent" aria-hidden="true" strokeWidth={1.8} /> Offer a Product
              </h2>
              <button onClick={() => setShowPostOffer(false)} aria-label="Close" className="fx-btn-ghost fx-btn p-1.5">
                <X className="w-4 h-4" aria-hidden="true" strokeWidth={1.8} />
              </button>
            </div>
            <div className="space-y-4 p-6">
              <div>
                <label htmlFor="offer-product-name" className="fx-eyebrow mb-1.5 block">Product Name *</label>
                <input id="offer-product-name" value={postForm.productName} onChange={(e) => setPostForm({ ...postForm, productName: e.target.value })}
                  placeholder="e.g. Tata Salt 1kg" className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="offer-quantity" className="fx-eyebrow mb-1.5 block">Quantity *</label>
                  <input id="offer-quantity" type="number" min="1" value={postForm.quantity} onChange={(e) => setPostForm({ ...postForm, quantity: e.target.value })}
                    placeholder="e.g. 30" className={`${inputCls} fx-num`} />
                </div>
                <div>
                  <label htmlFor="offer-unit" className="fx-eyebrow mb-1.5 block">Unit</label>
                  <select id="offer-unit" value={postForm.unit} onChange={(e) => setPostForm({ ...postForm, unit: e.target.value })} className={inputCls}>
                    {["pcs", "kg", "g", "L", "ml", "box", "pack", "dozen"].map((u) => <option key={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="offer-price" className="fx-eyebrow mb-1.5 block">Price per unit (₹)</label>
                  <input id="offer-price" type="number" min="0" step="0.5" value={postForm.price} onChange={(e) => setPostForm({ ...postForm, price: e.target.value })}
                    placeholder="e.g. 25" className={`${inputCls} fx-num`} />
                </div>
                <div>
                  <label htmlFor="offer-category" className="fx-eyebrow mb-1.5 block">Category</label>
                  <input id="offer-category" value={postForm.category} onChange={(e) => setPostForm({ ...postForm, category: e.target.value })}
                    placeholder="e.g. Groceries" className={inputCls} />
                </div>
              </div>
              <div>
                <label htmlFor="offer-message" className="fx-eyebrow mb-1.5 block">Message (optional)</label>
                <input id="offer-message" value={postForm.message} onChange={(e) => setPostForm({ ...postForm, message: e.target.value })}
                  placeholder="e.g. Expiring in 15 days, selling at discount" className={inputCls} />
              </div>
              <button onClick={() => submitPost("offer")} disabled={postLoading || !postForm.productName.trim() || !postForm.quantity}
                className="fx-btn fx-btn-accent w-full">
                {postLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> : <Send className="w-3.5 h-3.5" aria-hidden="true" strokeWidth={1.8} />}
                Post Offer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
