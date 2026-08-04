"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface FloatingSignal {
  id: number;
  text: string;
  x: number;
  y: number;
  type: "positive" | "info" | "accent" | "warning";
}

const SIGNALS = [
  { text: "+8% Demand ↑", type: "positive" as const },
  { text: "Inventory Stable", type: "info" as const },
  { text: "Restock Soon", type: "warning" as const },
  { text: "Forecast Updated", type: "accent" as const },
  { text: "99.4% Accuracy", type: "positive" as const },
  { text: "AI Signal Active", type: "accent" as const },
];

export default function AuthBackground() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [activeSignal, setActiveSignal] = useState<FloatingSignal | null>(null);

  // Mouse tracking for subtle desktop cursor radial glow
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Cycle floating data signals occasionally
  useEffect(() => {
    const interval = setInterval(() => {
      const randomSignal = SIGNALS[Math.floor(Math.random() * SIGNALS.length)];
      // Keep x between 10% and 40% (left panel area)
      const x = Math.floor(Math.random() * 30) + 10;
      // Keep y between 15% and 85%
      const y = Math.floor(Math.random() * 70) + 15;
      
      setActiveSignal({
        id: Date.now(),
        text: randomSignal.text,
        x,
        y,
        type: randomSignal.type,
      });

      // Clear signal after 4 seconds
      setTimeout(() => {
        setActiveSignal(null);
      }, 4000);
    }, 7000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0">
      {/* 20-30s Slow Animated Gradient Ambient Glow */}
      <motion.div
        className="absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] max-w-[900px] max-h-[900px] rounded-full blur-[140px] opacity-[0.22]"
        style={{
          background: "radial-gradient(circle, #0B6E62 0%, #12332D 45%, transparent 70%)",
        }}
        animate={{
          x: [0, 50, -30, 0],
          y: [0, -40, 30, 0],
          scale: [1, 1.12, 0.95, 1],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      <motion.div
        className="absolute -bottom-[20%] -right-[10%] w-[60vw] h-[60vw] max-w-[800px] max-h-[800px] rounded-full blur-[130px] opacity-[0.16]"
        style={{
          background: "radial-gradient(circle, #095A50 0%, #062420 50%, transparent 75%)",
        }}
        animate={{
          x: [0, -40, 40, 0],
          y: [0, 30, -50, 0],
          scale: [1, 0.9, 1.1, 1],
        }}
        transition={{
          duration: 28,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Faint AI Neural Network Grid */}
      <div 
        className="absolute inset-0 opacity-[0.035] dark:opacity-[0.05]"
        style={{
          backgroundImage: `radial-gradient(rgba(245, 243, 237, 0.6) 1px, transparent 1px)`,
          backgroundSize: "32px 32px",
        }}
      />

      {/* Desktop Cursor Radial Glow (<10% opacity) */}
      <div
        className="hidden lg:block fixed pointer-events-none rounded-full blur-[90px] transition-transform duration-300 ease-out z-0"
        style={{
          width: "450px",
          height: "450px",
          left: `${mousePos.x - 225}px`,
          top: `${mousePos.y - 225}px`,
          background: "radial-gradient(circle, rgba(11, 110, 98, 0.14) 0%, rgba(59, 184, 165, 0.04) 50%, transparent 70%)",
        }}
      />

      {/* Floating Data Signals */}
      <AnimatePresence>
        {activeSignal && (
          <motion.div
            key={activeSignal.id}
            initial={{ opacity: 0, y: 12, scale: 0.92 }}
            animate={{ opacity: 0.85, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.95 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="absolute hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold tracking-wide border backdrop-blur-md z-10 shadow-lg"
            style={{
              left: `${activeSignal.x}%`,
              top: `${activeSignal.y}%`,
              backgroundColor: "rgba(18, 51, 45, 0.65)",
              borderColor: "rgba(245, 243, 237, 0.15)",
              color: "#F5F3ED",
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full animate-ping"
              style={{
                backgroundColor:
                  activeSignal.type === "positive" ? "#58B57F" :
                  activeSignal.type === "warning" ? "#D9A03E" : "#3BB8A5",
              }}
            />
            <span>{activeSignal.text}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
