"use client";

/**
 * The narrative centre of the page.
 *
 * A sticky stage on the left holds one scene while four chapters scroll past
 * on the right. Scroll position drives the stage through the product's actual
 * sequence: listen, predict, explain, decide. The motion is the argument, so
 * it earns its cost here in a way an ambient loop never would.
 *
 * Progress comes from `useScroll` against the section, never a scroll listener,
 * and is consumed as motion values so a scroll never re-renders this subtree.
 */

import { useRef } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  useReducedMotion,
  type MotionValue,
} from "framer-motion";
import {
  CloudRain,
  PartyPopper,
  Receipt,
  Check,
  X,
  SlidersHorizontal,
} from "lucide-react";
const CHAPTERS = [
  {
    key: "listen",
    title: "It listens before it counts.",
    body: "Every sale you ring up joins the rain due on Thursday, the festival two weeks out, and the offer the shop across the road just posted. One product, many signals, all of them local to you.",
  },
  {
    key: "predict",
    title: "The curve bends before the week does.",
    body: "Those signals become a number with a range around it. Not a single confident guess, but an honest span: this much, probably, and here is how sure the model actually is.",
  },
  {
    key: "explain",
    title: "Then it shows its working.",
    body: "Every forecast breaks down into the things that moved it, each with its own weight. If you disagree with the reason, you can disagree with the number. A figure you cannot interrogate is a figure you cannot trust.",
  },
  {
    key: "decide",
    title: "And it stops, because you decide.",
    body: "Forecastify proposes the order. Accept it, adjust the quantity, or throw it out. Nothing reaches a supplier until a person says so. The instinct stays yours, the arithmetic stops being yours.",
  },
];

/* ── Scenes ──────────────────────────────────────────────────────
   Each scene owns one chapter's visual. They cross-fade on a shared
   progress value rather than mounting and unmounting, so nothing pops. */

function SceneShell({
  children,
  progress,
  index,
  reduce,
}: {
  children: React.ReactNode;
  progress: MotionValue<number>;
  index: number;
  reduce: boolean | null;
}) {
  const n = CHAPTERS.length;
  const start = index / n;
  const end = (index + 1) / n;
  /* Cross-fade overlap. Zero under reduced motion, which turns the same
     mapping into a hard cut: the stage still follows the chapter being read,
     it just swaps instead of dissolving. Freezing on the first scene would
     leave three of the four visuals permanently unreachable. */
  const pad = reduce ? 0.0001 : 0.055;

  const opacity = useTransform(
    progress,
    [start - pad, start + pad, end - pad, end + pad],
    index === 0
      ? [1, 1, 1, 0]
      : index === n - 1
        ? [0, 1, 1, 1]
        : [0, 1, 1, 0]
  );
  const scale = useTransform(
    progress,
    [start - pad, start + pad, end - pad, end + pad],
    reduce ? [1, 1, 1, 1] : [0.97, 1, 1, 0.97]
  );

  return (
    <motion.div
      aria-hidden="true"
      className="absolute inset-0 flex items-center justify-center p-6"
      style={{ opacity, scale }}
    >
      {children}
    </motion.div>
  );
}

const LISTEN_INPUTS = [
  { icon: CloudRain, label: "Rain, 3 days", offset: -34 },
  { icon: PartyPopper, label: "Ganesh Chaturthi", offset: 0 },
  { icon: Receipt, label: "412 sales logged", offset: 34 },
];

/* One row per signal. Extracted so each motion value is created at the top
   level of a component rather than inside a loop. */
function ListenRow({
  pull,
  input,
}: {
  pull: MotionValue<number>;
  input: (typeof LISTEN_INPUTS)[number];
}) {
  const x = useTransform(pull, [0, 1], [0, input.offset]);
  const opacity = useTransform(pull, [0, 1], [1, 0.35]);
  const Icon = input.icon;

  return (
    <motion.div
      style={{ x, opacity }}
      className="flex items-center gap-3 rounded-[var(--radius-md)] border bg-[var(--card)] px-4 py-3"
    >
      <Icon
        size={16}
        strokeWidth={1.7}
        className="text-[var(--accent)]"
        aria-hidden="true"
      />
      <span className="text-[13.5px]">{input.label}</span>
    </motion.div>
  );
}

