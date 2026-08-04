"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Eye, EyeOff, BarChart3, TrendingUp, ShieldCheck } from "lucide-react";

function BrandMark({ dark = false, size = 38 }: { dark?: boolean; size?: number }) {
  return (
    <div
      className="rounded-lg flex items-center justify-center shrink-0"
      style={{ width: size, height: size, background: dark ? "rgba(245, 243, 237, 0.12)" : "var(--accent)" }}
    >
      <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M3 20L7 10L11 13L17 6L21 10" stroke={dark ? "#F5F3ED" : "var(--accent-foreground)"} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="17" cy="6" r="2.3" fill={dark ? "#F5F3ED" : "var(--accent-foreground)"} />
      </svg>
    </div>
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

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
      router.push("/dashboard");
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left panel — deep evergreen editorial */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden" style={{ background: "#12332D" }}>
        {/* Quiet forecast-line motif */}
        <svg className="absolute inset-x-0 bottom-0 w-full h-2/5 opacity-[0.14]" viewBox="0 0 800 300" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 260 L110 190 L220 225 L330 130 L440 170 L550 80 L660 115 L800 30" stroke="#F5F3ED" strokeWidth="1.5" fill="none" />
          <path d="M0 285 L110 240 L220 262 L330 200 L440 228 L550 160 L660 185 L800 120" stroke="#F5F3ED" strokeWidth="1" strokeDasharray="4 6" fill="none" />
        </svg>

        <div className="relative z-10 flex flex-col justify-between px-12 xl:px-20 py-14 w-full" style={{ color: "#F5F3ED" }}>
          <div className="flex items-center gap-3">
            <BrandMark dark />
            <span className="text-xl font-semibold tracking-tight" style={{ fontFamily: "var(--font-display), Georgia, serif" }}>
              Forecastify
            </span>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] mb-5" style={{ color: "rgba(245,243,237,0.55)" }}>
              Retail Intelligence Platform
            </p>
            <h2
              className="text-[44px] xl:text-[54px] leading-[1.06]"
              style={{ fontFamily: "var(--font-display), Georgia, serif", fontWeight: 520, letterSpacing: "-0.015em" }}
            >
              Know what sells,
              <br />
              before it sells.
            </h2>
            <p className="text-[15px] leading-relaxed mt-6 max-w-md" style={{ color: "rgba(245,243,237,0.72)" }}>
              Demand forecasting, inventory intelligence, and market signals —
              one calm operating picture for your store.
            </p>
          </div>

          <div>
            {[
              { icon: TrendingUp, title: "7-day demand predictions", desc: "Weather, market and event signals built in" },
              { icon: BarChart3, title: "Smart inventory levels", desc: "Avoid stockouts and overstocking automatically" },
              { icon: ShieldCheck, title: "Risk alerts & insights", desc: "Actionable alerts for at-risk products" },
            ].map((feature, i) => (
              <div
                key={feature.title}
                className="flex items-center gap-4 py-4"
                style={{ borderTop: i === 0 ? "none" : "1px solid rgba(245,243,237,0.14)" }}
              >
                <feature.icon className="w-4.5 h-4.5 shrink-0" strokeWidth={1.6} style={{ color: "rgba(245,243,237,0.85)" }} aria-hidden="true" />
                <div>
                  <h3 className="text-sm font-medium">{feature.title}</h3>
                  <p className="text-[13px] mt-0.5" style={{ color: "rgba(245,243,237,0.55)" }}>{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-[400px]">
          <div className="lg:hidden flex items-center gap-3 mb-10 justify-center">
            <BrandMark size={34} />
            <h1 className="fx-display text-[22px] font-semibold text-foreground">Forecastify</h1>
          </div>

          <div className="mb-9">
            <h2 className="fx-display text-[30px] text-foreground">Welcome back</h2>
            <p className="text-sm text-muted-foreground mt-2">Sign in to your forecasting console</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {error && (
              <div className="bg-danger/8 border border-danger/25 text-danger rounded-[var(--radius-md)] px-4 py-3 text-sm" role="alert">{error}</div>
            )}

            <div>
              <label htmlFor="login-email" className="block text-[13px] font-medium text-secondary-foreground mb-1.5">Email Address</label>
              <input
                id="login-email"
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@yourstore.com" required autoComplete="email"
                className="fx-input py-3"
              />
            </div>

            <div>
              <label htmlFor="login-password" className="block text-[13px] font-medium text-secondary-foreground mb-1.5">Password</label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"} value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password" required autoComplete="current-password"
                  className="fx-input py-3 pr-12"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors fx-focus rounded">
                  {showPassword ? <EyeOff className="w-4.5 h-4.5" strokeWidth={1.8} /> : <Eye className="w-4.5 h-4.5" strokeWidth={1.8} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="fx-btn fx-btn-accent w-full py-3 text-sm">
              {loading ? (
                <><div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" aria-hidden="true" />Signing in…</>
              ) : "Sign In"}
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-8">
            Don&apos;t have an account?{" "}
            <Link href="/auth/signup" className="font-semibold hover:underline fx-focus rounded" style={{ color: "var(--accent)" }}>Create Account</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
