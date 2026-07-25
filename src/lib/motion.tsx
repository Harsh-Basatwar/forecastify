"use client";
import { forwardRef, createElement, type ReactNode } from "react";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Lightweight drop-in shim for framer-motion.
 * Strips animation props and renders plain HTML/SVG elements.
 * Replace with `import { motion, AnimatePresence } from "framer-motion"` once installed.
 */

const cache = new Map<string, any>();

export const motion: Record<string, any> = new Proxy({} as any, {
  get: (_target, prop: string) => {
    if (cache.has(prop)) return cache.get(prop);
    const Comp = forwardRef((props: any, ref: any) => {
      const {
        initial, animate, exit, transition,
        whileHover, whileTap, whileInView, whileFocus, whileDrag,
        variants, layout, layoutId,
        onAnimationComplete, onAnimationStart,
        dragConstraints, drag, dragElastic, dragMomentum,
        ...htmlProps
      } = props;
      return createElement(prop, { ...htmlProps, ref });
    });
    Comp.displayName = `motion.${prop}`;
    cache.set(prop, Comp);
    return Comp;
  },
});

export function AnimatePresence({
  children,
}: {
  children: ReactNode;
  mode?: string;
  initial?: boolean;
  onExitComplete?: () => void;
}) {
  return <>{children}</>;
}