function SceneListen({ progress }: { progress: MotionValue<number> }) {
  /* Cards converge on the centre as the chapter is read. */
  const pull = useTransform(progress, [0, 0.25], [1, 0]);

  return (
    <div className="w-full max-w-sm">
      <div className="flex flex-col gap-3">
        {LISTEN_INPUTS.map((s) => (
          <ListenRow key={s.label} pull={pull} input={s} />
        ))}
      </div>
      <div className="mt-4 h-px w-full bg-[var(--border-strong)]" />
      <p className="fx-num mt-4 text-center text-[12px] text-[var(--muted-foreground)]">
        one product, three signals
      </p>
    </div>
  );
}

function ScenePredict({ progress }: { progress: MotionValue<number> }) {
  /* The forecast segment draws itself across this chapter's slice of scroll. */
  const len = useTransform(progress, [0.26, 0.46], [0, 1]);
  const bandOpacity = useTransform(progress, [0.34, 0.48], [0, 1]);
  const bandFill = useTransform(bandOpacity, [0, 1], [0, 0.15]);

  return (
    <div className="w-full max-w-md">
      <svg viewBox="0 0 400 200" className="w-full" aria-hidden="true">
        <path
          d="M 12 150 C 60 146, 96 138, 140 132 S 210 120, 240 112"
          fill="none"
          stroke="var(--foreground)"
          strokeWidth="2"
          opacity="0.6"
          strokeLinecap="round"
        />
        <motion.path
          d="M 240 112 C 276 96, 300 52, 330 40 S 376 58, 392 74"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2.5"
          strokeDasharray="6 5"
          strokeLinecap="round"
          style={{ pathLength: len }}
        />
        <motion.path
          d="M 240 112 C 276 78, 300 30, 330 18 S 376 40, 392 56 L 392 92 C 376 76, 352 62, 330 62 S 276 114, 240 112 Z"
          fill="var(--accent)"
          style={{ opacity: bandFill }}
        />
        <line
          x1="240"
          x2="240"
          y1="10"
          y2="170"
          stroke="var(--border-strong)"
          strokeWidth="1"
          strokeDasharray="3 5"
        />
        <circle cx="240" cy="112" r="4" fill="var(--accent)" />
      </svg>
      <motion.p
        style={{ opacity: bandOpacity }}
        className="fx-num mt-2 text-center text-[12px] text-[var(--muted-foreground)]"
      >
        141 units, range 112 to 170
      </motion.p>
    </div>
  );
}

/* A signed contribution breakdown: the honest form for attribution, and the
   reason there is no filled progress track anywhere on this page. */
const DRIVERS = [
  { label: "Festival demand", value: 0.42 },
  { label: "Rain forecast", value: 0.26 },
  { label: "Recent sales trend", value: 0.19 },
  { label: "Competitor discount", value: -0.11 },
];

function DriverRow({
  reveal,
  driver,
  index,
}: {
  reveal: MotionValue<number>;
  driver: (typeof DRIVERS)[number];
  index: number;
}) {
  const grow = useTransform(reveal, [index * 0.16, index * 0.16 + 0.4], [0, 1]);
  const positive = driver.value > 0;

  return (
    <li>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[13px] text-[var(--secondary-foreground)]">
          {driver.label}
        </span>
        <span
          className={`fx-num text-[12.5px] tabular-nums ${
            positive ? "text-[var(--accent)]" : "text-[var(--danger)]"
          }`}
        >
          {positive ? "+" : ""}
          {Math.round(driver.value * 100)}%
        </span>
      </div>
      <div className="mt-1.5 flex h-1.5 items-center">
        <div className="flex w-1/2 justify-end">
          {!positive && (
            <motion.span
              className="block h-1.5 rounded-l-[2px] bg-[var(--danger)]"
              style={{
                scaleX: grow,
                transformOrigin: "right center",
                width: `${Math.abs(driver.value) * 180}%`,
              }}
            />
          )}
        </div>
        <span aria-hidden="true" className="h-3 w-px bg-[var(--border-strong)]" />
        <div className="flex w-1/2">
          {positive && (
            <motion.span
              className="block h-1.5 rounded-r-[2px] bg-[var(--accent)]"
              style={{
                scaleX: grow,
                transformOrigin: "left center",
                width: `${driver.value * 180}%`,
              }}
            />
          )}
        </div>
      </div>
    </li>
  );
}

