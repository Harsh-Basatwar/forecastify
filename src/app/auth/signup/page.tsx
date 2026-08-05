"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { validateGstin } from "@/lib/gstin";
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
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.2, ease: "easeOut" }}
      className="lg:hidden flex items-center gap-3 mb-6 justify-center"
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

interface SignupFieldErrors {
  fullName?: string;
  email?: string;
  phone?: string;
  password?: string;
  confirmPassword?: string;
  storeName?: string;
  storeCategory?: string;
  storeSize?: string;
  gstNumber?: string;
}

export default function SignupPage() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<SignupFieldErrors>({});
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

  // Validation rules are unchanged — the same checks, in the same order, with
  // the same messages. They are additionally attributed to the fields they
  // came from so each one can be surfaced in place.
  const validateStep1 = () => {
    if (!formData.fullName || !formData.email || !formData.phone || !formData.password) {
      setError("Please fill in all required fields");
      setFieldErrors({
        fullName: formData.fullName ? undefined : "Full name is required",
        email: formData.email ? undefined : "Email address is required",
        phone: formData.phone ? undefined : "Phone number is required",
        password: formData.password ? undefined : "Password is required",
      });
      return false;
    }
    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      setFieldErrors({ password: "Password must be at least 6 characters" });
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      setFieldErrors({ confirmPassword: "Passwords do not match" });
      return false;
    }
    setError("");
    setFieldErrors({});
    return true;
  };

  const handleNext = () => { if (validateStep1()) setStep(2); };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.storeName || !formData.storeCategory || !formData.storeSize) {
      setError("Please fill in all required store details");
      setFieldErrors({
        storeName: formData.storeName ? undefined : "Store name is required",
        storeCategory: formData.storeCategory ? undefined : "Store category is required",
        storeSize: formData.storeSize ? undefined : "Store size is required",
      });
      return;
    }
    // GST is optional, but a malformed one must not reach the profile — it
    // ends up on tax documents.
    const gstError = validateGstin(formData.gstNumber);
    if (gstError) {
      setError(gstError);
      setFieldErrors({ gstNumber: gstError });
      return;
    }
    setError(""); setFieldErrors({}); setLoading(true);

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

  // The banner carries anything not already attached to a field, so one
  // failure is never announced twice.
  const hasFieldError = Object.values(fieldErrors).some(Boolean);
  const showBanner = Boolean(error) && !hasFieldError;

  const stepMotion = reduceMotion
    ? { initial: false as const, animate: { opacity: 1, x: 0 }, transition: { duration: 0 } }
    : {
        initial: { opacity: 0, x: 8 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -8 },
        transition: { duration: 0.2, ease: "easeOut" as const },
      };

  return (
    <div className="min-h-[100dvh] flex flex-col lg:flex-row relative">
      {/* Decorative ambient layer */}
      <AuthBackground />

      <SuccessOverlay show={showSuccess} onComplete={handleSuccessComplete} />

      {/* Brand panel — desktop only */}
      <AuthLeftPanel mode="signup" step={step} />

      {/* Form column — scrolls independently so a short viewport never clips it */}
      <div className="w-full lg:w-[47%] flex flex-col justify-center items-center px-[4vw] py-[5vh] relative z-10 lg:max-h-[100dvh] lg:overflow-y-auto bg-background">
        <AuthCard>
          <MobileBrandHeader />

          {/* Decorative mirror of the "Step n of 2" text below */}
          <div aria-hidden="true" className="lg:hidden flex items-center justify-center gap-1.5 mb-5">
            <div
              className={`h-1.5 w-8 rounded-full origin-left transition-transform duration-[var(--t-fast)] ease-[var(--ease-out)] ${
                step === 1 ? "bg-accent" : "bg-muted scale-x-[0.375]"
              }`}
            />
            <div
              className={`h-1.5 w-8 rounded-full origin-left transition-transform duration-[var(--t-fast)] ease-[var(--ease-out)] ${
                step === 2 ? "bg-accent" : "bg-muted scale-x-[0.375]"
              }`}
            />
          </div>

          <div className="mb-6 xl:mb-8">
            <p className="fx-eyebrow mb-1">Step {step} of 2</p>
            <h1 className="fx-display text-[22px] xl:text-[26px] font-semibold text-foreground">
              {step === 1 ? "Create your account" : "Store details"}
            </h1>
            {step === 1 && (
              <p className="text-sm text-muted-foreground mt-1">
                Enter your personal details to get started
              </p>
            )}
          </div>

          <AnimatePresence initial={false}>
            {showBanner && (
              <motion.div
                initial={reduceMotion ? false : { opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? { opacity: 1 } : { opacity: 0, y: -4 }}
                transition={{ duration: reduceMotion ? 0 : 0.14, ease: "easeOut" }}
                className="bg-danger-soft border border-danger/25 text-danger rounded-[var(--radius-md)] px-4 py-3 text-sm font-medium mb-4"
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
              <motion.div key="step1" {...stepMotion} className="space-y-3 xl:space-y-4">
                <AnimatedInput
                  id="su-name"
                  label="Full Name *"
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => updateField("fullName", e.target.value)}
                  placeholder="Priya Sharma"
                  required
                  autoComplete="name"
                  error={fieldErrors.fullName}
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
                    error={fieldErrors.email}
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
                    error={fieldErrors.phone}
                  />
                </div>

                <AnimatedPasswordInput
                  id="su-pass"
                  label="Password *"
                  value={formData.password}
                  onChange={(e) => updateField("password", e.target.value)}
                  showPassword={showPassword}
                  onToggleShowPassword={() => setShowPassword(!showPassword)}
                  placeholder="Enter a password"
                  hint="Must be at least 6 characters."
                  minLength={6}
                  required
                  autoComplete="new-password"
                  error={fieldErrors.password}
                />

                <AnimatedInput
                  id="su-confirm"
                  label="Confirm Password *"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => updateField("confirmPassword", e.target.value)}
                  placeholder="Re-enter your password"
                  minLength={6}
                  required
                  autoComplete="new-password"
                  error={fieldErrors.confirmPassword}
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
                {...stepMotion}
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
                  autoComplete="organization"
                  error={fieldErrors.storeName}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 xl:gap-4">
                  <AnimatedSelect
                    id="su-cat"
                    label="Store Category *"
                    value={formData.storeCategory}
                    onChange={(e) => updateField("storeCategory", e.target.value)}
                    placeholder="Select category"
                    options={storeCategories}
                    required
                    error={fieldErrors.storeCategory}
                  />
                  <AnimatedSelect
                    id="su-size"
                    label="Store Size *"
                    value={formData.storeSize}
                    onChange={(e) => updateField("storeSize", e.target.value)}
                    placeholder="Select size"
                    options={storeSizes}
                    required
                    error={fieldErrors.storeSize}
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
                    autoComplete="address-level2"
                  />
                  <AnimatedInput
                    id="su-state"
                    label="State"
                    type="text"
                    value={formData.state}
                    onChange={(e) => updateField("state", e.target.value)}
                    placeholder="Maharashtra"
                    autoComplete="address-level1"
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
                    maxLength={15}
                    spellCheck={false}
                    value={formData.gstNumber}
                    onChange={(e) => updateField("gstNumber", e.target.value.toUpperCase())}
                    placeholder="27AAPFU0939F1ZV"
                    hint="Optional — leave blank if not GST registered"
                    error={fieldErrors.gstNumber}
                    className="uppercase"
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
                    className="fx-btn flex-1 py-3 text-sm font-medium"
                  >
                    Back
                  </button>
                  <div className="flex-[2]">
                    <AuthSubmitButton loading={loading} loadingLabel="Creating account…">
                      Create Account
                    </AuthSubmitButton>
                  </div>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          <p className="text-center text-sm text-muted-foreground mt-6 xl:mt-8">
            Already have an account?{" "}
            <Link
              href="/auth/login"
              className="font-semibold hover:underline fx-focus rounded inline-block relative group"
              style={{ color: "var(--accent-hover)" }}
            >
              <span>Sign In</span>
              <span
                aria-hidden="true"
                className="absolute bottom-0 left-0 w-full h-[1.5px] origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-[var(--t-fast)] ease-[var(--ease-out)]"
                style={{ backgroundColor: "var(--accent-hover)" }}
              />
            </Link>
          </p>
        </AuthCard>
      </div>
    </div>
  );
}
