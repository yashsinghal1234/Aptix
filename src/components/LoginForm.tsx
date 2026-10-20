"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { candidateLoginAction, staffLoginAction, getSsoIdentityAction, staffSsoLoginAction } from "@/app/actions/auth";
import { ToastBanner } from "@/components/ToastBanner";
import { signIn, signOut } from "next-auth/react";
import Link from "next/link";
import { ChunkedVideo } from "@/components/ChunkedVideo";
import { HostExamModal } from "@/components/HostExamModal";

interface LoginFormProps {
  initialMode?: "candidate" | "staff";
}

const CAROUSEL_SLIDES = [
  {
    title: "High-Concurrency Digital Examination Engine.",
    subtitle: "Engineered for 1,000+ simultaneous candidates with zero-data-loss crash recovery, in-memory question caching, and progressive autosave.",
    video: "/showcase-video-1.mp4",
    hls: "/hls/showcase-1/index.m3u8",
  },
  {
    title: "Automated Integrity & Proctoring Suite.",
    subtitle: "Full-screen lockdown enforcement, real-time tab switch tracking, randomized question sets, and server-calibrated NTP timekeeping.",
    video: "/showcase-video-2.mp4",
    hls: "/hls/showcase-2/index.m3u8",
  },
  {
    title: "Comprehensive Question Bank & Instant Evaluation.",
    subtitle: "Supports single/multi-choice, numerical entry with tolerances, bulk CSV imports, automated grading, and deep topic analytics.",
    video: "/showcase-video-3.mp4",
    hls: "/hls/showcase-3/index.m3u8",
  },
];

