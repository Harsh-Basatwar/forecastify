"use client";

import Image from "next/image";
import {
  BookOpen,
  Clock,
  ShoppingCart,
  Sunrise,
  Building2,
} from "lucide-react";
import { Reveal, Tilt, AnimatedCounter } from "@/lib/motion-primitives";

/**
 * Five capabilities, five cells. The grid is shaped around the content rather
 * than the content padded out to fill a grid, so there is no empty tile.
 */
export default function AutopilotBento() {
  return (
    <section id="autopilot" className="relative scroll-mt-20 py-24 lg:py-32">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-10">
        <Reveal>
          <h2 className="fx-display max-w-[22ch] text-[2.1rem] leading-[1.1] tracking-[-0.02em] sm:text-5xl">
            Forecasting is the hard part. The rest should just happen.
          </h2>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-6 lg:gap-5">
          {/* Wide cell, photographic */}
          <Reveal className="md:col-span-4" delay={0.02}>
            <Tilt className="h-full">
              <article className="fx-card fx-zoom relative h-full min-h-[19rem] overflow-hidden p-0">
                {/* Placeholder photography, see CostOfGuessing for the swap note. */}
                <Image
                  src="https://picsum.photos/seed/forecastify-kirana-counter/1400/900"
                  alt="A neighbourhood grocery counter at the start of the day."
                  fill
                  unoptimized
                  sizes="(max-width: 768px) 100vw, 66vw"
                  className="fx-zoom-target object-cover"
                />
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-[var(--accent)] opacity-[0.18] mix-blend-color"
                />
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-t from-[var(--card)] via-[color-mix(in_srgb,var(--card)_72%,transparent)] to-transparent"
                />
                <div className="relative flex h-full flex-col justify-end p-6 lg:p-8">
                  <Sunrise
                    size={20}
                    strokeWidth={1.6}
                    className="text-[var(--accent)]"
                    aria-hidden="true"
                  />
                  <h3 className="mt-4 text-[20px] font-semibold tracking-[-0.01em]">
                    The morning brief
                  </h3>
                  <p className="mt-2 max-w-[38ch] text-[14.5px] leading-relaxed text-[var(--secondary-foreground)]">
                    What to reorder, what expires this week, who owes you money, and
                    what yesterday actually earned. Waiting before you open the
                    shutters.
                  </p>
                </div>
              </article>
            </Tilt>
          </Reveal>

          {/* Tall cell, accent field */}
          <Reveal className="md:col-span-2 md:row-span-2" delay={0.06}>
            <article className="fx-card relative h-full min-h-[19rem] overflow-hidden border-[var(--accent-border)] bg-[var(--accent-soft)] p-6 lg:p-8">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[var(--accent)] opacity-[0.10] blur-2xl"
              />
              <BookOpen
                size={20}
                strokeWidth={1.6}
                className="text-[var(--accent)]"
                aria-hidden="true"
              />
              <h3 className="mt-4 text-[20px] font-semibold tracking-[-0.01em]">
                Khata, without the notebook
              </h3>
              <p className="mt-2.5 text-[14.5px] leading-relaxed text-[var(--secondary-foreground)]">
                Credit given, credit due, and who to remind. The ledger every kirana
                already keeps, kept properly.
              </p>

              <div className="fx-rule mt-8 pt-6">
                <p className="fx-num fx-metric-xl tabular-nums text-[var(--accent)]">
                  <AnimatedCounter value={11} prefix="₹" suffix="k" />
                </p>
                <p className="mt-1 text-[12.5px] text-[var(--muted-foreground)]">
                  outstanding across 23 customers, in this sample ledger
                </p>
              </div>
            </article>
          </Reveal>

          {/* Two narrow cells */}
          <Reveal className="md:col-span-2" delay={0.1}>
            <article className="fx-card fx-lift h-full p-6">
              <Clock
                size={19}
                strokeWidth={1.6}
                className="text-[var(--accent)]"
                aria-hidden="true"
              />
              <h3 className="mt-4 text-[17px] font-semibold tracking-[-0.01em]">
                Expiry shield
              </h3>
              <p className="mt-2 text-[14px] leading-relaxed text-[var(--muted-foreground)]">
                Batch level shelf-life tracking that proposes a discount while the
                stock is still worth something.
              </p>
            </article>
          </Reveal>

          <Reveal className="md:col-span-2" delay={0.14}>
            <article className="fx-card fx-lift h-full p-6">
              <ShoppingCart
                size={19}
                strokeWidth={1.6}
                className="text-[var(--accent)]"
                aria-hidden="true"
              />
              <h3 className="mt-4 text-[17px] font-semibold tracking-[-0.01em]">
                Procurement
              </h3>
              <p className="mt-2 text-[14px] leading-relaxed text-[var(--muted-foreground)]">
                Purchase orders, goods receipts and supplier prices, with a browser
                extension that fills the distributor cart for you.
              </p>
            </article>
          </Reveal>

          {/* Full-width closing cell, mono register */}
          <Reveal className="md:col-span-6" delay={0.18}>
            <article className="fx-card flex h-full flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between lg:p-8">
              <div>
                <Building2
                  size={19}
                  strokeWidth={1.6}
                  className="text-[var(--accent)]"
                  aria-hidden="true"
                />
                <h3 className="mt-4 text-[17px] font-semibold tracking-[-0.01em]">
                  One shop, or forty
                </h3>
                <p className="mt-2 max-w-[54ch] text-[14px] leading-relaxed text-[var(--muted-foreground)]">
                  Stock transfers between outlets, central purchasing, and ten
                  permission roles so a cashier sees the till while the owner sees the
                  region.
                </p>
              </div>
              <dl className="flex shrink-0 gap-8 sm:gap-10">
                {[
                  { n: 10, label: "roles" },
                  { n: 30, label: "consoles" },
                  { n: 2, label: "languages" },
                ].map((s) => (
                  <div key={s.label}>
                    <dt className="sr-only">{s.label}</dt>
                    <dd className="fx-num fx-metric-lg tabular-nums">
                      <AnimatedCounter value={s.n} />
                    </dd>
                    <p className="mt-1 text-[12px] text-[var(--muted-foreground)]">
                      {s.label}
                    </p>
                  </div>
                ))}
              </dl>
            </article>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