function SceneExplain({ progress }: { progress: MotionValue<number> }) {
  const reveal = useTransform(progress, [0.52, 0.68], [0, 1]);

  return (
    <div className="w-full max-w-sm">
      <ul className="flex flex-col gap-4">
        {DRIVERS.map((d, i) => (
          <DriverRow key={d.label} reveal={reveal} driver={d} index={i} />
        ))}
      </ul>
      <p className="fx-num mt-6 text-center text-[12px] text-[var(--muted-foreground)]">
        what moved the number
      </p>
    </div>
  );
}

function SceneDecide({ progress }: { progress: MotionValue<number> }) {
  const lift = useTransform(progress, [0.78, 0.92], [14, 0]);
  const fade = useTransform(progress, [0.78, 0.92], [0, 1]);

  return (
    <motion.div style={{ y: lift, opacity: fade }} className="w-full max-w-sm">
      <div className="fx-card p-5">
        <p className="text-[12px] text-[var(--muted-foreground)]">Suggested order</p>
        <p className="mt-1.5 text-[17px] font-semibold tracking-[-0.01em]">
          Parle-G 80g, 14 cartons
        </p>
        <p className="mt-1 text-[13px] text-[var(--muted-foreground)]">
          Covers the festival peak with four days of buffer.
        </p>

        <div className="fx-rule mt-5 flex flex-wrap gap-2 pt-4">
          <span className="fx-btn fx-btn-accent pointer-events-none h-9 px-3.5 text-[13px]">
            <Check size={14} aria-hidden="true" />
            Accept
          </span>
          <span className="fx-btn pointer-events-none h-9 px-3.5 text-[13px]">
            <SlidersHorizontal size={14} aria-hidden="true" />
            Adjust
          </span>
          <span className="fx-btn fx-btn-ghost pointer-events-none h-9 px-3.5 text-[13px]">
            <X size={14} aria-hidden="true" />
            Reject
          </span>
        </div>
      </div>
      <p className="fx-num mt-4 text-center text-[12px] text-[var(--muted-foreground)]">
        nothing is ordered without you
      </p>
    </motion.div>
  );
}

/* ── Section ─────────────────────────────────────────────────── */

export default function StoryScroll() {
  const sectionRef = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });
  /* The spring smooths the scrub. Under reduced motion the raw value is used
     instead, so the stage tracks scroll exactly with no easing to watch. */
  const smoothed = useSpring(scrollYProgress, {
    stiffness: 180,
    damping: 32,
    mass: 0.4,
  });
  const progress = reduce ? scrollYProgress : smoothed;

  return (
    <section
      id="story"
      ref={sectionRef}
      className="relative scroll-mt-16 border-t"
      aria-label="How a forecast becomes a decision"
    >
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:grid lg:grid-cols-12 lg:gap-12 lg:px-10">
        {/* Stage. Sticky on every breakpoint, shorter on small screens so the
            chapter text still has room to breathe underneath it. */}
        <div className="sticky top-16 z-10 -mx-4 h-[42dvh] border-b bg-[var(--background)] sm:-mx-6 lg:top-0 lg:col-span-6 lg:mx-0 lg:h-[100dvh] lg:border-b-0">
          <div className="relative h-full w-full">
            <SceneShell progress={progress} index={0} reduce={reduce}>
              <SceneListen progress={progress} />
            </SceneShell>
            <SceneShell progress={progress} index={1} reduce={reduce}>
              <ScenePredict progress={progress} />
            </SceneShell>
            <SceneShell progress={progress} index={2} reduce={reduce}>
              <SceneExplain progress={progress} />
            </SceneShell>
            <SceneShell progress={progress} index={3} reduce={reduce}>
              <SceneDecide progress={progress} />
            </SceneShell>
          </div>
        </div>

        {/* Chapters */}
        <div className="lg:col-span-6">
          {CHAPTERS.map((c) => (
            <article
              key={c.key}
              className="flex min-h-[68dvh] flex-col justify-center py-12 lg:min-h-[100dvh] lg:py-0"
            >
              <h3 className="fx-display max-w-[20ch] text-[1.9rem] leading-[1.14] tracking-[-0.02em] sm:text-[2.5rem]">
                {c.title}
              </h3>
              <p className="mt-5 max-w-[48ch] text-[15.5px] leading-relaxed text-[var(--muted-foreground)]">
                {c.body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