export function LoginForm({ initialMode = "candidate" }: LoginFormProps) {
  const [mode, setMode] = useState<"candidate" | "staff">(initialMode);
  const [candidateError, setCandidateError] = useState<string | null>(null);
  const [staffError, setStaffError] = useState<string | null>(null);
  const [errorField, setErrorField] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [showForgotNotice, setShowForgotNotice] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hostModalOpen, setHostModalOpen] = useState(false);
  const [examPin, setExamPin] = useState("");
  const [candidateName, setCandidateName] = useState("");
  const [candidateEmail, setCandidateEmail] = useState("");
  const [staffEmail, setStaffEmail] = useState("");
  const [staffPassword, setStaffPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberStaff, setRememberStaff] = useState(true);
  const [rememberCandidate, setRememberCandidate] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const [ssoEmail, setSsoEmail] = useState<string | null>(null);
  const [ssoName, setSsoName] = useState<string | null>(null);
  const [ssoLoading, setSsoLoading] = useState(false);
  // The staff Google button must not react to manual password logins, so it
  // tracks its own connect flow instead of sharing the generic `loading`.
  const [ssoBusy, setSsoBusy] = useState(false);
  const router = useRouter();

  // Instant route prefetching for seamless post-login navigation
  useEffect(() => {
    try {
      router.prefetch("/dashboard/owner");
      router.prefetch("/dashboard/setter");
      router.prefetch("/admin/login");
    } catch {}
  }, [router]);

  const formatClientAuthError = (msg: string): string => {
    if (!msg) return "An unexpected error occurred. Please try again.";
    
    // Only return "Internet is not connected" if the browser is genuinely offline
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      return "Internet is not connected. Please check your internet connection and try again.";
    }

    // Return the server's exact message directly without obscuring diagnostics
    return msg;
  };

  // Trigger smooth error animation and set active error field
  const triggerCandidateError = (msg: string, field: string | null = null) => {
    setCandidateError(formatClientAuthError(msg));
    setErrorField(field);
    setShake(true);
    setTimeout(() => setShake(false), 450);
  };

  const triggerStaffError = (msg: string, field: string | null = null) => {
    setStaffError(formatClientAuthError(msg));
    setErrorField(field);
    setShake(true);
    setTimeout(() => setShake(false), 450);
  };

  // Auto-advance the showcase carousel
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % CAROUSEL_SLIDES.length);
    }, 6500);
    return () => clearInterval(timer);
  }, []);

  // Single staff-SSO exchange: trades the verified Google session for a
  // staff JWT. Used by both the button and the /admin/login auto-complete.
  const completeStaffSso = async (remember: boolean) => {
    setLoading(true);
    setSsoBusy(true);
    setStaffError(null);
    try {
      const res = await staffSsoLoginAction(remember);
      if ("error" in res && res.error) {
        triggerStaffError(res.error);
        setLoading(false);
        setSsoBusy(false);
        return;
      }
      if ("redirectUrl" in res && res.redirectUrl) {
        window.location.href = res.redirectUrl as string;
        return;
      }
      setLoading(false);
      setSsoBusy(false);
    } catch (err: any) {
      setLoading(false);
      setSsoBusy(false);
      triggerStaffError(err?.message || "Staff SSO failed. Please try again.");
    }
  };

  // College SSO identity (Google Workspace, SSO-first-then-PIN)
  // A valid KIET ID jumps straight to the PIN dialog - no intermediate chip.
  // On /admin/login, a returning Google session auto-completes staff SSO.
  const ssoPinAuto = React.useRef<string | null>(null);
  const staffSsoAuto = React.useRef(false);
  useEffect(() => {
    getSsoIdentityAction()
      .then((res) => {
        if (res.signedIn) {
          setSsoEmail(res.email);
          setSsoName(res.name);
          setCandidateEmail((prev) => prev || res.email);
          setCandidateName((prev) => prev || res.name || prev);
          if (
            typeof window !== "undefined" &&
            window.location.pathname.startsWith("/admin/login") &&
            !staffSsoAuto.current
          ) {
            staffSsoAuto.current = true;
            setMode("staff");
            completeStaffSso(true);
          } else if (
            res.email &&
            ssoPinAuto.current !== res.email &&
            typeof window !== "undefined" &&
            !window.location.pathname.startsWith("/admin/login")
          ) {
            ssoPinAuto.current = res.email;
            setPinOpen(true);
          }
        }
      })
      .catch(() => {});
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      if (sp.get("sso_error") === "domain") {
        triggerCandidateError("This exam requires a college @kiet.edu Google account. Please use your institutional email.");
      }
    }
  }, []);

  const handleGoogleSignIn = async () => {
    setSsoLoading(true);
    try {
      await signIn("google", { callbackUrl: typeof window !== "undefined" ? window.location.pathname : "/" });
    } finally {
      setSsoLoading(false);
    }
  };

  const handleGoogleSignOut = async () => {
    try {
      await signOut({ redirect: false });
    } catch {}
    setSsoEmail(null);
    setSsoName(null);
    ssoPinAuto.current = null;
  };

  const handleSwitchAccount = async () => {
    setSsoLoading(true);
    try {
      try {
        await signOut({ redirect: false });
      } catch {}
      setSsoEmail(null);
      setSsoName(null);
      ssoPinAuto.current = null;
      await signIn("google", { callbackUrl: typeof window !== "undefined" ? window.location.pathname : "/" });
    } finally {
      setSsoLoading(false);
    }
  };

  const handleStaffSso = async () => {
    setSsoBusy(true);
    const id = await getSsoIdentityAction().catch(() => ({ signedIn: false as const }));
    if (!id.signedIn) {
      try {
        await signIn("google", { callbackUrl: "/admin/login" });
      } catch {}
      setSsoBusy(false);
      return;
    }
    await completeStaffSso(rememberStaff);
  };

  // Real-time network connectivity monitoring
  useEffect(() => {
    if (typeof window !== "undefined") {
      const handleOffline = () => {
        const errorMsg = "Internet is not connected. Please check your internet connection and try again.";
        if (mode === "candidate") {
          triggerCandidateError(errorMsg);
        } else {
          triggerStaffError(errorMsg);
        }
      };
      const handleOnline = () => {
        setCandidateError((prev) => (prev?.includes("Internet is not connected") ? null : prev));
        setStaffError((prev) => (prev?.includes("Internet is not connected") ? null : prev));
      };

      window.addEventListener("offline", handleOffline);
      window.addEventListener("online", handleOnline);
      return () => {
        window.removeEventListener("offline", handleOffline);
        window.removeEventListener("online", handleOnline);
      };
    }
  }, [mode]);

  // Restore saved credentials from localStorage on mount & mode changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const savedStaffEmail = localStorage.getItem("aptix_saved_staff_email");
        const savedStaffRemember = localStorage.getItem("aptix_remember_staff");

        // Never read or store plaintext passwords in client localStorage
        localStorage.removeItem("aptix_saved_staff_password");

        if (savedStaffEmail) setStaffEmail(savedStaffEmail);
        if (savedStaffRemember !== null) {
          setRememberStaff(savedStaffRemember === "true");
        }

        const savedCandidateName = localStorage.getItem("aptix_saved_candidate_name");
        const savedCandidateEmail = localStorage.getItem("aptix_saved_candidate_email");

        if (savedCandidateName) setCandidateName(savedCandidateName);
        if (savedCandidateEmail) setCandidateEmail(savedCandidateEmail);

        // Explicitly ensure exam pin is NEVER saved or restored
        localStorage.removeItem("aptix_saved_candidate_pin");
        setExamPin("");

        // Checkbox remains unchecked by default
        setRememberCandidate(false);
      } catch (err) {
        console.warn("Could not restore remembered credentials:", err);
      }

      const isStaffPath = window.location.pathname.startsWith("/admin/login");
      if (isStaffPath && mode !== "staff") {
        setMode("staff");
      }

      const handlePopState = () => {
        const staffNow = window.location.pathname.startsWith("/admin/login");
        setMode(staffNow ? "staff" : "candidate");
        setCandidateError(null);
        setStaffError(null);
        setErrorField(null);
      };

      window.addEventListener("popstate", handlePopState);
      return () => window.removeEventListener("popstate", handlePopState);
    }
  }, [mode]);

  const switchMode = (newMode: "candidate" | "staff") => {
    setMode(newMode);
    setCandidateError(null);
    setStaffError(null);
    setErrorField(null);
    setShowForgotNotice(false);
    setLoading(false);
    setSsoBusy(false);
    if (typeof window !== "undefined") {
      const targetUrl = newMode === "staff" ? "/admin/login" : "/";
      if (window.location.pathname !== targetUrl) {
        window.history.pushState({ mode: newMode }, "", targetUrl);
      }
    }
  };

  const [pinOpen, setPinOpen] = useState(false);

  const openPinDialog = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCandidateError(null);
    setErrorField(null);

    if (ssoEmail) return setPinOpen(true);

    const nm = candidateName.trim();
    const em = candidateEmail.trim();
    if (!nm) {
      triggerCandidateError("Please enter your full candidate name.", "name");
      return;
    }
    if (!em) {
      triggerCandidateError("Please enter your candidate email address.", "email");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      triggerCandidateError("Please enter a valid email address with a domain name.", "email");
      return;
    }
    setPinOpen(true);
  };

  const handleCandidateSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCandidateError(null);
    setErrorField(null);

    const formData = new FormData();
    // Path A (Google SSO): submitted email matches the verified Google session.
    // Path B (manual): typed name+email must match the uploaded roster for the PIN.
    // Fields stay editable so you are never stuck on one ID - SSO applies only
    // when the submitted email equals the verified Google account.
    const email = candidateEmail.trim();
    const name = (ssoEmail && email.toLowerCase() === ssoEmail ? ssoName : null) || candidateName.trim() || email;
    formData.set("email", email);
    formData.set("name", name);
    formData.set("examPin", examPin.trim());

    const pin = examPin.trim();

    if (!pin) {
      triggerCandidateError("Please enter your Exam PIN to proceed.", "examPin");
      return;
    }

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      triggerCandidateError("Internet is not connected. Please check your internet connection and try again.");
      return;
    }

    setLoading(true);
    try {
      const res = await candidateLoginAction(formData);
      if (res?.error) {
        triggerCandidateError(res.error, res.field || null);
        setLoading(false);
        return;
      }
      if (res?.redirectUrl) {
        window.location.href = res.redirectUrl;
        return;
      }
    } catch (err: any) {
      setLoading(false);
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        triggerCandidateError("Internet is not connected. Please check your internet connection and try again.", null);
      } else if (err?.message?.includes("NEXT_REDIRECT") || err?.digest?.includes("NEXT_REDIRECT")) {
        return;
      } else {
        const errorText = err?.message || "Login request failed. Please try again.";
        triggerCandidateError(errorText, null);
      }
    }
  };

  const handleStaffSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStaffError(null);
    setErrorField(null);

    const formData = new FormData(e.currentTarget);
    const email = (formData.get("email") as string || "").trim();
    const password = (formData.get("password") as string || "");

    if (!email) {
      triggerStaffError("Please enter your registered staff email address.", "staffEmail");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      triggerStaffError("Please enter a valid email address format.", "staffEmail");
      return;
    }
    if (!password) {
      triggerStaffError("Please enter your account password.", "staffPassword");
      return;
    }

    // Persist or clear remembered staff email only (NEVER plaintext password)
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("aptix_saved_staff_password");
        if (rememberStaff) {
          localStorage.setItem("aptix_saved_staff_email", email);
          localStorage.setItem("aptix_remember_staff", "true");
        } else {
          localStorage.removeItem("aptix_saved_staff_email");
          localStorage.setItem("aptix_remember_staff", "false");
        }
      } catch {}
    }

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      triggerStaffError("Internet is not connected. Please check your internet connection and try again.");
      return;
    }

    setLoading(true);
    try {
      const res = await staffLoginAction(formData);
      if (res?.error) {
        triggerStaffError(res.error, res.field === "email" ? "staffEmail" : (res.field === "password" ? "staffPassword" : null));
        setLoading(false);
        return;
      }
      if (res?.redirectUrl) {
        window.location.href = res.redirectUrl;
        return;
      }
    } catch (err: any) {
      setLoading(false);
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        triggerStaffError("Internet is not connected. Please check your internet connection and try again.", null);
      } else if (err?.message?.includes("NEXT_REDIRECT") || err?.digest?.includes("NEXT_REDIRECT")) {
        return;
      } else {
        const errorText = err?.message || "Staff login request failed. Please try again.";
        triggerStaffError(errorText, null);
      }
    }
  };

  return (
    <main className="min-h-screen w-full bg-[#000000] text-white flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans select-none selection:bg-white selection:text-black">
      <div className="w-full max-w-[1380px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 xl:gap-24 2xl:gap-32 items-center">
        
        {/* Left Column: Modern Dark Login Form */}
        <div className="lg:col-span-5 xl:col-span-5 flex flex-col justify-center w-full max-w-[480px] mx-auto lg:mx-0 px-2 sm:px-0 py-6">
          
          {/* Brand header */}
          <div className="flex items-center gap-4 sm:gap-5 mb-8">
            <div className="relative w-18 h-18 sm:w-20 sm:h-20 rounded-2xl overflow-hidden shrink-0 flex items-center justify-center bg-transparent">
              <video
                src="/aptix-logo-anim.mp4"
                poster="/logo-preview-frame.jpg"
                autoPlay
                loop
                muted
                playsInline
                preload="auto"
                className="w-full h-full object-cover mix-blend-screen scale-125"
              />
            </div>
            <div>
              <span className="font-extrabold text-3xl sm:text-[32px] tracking-tight text-white leading-none block uppercase">
                APTIX
              </span>
              <span className="text-xs sm:text-[13px] text-neutral-400 font-medium tracking-wide mt-1.5 block">
                Digital Examination Platform
              </span>
            </div>
          </div>

          {/* Heading tailored to Aptix requirements */}
          <div className="mb-7">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight font-sans">
              {mode === "candidate" ? "Candidate Access" : "Faculty Command"}
            </h1>
          </div>

          {/* Role Pill Switcher */}
          <div
            role="tablist"
            aria-label="Portal selection"
            className="flex p-1 bg-[#0f1117] rounded-full border border-neutral-800/90 mb-6 max-w-[280px]"
          >
            <button
              type="button"
              role="tab"
              id="tab-candidate"
              aria-selected={mode === "candidate"}
              aria-controls="panel-candidate"
              onClick={() => switchMode("candidate")}
              className={`flex-1 py-1.5 px-3 rounded-full text-xs font-semibold transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                mode === "candidate"
                  ? "bg-white text-black shadow-sm"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              Candidate PIN
            </button>
            <button
              type="button"
              role="tab"
              id="tab-staff"
              aria-selected={mode === "staff"}
              aria-controls="panel-staff"
              onClick={() => switchMode("staff")}
              className={`flex-1 py-1.5 px-3 rounded-full text-xs font-semibold transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                mode === "staff"
                  ? "bg-white text-black shadow-sm"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              Staff Portal
            </button>
          </div>

          {/* Mode 1: Candidate Form */}
          {mode === "candidate" ? (
            <div
              id="panel-candidate"
              role="tabpanel"
              aria-labelledby="tab-candidate"
            >
              {candidateError && (
                <div className={`mb-5 ${shake ? "animate-shake" : ""}`}>
                  <ToastBanner
                    variant="error"
                    message={candidateError}
                    alertId="candidate-error-msg"
                    onClose={() => {
                      setCandidateError(null);
                      setErrorField(null);
                    }}
                  />
                </div>
              )}

              <form onSubmit={openPinDialog} className="space-y-4">
                {ssoEmail ? (
                  <button
                    type="button"
                    onClick={handleSwitchAccount}
                    disabled={ssoLoading}
                    title="Switch Google account"
                    className="w-full py-3 px-4 rounded-full bg-white hover:bg-neutral-200 text-black font-bold text-xs sm:text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.5 12.3c0-.9-.1-1.5-.3-2.3H12v4.5h6.5c-.1 1.1-.8 2.7-2.4 3.8l-.1.1 3.5 2.7.2.1c2.2-2 3.8-5 3.8-8.9z"/><path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.8-2.9c-1 .7-2.4 1.2-4.1 1.2-3.1 0-5.8-2.1-6.8-5l-.1.1-3.6 2.8v.1C3.5 21.3 7.5 24 12 24z"/><path fill="#FBBC05" d="M5.2 14.4c-.2-.7-.4-1.5-.4-2.4s.1-1.7.4-2.4l-.1-.1-3.5-2.7-.1.1C.6 8.7 0 10.2 0 12s.6 3.3 1.5 4.8l3.7-2.4z"/><path fill="#EA4335" d="M12 4.7c1.8 0 3 .8 3.7 1.4l3.3-3.2C17.9 1.1 15.2 0 12 0 7.5 0 3.5 2.7 1.5 6.9l3.7 2.9c1-2.9 3.7-5.1 6.8-5.1z"/></svg>
                    <span className="truncate">{ssoLoading ? "Opening Google..." : ssoEmail}</span>
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={handleGoogleSignIn}
                      disabled={ssoLoading}
                      className="w-full py-3.5 sm:py-4 px-6 rounded-full bg-white hover:bg-neutral-200 active:bg-neutral-300 text-black font-bold text-sm sm:text-base tracking-wide transition-all shadow-[0_4px_24px_rgba(255,255,255,0.2)] cursor-pointer flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                    >
                      <svg className="w-4.5 h-4.5 sm:w-5 sm:h-5 shrink-0" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.5 12.3c0-.9-.1-1.5-.3-2.3H12v4.5h6.5c-.1 1.1-.8 2.7-2.4 3.8l-.1.1 3.5 2.7.2.1c2.2-2 3.8-5 3.8-8.9z"/><path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.8-2.9c-1 .7-2.4 1.2-4.1 1.2-3.1 0-5.8-2.1-6.8-5l-.1.1-3.6 2.8v.1C3.5 21.3 7.5 24 12 24z"/><path fill="#FBBC05" d="M5.2 14.4c-.2-.7-.4-1.5-.4-2.4s.1-1.7.4-2.4l-.1-.1-3.5-2.7-.1.1C.6 8.7 0 10.2 0 12s.6 3.3 1.5 4.8l3.7-2.4z"/><path fill="#EA4335" d="M12 4.7c1.8 0 3 .8 3.7 1.4l3.3-3.2C17.9 1.1 15.2 0 12 0 7.5 0 3.5 2.7 1.5 6.9l3.7 2.9c1-2.9 3.7-5.1 6.8-5.1z"/></svg>
                      <span>{ssoLoading ? "Opening Google..." : "Continue with Google"}</span>
                    </button>
                    <div className="flex items-center gap-3 text-[10px] text-neutral-600 px-1">
                      <span className="flex-1 h-px bg-white/10" /> or enter manually <span className="flex-1 h-px bg-white/10" />
                    </div>
                  </>
                )}
                <div>
                  <label htmlFor="candidate-full-name" className="sr-only">
                    Candidate Full Name
                  </label>
                  <input
                    id="candidate-full-name"
                    type="text"
                    name="name"
                    value={candidateName}
                    autoComplete="name"
                    aria-invalid={errorField === "name"}
                    onChange={(e) => {
                      setCandidateName(e.target.value);
                      if (candidateError) {
                        setCandidateError(null);
                        setErrorField(null);
                      }
                    }}
                    className={`w-full px-6 py-4 bg-[#0d0f14] border rounded-full text-white text-sm sm:text-base placeholder:text-neutral-500 focus:outline-none transition-all ${
                      errorField === "name"
                        ? "border-rose-500/80 ring-1 ring-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.15)]"
                        : "border-[#232733] focus:border-neutral-400 focus:ring-1 focus:ring-neutral-400"
                    }`}
                    placeholder="Candidate Full Name"
                  />
                </div>

                <div>
                  <label htmlFor="candidate-email" className="sr-only">
                    Student / Institutional Email
                  </label>
                  <input
                    id="candidate-email"
                    type="email"
                    name="email"
                    value={candidateEmail}
                    autoComplete="email"
                    aria-invalid={errorField === "email"}
                    onChange={(e) => {
                      setCandidateEmail(e.target.value);
                      if (candidateError) {
                        setCandidateError(null);
                        setErrorField(null);
                      }
                    }}
                    className={`w-full px-6 py-4 bg-[#0d0f14] border rounded-full text-white text-sm sm:text-base placeholder:text-neutral-500 focus:outline-none transition-all ${
                      errorField === "email"
                        ? "border-rose-500/80 ring-1 ring-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.15)]"
                        : "border-[#232733] focus:border-neutral-400 focus:ring-1 focus:ring-neutral-400"
                    }`}
                    placeholder="Student / Institutional Email"
                  />
                </div>

                {/* Primary Pure-White Pill Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-3 py-4 px-8 rounded-full bg-white hover:bg-neutral-200 active:bg-neutral-300 text-black font-bold text-sm sm:text-base tracking-wide transition-all shadow-[0_4px_24px_rgba(255,255,255,0.2)] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                >
                  <span>Verify & Continue</span>
                </button>
              </form>

              {/* Exam PIN dialog - frosted confirmation card */}
              {pinOpen && (
                <div
                  className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
                  onClick={() => { if (!loading) setPinOpen(false); }}
                  role="presentation"
                >
                  <div className="relative w-full max-w-[400px]">
                    <div
                      role="dialog"
                      aria-modal="true"
                      aria-label="Enter exam PIN"
                      className="relative overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-b from-white/[0.09] via-[#1a1d24]/95 to-[#101216]/95 backdrop-blur-xl px-6 sm:px-8 pt-10 sm:pt-12 pb-6 sm:pb-7 shadow-[0_24px_80px_rgba(0,0,0,0.6)]"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => { if (e.key === "Escape" && !loading) setPinOpen(false); }}
                    >
                      {/* soft top highlight */}
                      <span aria-hidden className="pointer-events-none absolute inset-x-8 top-0 h-20 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.14),transparent_70%)]" />
                      <p className="relative text-center text-lg sm:text-xl text-neutral-200 leading-snug whitespace-nowrap">
                        Enter your exam PIN to begin?
                      </p>
                      <form onSubmit={handleCandidateSubmit} className="relative mt-6 space-y-4">
                        <label htmlFor="candidate-exam-pin-dialog" className="sr-only">
                          Exam PIN
                        </label>
                        <input
                          id="candidate-exam-pin-dialog"
                          type="text"
                          name="examPin"
                          value={examPin}
                          autoComplete="off"
                          autoCorrect="off"
                          autoCapitalize="characters"
                          spellCheck={false}
                          maxLength={16}
                          autoFocus
                          aria-invalid={errorField === "examPin"}
                          onChange={(e) => {
                            setExamPin(e.target.value.toUpperCase());
                            if (candidateError) {
                              setCandidateError(null);
                              setErrorField(null);
                            }
                          }}
                          className={`w-full px-6 py-4 bg-black/50 border rounded-2xl text-center text-white text-base sm:text-lg font-mono tracking-[0.2em] placeholder:font-sans placeholder:tracking-normal placeholder:normal-case placeholder:text-neutral-600 focus:outline-none transition-all ${
                            errorField === "examPin"
                              ? "border-rose-500/80 ring-1 ring-rose-500/50"
                              : "border-white/10 focus:border-white/30"
                          }`}
                          placeholder="••••••"
                        />
                        {candidateError && (
                          <p role="alert" className="text-center text-xs text-rose-300 leading-relaxed">{candidateError}</p>
                        )}
                        <div className="flex gap-3 pt-1">
                          <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 py-3.5 px-4 rounded-full bg-white/[0.07] hover:bg-white/[0.12] text-neutral-200 font-semibold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                            {loading ? (
                              <>
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                <span>Verifying...</span>
                              </>
                            ) : (
                              <span>Begin Exam</span>
                            )}
                          </button>
                          <button
                            type="button"
                            disabled={loading}
                            onClick={() => setPinOpen(false)}
                            className="flex-1 py-3.5 px-4 rounded-full bg-white/[0.07] hover:bg-white/[0.12] text-neutral-200 font-semibold text-sm transition-all disabled:opacity-50"
                          >
                            Back
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Mode 2: Staff Form */
            <div
              id="panel-staff"
              role="tabpanel"
              aria-labelledby="tab-staff"
            >
              {staffError && (
                <div className={`mb-5 ${shake ? "animate-shake" : ""}`}>
                  <ToastBanner
                    variant="error"
                    message={staffError}
                    alertId="staff-error-msg"
                    onClose={() => {
                      setStaffError(null);
                      setErrorField(null);
                    }}
                  />
                </div>
              )}

              {showForgotNotice && (
                <div className="mb-4 p-3.5 bg-neutral-900/90 border border-neutral-700/80 rounded-2xl text-xs text-neutral-300 flex items-start justify-between gap-3 shadow-lg">
                  <p className="leading-relaxed">
                    For institutional security, password resets are handled directly by your department administrator or system owner.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowForgotNotice(false)}
                    className="text-neutral-400 hover:text-white p-0.5 cursor-pointer"
                    aria-label="Close notification"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}

              <form onSubmit={handleStaffSubmit} className="space-y-4">
                <button
                  type="button"
                  onClick={handleStaffSso}
                  disabled={loading || ssoBusy}
                  className="w-full py-3.5 sm:py-4 px-6 rounded-full bg-white hover:bg-neutral-200 active:bg-neutral-300 text-black font-bold text-sm sm:text-base tracking-wide transition-all shadow-[0_4px_24px_rgba(255,255,255,0.2)] cursor-pointer flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                >
                  <svg className="w-4.5 h-4.5 sm:w-5 sm:h-5 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M23.5 12.3c0-.9-.1-1.5-.3-2.3H12v4.5h6.5c-.1 1.1-.8 2.7-2.4 3.8l-.1.1 3.5 2.7.2.1c2.2-2 3.8-5 3.8-8.9z"/>
                    <path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.8-2.9c-1 .7-2.4 1.2-4.1 1.2-3.1 0-5.8-2.1-6.8-5l-.1.1-3.6 2.8v.1C3.5 21.3 7.5 24 12 24z"/>
                    <path fill="#FBBC05" d="M5.2 14.4c-.2-.7-.4-1.5-.4-2.4s.1-1.7.4-2.4l-.1-.1-3.5-2.7-.1.1C.6 8.7 0 10.2 0 12s.6 3.3 1.5 4.8l3.7-2.4z"/>
                    <path fill="#EA4335" d="M12 4.7c1.8 0 3 .8 3.7 1.4l3.3-3.2C17.9 1.1 15.2 0 12 0 7.5 0 3.5 2.7 1.5 6.9l3.7 2.9c1-2.9 3.7-5.1 6.8-5.1z"/>
                  </svg>
                  <span>{ssoBusy ? "Connecting to Google..." : "Continue with Google"}</span>
                </button>
                <div className="flex items-center gap-3 text-[10px] text-neutral-600">
                  <span className="flex-1 h-px bg-white/10" /> or password <span className="flex-1 h-px bg-white/10" />
                </div>
                <div>
                  <label htmlFor="staff-email" className="sr-only">
                    Staff Email Address
                  </label>
                  <input
                    id="staff-email"
                    type="email"
                    name="email"
                    value={staffEmail}
                    autoComplete="username"
                    aria-invalid={errorField === "staffEmail"}
                    aria-describedby={staffError ? "staff-error-msg" : undefined}
                    onChange={(e) => {
                      setStaffEmail(e.target.value);
                      if (staffError) {
                        setStaffError(null);
                        setErrorField(null);
                      }
                    }}
                    className={`w-full px-6 py-4 bg-[#0d0f14] border rounded-full text-white text-sm sm:text-base placeholder:text-neutral-500 focus:outline-none transition-all ${
                      errorField === "staffEmail"
                        ? "border-rose-500/80 ring-1 ring-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.15)]"
                        : "border-[#232733] focus:border-neutral-400 focus:ring-1 focus:ring-neutral-400"
                    }`}
                    placeholder="Staff Email"
                    autoFocus
                  />
                </div>

                <div className="relative">
                  <label htmlFor="staff-password" className="sr-only">
                    Account Password
                  </label>
                  <input
                    id="staff-password"
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={staffPassword}
                    autoComplete="current-password"
                    aria-invalid={errorField === "staffPassword"}
                    onChange={(e) => {
                      setStaffPassword(e.target.value);
                      if (staffError) {
                        setStaffError(null);
                        setErrorField(null);
                      }
                    }}
                    className={`w-full px-6 py-4 pr-14 bg-[#0d0f14] border rounded-full text-white text-sm sm:text-base placeholder:text-neutral-500 focus:outline-none transition-all ${
                      errorField === "staffPassword"
                        ? "border-rose-500/80 ring-1 ring-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.15)]"
                        : "border-[#232733] focus:border-neutral-400 focus:ring-1 focus:ring-neutral-400"
                    }`}
                    placeholder="Password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 sm:right-5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/10 active:bg-white/15 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.084 14.158a3 3 0 0 1-4.242-4.242" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.479 17.499A10.75 10.75 0 0 1 2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 2.82-4.134" />
                        <line x1="2" y1="2" x2="22" y2="22" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>

                {/* Auxiliary links row */}
                <div className="flex items-center justify-between text-xs sm:text-sm pt-1 px-1">
                  <label htmlFor="remember-staff" className="flex items-center gap-2 cursor-pointer text-neutral-400 hover:text-neutral-300">
                    <input
                      id="remember-staff"
                      type="checkbox"
                      name="rememberStaff"
                      checked={rememberStaff}
                      onChange={(e) => setRememberStaff(e.target.checked)}
                      className="w-4 h-4 rounded-md border border-neutral-700 bg-[#0d0f14] text-white accent-white focus:ring-0 cursor-pointer"
                    />
                    <span>Remember credentials</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowForgotNotice((prev) => !prev)}
                    className="text-neutral-300 hover:text-white transition font-medium cursor-pointer focus-visible:underline"
                  >
                    Forgot Password?
                  </button>
                </div>

                {/* Primary Pure-White Pill Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-3 py-4 px-8 rounded-full bg-white hover:bg-neutral-200 active:bg-neutral-300 text-black font-bold text-sm sm:text-base tracking-wide transition-all shadow-[0_4px_24px_rgba(255,255,255,0.2)] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                      <span>Authenticating Staff...</span>
                    </>
                  ) : (
                    <span>Sign In to Dashboard</span>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* Footer action link: Contact Us */}
          <div className="text-center text-xs sm:text-sm text-neutral-400 mt-7 sm:mt-9 space-y-2">
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span>Want to conduct exams on this platform?</span>
              <button
                type="button"
                onClick={() => setHostModalOpen(true)}
                className="text-lime-300 hover:text-lime-200 font-extrabold hover:underline cursor-pointer transition-colors inline-flex items-center gap-1.5"
              >
                <span>Contact Us</span>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Visual Showcase Card */}
        <div className="lg:col-span-7 xl:col-span-7 flex flex-col w-full">
          <div className="flex items-center justify-end mb-4">
            <Link
              href="/practice"
              prefetch={true}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-white hover:bg-neutral-200 text-black text-xs sm:text-sm font-bold transition-all shadow-[0_4px_24px_rgba(255,255,255,0.15)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <span>Practice Arena</span>
              <svg className="w-3.5 h-3.5 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </Link>
          </div>
          <div className="relative w-full h-[500px] sm:h-[550px] lg:h-[600px] xl:h-[620px] rounded-[32px] sm:rounded-[36px] overflow-hidden bg-[#07080c] border border-[#1e222d] shadow-[0_20px_60px_rgba(0,0,0,0.85)] flex flex-col justify-end p-8 sm:p-10 lg:p-11 group">
            
            {/* Top Corner Creator Pill */}
            <a
              href="https://github.com/yashsinghal1234"
              target="_blank"
              rel="noopener noreferrer"
              className="absolute top-5 right-5 sm:top-6 sm:right-6 z-20 group/pill inline-flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-full bg-black/60 hover:bg-black/85 backdrop-blur-md border border-white/15 hover:border-white/30 transition-all shadow-[0_4px_24px_rgba(0,0,0,0.6)]"
              title="View Yash Singhal on GitHub"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/yash-avatar.jpg"
                alt="Yash Singhal"
                className="w-4 h-4 rounded-full ring-1 ring-white/30 object-cover shrink-0"
                onError={(e) => {
                  e.currentTarget.src = "https://avatars.githubusercontent.com/u/173256800?v=4";
                }}
              />
              <span className="text-[11px] text-zinc-300 font-medium">
                Made by <span className="text-white font-bold group-hover/pill:text-lime-300 transition-colors">Yash Singhal</span>
              </span>
            </a>

            {/* Background Chunked Videos with Smooth HLS Streaming */}
            <div className="absolute inset-0 z-0 overflow-hidden bg-black">
              {CAROUSEL_SLIDES.map((slide, idx) => (
                <ChunkedVideo
                  key={slide.hls}
                  hlsSrc={slide.hls}
                  fallbackSrc={slide.video}
                  isActive={activeSlide === idx}
                  className={
                    activeSlide === idx
                      ? "opacity-100 scale-100"
                      : "opacity-0 scale-105 pointer-events-none"
                  }
                />
              ))}
              {/* Vignette gradients to enhance contrast */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-black/20 pointer-events-none" />
              <div className="absolute inset-0 bg-radial-at-c from-transparent via-black/10 to-black/60 pointer-events-none" />
            </div>

            {/* Showcase Overlay Content */}
            <div className="relative z-10 space-y-4 max-w-xl">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight drop-shadow-md">
                {CAROUSEL_SLIDES[activeSlide].title}
              </h2>
              <p className="text-xs sm:text-sm lg:text-base text-neutral-300 font-medium leading-relaxed drop-shadow-sm">
                {CAROUSEL_SLIDES[activeSlide].subtitle}
              </p>

              {/* Pagination Dots */}
              <div className="flex items-center gap-2 pt-2">
                {CAROUSEL_SLIDES.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveSlide(idx)}
                    className={`transition-all duration-300 cursor-pointer ${
                      activeSlide === idx
                        ? "w-7 h-2 rounded-full bg-white shadow-xs"
                        : "w-2 h-2 rounded-full bg-neutral-600 hover:bg-neutral-400"
                    }`}
                    aria-label={`Go to slide ${idx + 1}`}
                  />
                ))}
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* Host Exam & Contact Modal */}
      {hostModalOpen && (
        <HostExamModal
          isOpen={hostModalOpen}
          onClose={() => setHostModalOpen(false)}
        />
      )}
    </main>
  );
}
