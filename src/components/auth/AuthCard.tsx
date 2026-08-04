"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";

interface AuthCardProps {
  children: React.ReactNode;
}

export default function AuthCard({ children }: AuthCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  // Subtle desktop mouse parallax (max tilt 2deg)
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const mouseX = e.clientX - centerX;
    const mouseY = e.clientY - centerY;

    // Limit to max 2 deg tilt
    const tiltX = (mouseY / (rect.height / 2)) * -2;
    const tiltY = (mouseX / (rect.width / 2)) * 2;

    setTilt({ x: tiltX, y: tiltY });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
  };

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      initial={{ opacity: 0, y: 24, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
      style={{
        transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
        transition: tilt.x === 0 ? "transform 0.5s ease" : "none",
      }}
      className="w-full max-w-[480px] p-6 sm:p-8 xl:p-10 rounded-3xl bg-card/85 dark:bg-card/70 backdrop-blur-xl border border-border/80 dark:border-white/10 shadow-premium relative z-10"
    >
      {/* Soft inner lighting refraction */}
      <div 
        className="absolute inset-0 rounded-2xl pointer-events-none opacity-50"
        style={{
          background: "radial-gradient(circle at 50% 0%, rgba(11, 110, 98, 0.08) 0%, transparent 60%)",
        }}
      />

      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}
