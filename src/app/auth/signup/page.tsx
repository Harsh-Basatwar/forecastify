"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import AuthBackground from "@/components/auth/AuthBackground";
import AuthLeftPanel from "@/components/auth/AuthLeftPanel";
import AuthCard from "@/components/auth/AuthCard";
import { AnimatedInput, AnimatedPasswordInput, AnimatedSelect } from "@/components/auth/AuthInputs";
import AuthSubmitButton from "@/components/auth/AuthSubmitButton";
import SuccessOverlay from "@/components/auth/SuccessOverlay";

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

function MobileBrandHeader() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="lg:hidden flex items-center gap-3 mb-6 justify-center"
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

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

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

        setLoading(false);
        setShowSuccess(true);
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  const handleSuccessComplete = () => {
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen h-screen lg:h-screen lg:max-h-screen lg:overflow-hidden flex flex-col lg:flex-row relative overflow-y-auto lg:overflow-hidden">
      {/* Ambient Motion Background */}
      <AuthBackground />

      {/* Success Overlay Animation */}
      <SuccessOverlay show={showSuccess} onComplete={handleSuccessComplete} />

      {/* Left panel (takes 53% width) */}
      <AuthLeftPanel mode="signup" step={step} />

      {/* Right panel (takes 47% width, has warm off-white background and ambient radial bleed) */}
      <div className="w-full lg:w-[47%] flex flex-col justify-center items-center px-[4vw] py-[5vh] lg:pb-[8vh] relative z-10 lg:h-full lg:max-h-full lg:overflow-y-auto bg-[#FAF9F6] dark:bg-background transition-colors duration-300">
        {/* Ambient radial glow bleed from left dark green panel to right */}
        <div 
          className="hidden lg:block absolute left-[-150px] top-1/4 w-[300px] h-[50%] rounded-full blur-[100px] pointer-events-none opacity-40 dark:opacity-20 z-0"
          style={{
            background: "radial-gradient(circle, #12332D 0%, transparent 70%)"
          }}
        />

        <AuthCard>
          <MobileBrandHeader />

          {/* Mobile step dots */}
          <div className="lg:hidden flex items-center justify-center gap-1.5 mb-5" aria-label={`Step ${step} of 2`}>
            <div className={`h-1.5 rounded-full transition-all duration-300 ${step === 1 ? "w-8 bg-accent" : "w-3 bg-muted"}`} />
            <div className={`h-1.5 rounded-full transition-all duration-300 ${step === 2 ? "w-8 bg-accent" : "w-3 bg-muted"}`} />
          </div>

          <motion.div
            key={step}
            initial={{ opacity: 0, x: step === 1 ? -16 : 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-6 xl:mb-8"
          >
            <p className="fx-eyebrow mb-1">Step {step} of 2</p>
            <h2 className="fx-display text-[22px] xl:text-[26px] font-semibold text-foreground">
              {step === 1 ? "Create your account" : "Store details"}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {step === 1 ? "Enter your personal details to get started" : "Tell us about your retail store for a tailored experience"}
            </p>
          </motion.div>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  x: [0, -6, 6, -6, 6, 0],
                }}
                exit={{ opacity: 0, y: -8 }}
                className="bg-danger/10 border border-danger/25 text-danger rounded-xl px-4 py-3 text-sm font-medium mb-4"
                role="alert"
              >
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
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-3 xl:space-y-4"
              >
                <AnimatedInput
                  id="su-name"
                  label="Full Name *"
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => updateField("fullName", e.target.value)}
                  placeholder="John Doe"
                  required
                  autoComplete="name"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 xl:gap-4">
                  <AnimatedInput
                    id="su-email"
                    label="Email Address *"
                    type="email"
                    value={formData.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    placeholder="you@yourstore.com"
                    required
                    autoComplete="email"
                  />
                  <AnimatedInput
                    id="su-phone"
                    label="Phone Number *"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => updateField("phone", e.target.value)}
                    placeholder="+91 9876543210"
                    required
                    autoComplete="tel"
                  />
                </div>

                <AnimatedPasswordInput
                  id="su-pass"
                  label="Password *"
                  value={formData.password}
                  onChange={(e) => updateField("password", e.target.value)}
                  showPassword={showPassword}
                  onToggleShowPassword={() => setShowPassword(!showPassword)}
                  placeholder="Min. 6 characters"
                  required
                  autoComplete="new-password"
                />

                <AnimatedInput
                  id="su-confirm"
                  label="Confirm Password *"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => updateField("confirmPassword", e.target.value)}
                  placeholder="Re-enter your password"
                  required
                  autoComplete="new-password"
                />

                <div className="pt-1">
                  <AuthSubmitButton loading={false} onClick={handleNext} type="button">
                    Continue to Store Details
                  </AuthSubmitButton>
                </div>
              </motion.div>
            ) : (
              <motion.form
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                onSubmit={handleSignup}
                className="space-y-3 xl:space-y-4"
              >
                <AnimatedInput
                  id="su-store"
                  label="Store Name *"
                  type="text"
                  value={formData.storeName}
                  onChange={(e) => updateField("storeName", e.target.value)}
                  placeholder="My Retail Store"
                  required
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 xl:gap-4">
                  <AnimatedSelect
                    id="su-cat"
                    label="Store Category *"
                    value={formData.storeCategory}
                    onChange={(e) => updateField("storeCategory", e.target.value)}
                    options={["Select category", ...storeCategories]}
                    required
                  />
                  <AnimatedSelect
                    id="su-size"
                    label="Store Size *"
                    value={formData.storeSize}
                    onChange={(e) => updateField("storeSize", e.target.value)}
                    options={["Select size", ...storeSizes]}
                    required
                  />
                </div>

                <AnimatedInput
                  id="su-addr"
                  label="Store Address"
                  type="text"
                  value={formData.storeAddress}
                  onChange={(e) => updateField("storeAddress", e.target.value)}
                  placeholder="123 Market Street"
                  autoComplete="street-address"
                />

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 xl:gap-4">
                  <AnimatedInput
                    id="su-city"
                    label="City"
                    type="text"
                    value={formData.city}
                    onChange={(e) => updateField("city", e.target.value)}
                    placeholder="Mumbai"
                  />
                  <AnimatedInput
                    id="su-state"
                    label="State"
                    type="text"
                    value={formData.state}
                    onChange={(e) => updateField("state", e.target.value)}
                    placeholder="Maharashtra"
                  />
                  <AnimatedInput
                    id="su-pin"
                    label="PIN Code"
                    type="text"
                    value={formData.pincode}
                    onChange={(e) => updateField("pincode", e.target.value)}
                    placeholder="400001"
                    autoComplete="postal-code"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 xl:gap-4">
                  <AnimatedInput
                    id="su-gst"
                    label="GST Number"
                    type="text"
                    value={formData.gstNumber}
                    onChange={(e) => updateField("gstNumber", e.target.value)}
                    placeholder="22AAAAA0000A1Z5"
                  />
                  <AnimatedInput
                    id="su-outlets"
                    label="Number of Outlets"
                    type="number"
                    min="1"
                    value={formData.numberOfOutlets}
                    onChange={(e) => updateField("numberOfOutlets", e.target.value)}
                  />
                </div>

                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="fx-btn flex-1 py-3 text-sm rounded-xl font-medium"
                  >
                    Back
                  </button>
                  <div className="flex-[2]">
                    <AuthSubmitButton loading={loading}>
                      Create Account
                    </AuthSubmitButton>
                  </div>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.8 }}
            className="text-center text-sm text-muted-foreground mt-6 xl:mt-8"
          >
            Already have an account?{" "}
            <Link
              href="/auth/login"
              className="font-semibold transition-all duration-200 hover:underline fx-focus rounded inline-block relative group"
              style={{ color: "var(--accent-hover)" }}
            >
              <span>Sign In</span>
              <span className="absolute bottom-0 left-0 w-0 h-[1.5px] transition-all duration-300 group-hover:w-full" style={{ backgroundColor: "var(--accent-hover)" }} />
            </Link>
          </motion.p>
        </AuthCard>
      </div>
    </div>
  );
}
