"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Eye, EyeOff } from "lucide-react";

const storeCategories = [
  "Grocery & Supermarket", "Electronics & Appliances", "Fashion & Apparel",
  "Pharmacy & Health", "Home & Furniture", "Sports & Outdoors",
  "Beauty & Personal Care", "Food & Beverage", "Department Store",
  "Convenience Store", "Other",
];

const storeSizes = [
  "Small (1-5 employees)", "Medium (6-25 employees)",
  "Large (26-100 employees)", "Enterprise (100+ employees)",
];

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

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    fullName: "", email: "", phone: "", password: "", confirmPassword: "",
    storeName: "", storeCategory: "", storeSize: "", storeAddress: "",
    city: "", state: "", pincode: "", gstNumber: "", numberOfOutlets: "1",
  });

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateStep1 = () => {
    if (!formData.fullName || !formData.email || !formData.phone || !formData.password) {
      setError("Please fill in all required fields"); return false;
    }
    if (formData.password.length < 6) { setError("Password must be at least 6 characters"); return false; }
    if (formData.password !== formData.confirmPassword) { setError("Passwords do not match"); return false; }
    setError(""); return true;
  };

  const handleNext = () => { if (validateStep1()) setStep(2); };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.storeName || !formData.storeCategory || !formData.storeSize) {
      setError("Please fill in all required store details"); return;
    }
    setError(""); setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName, phone: formData.phone,
            store_name: formData.storeName, store_category: formData.storeCategory,
            store_size: formData.storeSize, store_address: formData.storeAddress,
            city: formData.city, state: formData.state, pincode: formData.pincode,
            gst_number: formData.gstNumber, number_of_outlets: formData.numberOfOutlets,
          },
        },
      });

      if (error) {
        console.error("Signup error:", error);
        if (error.message.toLowerCase().includes("rate limit")) {
          setError("Too many signup attempts. Please wait a few minutes and try again.");
        } else if (
          error.message.toLowerCase().includes("already registered") ||
          error.message.toLowerCase().includes("already exists") ||
          error.message.toLowerCase().includes("already in use")
        ) {
          setError("This email address is already registered. Please try logging in instead.");
        } else {
          setError(error.message);
        }
        setLoading(false);
        return;
      }

      if (data.user) {
        // Update profile with store details
        const { error: profileError } = await supabase
          .from("profiles")
          .upsert({
            id: data.user.id,
            full_name: formData.fullName,
            phone: formData.phone,
            store_name: formData.storeName,
            store_category: formData.storeCategory,
            store_size: formData.storeSize,
            store_address: formData.storeAddress,
            city: formData.city,
            state: formData.state,
            pincode: formData.pincode,
            gst_number: formData.gstNumber || null,
            number_of_outlets: parseInt(formData.numberOfOutlets) || 1,
          });

        if (profileError) {
          console.error("Profile update error:", profileError);
          setError(`Failed to create store profile: ${profileError.message || JSON.stringify(profileError)}`);
          setLoading(false);
          return;
        }

        if (data.session) {
          router.push("/dashboard");
        } else {
          // Email confirmation is enabled — sign in directly
          const { data: loginData } = await supabase.auth.signInWithPassword({
            email: formData.email,
            password: formData.password,
          });

          if (loginData?.session) {
            router.push("/dashboard");
          } else {
            setError("Account created! Please check your email to confirm, then log in.");
            setLoading(false);
          }
        }
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  const labelClass = "block text-[13px] font-medium text-secondary-foreground mb-1.5";

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left panel — deep evergreen editorial */}
      <div className="hidden lg:flex lg:w-5/12 relative overflow-hidden" style={{ background: "#12332D" }}>
        <svg className="absolute inset-x-0 bottom-0 w-full h-2/5 opacity-[0.14]" viewBox="0 0 800 300" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 260 L110 190 L220 225 L330 130 L440 170 L550 80 L660 115 L800 30" stroke="#F5F3ED" strokeWidth="1.5" fill="none" />
          <path d="M0 285 L110 240 L220 262 L330 200 L440 228 L550 160 L660 185 L800 120" stroke="#F5F3ED" strokeWidth="1" strokeDasharray="4 6" fill="none" />
        </svg>

        <div className="relative z-10 flex flex-col justify-between px-12 xl:px-16 py-14 w-full" style={{ color: "#F5F3ED" }}>
          <div className="flex items-center gap-3">
            <BrandMark dark />
            <span className="text-xl font-semibold tracking-tight" style={{ fontFamily: "var(--font-display), Georgia, serif" }}>
              Forecastify
            </span>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] mb-5" style={{ color: "rgba(245,243,237,0.55)" }}>
              Get Started
            </p>
            <h2
              className="text-[38px] xl:text-[46px] leading-[1.08]"
              style={{ fontFamily: "var(--font-display), Georgia, serif", fontWeight: 520, letterSpacing: "-0.015em" }}
            >
              Set up your store
              <br />
              in minutes.
            </h2>
            <p className="text-[15px] leading-relaxed mt-6 max-w-sm" style={{ color: "rgba(245,243,237,0.72)" }}>
              Join retailers running calmer, better-stocked stores with
              Forecastify&apos;s demand intelligence.
            </p>
          </div>

          {/* Steps */}
          <div>
            {[
              { n: 1, title: "Personal information", desc: "Your account credentials" },
              { n: 2, title: "Store details", desc: "Tell us about your retail business" },
            ].map((item, i) => (
              <div
                key={item.n}
                className="flex items-center gap-4 py-4"
                style={{ borderTop: i === 0 ? "none" : "1px solid rgba(245,243,237,0.14)", opacity: step >= item.n ? 1 : 0.45 }}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-semibold shrink-0 transition-colors"
                  style={step >= item.n
                    ? { background: "#F5F3ED", color: "#12332D" }
                    : { border: "1px solid rgba(245,243,237,0.35)", color: "rgba(245,243,237,0.7)" }}
                  aria-hidden="true"
                >
                  {item.n}
                </div>
                <div>
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-[13px] mt-0.5" style={{ color: "rgba(245,243,237,0.55)" }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="w-full lg:w-7/12 flex items-center justify-center p-6 sm:p-12 overflow-y-auto">
        <div className="w-full max-w-lg">
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <BrandMark size={34} />
            <h1 className="fx-display text-[22px] font-semibold text-foreground">Forecastify</h1>
          </div>

          {/* Mobile step dots */}
          <div className="lg:hidden flex items-center justify-center gap-1.5 mb-8" aria-label={`Step ${step} of 2`}>
            <div className={`h-1 rounded-full transition-all duration-200 ${step === 1 ? "w-8 bg-accent" : "w-4 bg-muted"}`} />
            <div className={`h-1 rounded-full transition-all duration-200 ${step === 2 ? "w-8 bg-accent" : "w-4 bg-muted"}`} />
          </div>

          <div className="mb-8">
            <p className="fx-eyebrow mb-2">Step {step} of 2</p>
            <h2 className="fx-display text-[28px] text-foreground">
              {step === 1 ? "Create your account" : "Store details"}
            </h2>
            <p className="text-sm text-muted-foreground mt-2">
              {step === 1 ? "Enter your personal details to get started" : "Tell us about your retail store for a tailored experience"}
            </p>
          </div>

          {error && (
            <div className="bg-danger/8 border border-danger/25 text-danger rounded-[var(--radius-md)] px-4 py-3 text-sm mb-5" role="alert">
              {error.includes("already registered") ? (
                <>
                  This email address is already registered.{" "}
                  <Link
                    href={`/auth/login?email=${encodeURIComponent(formData.email)}`}
                    className="font-semibold underline hover:opacity-80"
                  >
                    Sign in instead
                  </Link>
                </>
              ) : (
                error
              )}
            </div>
          )}

          {step === 1 ? (
            <div className="space-y-4">
              <div>
                <label htmlFor="su-name" className={labelClass}>Full Name *</label>
                <input id="su-name" type="text" value={formData.fullName} onChange={(e) => updateField("fullName", e.target.value)} placeholder="John Doe" required autoComplete="name" className="fx-input py-2.5" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="su-email" className={labelClass}>Email Address *</label>
                  <input id="su-email" type="email" value={formData.email} onChange={(e) => updateField("email", e.target.value)} placeholder="you@yourstore.com" required autoComplete="email" className="fx-input py-2.5" />
                </div>
                <div>
                  <label htmlFor="su-phone" className={labelClass}>Phone Number *</label>
                  <input id="su-phone" type="tel" value={formData.phone} onChange={(e) => updateField("phone", e.target.value)} placeholder="+91 9876543210" required autoComplete="tel" className="fx-input py-2.5" />
                </div>
              </div>
              <div>
                <label htmlFor="su-pass" className={labelClass}>Password *</label>
                <div className="relative">
                  <input id="su-pass" type={showPassword ? "text" : "password"} value={formData.password} onChange={(e) => updateField("password", e.target.value)} placeholder="Min. 6 characters" required autoComplete="new-password" className="fx-input py-2.5 pr-12" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors fx-focus rounded">
                    {showPassword ? <EyeOff className="w-4.5 h-4.5" strokeWidth={1.8} /> : <Eye className="w-4.5 h-4.5" strokeWidth={1.8} />}
                  </button>
                </div>
              </div>
              <div>
                <label htmlFor="su-confirm" className={labelClass}>Confirm Password *</label>
                <input id="su-confirm" type="password" value={formData.confirmPassword} onChange={(e) => updateField("confirmPassword", e.target.value)} placeholder="Re-enter your password" required autoComplete="new-password" className="fx-input py-2.5" />
              </div>
              <div className="pt-2">
                <button type="button" onClick={handleNext} className="fx-btn fx-btn-accent w-full py-3 text-sm">
                  Continue to Store Details
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <label htmlFor="su-store" className={labelClass}>Store Name *</label>
                <input id="su-store" type="text" value={formData.storeName} onChange={(e) => updateField("storeName", e.target.value)} placeholder="My Retail Store" required className="fx-input py-2.5" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="su-cat" className={labelClass}>Store Category *</label>
                  <select id="su-cat" value={formData.storeCategory} onChange={(e) => updateField("storeCategory", e.target.value)} required className="fx-input py-2.5">
                    <option value="">Select category</option>
                    {storeCategories.map((cat) => (<option key={cat} value={cat}>{cat}</option>))}
                  </select>
                </div>
                <div>
                  <label htmlFor="su-size" className={labelClass}>Store Size *</label>
                  <select id="su-size" value={formData.storeSize} onChange={(e) => updateField("storeSize", e.target.value)} required className="fx-input py-2.5">
                    <option value="">Select size</option>
                    {storeSizes.map((size) => (<option key={size} value={size}>{size}</option>))}
                  </select>
                </div>
              </div>
              <div>
                <label htmlFor="su-addr" className={labelClass}>Store Address</label>
                <input id="su-addr" type="text" value={formData.storeAddress} onChange={(e) => updateField("storeAddress", e.target.value)} placeholder="123 Market Street" autoComplete="street-address" className="fx-input py-2.5" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="su-city" className={labelClass}>City</label>
                  <input id="su-city" type="text" value={formData.city} onChange={(e) => updateField("city", e.target.value)} placeholder="Mumbai" className="fx-input py-2.5" />
                </div>
                <div>
                  <label htmlFor="su-state" className={labelClass}>State</label>
                  <input id="su-state" type="text" value={formData.state} onChange={(e) => updateField("state", e.target.value)} placeholder="Maharashtra" className="fx-input py-2.5" />
                </div>
                <div>
                  <label htmlFor="su-pin" className={labelClass}>PIN Code</label>
                  <input id="su-pin" type="text" value={formData.pincode} onChange={(e) => updateField("pincode", e.target.value)} placeholder="400001" autoComplete="postal-code" className="fx-input py-2.5" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="su-gst" className={labelClass}>GST Number</label>
                  <input id="su-gst" type="text" value={formData.gstNumber} onChange={(e) => updateField("gstNumber", e.target.value)} placeholder="22AAAAA0000A1Z5" className="fx-input py-2.5" />
                </div>
                <div>
                  <label htmlFor="su-outlets" className={labelClass}>Number of Outlets</label>
                  <input id="su-outlets" type="number" min="1" value={formData.numberOfOutlets} onChange={(e) => updateField("numberOfOutlets", e.target.value)} className="fx-input py-2.5 fx-num" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setStep(1)} className="fx-btn flex-1 py-3 text-sm">Back</button>
                <button type="submit" disabled={loading} className="fx-btn fx-btn-accent flex-[2] py-3 text-sm">
                  {loading ? (<><div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" aria-hidden="true" />Creating Account…</>) : "Create Account"}
                </button>
              </div>
            </form>
          )}

          <p className="text-center text-sm text-muted-foreground mt-8">
            Already have an account?{" "}
            <Link href="/auth/login" className="font-semibold hover:underline fx-focus rounded" style={{ color: "var(--accent)" }}>Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
