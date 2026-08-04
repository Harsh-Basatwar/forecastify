"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import AuthBackground from "@/components/auth/AuthBackground";
import AuthLeftPanel from "@/components/auth/AuthLeftPanel";
import AuthCard from "@/components/auth/AuthCard";
import { AnimatedInput, AnimatedPasswordInput } from "@/components/auth/AuthInputs";
import AuthSubmitButton from "@/components/auth/AuthSubmitButton";
import SuccessOverlay from "@/components/auth/SuccessOverlay";

function MobileBrandHeader() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="lg:hidden flex items-center gap-3 mb-8 justify-center"
    >
      <div
        className="rounded-lg bg-accent flex items-center justify-center shrink-0 shadow-md"
        style={{ width: 36, height: 36 }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M3 20L7 10L11 13L17 6L21 10" stroke="var(--accent-foreground)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="17" cy="6" r="2.3" fill="var(--accent-foreground)" />
        </svg>
      </div>
      <h1 className="fx-display text-[22px] font-semibold text-foreground">Forecastify</h1>
    </motion.div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      return params.get("email") || "doraemonboy288@gmail.com";
    }
    return "doraemonboy288@gmail.com";
  });
  const [password, setPassword] = useState("Darshan@1");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        console.error("Login error:", error);
        if (error.message.toLowerCase().includes("email not confirmed")) {
          setError("Your email is not confirmed yet. Please check your inbox or sign up again.");
        } else {
          setError(error.message);
        }
        setLoading(false);
      } else if (data.session) {
        setLoading(false);
        setShowSuccess(true);
      }
    } catch (err) {
      console.error("Unexpected login error:", err);
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  };

  const handleSuccessComplete = () => {
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen h-screen lg:h-screen lg:max-h-screen lg:overflow-hidden flex flex-col lg:flex-row relative overflow-y-auto lg:overflow-hidden">
      {/* Background layer: ambient glow, neural grid, cursor tracking, data signals */}
      <AuthBackground />

      {/* Success Overlay Animation */}
      <SuccessOverlay show={showSuccess} onComplete={handleSuccessComplete} />

      {/* Left panel — Enterprise Evergreen Editorial (takes 53% width) */}
      <AuthLeftPanel mode="login" />

      {/* Right panel — Form (takes 47% width, has warm off-white background and ambient radial bleed) */}
      <div className="w-full lg:w-[47%] flex flex-col justify-center items-center px-[4vw] py-[5vh] lg:pb-[8vh] relative z-10 lg:h-full lg:max-h-full bg-[#FAF9F6] dark:bg-background transition-colors duration-300">
        {/* Ambient radial glow bleed from left dark green panel to right */}
        <div 
          className="hidden lg:block absolute left-[-150px] top-1/4 w-[300px] h-[50%] rounded-full blur-[100px] pointer-events-none opacity-40 dark:opacity-20 z-0"
          style={{
            background: "radial-gradient(circle, #12332D 0%, transparent 70%)"
          }}
        />

        <AuthCard>
          <MobileBrandHeader />

          {/* Header text */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mb-6 xl:mb-8"
          >
            <h2 className="fx-display text-[26px] xl:text-[32px] font-semibold text-foreground tracking-tight">
              Welcome back
            </h2>
            <p className="text-sm text-muted-foreground mt-1.5">
              Sign in to your forecasting console
            </p>
          </motion.div>

          <form onSubmit={handleLogin} className="space-y-4 xl:space-y-5">
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.96 }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    x: [0, -6, 6, -6, 6, 0], // Error shake
                  }}
                  exit={{ opacity: 0, y: -8, scale: 0.96 }}
                  transition={{
                    x: { duration: 0.4 },
                    default: { duration: 0.2 },
                  }}
                  className="bg-danger/10 border border-danger/25 text-danger rounded-xl px-4 py-3 text-sm font-medium"
                  role="alert"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
            >
              <AnimatedInput
                id="login-email"
                label="Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@yourstore.com"
                required
                autoComplete="email"
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.7 }}
            >
              <AnimatedPasswordInput
                id="login-password"
                label="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                showPassword={showPassword}
                onToggleShowPassword={() => setShowPassword(!showPassword)}
                placeholder="Enter your password"
                required
                autoComplete="current-password"
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.8 }}
              className="pt-2"
            >
              <AuthSubmitButton loading={loading}>
                Sign In
              </AuthSubmitButton>
            </motion.div>
          </form>

          {/* Footer link */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.9 }}
            className="text-center text-sm text-muted-foreground mt-6 xl:mt-8"
          >
            Don&apos;t have an account?{" "}
            <Link
              href="/auth/signup"
              className="font-semibold transition-all duration-200 hover:underline fx-focus rounded inline-block relative group"
              style={{ color: "var(--accent-hover)" }}
            >
              <span>Create Account</span>
              {/* Animated underline */}
              <span className="absolute bottom-0 left-0 w-0 h-[1.5px] transition-all duration-300 group-hover:w-full" style={{ backgroundColor: "var(--accent-hover)" }} />
            </Link>
          </motion.p>
        </AuthCard>
      </div>
    </div>
  );
}
