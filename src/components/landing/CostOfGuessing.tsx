"use client";

import Image from "next/image";
import { PackageX, Trash2 } from "lucide-react";
import { Reveal, AnimatedCounter } from "@/lib/motion-primitives";

/**
 * The problem, stated as an opposition rather than a feature list: a shop can
 * only fail in two directions, and both are failures of the same guess.
 */
const FAILURES = [
  {
    icon: PackageX,
    photo: "/outofstock.jpeg",
    alt: "A shopkeeper turning a customer away from an empty fridge while the customer walks to the shop next door.",
    title: "You ran out",
    body: "The customer wanted it, you did not have it. They walk to the next shop, and often they keep going there.",
    stat: 82,
    statSuffix: "%",
    statLabel: "fewer stockouts",
  },
  {
    icon: Trash2,
    photo: "/boughttoomuch.jpeg",
    alt: "A shopkeeper checking a clipboard against shelves of expiry-tagged stock, with expired goods already in the bin.",
    title: "You bought too much",
    body: "Capital sits on the shelf until the date passes. Then it is not stock any more, it is loss you already paid for.",
    stat: 76,
    statSuffix: "%",
    statLabel: "less expiry waste",
  },
];

export default function CostOfGuessing() {
  return (
    <section id="cost" className="relative scroll-mt-20 py-24 lg:py-32">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-10">
        <Reveal>
          <h2 className="fx-display max-w-[18ch] text-[2.1rem] leading-[1.1] tracking-[-0.02em] sm:text-5xl">
            There are only two ways a shop loses money.
          </h2>
          <p className="mt-5 max-w-[54ch] text-[15.5px] leading-relaxed text-[var(--muted-foreground)]">
            Both come from the same place. Somebody had to guess how much to buy, and
            the guess was made from memory.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-5 md:grid-cols-2 lg:gap-6">
          {FAILURES.map((f, i) => (
            <Reveal key={f.title} delay={i * 0.08} direction={i === 0 ? "left" : "right"}>
              <article className="fx-card fx-lift group relative h-full overflow-hidden p-0">
                <div className="fx-zoom relative aspect-[16/10] w-full bg-white">
                  <Image
                    src={f.photo}
                    alt={f.alt}
                    fill
                    priority={i === 0}
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover"
                  />
                  {/* These illustrations are already drawn on the brand palette,
                      so they need no duotone wash to read as one system. The
                      white plate stays fixed in both themes for the same reason. */}
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 bg-gradient-to-t from-[var(--card)] via-transparent to-transparent"
                  />
                </div>

                <div className="p-6 lg:p-8">
                  <f.icon
                    size={20}
                    strokeWidth={1.6}
                    className="text-[var(--accent)]"
                    aria-hidden="true"
                  />
                  <h3 className="mt-4 text-[19px] font-semibold tracking-[-0.01em]">
                    {f.title}
                  </h3>
                  <p className="mt-2.5 max-w-[42ch] text-[14.5px] leading-relaxed text-[var(--muted-foreground)]">
                    {f.body}
                  </p>

                  <div className="fx-rule mt-7 pt-5">
                    <p className="fx-num fx-metric-xl text-[var(--accent)] tabular-nums">
                      <AnimatedCounter value={f.stat} suffix={f.statSuffix} />
                    </p>
                    <p className="mt-1 text-[12.5px] text-[var(--muted-foreground)]">
                      {f.statLabel}, the target this system is built to hit
                    </p>
                  </div>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
