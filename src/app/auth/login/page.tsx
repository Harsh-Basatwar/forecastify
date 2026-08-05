"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import AuthBackground from "@/components/auth/AuthBackground";
import AuthLeftPanel from "@/components/auth/AuthLeftPanel";
import AuthCard from "@/components/auth/AuthCard";
import { AnimatedInput, AnimatedPasswordInput } from "@/components/auth/AuthInputs";
import AuthSubmitButton from "@/components/auth/AuthSubmitButton";
import SuccessOverlay from "@/components/auth/SuccessOverlay";

function MobileBrandHeader() {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.2, ease: "easeOut" }}
      className="lg:hidden flex items-center gap-3 mb-8 justify-center"
    >
      <div
        className="rounded-[var(--radius-md)] bg-accent flex items-center justify-center shrink-0 shadow-md"
        style={{ width: 36, height: 36 }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M3 20L7 10L11 13L17 6L21 10" stroke="var(--accent-foreground)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="17" cy="6" r="2.3" fill="var(--accent-foreground)" />
        </svg>
      </div>
      <span className="fx-display text-[22px] font-semibold text-foreground">Forecastify</span>
    </motion.div>
  );
}

interface LoginFieldErrors {
  email?: string;
  password?: string;
}

export default function LoginPage() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  /*
    Demo prefill comes from the environment, never from source. Set
    NEXT_PUBLIC_DEMO_EMAIL / NEXT_PUBLIC_DEMO_PASSWORD in .env.local (which is
    gitignored) to keep one-click sign-in locally; both are empty in any real
    deployment, so the fields simply start blank.
  */
  const [email, setEmail] = useState(() => {
    const fallback = process.env.NEXT_PUBLIC_DEMO_EMAIL ?? "";
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      return params.get("email") || fallback;
    }
    return fallback;
  });
  const [password, setPassword] = useState(process.env.NEXT_PUBLIC_DEMO_PASSWORD ?? "");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<LoginFieldErrors>({});
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        console.error("Login error:", error);
        if (error.message.toLowerCase().includes("email not confirmed")) {
          setError("Your email is not confirmed yet. Please check your inbox or sign up again.");
          setFieldErrors({ email: "This email is not confirmed yet. Check your inbox or sign up again." });
        } else {
          setError(error.message);
          if (error.message.toLowerCase().includes("invalid login credentials")) {
            setFieldErrors({ password: "Email or password is incorrect." });
          }
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

  // The banner carries anything not already surfaced on a field, so a single
  // failure is never announced twice.
  const showBanner = Boolean(error) && !fieldErrors.email && !fieldErrors.password;

  const enter = (index: number) =>
    reduceMotion
      ? { initial: false as const, animate: { opacity: 1, y: 0 }, transition: { duration: 0 } }
      : {
          initial: { opacity: 0, y: 6 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.24, delay: index * 0.03, ease: "easeOut" as const },
        };

  return (
    <div className="min-h-[100dvh] flex flex-col lg:flex-row relative">
      {/* Decorative ambient layer */}
      <AuthBackground />

      <SuccessOverlay show={showSuccess} onComplete={handleSuccessComplete} />

      {/* Brand panel — desktop only */}
      <AuthLeftPanel mode="login" />

      {/* Form column — scrolls independently so a short viewport never clips it */}
      <div className="w-full lg:w-[47%] flex flex-col justify-center items-center px-[4vw] py-[5vh] relative z-10 lg:max-h-[100dvh] lg:overflow-y-auto bg-background">
        <AuthCard>
          <MobileBrandHeader />

          <motion.div {...enter(0)} className="mb-6 xl:mb-8">
            <h1 className="fx-display text-[26px] xl:text-[32px] font-semibold text-foreground tracking-tight">
              Welcome back
            </h1>
          </motion.div>

          <form onSubmit={handleLogin} className="space-y-4 xl:space-y-5">
            <AnimatePresence initial={false}>
              {showBanner && (
                <motion.div
                  initial={reduceMotion ? false : { opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduceMotion ? { opacity: 1 } : { opacity: 0, y: -4 }}
                  transition={{ duration: reduceMotion ? 0 : 0.14, ease: "easeOut" }}
                  className="bg-danger-soft border border-danger/25 text-danger rounded-[var(--radius-md)] px-4 py-3 text-sm font-medium"
                  role="alert"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div {...enter(1)}>
              <AnimatedInput
                id="login-email"
                label="Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@yourstore.com"
                required
                autoComplete="email"
                error={fieldErrors.email}
              />
            </motion.div>

            <motion.div {...enter(2)}>
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
                error={fieldErrors.password}
              />
            </motion.div>

            {/* No entrance animation: the primary action is visible immediately */}
            <div className="pt-2">
              <AuthSubmitButton loading={loading} loadingLabel="Signing in…">
                Sign In
              </AuthSubmitButton>
            </div>
          </form>

          <motion.p {...enter(3)} className="text-center text-sm text-muted-foreground mt-6 xl:mt-8">
            Don&apos;t have an account?{" "}
            <Link
              href="/auth/signup"
              className="font-semibold hover:underline fx-focus rounded inline-block relative group"
              style={{ color: "var(--accent-hover)" }}
            >
              <span>Create Account</span>
              <span
                aria-hidden="true"
                className="absolute bottom-0 left-0 w-full h-[1.5px] origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-[var(--t-fast)] ease-[var(--ease-out)]"
                style={{ backgroundColor: "var(--accent-hover)" }}
              />
            </Link>
          </motion.p>
        </AuthCard>
      </div>
    </div>
  );
}
