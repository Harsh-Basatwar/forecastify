"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Cpu, RefreshCw, BarChart2, ArrowRight } from "lucide-react";

interface SuccessOverlayProps {
  show: boolean;
  onComplete: () => void;
}

const STEPS = [
  { text: "Authenticated", icon: CheckCircle2 },
  { text: "Syncing Inventory Data", icon: RefreshCw },
  { text: "Loading AI Models", icon: Cpu },
  { text: "Fetching Market Signals", icon: BarChart2 },
  { text: "Opening Dashboard", icon: ArrowRight },
];

export default function SuccessOverlay({ show, onComplete }: SuccessOverlayProps) {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (!show) return;

    // Realistic variable durations for each step to look authentic and premium
    const stepDelays = [650, 1200, 1000, 950, 700];
    let timeoutId: NodeJS.Timeout;

    const runStep = (step: number) => {
      if (step >= STEPS.length - 1) {
        timeoutId = setTimeout(onComplete, 600);
        return;
      }

      timeoutId = setTimeout(() => {
        setCurrentStep(step + 1);
        runStep(step + 1);
      }, stepDelays[step]);
    };

    runStep(0);

    return () => clearTimeout(timeoutId);
  }, [show, onComplete]);

  if (!show) return null;

  const CurrentIcon = STEPS[currentStep].icon;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xl select-none"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 350, damping: 25 }}
        className="flex flex-col items-center justify-center p-8 sm:p-12 rounded-3xl bg-[#12332D] text-[#F5F3ED] border border-white/15 shadow-2xl max-w-sm w-full text-center"
      >
        <div className="relative mb-6">
          <motion.div
            key={currentStep}
            initial={{ scale: 0.5, rotate: -45, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-lg"
          >
            <CurrentIcon className={`w-8 h-8 ${currentStep === 1 ? "animate-spin" : "animate-pulse"}`} />
          </motion.div>
        </div>

        <AnimatePresence mode="wait">
          <motion.p
            key={currentStep}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="text-lg font-semibold tracking-tight"
            style={{ fontFamily: "var(--font-display), Georgia, serif" }}
          >
            {STEPS[currentStep].text}
          </motion.p>
        </AnimatePresence>

        {/* Step dots */}
        <div className="flex items-center gap-1.5 mt-6">
          {STEPS.map((_, idx) => (
            <div
              key={idx}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                idx <= currentStep ? "w-6 bg-emerald-400" : "w-1.5 bg-white/20"
              }`}
            />
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
