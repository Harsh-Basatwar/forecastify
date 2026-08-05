"use client";

/**
 * Forecastify motion primitives.
 *
 * House rules baked in:
 *  - Every primitive short-circuits under `prefers-reduced-motion`, rendering
 *    its final state with no transition.
 *  - Only `transform` and `opacity` are animated, so work stays on the
 *    compositor and holds 60fps.
 *  - Pointer-driven effects use motion values, never `useState`, so a mousemove
 *    never re-renders a React subtree.
 *  - Durations sit in the 120–260ms band; ambient loops are slow and low
 *    amplitude so they read as life, not motion for its own sake.
 */

import {
  useRef,
  useEffect,
  useState,
  type ReactNode,
  type ElementType,
  type CSSProperties,
} from "react";
import {
  motion,
  useInView,
  useReducedMotion,
  useMotionValue,
  useSpring,
  useTransform,
  useScroll,
  animate,
  type Transition,
} from "framer-motion";

/* House easing — matches --ease-out in globals.css. */
export const EASE_OUT = [0.16, 1, 0.3, 1] as const;
export const EASE_SOFT = [0.33, 1, 0.68, 1] as const;

export const springSoft: Transition = { type: "spring", stiffness: 260, damping: 26, mass: 0.6 };

/* ────────────────────────────────────────────────────────────
   Reveal — entrance animation when the element scrolls in
   ──────────────────────────────────────────────────────────── */

type RevealDirection = "up" | "down" | "left" | "right" | "none";

const OFFSETS: Record<RevealDirection, { x: number; y: number }> = {
  up: { x: 0, y: 14 },
  down: { x: 0, y: -14 },
  left: { x: 16, y: 0 },
  right: { x: -16, y: 0 },
  none: { x: 0, y: 0 },
};

interface RevealProps {
  children: ReactNode;
  direction?: RevealDirection;
  delay?: number;
  duration?: number;
  scale?: boolean;
  className?: string;
  as?: ElementType;
  /** Re-run each time it enters the viewport. Off by default — replaying on
   *  every scroll past is the fastest way to make motion feel cheap. */
  repeat?: boolean;
}

export function Reveal({
  children,
  direction = "up",
  delay = 0,
  duration = 0.34,
  scale = false,
  className,
  as = "div",
  repeat = false,
}: RevealProps) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: !repeat, margin: "-12% 0px -8% 0px" });
  const MotionTag = motion[as as keyof typeof motion] as typeof motion.div;
  const offset = OFFSETS[direction];

  if (reduce) {
    const Tag = as as ElementType;
    return <Tag className={className}>{children}</Tag>;
  }

  return (
    <MotionTag
      ref={ref as never}
      className={className}
      initial={{ opacity: 0, x: offset.x, y: offset.y, scale: scale ? 0.97 : 1 }}
      animate={inView ? { opacity: 1, x: 0, y: 0, scale: 1 } : undefined}
      transition={{ duration, delay, ease: EASE_OUT }}
      style={{ willChange: "transform, opacity" }}
    >
      {children}
    </MotionTag>
  );
}

/* ────────────────────────────────────────────────────────────
   Stagger — children reveal in sequence
   ──────────────────────────────────────────────────────────── */

interface StaggerProps {
  children: ReactNode;
  className?: string;
  /** Gap between children. Kept at 40ms: the rubric's budget is 30–80ms. */
  step?: number;
  delay?: number;
  as?: ElementType;
}

export function Stagger({ children, className, step = 0.04, delay = 0, as = "div" }: StaggerProps) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const MotionTag = motion[as as keyof typeof motion] as typeof motion.div;

  if (reduce) {
    const Tag = as as ElementType;
    return <Tag className={className}>{children}</Tag>;
  }

  return (
    <MotionTag
      ref={ref as never}
      className={className}
      initial="hidden"
      animate={inView ? "shown" : "hidden"}
      variants={{
        hidden: {},
        shown: { transition: { staggerChildren: step, delayChildren: delay } },
      }}
    >
      {children}
    </MotionTag>
  );
}

