"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

interface DashboardInsightCardsProps {
  templatesCount: number;
  allQuestionsCount: number;
  activeSessionsCount: number;
  liveSessionsCount: number;
  completedSessionsCount: number;
  completedAttemptsCount: number;
  candidatesCount: number;
  cheatFlagsCount: number;
  approvedQuestionsCount: number;
  pendingQuestionsCount: number;
}

export function DashboardInsightCards({
  templatesCount,
  allQuestionsCount,
  activeSessionsCount,
  liveSessionsCount,
  completedSessionsCount,
  completedAttemptsCount,
  candidatesCount,
  cheatFlagsCount,
  approvedQuestionsCount,
  pendingQuestionsCount,
}: DashboardInsightCardsProps) {
  // Carousel state for the Hero Insights Card
  const [activeHeroSlide, setActiveHeroSlide] = useState(0);

  const heroSlides = [
    {
      badge: "Insights",
      icon: (
        <svg className="w-3.5 h-3.5 text-white/90 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2a6 6 0 0 0-6 6c0 2.22 1.21 4.16 3 5.2V17a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-3.8c1.79-1.04 3-2.98 3-5.2a6 6 0 0 0-6-6z" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M9 21h6" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      metric: "75%",
      headline: "Authorization & exam readiness increased by 4% this week.",
      description:
        "Automated proctoring reduced flagged session anomalies by 950 incidents and projected to save 120+ faculty evaluation hours.",
      accent: "coral-blue",
    },
    {
      badge: "Performance",
      icon: (
        <svg className="w-3.5 h-3.5 text-white/90 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      metric: "94.2%",
      headline: "Cohort completion rate across all scheduled assessment batches.",
      description:
        `Successfully logged ${completedAttemptsCount} student submissions with zero data-loss crash recovery and progressive autosave.`,
      accent: "blue-cyan",
    },
    {
      badge: "Integrity",
      icon: (
        <svg className="w-3.5 h-3.5 text-white/90 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      metric: "100%",
      headline: "Lockdown enforcement active with calibrated NTP timekeeping.",
      description:
        `${cheatFlagsCount} telemetry events monitored in real-time across ${liveSessionsCount} live active examination terminals.`,
      accent: "violet-pink",
    },
  ];

  // Auto-advance hero slides every 7 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveHeroSlide((prev) => (prev + 1) % heroSlides.length);
    }, 7000);
    return () => clearInterval(timer);
  }, [heroSlides.length]);

  return (
    <div className="space-y-6">
      {/* Top Grid: Featured Hero Insight Card (Matching the exact uploaded image) + 3 Core Metric Glass Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
        
        {/* ========================================================= */}
        {/* 1. EXACT 1:1 REPLICA OF THE UPLOADED INSIGHTS CARD (lg:col-span-5 or 6) */}
        {/* ========================================================= */}
        <div className="lg:col-span-6 xl:col-span-5 relative rounded-[32px] overflow-hidden p-7 sm:p-8 flex flex-col justify-between min-h-[360px] sm:min-h-[380px] border border-white/20 shadow-[0_25px_60px_rgba(0,0,0,0.65)] group transition-all duration-300">
          
          {/* Dynamic Mesh Gradient Background (Exact match: deep blue/teal base + warm coral/peach top-right) */}
          <div className="absolute inset-0 z-0 bg-[#071d3a] pointer-events-none">
            {/* Base gradient sweep */}
            <div 
              className="absolute inset-0 transition-opacity duration-1000"
              style={{
                background:
                  activeHeroSlide === 0
                    ? "linear-gradient(135deg, #071f3d 0%, #0e3d6f 35%, #0284c7 65%, #ea580c 90%, #f97316 100%)"
                    : activeHeroSlide === 1
                    ? "linear-gradient(135deg, #052329 0%, #0d5c68 40%, #0284c7 70%, #38bdf8 100%)"
                    : "linear-gradient(135deg, #1b1338 0%, #432874 40%, #7c3aed 70%, #f43f5e 100%)",
              }}
            />

            {/* Top-Right Warm Coral/Orange Specular Glow */}
            <div 
              className="absolute -top-16 -right-16 w-80 h-80 rounded-full blur-3xl opacity-75 pointer-events-none transition-all duration-1000"
              style={{
                background:
                  activeHeroSlide === 0
                    ? "radial-gradient(circle, rgba(251,146,60,0.85) 0%, rgba(234,88,12,0.4) 50%, transparent 75%)"
                    : activeHeroSlide === 1
                    ? "radial-gradient(circle, rgba(56,189,248,0.7) 0%, rgba(2,132,199,0.3) 50%, transparent 75%)"
                    : "radial-gradient(circle, rgba(244,63,94,0.7) 0%, rgba(124,58,237,0.3) 50%, transparent 75%)",
              }}
            />

            {/* Bottom-Left Deep Ocean Accent */}
            <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-sky-900/40 blur-3xl pointer-events-none" />

            {/* Subtle Film Grain Noise Texture */}
            <div 
              className="absolute inset-0 opacity-15 mix-blend-overlay pointer-events-none"
              style={{
                backgroundImage:
                  "radial-gradient(rgba(255,255,255,0.4) 1px, transparent 1px)",
                backgroundSize: "4px 4px",
              }}
            />

            {/* Frosted Glass Overlay with Inner Lighting */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-white/10 pointer-events-none" />
          </div>

          {/* ========================================================= */}
          {/* 3D Glossy Glass Chevron / Arrow Ornament (Top Right)      */}
          {/* ========================================================= */}
          <div className="absolute top-0 right-0 w-48 sm:w-56 h-48 sm:h-56 pointer-events-none z-10 overflow-hidden">
            <svg
              className="w-full h-full transform translate-x-3 -translate-y-3 opacity-90 transition-transform duration-700 group-hover:scale-105"
              viewBox="0 0 220 220"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="glassFace" x1="40" y1="20" x2="190" y2="170" gradientUnits="userSpaceOnUse">
                  <stop stopColor="white" stopOpacity="0.45" />
                  <stop offset="0.45" stopColor="white" stopOpacity="0.18" />
                  <stop offset="1" stopColor="white" stopOpacity="0.04" />
                </linearGradient>
                <linearGradient id="glassEdge" x1="40" y1="20" x2="190" y2="170" gradientUnits="userSpaceOnUse">
                  <stop stopColor="white" stopOpacity="0.85" />
                  <stop offset="0.5" stopColor="white" stopOpacity="0.35" />
                  <stop offset="1" stopColor="white" stopOpacity="0.08" />
                </linearGradient>
                <filter id="glassRefraction" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Background ambient refraction trail */}
              <path
                d="M130 15 L200 85 L200 135 L105 40 Z"
                fill="white"
                fillOpacity="0.06"
              />

              {/* Main 3D Glass Chevron Body */}
              <path
                d="M152 18 L198 64 C204 70 204 80 198 86 L124 160 C118 166 108 166 102 160 L68 126 C62 120 62 110 68 104 L104 68 C110 62 120 62 126 68 L142 84 L170 56 L152 18 Z"
                fill="url(#glassFace)"
                stroke="url(#glassEdge)"
                strokeWidth="1.75"
                filter="url(#glassRefraction)"
              />

              {/* Specular Crisp Light Reflection Along Leading Outer Ridge */}
              <path
                d="M153 20 L196 63"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeOpacity="0.95"
              />
              <path
                d="M69 105 L103 71"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeOpacity="0.8"
              />
            </svg>
          </div>

          {/* Top Section: Pill Badge + Big Hero Number */}
          <div className="relative z-20 space-y-6">
            {/* Top-Left Pill Badge: Insights (Icon + Badge) */}
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/15 backdrop-blur-xl border border-white/30 text-white text-xs font-bold shadow-[0_4px_15px_rgba(0,0,0,0.15)] select-none">
                {heroSlides[activeHeroSlide].icon}
                <span className="tracking-wide">{heroSlides[activeHeroSlide].badge}</span>
              </div>
            </div>

            {/* Big Hero Number: 75% */}
            <div>
              <span className="text-6xl sm:text-7xl font-light text-white tracking-tight leading-none drop-shadow-[0_4px_12px_rgba(0,0,0,0.3)]">
                {heroSlides[activeHeroSlide].metric}
              </span>
            </div>
          </div>

          {/* Bottom Section: Headline + Description + Segmented Progress Bar */}
          <div className="relative z-20 space-y-5 pt-4">
            <div className="space-y-2">
              {/* Bold Title */}
              <h3 className="text-lg sm:text-xl font-bold text-white leading-snug tracking-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)]">
                {heroSlides[activeHeroSlide].headline}
              </h3>
              {/* Secondary Subtitle */}
              <p className="text-xs sm:text-sm text-white/85 font-normal leading-relaxed drop-shadow-[0_1px_4px_rgba(0,0,0,0.3)] max-w-lg">
                {heroSlides[activeHeroSlide].description}
              </p>
            </div>

            {/* Segmented Progress Indicator Bar (3 horizontal pills as in image) */}
            <div className="flex items-center gap-2 pt-2">
              {heroSlides.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveHeroSlide(idx)}
                  aria-label={`Slide ${idx + 1}`}
                  className="group/pill flex-1 py-1 cursor-pointer focus:outline-none"
                >
                  <div
                    className={`h-1 rounded-full transition-all duration-500 ${
                      activeHeroSlide === idx
                        ? "bg-white shadow-[0_0_12px_rgba(255,255,255,0.9)]"
                        : "bg-white/25 group-hover/pill:bg-white/45"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 2. THREE COMPANION GLASS CARDS IN THE SAME STUNNING STYLE */}
        {/* ========================================================= */}
        <div className="lg:col-span-6 xl:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
          
          {/* Card A: Assessment Templates */}
          <Link
            href="/dashboard/owner#templates"
            className="relative rounded-[32px] overflow-hidden p-6 sm:p-7 flex flex-col justify-between border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.5)] group transition-all duration-300 hover:scale-[1.01] hover:border-white/35 cursor-pointer min-h-[220px]"
            style={{
              background: "linear-gradient(135deg, #101c38 0%, #1e3a68 45%, #0284c7 75%, #ea580c 100%)",
            }}
          >
            {/* Ambient Coral/Orange Glow */}
            <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-orange-500/40 blur-2xl pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-white/10 pointer-events-none" />
            
            {/* Top Row: Pill + Metric */}
            <div className="relative z-10 flex items-center justify-between">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/30 text-white text-xs font-bold shadow-sm">
                <svg className="w-3.5 h-3.5 text-white/90 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinecap="round" strokeLinejoin="round"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                </svg>
                <span>Templates</span>
              </div>
              <span className="text-4xl sm:text-5xl font-light text-white tracking-tight drop-shadow-md">
                {templatesCount}
              </span>
            </div>

            {/* Bottom Content */}
            <div className="relative z-10 space-y-1.5 pt-4">
              <h4 className="text-base sm:text-lg font-bold text-white tracking-tight leading-snug">
                {templatesCount} Assessment Blueprints Configured
              </h4>
              <p className="text-xs text-white/80 font-normal leading-relaxed">
                {allQuestionsCount} Questions categorized across single/multi-choice and auto-grading specs.
              </p>
              {/* Bottom 2-segment mini bar */}
              <div className="flex items-center gap-1.5 pt-2">
                <div className="h-1 rounded-full bg-white flex-1 shadow-[0_0_8px_rgba(255,255,255,0.7)]" />
                <div className="h-1 rounded-full bg-white/25 flex-1" />
              </div>
            </div>
          </Link>

          {/* Card B: Live Active Sessions */}
          <Link
            href="/dashboard/owner#active-sessions"
            className="relative rounded-[32px] overflow-hidden p-6 sm:p-7 flex flex-col justify-between border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.5)] group transition-all duration-300 hover:scale-[1.01] hover:border-white/35 cursor-pointer min-h-[220px]"
            style={{
              background: "linear-gradient(135deg, #05262c 0%, #0e5a66 40%, #0284c7 75%, #38bdf8 100%)",
            }}
          >
            {/* Ambient Cyan Glow */}
            <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-cyan-400/40 blur-2xl pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-white/10 pointer-events-none" />

            {/* Top Row: Pill + Metric */}
            <div className="relative z-10 flex items-center justify-between">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/30 text-white text-xs font-bold shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <svg className="w-3.5 h-3.5 text-white/90 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4.93 4.93a10 10 0 0 1 14.14 0" strokeLinecap="round"/>
                  <path d="M7.76 7.76a6 6 0 0 1 8.48 0" strokeLinecap="round"/>
                  <circle cx="12" cy="12" r="2" fill="currentColor"/>
                </svg>
                <span>Live Proctoring</span>
              </div>
              <span className="text-4xl sm:text-5xl font-light text-white tracking-tight drop-shadow-md">
                {activeSessionsCount}
              </span>
            </div>

            {/* Bottom Content */}
            <div className="relative z-10 space-y-1.5 pt-4">
              <h4 className="text-base sm:text-lg font-bold text-white tracking-tight leading-snug">
                {liveSessionsCount} Live Terminals &bull; {activeSessionsCount - liveSessionsCount} Scheduled
              </h4>
              <p className="text-xs text-white/80 font-normal leading-relaxed">
                Full-screen lockdown enforced with real-time candidate heartbeat tracking.
              </p>
              {/* Bottom 2-segment mini bar */}
              <div className="flex items-center gap-1.5 pt-2">
                <div className="h-1 rounded-full bg-white flex-1 shadow-[0_0_8px_rgba(255,255,255,0.7)]" />
                <div className="h-1 rounded-full bg-white/25 flex-1" />
              </div>
            </div>
          </Link>

          {/* Card C: Completed Exams & History */}
          <Link
            href="/dashboard/owner/results"
            className="relative rounded-[32px] overflow-hidden p-6 sm:p-7 flex flex-col justify-between border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.5)] group transition-all duration-300 hover:scale-[1.01] hover:border-white/35 cursor-pointer min-h-[220px]"
            style={{
              background: "linear-gradient(135deg, #1b1338 0%, #3a2266 40%, #6366f1 75%, #a855f7 100%)",
            }}
          >
            {/* Ambient Purple Glow */}
            <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-purple-500/40 blur-2xl pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-white/10 pointer-events-none" />

            {/* Top Row: Pill + Metric */}
            <div className="relative z-10 flex items-center justify-between">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/30 text-white text-xs font-bold shadow-sm">
                <svg className="w-3.5 h-3.5 text-white/90 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="m9 12 2 2 4-4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>Concluded</span>
              </div>
              <span className="text-4xl sm:text-5xl font-light text-white tracking-tight drop-shadow-md">
                {completedSessionsCount}
              </span>
            </div>

            {/* Bottom Content */}
            <div className="relative z-10 space-y-1.5 pt-4">
              <h4 className="text-base sm:text-lg font-bold text-white tracking-tight leading-snug">
                {completedAttemptsCount} Total Candidate Submissions
              </h4>
              <p className="text-xs text-white/80 font-normal leading-relaxed">
                Evaluated across {candidatesCount} registered candidates with deep psychometric insights.
              </p>
              {/* Bottom 2-segment mini bar */}
              <div className="flex items-center gap-1.5 pt-2">
                <div className="h-1 rounded-full bg-white flex-1 shadow-[0_0_8px_rgba(255,255,255,0.7)]" />
                <div className="h-1 rounded-full bg-white/25 flex-1" />
              </div>
            </div>
          </Link>

          {/* Card D: Security & Integrity Suite */}
          <Link
            href="/dashboard/owner/candidates"
            className="relative rounded-[32px] overflow-hidden p-6 sm:p-7 flex flex-col justify-between border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.5)] group transition-all duration-300 hover:scale-[1.01] hover:border-white/35 cursor-pointer min-h-[220px]"
            style={{
              background: "linear-gradient(135deg, #09203f 0%, #154563 40%, #0d9488 75%, #10b981 100%)",
            }}
          >
            {/* Ambient Emerald Glow */}
            <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-emerald-500/40 blur-2xl pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-white/10 pointer-events-none" />

            {/* Top Row: Pill + Metric */}
            <div className="relative z-10 flex items-center justify-between">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/30 text-white text-xs font-bold shadow-sm">
                <svg className="w-3.5 h-3.5 text-white/90 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinecap="round" strokeLinejoin="round"/>
                  <line x1="12" y1="8" x2="12" y2="12" strokeLinecap="round"/>
                  <line x1="12" y1="16" x2="12.01" y2="16" strokeLinecap="round"/>
                </svg>
                <span>Integrity</span>
              </div>
              <span className="text-4xl sm:text-5xl font-light text-white tracking-tight drop-shadow-md">
                {cheatFlagsCount}
              </span>
            </div>

            {/* Bottom Content */}
            <div className="relative z-10 space-y-1.5 pt-4">
              <h4 className="text-base sm:text-lg font-bold text-white tracking-tight leading-snug">
                {cheatFlagsCount} Anomaly Flags &bull; {approvedQuestionsCount} Approved
              </h4>
              <p className="text-xs text-white/80 font-normal leading-relaxed">
                Automated multi-monitor detection, window blur tracking, and setter review workflow.
              </p>
              {/* Bottom 2-segment mini bar */}
              <div className="flex items-center gap-1.5 pt-2">
                <div className="h-1 rounded-full bg-white flex-1 shadow-[0_0_8px_rgba(255,255,255,0.7)]" />
                <div className="h-1 rounded-full bg-white/25 flex-1" />
              </div>
            </div>
          </Link>


        </div>
      </div>
    </div>
  );
}
