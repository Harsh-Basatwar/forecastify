"use client";

import { useEffect, useRef, useCallback, type ReactNode } from "react";
import { X } from "lucide-react";

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  /** Rendered in the footer, right-aligned. */
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
}

const SIZES = { sm: "max-w-sm", md: "max-w-md", lg: "max-w-2xl" } as const;

/**
 * Accessible dialog: focus moves in on open, is trapped while open, and
 * returns to the trigger on close. Escape closes, background scroll locks,
 * and the ARIA lives on the panel rather than the click-to-dismiss scrim.
 */
export default function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  const titleId = `modal-title-${title.replace(/\s+/g, "-").toLowerCase()}`;
  const descId = description ? `${titleId}-desc` : undefined;

  // Remember the trigger so focus can be handed back on close.
  useEffect(() => {
    if (open) {
      triggerRef.current = document.activeElement as HTMLElement | null;
    } else if (triggerRef.current) {
      triggerRef.current.focus?.();
      triggerRef.current = null;
    }
  }, [open]);

  // Move focus to the first control inside the panel.
  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (!panel) return;
    const first = panel.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? panel).focus();
  }, [open]);

  // Lock background scroll while open.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;

      const panel = panelRef.current;
      if (!panel) return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null
      );
      if (items.length === 0) return;

      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;

      if (e.shiftKey && (active === first || active === panel)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    },
    [onClose]
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-foreground/25 backdrop-blur-[2px] z-[60] flex items-center justify-center p-4 fx-fade-in"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        tabIndex={-1}
        className={`bg-elevated border border-border rounded-[var(--radius-lg)] w-full ${SIZES[size]} fx-page focus:outline-none`}
        style={{ boxShadow: "var(--shadow-lg)" }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-border">
          <div>
            <h2 id={titleId} className="fx-display text-lg text-foreground">
              {title}
            </h2>
            {description && (
              <p id={descId} className="text-xs text-muted-foreground mt-0.5">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="fx-icon-btn shrink-0 -mr-2 -mt-1"
            aria-label={`Close ${title}`}
          >
            <X className="w-4.5 h-4.5" aria-hidden="true" />
          </button>
        </div>

        <div className="px-6 py-5 max-h-[65vh] overflow-y-auto">{children}</div>

        {footer && (
          <div className="px-6 py-4 border-t border-border flex justify-end gap-2">{footer}</div>
        )}
      </div>
    </div>
  );
}
