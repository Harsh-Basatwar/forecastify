"use client";

import {
  CloudRain,
  PartyPopper,
  Tag,
  Timer,
  Truck,
  CalendarDays,
  Store,
  Thermometer,
} from "lucide-react";
import { Reveal } from "@/lib/motion-primitives";

/**
 * The inputs, moving. A marquee is the right form here because the point is
 * breadth rather than any single item: nobody needs to stop and read one.
 * This is the only marquee on the page.
 */
const SIGNALS = [
  { icon: CloudRain, label: "Rainfall forecast" },
  { icon: PartyPopper, label: "Festival calendar" },
  { icon: Tag, label: "Competitor offers" },
  { icon: Timer, label: "Shelf life remaining" },
  { icon: Truck, label: "Supplier lead time" },
  { icon: CalendarDays, label: "Day of week" },
  { icon: Store, label: "Nearby store demand" },
  { icon: Thermometer, label: "Temperature swing" },
];

function Track({ ariaHidden }: { ariaHidden?: boolean }) {
  return (
    <ul
      aria-hidden={ariaHidden || undefined}
      className="flex shrink-0 items-center gap-3 pr-3"
    >
      {SIGNALS.map((s) => (
        <li
          key={s.label}
          className="flex items-center gap-2.5 rounded-[var(--radius-md)] border bg-[var(--card)] px-4 py-2.5 whitespace-nowrap"
        >
          <s.icon
            size={15}
            strokeWidth={1.7}
            className="shrink-0 text-[var(--accent)]"
            aria-hidden="true"
          />
          <span className="text-[13.5px] text-[var(--secondary-foreground)]">
            {s.label}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default function SignalBand() {
  return (
    <section className="border-y bg-[var(--background-subtle)] py-14 lg:py-16">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-10">
        <Reveal>
          <h2 className="fx-display max-w-[26ch] text-[1.6rem] leading-[1.2] tracking-[-0.015em] sm:text-[2rem]">
            A till only records the past. These say something about next week.
          </h2>
        </Reveal>
      </div>

      <div
        className="lp-marquee mt-10"
        role="group"
        aria-label="Signals the forecast reads"
      >
        <div className="lp-marquee-inner">
          <Track />
          <Track ariaHidden />
        </div>
      </div>
    </section>
  );
}
