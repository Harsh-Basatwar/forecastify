"use client";

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from "react";

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

const STORAGE_KEY = "sidebar:pinned";

/** Read the stored preference during the first render so the rail does not
 *  paint expanded and then snap collapsed. */
function initialPinned(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === null ? true : JSON.parse(stored);
  } catch {
    return true;
  }
}

/** True when focus is somewhere that swallows printable characters. Covers
 *  native fields plus ARIA widgets that behave like them. */
function isTypingContext(): boolean {
  const el = document.activeElement as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (el.isContentEditable) return true;
  const role = el.getAttribute("role");
  return role === "textbox" || role === "combobox" || role === "searchbox" || role === "listbox";
}

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isPinned, setIsPinned] = useState<boolean>(initialPinned);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [isMobileOpen, setIsMobileOpen] = useState<boolean>(false);

  const enterTimerRef = useRef<NodeJS.Timeout | null>(null);
  const leaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const persist = (next: boolean) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Storage unavailable — preference just won't survive the session.
    }
  };

  const togglePin = useCallback(() => {
    setIsPinned((prev) => {
      const next = !prev;
      persist(next);
      return next;
    });
  }, []);

  /*
    Sidebar shortcut. Modifier-based only: bare printable keys as global
    shortcuts fail WCAG 2.1.4, since they fire in any context that is not a
    recognised text field and cannot be turned off.
      Ctrl/Cmd + \  toggles the rail
  */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isTypingContext()) return;
      if ((e.metaKey || e.ctrlKey) && e.key === "\\") {
        e.preventDefault();
        togglePin();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [togglePin]);

  // Debounced hover so a cursor crossing the rail does not expand it.
  const handleSetHovered = useCallback((hovered: boolean) => {
    if (hovered) {
      if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
      enterTimerRef.current = setTimeout(() => setIsHovered(true), 120);
    } else {
      if (enterTimerRef.current) clearTimeout(enterTimerRef.current);
      leaveTimerRef.current = setTimeout(() => setIsHovered(false), 200);
    }
  }, []);

  // Both timers can outlive the component otherwise.
  useEffect(() => {
    return () => {
      if (enterTimerRef.current) clearTimeout(enterTimerRef.current);
      if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
    };
  }, []);

  const toggleMobile = useCallback(() => setIsMobileOpen((prev) => !prev), []);

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
