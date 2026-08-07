"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Reveal, EASE_OUT } from "@/lib/motion-primitives";

/**
 * The ideology, made operable.
 *
 * The reader picks a question and sees the answer the console would give.
 * Interactive rather than illustrated, because the claim is that you can
 * interrogate the forecast, and a static graphic cannot demonstrate that.
 */
const QUESTIONS = [
  {
    q: "Why this number?",
    a: "Because 141 units is what the model expects on the festival weekend. Four signals moved it, and the largest was the festival itself at plus 42 percent against a normal Saturday.",
    tag: "Attribution",
  },
  {
    q: "What if the rain misses us?",
    a: "Drop the rainfall signal and the forecast falls to roughly 118 units. The reorder quantity moves from 14 cartons to 11, and the buffer shortens by a day.",
    tag: "Counterfactual",
  },
  {
    q: "How sure are you?",
    a: "Moderately. The interval spans 112 to 170 units, which is wide because this product has only nine weeks of history behind it. Confidence tightens as the log grows.",
    tag: "Confidence",
  },
  {
    q: "Were you right last time?",
    a: "For this product the model has run twelve weeks. Accuracy and drift are tracked per model version, and a version that degrades gets flagged and rolled back.",
    tag: "Track record",
  },
];

export default function ShowsItsWork() {
  const [active, setActive] = useState(0);
  const reduce = useReducedMotion();

  return (
    <section
      id="reasoning"
      className="relative scroll-mt-20 border-t bg-[var(--background-subtle)] py-24 lg:py-32"
    >
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-10">
        <Reveal>
          <p className="fx-eyebrow text-[var(--accent)]">The whole idea</p>
          <h2 className="fx-display mt-4 max-w-[20ch] text-[2.1rem] leading-[1.1] tracking-[-0.02em] sm:text-5xl">
            A number you cannot question is a number you cannot use.
          </h2>
          <p className="mt-5 max-w-[58ch] text-[15.5px] leading-relaxed text-[var(--muted-foreground)]">
            Most forecasting tools hand you a figure and expect belief. Forecastify
            treats every prediction as a claim that has to defend itself. Ask it
            something.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-4 lg:grid-cols-12 lg:gap-8">
          {/* Questions */}
          <div className="lg:col-span-5">
            <ul className="flex flex-col gap-2">
              {QUESTIONS.map((item, i) => {
                const isActive = i === active;
                return (
                  <li key={item.q}>
                    <button
                      type="button"
                      onClick={() => setActive(i)}
                      aria-pressed={isActive}
                      className={`fx-press relative w-full rounded-[var(--radius-md)] border px-4 py-3.5 text-left transition-colors ${
                        isActive
                          ? "border-[var(--accent-border)] bg-[var(--card)]"
                          : "border-[var(--border)] bg-transparent hover:bg-[var(--hover-surface)]"
                      }`}
                    >
                      {isActive && !reduce && (
                        <motion.span
                          layoutId="lp-question-marker"
                          aria-hidden="true"
                          className="absolute inset-y-2 left-0 w-[2px] rounded-full bg-[var(--accent)]"
                          transition={{ duration: 0.25, ease: EASE_OUT }}
                        />
                      )}
                      <span
                        className={`block text-[14.5px] ${
                          isActive
                            ? "text-[var(--foreground)]"
                            : "text-[var(--muted-foreground)]"
                        }`}
                      >
                        {item.q}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Answer */}
          <div className="lg:col-span-7">
            <div className="fx-card flex min-h-[15rem] flex-col justify-center p-6 lg:min-h-[17rem] lg:p-9">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={active}
                  initial={reduce ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduce ? undefined : { opacity: 0, y: -6 }}
                  transition={{ duration: 0.26, ease: EASE_OUT }}
                >
                  <span className="fx-badge fx-badge-accent">
                    {QUESTIONS[active].tag}
                  </span>
                  <p className="mt-5 max-w-[52ch] text-[16.5px] leading-relaxed text-[var(--foreground)]">
                    {QUESTIONS[active].a}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
