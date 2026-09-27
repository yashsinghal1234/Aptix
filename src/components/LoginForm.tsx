"use client";

import React, { useState, useEffect } from "react";
import { candidateLoginAction, staffLoginAction } from "@/app/actions/auth";
import Link from "next/link";

interface LoginFormProps {
  initialMode?: "candidate" | "staff";
}

const CAROUSEL_SLIDES = [
  {
    title: "High-concurrency digital examination engine.",
    subtitle: "Engineered for 1,000+ simultaneous candidates with zero-data-loss crash recovery, in-memory question caching, and progressive autosave.",
    video: "/showcase-video-1.mp4",
  },
  {
    title: "Automated integrity & proctoring suite.",
    subtitle: "Full-screen lockdown enforcement, real-time tab switch tracking, randomized question sets, and server-calibrated NTP timekeeping.",
    video: "/showcase-video-2.mp4",
  },
  {
    title: "Comprehensive question bank & instant evaluation.",
    subtitle: "Supports single/multi-choice, numerical entry with tolerances, bulk CSV imports, automated grading, and deep topic analytics.",
    video: "/showcase-video-3.mp4",
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
  const [examPin, setExamPin] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [activeSlide, setActiveSlide] = useState(0);
  const videoRefs = React.useRef<(HTMLVideoElement | null)[]>([]);

  // Trigger smooth error animation and set active error field
  const triggerCandidateError = (msg: string, field: string | null = null) => {
    setCandidateError(msg);
    setErrorField(field);
    setShake(true);
    setTimeout(() => setShake(false), 450);
  };

  const triggerStaffError = (msg: string, field: string | null = null) => {
    setStaffError(msg);
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

  // Ensure the active video plays from start on slide change and pause non-active videos to conserve GPU/CPU
  useEffect(() => {
    videoRefs.current.forEach((vid, idx) => {
      if (!vid) return;
      if (idx === activeSlide) {
        vid.currentTime = 0;
        vid.play().catch(() => {});
      } else {
        vid.pause();
      }
    });
  }, [activeSlide]);

  useEffect(() => {
    if (typeof window !== "undefined") {
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
    if (typeof window !== "undefined") {
      const targetUrl = newMode === "staff" ? "/admin/login" : "/";
      if (window.location.pathname !== targetUrl) {
        window.history.pushState({ mode: newMode }, "", targetUrl);
      }
    }
  };

  const handleCandidateSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCandidateError(null);
    setErrorField(null);

    const formData = new FormData(e.currentTarget);
    const pin = (formData.get("examPin") as string || "").trim();
    const name = (formData.get("name") as string || "").trim();
    const email = (formData.get("email") as string || "").trim();

    if (!pin) {
      triggerCandidateError("Please enter your Exam PIN to proceed.", "examPin");
      return;
    }
    if (!name) {
      triggerCandidateError("Please enter your full candidate name.", "name");
      return;
    }
    if (!email) {
      triggerCandidateError("Please enter your candidate email address.", "email");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      triggerCandidateError("Please enter a valid email address with a domain name.", "email");
      return;
    }

    setLoading(true);
    try {
      const res = await candidateLoginAction(formData);
      if (res?.error) {
        triggerCandidateError(res.error, res.field || null);
        setLoading(false);
      }
    } catch {
      triggerCandidateError("Network connection interrupted. Please try again.", null);
      setLoading(false);
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

    setLoading(true);
    try {
      const res = await staffLoginAction(formData);
      if (res?.error) {
        triggerStaffError(res.error, res.field === "email" ? "staffEmail" : (res.field === "password" ? "staffPassword" : null));
        setLoading(false);
      }
    } catch {
      triggerStaffError("Network connection interrupted. Please try again.", null);
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen w-full bg-[#000000] text-white flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans select-none selection:bg-white selection:text-black">
      <div className="w-full max-w-[1380px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 xl:gap-24 2xl:gap-32 items-center">
        
        {/* Left Column: Modern Dark Login Form */}
        <div className="lg:col-span-5 xl:col-span-5 flex flex-col justify-center w-full max-w-[480px] mx-auto lg:mx-0 px-2 sm:px-0 py-6">
          
          {/* Brand header */}
          <div className="flex items-center gap-3.5 sm:gap-5 mb-8">
            <div className="relative w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-2xl overflow-hidden shrink-0 flex items-center justify-center bg-transparent">
              <video
                src="/aptix-logo-anim.mp4"
                poster="/logo-preview-frame.jpg"
                autoPlay
                loop
                muted
                playsInline
                preload="metadata"
                disablePictureInPicture
                disableRemotePlayback
                controlsList="nodownload nofullscreen noremoteplayback"
                className="w-full h-full object-cover mix-blend-screen scale-125 pointer-events-none select-none"
              />
            </div>
            <div>
              <span className="font-extrabold text-2xl sm:text-3xl lg:text-[32px] tracking-tight text-white leading-none block">
                Aptix
              </span>
              <span className="text-xs sm:text-[13px] text-neutral-400 font-medium tracking-wide mt-1.5 block">
                Digital Examination Platform
              </span>
            </div>
          </div>

          {/* Heading & Subtitle tailored to Aptix requirements */}
          <div className="mb-7">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
              {mode === "candidate" ? "Candidate Access" : "Faculty Command"}
            </h1>
            <p className="text-sm text-neutral-400 mt-2 font-normal leading-relaxed">
              {mode === "candidate" ? (
                <>
                  Enter your assigned <strong className="text-white font-medium">Exam PIN</strong>, full name, and institutional email to enter your live proctored session.
                </>
              ) : (
                <>
                  Sign in with authorized staff credentials to schedule examinations, curate question banks, and review candidate results.
                </>
              )}
            </p>
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
                <div
                  role="alert"
                  aria-live="assertive"
                  id="candidate-error-msg"
                  className={`mb-5 p-3.5 sm:p-4 bg-gradient-to-r from-rose-950/60 to-[#18080c] border border-rose-500/40 text-rose-200 text-xs sm:text-sm rounded-2xl flex items-start gap-3 shadow-[0_4px_24px_rgba(244,63,94,0.18)] ${
                    shake ? "animate-shake" : ""
                  }`}
                >
                  <div className="w-5 h-5 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center shrink-0 mt-0.5">
                    <svg className="w-3.5 h-3.5 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0 pr-1">
                    <p className="font-semibold text-rose-300 text-xs tracking-wide uppercase mb-0.5">
                      Verification Notice
                    </p>
                    <p className="text-rose-200/90 leading-relaxed font-normal">
                      {candidateError}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setCandidateError(null);
                      setErrorField(null);
                    }}
                    className="text-rose-400 hover:text-white p-1 rounded-lg transition shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-rose-400"
                    aria-label="Dismiss message"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}

              <form onSubmit={handleCandidateSubmit} className="space-y-4">
                <div>
                  <label htmlFor="candidate-exam-pin" className="sr-only">
                    Exam PIN
                  </label>
                  <input
                    id="candidate-exam-pin"
                    type="text"
                    name="examPin"
                    value={examPin}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    maxLength={16}
                    aria-invalid={errorField === "examPin"}
                    aria-describedby={candidateError ? "candidate-error-msg" : undefined}
                    onChange={(e) => {
                      setExamPin(e.target.value.toUpperCase());
                      if (candidateError) {
                        setCandidateError(null);
                        setErrorField(null);
                      }
                    }}
                    className={`w-full px-6 py-4 bg-[#0d0f14] border rounded-full text-white text-sm sm:text-base font-mono tracking-wider placeholder:font-sans placeholder:tracking-normal placeholder:normal-case placeholder:text-neutral-500 focus:outline-none transition-all ${
                      errorField === "examPin"
                        ? "border-rose-500/80 ring-1 ring-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.15)]"
                        : "border-[#232733] focus:border-neutral-400 focus:ring-1 focus:ring-neutral-400"
                    }`}
                    placeholder="Enter exam pin"
                    autoFocus
                  />
                </div>

                <div>
                  <label htmlFor="candidate-full-name" className="sr-only">
                    Candidate Full Name
                  </label>
                  <input
                    id="candidate-full-name"
                    type="text"
                    name="name"
                    autoComplete="name"
                    aria-invalid={errorField === "name"}
                    onChange={() => {
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
                    autoComplete="email"
                    aria-invalid={errorField === "email"}
                    onChange={() => {
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

                {/* Auxiliary links row */}
                <div className="flex items-center justify-between text-xs sm:text-sm pt-1 px-1">
                  <label htmlFor="remember-candidate" className="flex items-center gap-2 cursor-pointer text-neutral-400 hover:text-neutral-300">
                    <input
                      id="remember-candidate"
                      type="checkbox"
                      name="rememberMe"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded-md border border-neutral-700 bg-[#0d0f14] text-white accent-white focus:ring-0 cursor-pointer"
                    />
                    <span>Remember session</span>
                  </label>
                  <Link
                    href="/practice"
                    prefetch={true}
                    className="text-neutral-300 hover:text-white transition font-medium flex items-center gap-1 focus-visible:underline"
                  >
                    <span>Practice Arena</span>
                    <svg className="w-3 h-3 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </Link>
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
                      <span>Verifying Exam PIN...</span>
                    </>
                  ) : (
                    <span>Verify PIN & Begin Exam</span>
                  )}
                </button>
              </form>
            </div>
          ) : (
            /* Mode 2: Staff Form */
            <div
              id="panel-staff"
              role="tabpanel"
              aria-labelledby="tab-staff"
            >
              {staffError && (
                <div
                  role="alert"
                  aria-live="assertive"
                  id="staff-error-msg"
                  className={`mb-5 p-3.5 sm:p-4 bg-gradient-to-r from-rose-950/60 to-[#18080c] border border-rose-500/40 text-rose-200 text-xs sm:text-sm rounded-2xl flex items-start gap-3 shadow-[0_4px_24px_rgba(244,63,94,0.18)] ${
                    shake ? "animate-shake" : ""
                  }`}
                >
                  <div className="w-5 h-5 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center shrink-0 mt-0.5">
                    <svg className="w-3.5 h-3.5 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0 pr-1">
                    <p className="font-semibold text-rose-300 text-xs tracking-wide uppercase mb-0.5">
                      Authentication Notice
                    </p>
                    <p className="text-rose-200/90 leading-relaxed font-normal">
                      {staffError}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setStaffError(null);
                      setErrorField(null);
                    }}
                    className="text-rose-400 hover:text-white p-1 rounded-lg transition shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-rose-400"
                    aria-label="Dismiss message"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
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
                <div>
                  <label htmlFor="staff-email" className="sr-only">
                    Staff Email Address
                  </label>
                  <input
                    id="staff-email"
                    type="email"
                    name="email"
                    autoComplete="username"
                    aria-invalid={errorField === "staffEmail"}
                    aria-describedby={staffError ? "staff-error-msg" : undefined}
                    onChange={() => {
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
                    autoComplete="current-password"
                    aria-invalid={errorField === "staffPassword"}
                    onChange={() => {
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
                      name="rememberMe"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
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

          {/* Footer action link */}
          <div className="text-center text-xs sm:text-sm text-neutral-400 mt-7 sm:mt-9">
            {mode === "candidate" ? (
              <span>
                Faculty or exam setter?{" "}
                <button
                  type="button"
                  onClick={() => switchMode("staff")}
                  className="text-[#00e599] font-semibold hover:underline cursor-pointer ml-1"
                >
                  Sign in to Staff Portal
                </button>
              </span>
            ) : (
              <span>
                Candidate taking an examination?{" "}
                <button
                  type="button"
                  onClick={() => switchMode("candidate")}
                  className="text-[#00e599] font-semibold hover:underline cursor-pointer ml-1"
                >
                  Enter with Exam PIN
                </button>
              </span>
            )}
          </div>
        </div>

        {/* Right Column: Visual Showcase Card (Desktop & large screens only) */}
        <div className="hidden lg:flex lg:col-span-7 xl:col-span-7 items-center justify-center w-full">
          <div className="relative w-full h-[500px] sm:h-[550px] lg:h-[600px] xl:h-[620px] rounded-[32px] sm:rounded-[36px] overflow-hidden bg-[#07080c] border border-[#1e222d] shadow-[0_20px_60px_rgba(0,0,0,0.85)] flex flex-col justify-end p-8 sm:p-10 lg:p-11 group">
            
            {/* Background Videos with Smooth Crossfade */}
            <div className="absolute inset-0 z-0 overflow-hidden bg-black pointer-events-none select-none">
              {CAROUSEL_SLIDES.map((slide, idx) => (
                <video
                  key={slide.video}
                  ref={(el) => {
                    videoRefs.current[idx] = el;
                  }}
                  src={slide.video}
                  autoPlay
                  loop
                  muted
                  playsInline
                  preload="metadata"
                  disablePictureInPicture
                  disableRemotePlayback
                  controlsList="nodownload nofullscreen noremoteplayback"
                  poster="/login-ribbon.jpg"
                  className={`absolute inset-0 w-full h-full object-cover object-center transition-all duration-1000 ease-in-out pointer-events-none select-none ${
                    activeSlide === idx
                      ? "opacity-100 scale-100"
                      : "opacity-0 scale-105"
                  }`}
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
    </main>
  );
}