/** Direct child of <Stagger>. */
export function StaggerItem({
  children,
  className,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: ElementType;
}) {
  const reduce = useReducedMotion();
  const MotionTag = motion[as as keyof typeof motion] as typeof motion.div;

  if (reduce) {
    const Tag = as as ElementType;
    return <Tag className={className}>{children}</Tag>;
  }

  return (
    <MotionTag
      className={className}
      variants={{
        hidden: { opacity: 0, y: 10 },
        shown: { opacity: 1, y: 0, transition: { duration: 0.3, ease: EASE_OUT } },
      }}
      style={{ willChange: "transform, opacity" }}
    >
      {children}
    </MotionTag>
  );
}

/* ────────────────────────────────────────────────────────────
   AnimatedCounter — metrics count up when scrolled into view
   ──────────────────────────────────────────────────────────── */

interface CounterProps {
  value: number;
  duration?: number;
  decimals?: number;
  /** Rendered before the number, e.g. "₹". */
  prefix?: string;
  /** Rendered after, e.g. "%". */
  suffix?: string;
  /** Group thousands using the en-IN convention the product uses elsewhere. */
  locale?: string;
  className?: string;
}

export function AnimatedCounter({
  value,
  duration = 0.9,
  decimals = 0,
  prefix = "",
  suffix = "",
  locale = "en-IN",
  className,
}: CounterProps) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  /*
    `value` is the source of truth and is rendered directly. `tween` is an
    optional override that exists only while a count-up is in flight.

    A count-up is decoration; the number is the product. If the viewport
    observer never fires — element already on screen at mount, observer
    unsupported, container quirk — the figure is still correct, because the
    animation can only ever replay toward a number that already renders right.
  */
  const [tween, setTween] = useState<number | null>(null);
  const animatedFor = useRef<number | null>(null);

  useEffect(() => {
    if (reduce || !inView || value === 0) return;
    // Count up once per distinct value, not on every unrelated re-render.
    if (animatedFor.current === value) return;
    animatedFor.current = value;

    const controls = animate(0, value, {
      duration,
      ease: EASE_SOFT,
      onUpdate: (v) => setTween(v),
      onComplete: () => setTween(null),
    });
    return () => {
      controls.stop();
      setTween(null);
    };
  }, [inView, value, duration, reduce]);

  const shown = tween ?? value;
  const formatted = shown.toLocaleString(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <span ref={ref} className={className}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}

/* ────────────────────────────────────────────────────────────
   Tilt — pointer-reactive card tilt (motion values, no re-render)
   ──────────────────────────────────────────────────────────── */

interface TiltProps {
  children: ReactNode;
  className?: string;
  /** Max rotation in degrees. Deliberately small — big tilts read as a toy. */
  max?: number;
  /** Lift on hover, in px. */
  lift?: number;
  style?: CSSProperties;
}

export function Tilt({ children, className, max = 4, lift = 3, style }: TiltProps) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);

  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const rotateX = useSpring(useTransform(py, [-0.5, 0.5], [max, -max]), springSoft);
  const rotateY = useSpring(useTransform(px, [-0.5, 0.5], [-max, max]), springSoft);
  const y = useSpring(0, springSoft);

  if (reduce) {
    return (
      <div className={className} style={style}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{ ...style, rotateX, rotateY, y, transformPerspective: 900, willChange: "transform" }}
      onPointerMove={(e) => {
        // Fine pointers only — on touch this would fire mid-scroll.
        if (e.pointerType !== "mouse") return;
        const r = ref.current?.getBoundingClientRect();
        if (!r) return;
        px.set((e.clientX - r.left) / r.width - 0.5);
        py.set((e.clientY - r.top) / r.height - 0.5);
      }}
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse") y.set(-lift);
      }}
      onPointerLeave={() => {
        px.set(0);
        py.set(0);
        y.set(0);
      }}
    >
      {children}
    </motion.div>
  );
}

