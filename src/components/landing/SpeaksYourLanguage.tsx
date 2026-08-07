"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "framer-motion";
import { Mic } from "lucide-react";
import { Reveal, EASE_OUT } from "@/lib/motion-primitives";

/**
 * The accessibility argument, shown rather than claimed.
 *
 * A shopkeeper speaks a sentence and the console answers it. The phrasing
 * alternates between English and Hindi on a slow cycle, which is the only
 * ambient loop on the page: it carries the meaning of the section, so it is
 * not decoration. It pauses when off screen and stops under reduced motion.
 */
const EXCHANGES = [
  {
    lang: "en" as const,
    dir: "Aaj kitna bika?",
    said: "How much did we sell today?",
    reply: "₹18,240 across 96 bills. Cold drinks led, up 31 percent on last Tuesday.",
  },
  {
    lang: "hi" as const,
    dir: "इस हफ्ते क्या खत्म होने वाला है?",
    said: "What is running out this week?",
    reply: "चार चीज़ें कम हैं। सबसे ज़रूरी: अमूल दूध, दो दिन का स्टॉक बचा है।",
  },
  {
    lang: "en" as const,
    dir: "Order the biscuits",
    said: "Order the biscuits",
    reply: "Drafted: 14 cartons of Parle-G from Shree Traders. Sending needs your approval.",
  },
];

export default function SpeaksYourLanguage() {
  const [index, setIndex] = useState(0);
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "-20% 0px" });

  useEffect(() => {
    if (reduce || !inView) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % EXCHANGES.length);
    }, 4200);
    return () => clearInterval(id);
  }, [reduce, inView]);

  const current = EXCHANGES[index];

  return (
    <section className="relative border-t py-24 lg:py-32">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-10">
        <div className="grid gap-12 lg:grid-cols-12 lg:items-center lg:gap-16">
          <Reveal className="lg:col-span-5" direction="right">
            <h2 className="fx-display max-w-[16ch] text-[2.1rem] leading-[1.1] tracking-[-0.02em] sm:text-5xl">
              Ask it out loud. In your own language.
            </h2>
            <p className="mt-5 max-w-[46ch] text-[15.5px] leading-relaxed text-[var(--muted-foreground)]">
              The console speaks English and Hindi, and it answers by voice. A shop
              owner should not have to learn dashboard vocabulary to run their own
              shop.
            </p>

            {/* Selector doubles as the progress indicator for the loop. */}
            <div className="mt-8 flex gap-2" role="tablist" aria-label="Example questions">
              {EXCHANGES.map((e, i) => (
                <button
                  key={e.dir}
                  type="button"
                  role="tab"
                  aria-selected={i === index}
                  onClick={() => setIndex(i)}
                  className={`fx-press h-1.5 w-10 rounded-full transition-colors ${
                    i === index ? "bg-[var(--accent)]" : "bg-[var(--border-strong)]"
                  }`}
                >
                  <span className="sr-only">Example {i + 1}</span>
                </button>
              ))}
            </div>
          </Reveal>

          <div ref={ref} className="lg:col-span-7">
            <Reveal direction="left" delay={0.06}>
              <div className="fx-card min-h-[19rem] p-6 lg:p-9">
                <div className="flex items-center gap-3">
                  <span className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--accent-soft)]">
                    <Mic
                      size={15}
                      strokeWidth={1.8}
                      className="text-[var(--accent)]"
                      aria-hidden="true"
                    />
                    {!reduce && inView && (
                      <span
                        aria-hidden="true"
                        className="fx-pulse-soft absolute inset-0 rounded-full border border-[var(--accent-border)]"
                      />
                    )}
                  </span>
                  <span className="fx-eyebrow">Jarvis</span>
                </div>

                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={index}
                    initial={reduce ? false : { opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduce ? undefined : { opacity: 0, y: -8 }}
                    transition={{ duration: 0.3, ease: EASE_OUT }}
                    className="mt-7"
                  >
                    <p
                      lang={current.lang}
                      className="fx-display text-[1.5rem] leading-[1.3] tracking-[-0.01em] sm:text-[1.9rem]"
                    >
                      {current.dir}
                    </p>
                    {current.dir !== current.said && (
                      <p className="mt-2 text-[13px] text-[var(--muted-foreground)]">
                        {current.said}
                      </p>
                    )}

                    <div className="fx-rule mt-7 pt-6">
                      <p
                        lang={current.lang === "hi" ? "hi" : "en"}
                        className="max-w-[50ch] text-[15.5px] leading-relaxed text-[var(--secondary-foreground)]"
                      >
                        {current.reply}
                      </p>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
