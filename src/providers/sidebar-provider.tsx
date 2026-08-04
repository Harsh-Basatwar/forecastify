"use client";

import React, { createContext, useContext, useEffect, useState, useRef } from "react";

interface SidebarContextType {
  isExpanded: boolean;
  isPinned: boolean;
  isHovered: boolean;
  isMobileOpen: boolean;
  togglePin: () => void;
  toggleMobile: () => void;
  setMobileOpen: (open: boolean) => void;
  setHovered: (hovered: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isPinned, setIsPinned] = useState<boolean>(true); // default to expanded/pinned
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [isMobileOpen, setIsMobileOpen] = useState<boolean>(false);

  const enterTimerRef = useRef<NodeJS.Timeout | null>(null);
  const leaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Persistence on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("sidebar:pinned");
      if (stored !== null) {
        setIsPinned(JSON.parse(stored));
      }
    } catch (e) {
      console.warn("Storage access failed", e);
    }
  }, []);

  // 2. Keyboard Shortcuts: [ to collapse, ] to expand, Ctrl+\ / Cmd+\ to pin
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInputFocused = () => {
        const el = document.activeElement;
        return el && (
          el.tagName === "INPUT" || 
          el.tagName === "TEXTAREA" || 
          el.getAttribute("contenteditable") === "true"
        );
      };

      if (isInputFocused()) return;

      if ((e.metaKey || e.ctrlKey) && e.key === "\\") {
        e.preventDefault();
        togglePin();
      } else if (e.key === "[") {
        e.preventDefault();
        setIsHovered(false);
        setIsPinned(false);
        try {
          localStorage.setItem("sidebar:pinned", JSON.stringify(false));
        } catch {}
      } else if (e.key === "]") {
        e.preventDefault();
        setIsPinned(true);
        try {
          localStorage.setItem("sidebar:pinned", JSON.stringify(true));
        } catch {}
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPinned]);

  const togglePin = () => {
    setIsPinned((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("sidebar:pinned", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // 3. Debounced hover handlers to prevent accidental triggers
  const handleSetHovered = (hovered: boolean) => {
    if (hovered) {
      if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
      // Wait 120ms before expanding to ensure intent
      enterTimerRef.current = setTimeout(() => {
        setIsHovered(true);
      }, 120);
    } else {
      if (enterTimerRef.current) clearTimeout(enterTimerRef.current);
      // Wait 200ms before collapsing in case cursor briefly slips off
      leaveTimerRef.current = setTimeout(() => {
        setIsHovered(false);
      }, 200);
    }
  };

  const toggleMobile = () => setIsMobileOpen((prev) => !prev);

  // Compute final display state
  const isExpanded = isPinned || isHovered || isMobileOpen;

  return (
    <SidebarContext.Provider
      value={{
        isExpanded,
        isPinned,
        isHovered,
        isMobileOpen,
        togglePin,
        toggleMobile,
        setMobileOpen: setIsMobileOpen,
        setHovered: handleSetHovered,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
}