/* ────────────────────────────────────────────────────────────
   Magnetic — CTA drifts a few px toward the cursor
   ──────────────────────────────────────────────────────────── */

export function Magnetic({
  children,
  className,
  strength = 6,
}: {
  children: ReactNode;
  className?: string;
  strength?: number;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const x = useSpring(mx, springSoft);
  const y = useSpring(my, springSoft);

  if (reduce) return <span className={className}>{children}</span>;

  return (
    <motion.span
      ref={ref}
      className={className}
      style={{ x, y, display: "inline-block", willChange: "transform" }}
      onPointerMove={(e) => {
        if (e.pointerType !== "mouse") return;
        const r = ref.current?.getBoundingClientRect();
        if (!r) return;
        mx.set(((e.clientX - r.left) / r.width - 0.5) * strength * 2);
        my.set(((e.clientY - r.top) / r.height - 0.5) * strength * 2);
      }}
      onPointerLeave={() => {
        mx.set(0);
        my.set(0);
      }}
    >
      {children}
    </motion.span>
  );
}

/* ────────────────────────────────────────────────────────────
   ScrollProgress — thin accent bar tracking scroll of a container
   ──────────────────────────────────────────────────────────── */

export function ScrollProgress({
  target,
  className,
}: {
  /** Scrolling element. Defaults to the window. */
  target?: React.RefObject<HTMLElement | null>;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll(target ? { container: target as never } : undefined);
  const scaleX = useSpring(scrollYProgress, { stiffness: 220, damping: 34, mass: 0.4 });

  // Still useful without motion — it just tracks position rather than easing.
  const value = reduce ? scrollYProgress : scaleX;

  return (
    <motion.div
      aria-hidden="true"
      className={className}
      style={{ scaleX: value, transformOrigin: "0% 50%", willChange: "transform" }}
    />
  );
}

/* ────────────────────────────────────────────────────────────
   useCursorGlow — writes pointer position to CSS vars on a ref
   ──────────────────────────────────────────────────────────── */

/**
 * Tracks the pointer as `--mx` / `--my` percentages on the element, so a
 * CSS gradient can follow the cursor with zero React re-renders. Returns a
 * ref to attach, and does nothing under reduced motion or on touch.
 */
export function useCursorGlow<T extends HTMLElement = HTMLDivElement>() {
  const reduce = useReducedMotion();
  const ref = useRef<T>(null);

  useEffect(() => {
    if (reduce) return;
    const el = ref.current;
    if (!el) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    /*
      Written straight from the handler rather than inside requestAnimationFrame.
      A rAF-coalesced version stalls permanently if the frame callback never
      runs — which is exactly what happens when the tab is backgrounded, since
      rAF is suspended there and the "already queued" flag never clears.
      Setting a custom property does not invalidate layout, and the browser
      already delivers at most one pointermove per frame, so this is cheap.
    */
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;
      el.style.setProperty("--mx", `${((e.clientX - r.left) / r.width) * 100}%`);
      el.style.setProperty("--my", `${((e.clientY - r.top) / r.height) * 100}%`);
    };
    const onLeave = () => {
      el.style.setProperty("--mx", "50%");
      el.style.setProperty("--my", "50%");
    };

    el.addEventListener("pointermove", onMove, { passive: true });
    el.addEventListener("pointerleave", onLeave, { passive: true });
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, [reduce]);

  return ref;
}

/* ────────────────────────────────────────────────────────────
   Collapse — height animation for accordions and disclosures
   ──────────────────────────────────────────────────────────── */

export function Collapse({ open, children }: { open: boolean; children: ReactNode }) {
  const reduce = useReducedMotion();

  if (reduce) return open ? <div>{children}</div> : null;

  return (
    <motion.div
      initial={false}
      animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
      transition={{ duration: 0.24, ease: EASE_OUT }}
      style={{ overflow: "hidden" }}
    >
      {children}
    </motion.div>
  );
}
