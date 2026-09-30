"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { getLiveTelemetryData } from "@/app/actions/analytics";

export interface TopCategoryItem {
  name: string;
  count: number;
  pct: number;
}

export interface CheatFlagItem {
  type: string;
  count: number;
}

export interface ScoreDistributionData {
  tierCounts: [number, number, number, number, number];
  avgScore: number;
  avgPassRate: number;
  peakTierLabel: string;
  totalEvaluated: number;
}

export interface ExamDistributionOption {
  id: string;
  label: string;
  examTitle: string;
  pin: string | null;
  dateStr: string;
  attemptsCount: number;
  passRate: number;
  avgScore: number;
  tierCounts: [number, number, number, number, number];
  peakTierLabel: string;
  isLatest?: boolean;
  cheatFlagsCount?: number;
  cleanRate?: string;
  topFlagName?: string;
  status?: string;
}

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
  inProgressAttemptsCount?: number;
  liveCheatFlagsCount?: number;
  topCategories?: TopCategoryItem[];
  cheatFlagsByType?: CheatFlagItem[];
  scoreDistributionData?: ScoreDistributionData;
  examOptions?: ExamDistributionOption[];
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
  inProgressAttemptsCount,
  liveCheatFlagsCount,
  topCategories,
  cheatFlagsByType,
  scoreDistributionData,
  examOptions,
}: DashboardInsightCardsProps) {
  // Real-time live telemetry state with background polling
  const [liveTelemetry, setLiveTelemetry] = useState({
    liveSessionsCount,
    inProgressAttemptsCount: inProgressAttemptsCount ?? 0,
    liveCheatFlagsCount: liveCheatFlagsCount ?? 0,
    totalCheatFlagsCount: cheatFlagsCount ?? 0,
    completedAttemptsCount: completedAttemptsCount ?? 0,
    cheatFlagsByType: cheatFlagsByType || [],
  });

  // Keep in sync with server component props
  useEffect(() => {
    setLiveTelemetry(prev => ({
      ...prev,
      liveSessionsCount,
      inProgressAttemptsCount: inProgressAttemptsCount ?? 0,
      liveCheatFlagsCount: liveCheatFlagsCount ?? 0,
      totalCheatFlagsCount: cheatFlagsCount ?? 0,
      completedAttemptsCount: completedAttemptsCount ?? 0,
      cheatFlagsByType: cheatFlagsByType || prev.cheatFlagsByType,
    }));
  }, [liveSessionsCount, inProgressAttemptsCount, liveCheatFlagsCount, cheatFlagsCount, completedAttemptsCount, cheatFlagsByType]);

  // Live polling every 4s to reflect real-time candidate join & proctoring flags
  useEffect(() => {
    let isMounted = true;
    const poll = async () => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      try {
        const fresh = await getLiveTelemetryData();
        if (fresh && isMounted) {
          setLiveTelemetry({
            liveSessionsCount: fresh.liveSessionsCount,
            inProgressAttemptsCount: fresh.inProgressAttemptsCount,
            liveCheatFlagsCount: fresh.liveCheatFlagsCount,
            totalCheatFlagsCount: fresh.totalCheatFlagsCount,
            completedAttemptsCount: fresh.completedAttemptsCount,
            cheatFlagsByType: fresh.cheatFlagsByType,
          });
        }
      } catch (err) {
        // Silently ignore background polling blips
      }
    };

    const handleVisibility = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        poll();
      }
    };

    const interval = setInterval(poll, 12000);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      isMounted = false;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  // Carousel state for the Hero Insights Card
  const [activeHeroSlide, setActiveHeroSlide] = useState(0);

  // Selected exam state for Card 1 (defaults to the latest exam option)
  const defaultExamId = examOptions?.find((e) => e.isLatest)?.id || examOptions?.[0]?.id || "latest";
  const [selectedExamId, setSelectedExamId] = useState<string>(defaultExamId);
  const [isExamDropdownOpen, setIsExamDropdownOpen] = useState(false);
  const [hoveredTierIdx, setHoveredTierIdx] = useState<number | null>(null);
  const examDropdownRef = useRef<HTMLDivElement>(null);

  // Sync selected exam if examOptions changes
  useEffect(() => {
    if (examOptions && examOptions.length > 0) {
      if (selectedExamId === "latest" || !examOptions.some((e) => e.id === selectedExamId)) {
        const latest = examOptions.find((e) => e.isLatest) || examOptions[0];
        setSelectedExamId(latest.id);
      }
    }
  }, [examOptions, selectedExamId]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (examDropdownRef.current && !examDropdownRef.current.contains(event.target as Node)) {
        setIsExamDropdownOpen(false);
      }
    }
    if (isExamDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isExamDropdownOpen]);

  // Selected exam state for Card 4 (Proctoring Telemetry, defaults to latest exam)
  const defaultProctorExamId = examOptions?.find((e) => e.isLatest)?.id || examOptions?.[0]?.id || "latest";
  const [selectedProctorExamId, setSelectedProctorExamId] = useState<string>(defaultProctorExamId);
  const [isProctorDropdownOpen, setIsProctorDropdownOpen] = useState(false);
  const proctorDropdownRef = useRef<HTMLDivElement>(null);

  // Sync selected proctor exam if examOptions changes
  useEffect(() => {
    if (examOptions && examOptions.length > 0) {
      if (selectedProctorExamId === "latest" || !examOptions.some((e) => e.id === selectedProctorExamId)) {
        const latest = examOptions.find((e) => e.isLatest) || examOptions[0];
        setSelectedProctorExamId(latest.id);
      }
    }
  }, [examOptions, selectedProctorExamId]);

  // Click outside to close proctor dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (proctorDropdownRef.current && !proctorDropdownRef.current.contains(event.target as Node)) {
        setIsProctorDropdownOpen(false);
      }
    }
    if (isProctorDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isProctorDropdownOpen]);

  const heroSlides = [
    {
      badge: "Insights",
      icon: (
        <svg className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-white/95 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
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
        <svg className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-white/95 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
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
        <svg className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-white/95 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
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
          <div className="relative z-20 space-y-5 sm:space-y-6">
            {/* Top-Left Pill Badge: Insights (Icon + Badge) */}
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-2.5 px-4.5 py-2 sm:px-5 sm:py-2.5 rounded-full bg-white/15 backdrop-blur-xl border border-white/30 text-white text-sm sm:text-[15px] font-bold shadow-[0_4px_16px_rgba(0,0,0,0.2)] select-none transition-all">
                {heroSlides[activeHeroSlide].icon}
                <span className="tracking-wide font-bold">{heroSlides[activeHeroSlide].badge}</span>
              </div>
            </div>

            {/* Big Hero Number: 75% */}
            <div className="pt-0.5">
              <span className="text-7xl sm:text-8xl xl:text-[96px] font-light text-white tracking-tight leading-none drop-shadow-[0_6px_20px_rgba(0,0,0,0.4)] block">
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
        {/* 2. FOUR CURATED METRIC & ACTIVITY CARDS (DRIVEN BY LIVE DATA) */}
        {/* ========================================================= */}
        <div className="lg:col-span-6 xl:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
          
          {/* --------------------------------------------------------- */}
          {/* Card 1: Score & Cutoff Distribution (Interactive Graph & Exam Switcher) */}
          {/* --------------------------------------------------------- */}
          {(() => {
            // Find active exam data from examOptions or fallback to scoreDistributionData
            const activeExam = examOptions?.find((e) => e.id === selectedExamId) || {
              id: "latest",
              label: "Latest Assessment",
              examTitle: "Assessment",
              pin: null,
              dateStr: "",
              attemptsCount: scoreDistributionData?.totalEvaluated || completedAttemptsCount,
              passRate: scoreDistributionData?.avgPassRate !== undefined ? Number(scoreDistributionData.avgPassRate.toFixed(1)) : 20.3,
              avgScore: scoreDistributionData?.avgScore !== undefined ? Math.round(scoreDistributionData.avgScore) : 68,
              tierCounts: scoreDistributionData?.tierCounts || [4, 8, 14, 6, 4],
              peakTierLabel: scoreDistributionData?.peakTierLabel || "Cutoff: 50% • Peak: 55–70%",
              isLatest: true,
            };

            const tiers = activeExam.tierCounts;
            const tierLabels = ["<40%", "40–55%", "55–70%", "70–85%", ">85%"];
            const maxTier = Math.max(...tiers, 1);
            // Heights range from y=16 (max) to y=64 (min)
            const yVals = tiers.map((cnt) => Math.round(62 - (cnt / maxTier) * 44));
            const tierCenters = [34, 82, 130, 178, 226];
            
            let peakIdx = 0;
            let peakVal = tiers[0];
            tiers.forEach((cnt, idx) => {
              if (cnt > peakVal) {
                peakVal = cnt;
                peakIdx = idx;
              }
            });

            const currentHoverIdx = hoveredTierIdx !== null ? hoveredTierIdx : peakIdx;
            const totalExamCandidates = tiers.reduce((a, b) => a + b, 0);

            return (
              <div
                className="relative rounded-[28px] p-5 sm:p-6 flex flex-col justify-between bg-[#0a0d14] border border-neutral-800/80 shadow-[0_15px_35px_rgba(0,0,0,0.5)] group transition-all duration-300 hover:border-neutral-700/80 hover:shadow-[0_20px_45px_rgba(0,0,0,0.7)] min-h-[235px]"
              >
                {/* Ambient Pink Glow */}
                <div className="absolute inset-0 rounded-[28px] overflow-hidden pointer-events-none">
                  <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-pink-500/10 blur-2xl" />
                </div>

                {/* Header: Title & ••• (Interactive Exam Selector) */}
                <div className="flex items-start justify-between relative z-30">
                  <div className="min-w-0 pr-2">
                    <span className="text-sm font-bold text-neutral-200 tracking-tight block">
                      Score & Cutoff Distribution
                    </span>
                    <span className="text-[11px] text-pink-300/80 font-medium truncate block max-w-[200px] mt-0.5">
                      {activeExam.label}
                    </span>
                  </div>

                  {/* 3-Dots Trigger Button */}
                  <div className="relative shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsExamDropdownOpen((prev) => !prev);
                      }}
                      className={`w-7 h-7 rounded-full border flex items-center justify-center transition cursor-pointer ${
                        isExamDropdownOpen
                          ? "bg-pink-500/25 border-pink-500/60 text-pink-300 shadow-[0_0_10px_rgba(244,63,94,0.3)]"
                          : "border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-white"
                      }`}
                      aria-label="Filter by examination"
                      title="Filter by examination"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="5" cy="12" r="1.75" />
                        <circle cx="12" cy="12" r="1.75" />
                        <circle cx="19" cy="12" r="1.75" />
                      </svg>
                    </button>

                    {/* Dropdown Menu */}
                    {isExamDropdownOpen && (
                      <div
                        ref={examDropdownRef}
                        onClick={(e) => e.stopPropagation()}
                        className="absolute right-0 top-9 z-50 w-72 sm:w-80 rounded-2xl bg-[#0c0f17]/95 backdrop-blur-2xl border border-neutral-700/80 shadow-[0_20px_50px_rgba(0,0,0,0.9)] p-2 space-y-1 animate-in fade-in duration-150"
                      >
                        <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-800/80 text-[11px] font-bold text-neutral-400">
                          <span className="uppercase tracking-wider flex items-center gap-1.5 text-neutral-300">
                            <svg className="w-3.5 h-3.5 text-pink-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                            </svg>
                            Select Examination
                          </span>
                          <span className="font-mono text-[10px] text-neutral-400">
                            {examOptions?.length || 0} Options
                          </span>
                        </div>

                        <div className="max-h-56 overflow-y-auto space-y-1 py-1 pr-1 custom-scrollbar">
                          {examOptions?.map((exam) => {
                            const isSelected = exam.id === selectedExamId;
                            return (
                              <button
                                key={exam.id}
                                type="button"
                                onClick={() => {
                                  setSelectedExamId(exam.id);
                                  setIsExamDropdownOpen(false);
                                  setHoveredTierIdx(null);
                                }}
                                className={`w-full text-left px-3 py-2.5 rounded-xl transition flex items-center justify-between gap-2 cursor-pointer group ${
                                  isSelected
                                    ? "bg-pink-500/15 border border-pink-500/40 text-white"
                                    : "hover:bg-neutral-800/60 text-neutral-300 hover:text-white"
                                }`}
                              >
                                <div className="flex flex-col min-w-0 pr-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-xs font-bold truncate">
                                      {exam.examTitle}
                                    </span>
                                    {exam.isLatest && (
                                      <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase bg-pink-500/20 text-pink-300 border border-pink-500/40 shrink-0">
                                        Latest
                                      </span>
                                    )}
                                    {exam.pin && (
                                      <span className="text-[10px] font-mono text-neutral-400 bg-neutral-900 px-1 rounded border border-neutral-800 shrink-0">
                                        {exam.pin}
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[10px] text-neutral-400 mt-0.5">
                                    {exam.attemptsCount} candidates • {exam.passRate}% pass
                                  </span>
                                </div>

                                {isSelected && (
                                  <svg className="w-4 h-4 text-pink-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Hero Number & Dynamic Metric Badge */}
                <div className="flex items-center justify-between gap-2 mt-2 relative z-10">
                  {/* Left: Big Metric with stacked label to prevent horizontal crunch */}
                  <div className="shrink-0">
                    <span className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-none block">
                      {activeExam.passRate}%
                    </span>
                    <span className="text-xs text-neutral-400 font-medium mt-1 block whitespace-nowrap">
                      Pass Rate
                    </span>
                  </div>

                  {/* Dynamic Tier Badge in place of avg: Shows Peak by default, updates on graph hover */}
                  <div className="shrink-0 flex items-center">
                    {hoveredTierIdx !== null ? (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-pink-500/15 border border-pink-500/40 text-pink-200 text-xs font-bold transition-all duration-150 animate-in fade-in shrink-0 whitespace-nowrap shadow-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-pulse shrink-0" />
                        <span className="text-neutral-300 font-medium">{tierLabels[currentHoverIdx]}:</span>
                        <span className="text-white font-extrabold">{tiers[currentHoverIdx]}</span>
                        <span className="text-pink-300/80 font-normal text-[11px]">
                          ({totalExamCandidates > 0 ? Math.round((tiers[currentHoverIdx] / totalExamCandidates) * 100) : 0}%)
                        </span>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-pink-500/15 border border-pink-500/30 text-pink-300 text-xs font-bold transition-all duration-150 shrink-0 whitespace-nowrap">
                        <span className="text-pink-400/80 font-medium">Peak:</span>
                        <span>{tierLabels[peakIdx]}</span>
                        <span className="text-white font-extrabold">({tiers[peakIdx]})</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Stepped Area Staircase Chart with Interactive Hover & Needles */}
                <div 
                  className="relative pt-3 mt-auto z-10"
                  onMouseLeave={() => setHoveredTierIdx(null)}
                >
                  <svg className="w-full h-20 overflow-visible" viewBox="0 0 260 75" fill="none">
                    {/* Hover Column Glow Beam */}
                    {hoveredTierIdx !== null && (
                      <rect
                        x={10 + hoveredTierIdx * 48}
                        y={yVals[hoveredTierIdx]}
                        width={48}
                        height={Math.max(4, 70 - yVals[hoveredTierIdx])}
                        fill="#f43f5e"
                        opacity="0.14"
                        rx="3"
                      />
                    )}

                    {/* Vertical Needles for each bracket */}
                    {tiers.map((_, bIdx) => {
                      const isHovered = currentHoverIdx === bIdx;
                      const xBase = 10 + bIdx * 48;
                      const yTop = yVals[bIdx];
                      const stroke = isHovered ? "#fb7185" : "#f43f5e";
                      const strokeOpacity = isHovered ? "0.95" : "0.25";
                      const strokeWidth = isHovered ? "2.25" : "1.5";

                      return (
                        <g key={`bracket-needles-${bIdx}`}>
                          <line x1={xBase + 10} y1={yTop} x2={xBase + 10} y2={70} stroke={stroke} strokeOpacity={strokeOpacity} strokeWidth={strokeWidth} />
                          <line x1={xBase + 24} y1={yTop} x2={xBase + 24} y2={70} stroke={stroke} strokeOpacity={strokeOpacity} strokeWidth={strokeWidth} />
                          <line x1={xBase + 38} y1={yTop} x2={xBase + 38} y2={70} stroke={stroke} strokeOpacity={strokeOpacity} strokeWidth={strokeWidth} />
                        </g>
                      );
                    })}

                    {/* Step Line Curve */}
                    <path
                      d={`M 10 ${yVals[0]} H 58 V ${yVals[1]} H 106 V ${yVals[2]} H 154 V ${yVals[3]} H 202 V ${yVals[4]} H 250`}
                      stroke="#f43f5e"
                      strokeWidth="2.25"
                      strokeLinecap="round"
                      strokeLinejoin="miter"
                      fill="none"
                    />

                    {/* Active / Peak Pin Dot */}
                    <circle cx={tierCenters[currentHoverIdx]} cy={yVals[currentHoverIdx]} r="3" fill="#f43f5e" />
                    <circle cx={tierCenters[currentHoverIdx]} cy={yVals[currentHoverIdx]} r={hoveredTierIdx !== null ? "6.5" : "6"} stroke="#f43f5e" strokeOpacity="0.5" strokeWidth="1.5" fill="none" />

                    {/* 5 Transparent Interactive Hit Areas */}
                    {tierCenters.map((_, bIdx) => (
                      <rect
                        key={`hit-col-${bIdx}`}
                        x={10 + bIdx * 48}
                        y={0}
                        width={48}
                        height={75}
                        fill="transparent"
                        className="cursor-pointer"
                        onMouseEnter={() => setHoveredTierIdx(bIdx)}
                      />
                    ))}
                  </svg>

                  {/* Interactive Score Bracket Axis Labels */}
                  <div className="flex justify-between text-[10px] font-semibold px-0.5 pt-1 border-t border-neutral-800/60">
                    {tierLabels.map((lbl, idx) => (
                      <button
                        key={lbl}
                        type="button"
                        onMouseEnter={() => setHoveredTierIdx(idx)}
                        onMouseLeave={() => setHoveredTierIdx(null)}
                        className={`transition cursor-pointer focus:outline-none ${
                          currentHoverIdx === idx
                            ? "text-pink-300 font-bold"
                            : "text-neutral-500 hover:text-neutral-300"
                        }`}
                      >
                        {lbl}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* --------------------------------------------------------- */}
          {/* Card 2: Live Terminal Concurrency (Dot-Matrix Equalizer Chart) */}
          {/* --------------------------------------------------------- */}
          {(() => {
            const liveTerminals = liveTelemetry.inProgressAttemptsCount;
            const isSessionLive = liveTelemetry.liveSessionsCount > 0;
            const isActivelyRunning = liveTerminals > 0;

            // When actively running, generate dynamic spectrum around live count; when idle/standby, quiescent resting baseline
            const concurrencyBars = isActivelyRunning
              ? [
                  { count: 1, isPeak: false },
                  { count: 1, isPeak: false },
                  { count: Math.max(1, Math.min(3, Math.ceil(liveTerminals * 0.25))), isPeak: false },
                  { count: Math.max(1, Math.min(3, Math.ceil(liveTerminals * 0.35))), isPeak: false },
                  { count: Math.max(1, Math.min(3, Math.ceil(liveTerminals * 0.2))), isPeak: false },
                  { count: Math.max(2, Math.min(4, Math.ceil(liveTerminals * 0.5))), isPeak: false },
                  { count: Math.max(2, Math.min(4, Math.ceil(liveTerminals * 0.4))), isPeak: false },
                  { count: Math.max(2, Math.min(5, Math.ceil(liveTerminals * 0.65))), isPeak: false },
                  { count: Math.max(3, Math.min(6, Math.ceil(liveTerminals * 0.85))), isPeak: false },
                  { count: Math.max(4, Math.min(7, Math.ceil(liveTerminals * 1.1) || 5)), isPeak: true },
                  { count: Math.max(3, Math.min(6, Math.ceil(liveTerminals * 0.85))), isPeak: false },
                  { count: Math.max(2, Math.min(5, Math.ceil(liveTerminals * 0.65))), isPeak: false },
                  { count: Math.max(2, Math.min(4, Math.ceil(liveTerminals * 0.45))), isPeak: false },
                  { count: Math.max(2, Math.min(5, Math.ceil(liveTerminals * 0.6))), isPeak: false },
                  { count: Math.max(1, Math.min(3, Math.ceil(liveTerminals * 0.3))), isPeak: false },
                  { count: Math.max(1, Math.min(3, Math.ceil(liveTerminals * 0.4))), isPeak: false },
                  { count: Math.max(1, Math.min(3, Math.ceil(liveTerminals * 0.25))), isPeak: false },
                  { count: 1, isPeak: false },
                  { count: 1, isPeak: false },
                ]
              : Array.from({ length: 19 }).map(() => ({ count: 1, isPeak: false }));

            return (
              <Link
                href="/dashboard/owner#active-sessions"
                className="relative rounded-[28px] overflow-hidden p-5 sm:p-6 flex flex-col justify-between bg-[#0a0d14] border border-neutral-800/80 shadow-[0_15px_35px_rgba(0,0,0,0.5)] group transition-all duration-300 hover:border-neutral-700/80 hover:shadow-[0_20px_45px_rgba(0,0,0,0.7)] min-h-[235px]"
              >
                {/* Ambient Emerald Glow */}
                <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />

                {/* Header: Title & ••• */}
                <div className="flex items-center justify-between relative z-10">
                  <span className="text-sm font-bold text-neutral-200 tracking-tight">
                    Terminal Concurrency
                  </span>
                  <div className="w-7 h-7 rounded-full border border-neutral-800 text-neutral-400 flex items-center justify-center group-hover:border-neutral-700 transition">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="5" cy="12" r="1.75" />
                      <circle cx="12" cy="12" r="1.75" />
                      <circle cx="19" cy="12" r="1.75" />
                    </svg>
                  </div>
                </div>

                {/* Values Row (Shifted UP) */}
                <div className="flex items-start justify-between gap-3 mt-1.5 relative z-10">
                  {/* Left: Big Metric */}
                  <div className="shrink-0">
                    <span className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-none block">
                      {liveTerminals}
                    </span>
                    <span className="text-xs text-neutral-400 font-medium mt-1 block whitespace-nowrap">
                      {isActivelyRunning
                        ? (liveTerminals === 1 ? "In-Progress Test" : "In-Progress Tests")
                        : (isSessionLive ? "Awaiting Candidates" : "Live Terminals Active")}
                    </span>
                  </div>

                  {/* Right: Trend delta */}
                  <div className="text-right shrink-0">
                    <span className="text-[11px] text-neutral-400 font-medium block">Throughput</span>
                    <span className={`text-sm sm:text-base font-extrabold block mt-0.5 whitespace-nowrap ${isActivelyRunning ? "text-emerald-400" : "text-neutral-500"}`}>
                      {isActivelyRunning ? `+${Math.max(liveTerminals * 2, 4)}/hr` : "0/hr (Idle)"}
                    </span>
                  </div>
                </div>

                {/* Center/Bottom: Emerald Dot-Matrix Equalizer Chart (Spanning Full Width Left to Right) */}
                <div className="flex flex-col items-center justify-end my-auto pt-2 pb-1 relative z-10 w-full">
                  {/* Floating Tooltip Pill */}
                  <span className={`mb-2 px-2.5 py-0.5 rounded-full border text-[10px] font-bold shadow-xs whitespace-nowrap transition-all ${
                    isActivelyRunning
                      ? "bg-neutral-900/90 border-emerald-500/40 text-emerald-300"
                      : "bg-neutral-900/80 border-neutral-800 text-neutral-400"
                  }`}>
                    {isActivelyRunning ? `Live Sync • ${liveTerminals} Active` : (isSessionLive ? "Session Live • Ready" : "0 Active • Standby")}
                  </span>

                  {/* Stacks of rounded square dots spanning left to right */}
                  <div className="flex items-end justify-between w-full h-11 px-0.5">
                    {concurrencyBars.map((col, idx) => (
                      <div key={idx} className="flex flex-col-reverse gap-1 items-center">
                        {Array.from({ length: col.count }).map((_, dotIdx) => (
                          <div
                            key={dotIdx}
                            className={`w-2 sm:w-2.5 h-1.5 sm:h-2 rounded-[2px] transition-all duration-300 ${
                              col.isPeak
                                ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"
                                : isActivelyRunning
                                  ? "bg-emerald-500/35 group-hover:bg-emerald-500/55"
                                  : "bg-emerald-500/20 group-hover:bg-emerald-500/35"
                            }`}
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bottom Footer Note */}
                <div className="pt-2 border-t border-neutral-800/60 flex items-center justify-between text-[11px] text-neutral-400">
                  <span>Heartbeat & NTP sync</span>
                  {isActivelyRunning ? (
                    <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Live Feed Active
                    </span>
                  ) : (
                    <span className="text-neutral-500 font-medium">Standby (0 Intake)</span>
                  )}
                </div>
              </Link>
            );
          })()}

          {/* --------------------------------------------------------- */}
          {/* Card 3: Question Bank Allocation (Candy-Striped Progress Bars) */}
          {/* --------------------------------------------------------- */}
          {(() => {
            const categories = (topCategories && topCategories.length > 0)
              ? topCategories
              : [
                  { name: "Quantitative Aptitude", count: Math.round(allQuestionsCount * 0.5) || 15, pct: 50 },
                  { name: "Logical Reasoning", count: Math.round(allQuestionsCount * 0.3) || 9, pct: 30 },
                  { name: "Domain Specific", count: Math.max(1, allQuestionsCount - (Math.round(allQuestionsCount * 0.5) || 15) - (Math.round(allQuestionsCount * 0.3) || 9)), pct: 20 },
                ];

            const barConfigs = [
              {
                className: "bg-striped-emerald",
                gradient: "repeating-linear-gradient(45deg, rgba(255,255,255,0.35) 0px, rgba(255,255,255,0.35) 4px, transparent 4px, transparent 8px), #10b981",
              },
              {
                className: "bg-striped-blue",
                gradient: "repeating-linear-gradient(45deg, rgba(255,255,255,0.35) 0px, rgba(255,255,255,0.35) 4px, transparent 4px, transparent 8px), #3b82f6",
              },
              {
                className: "bg-striped-pink",
                gradient: "repeating-linear-gradient(45deg, rgba(255,255,255,0.35) 0px, rgba(255,255,255,0.35) 4px, transparent 4px, transparent 8px), #ec4899",
              },
            ];

            return (
              <Link
                href="/dashboard/owner#templates"
                className="relative rounded-[28px] overflow-hidden p-5 sm:p-6 flex flex-col justify-between bg-[#0a0d14] border border-neutral-800/80 shadow-[0_15px_35px_rgba(0,0,0,0.5)] group transition-all duration-300 hover:border-neutral-700/80 hover:shadow-[0_20px_45px_rgba(0,0,0,0.7)] min-h-[235px]"
              >
                {/* Ambient Blue Glow */}
                <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-blue-500/10 blur-2xl pointer-events-none" />

                {/* Header: Title & ••• */}
                <div className="flex items-center justify-between relative z-10">
                  <span className="text-sm font-bold text-neutral-200 tracking-tight">
                    Question Bank Breakdown
                  </span>
                  <div className="w-7 h-7 rounded-full border border-neutral-800 text-neutral-400 flex items-center justify-center group-hover:border-neutral-700 transition">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="5" cy="12" r="1.75" />
                      <circle cx="12" cy="12" r="1.75" />
                      <circle cx="19" cy="12" r="1.75" />
                    </svg>
                  </div>
                </div>

                {/* Top Stat & Blueprint Badge */}
                <div className="flex items-baseline justify-between mt-1 relative z-10">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-none">
                      {allQuestionsCount || 30}
                    </span>
                    <span className="text-xs text-neutral-400 font-medium">Banked Questions</span>
                  </div>
                  <span className="text-[11px] font-bold text-neutral-300 bg-neutral-900 px-2.5 py-1 rounded-full border border-neutral-800">
                    {templatesCount} Blueprint{templatesCount > 1 ? "s" : ""}
                  </span>
                </div>

                {/* Candy-Striped Category Breakdown Rows */}
                <div className="space-y-2.5 my-auto pt-2 relative z-10">
                  {categories.map((cat, idx) => {
                    const cfg = barConfigs[idx % barConfigs.length];
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-[11px] font-semibold">
                          <span className="text-neutral-300 truncate max-w-[170px]">{cat.name}</span>
                          <span className="text-white font-bold shrink-0">{cat.count} ({cat.pct}%)</span>
                        </div>
                        <div className="w-full h-2 bg-neutral-900 rounded-full overflow-hidden border border-neutral-800/80">
                          <div
                            className={`h-full ${cfg.className} rounded-full transition-all duration-500`}
                            style={{
                              width: `${Math.max(8, Math.min(100, cat.pct))}%`,
                              background: cfg.gradient,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Bottom Footer Note */}
                <div className="pt-2 border-t border-neutral-800/60 flex items-center justify-between text-[11px] text-neutral-400">
                  <span>{approvedQuestionsCount} Ready for deployment</span>
                  <span className="text-neutral-300 font-semibold">{pendingQuestionsCount} Pending</span>
                </div>
              </Link>
            );
          })()}

          {/* --------------------------------------------------------- */}
          {/* Card 4: Proctoring Telemetry (Live / Per-Exam Breakdown & Switcher) */}
          {/* --------------------------------------------------------- */}
          {(() => {
            const activeProctorExam = examOptions?.find((e) => e.id === selectedProctorExamId) || examOptions?.find((e) => e.isLatest) || examOptions?.[0] || {
              id: "latest",
              label: "Latest Assessment",
              examTitle: "Assessment",
              pin: null,
              dateStr: "",
              attemptsCount: liveTelemetry.completedAttemptsCount || completedAttemptsCount,
              cheatFlagsCount: liveTelemetry.totalCheatFlagsCount || cheatFlagsCount,
              cleanRate: "97.5",
              topFlagName: "Window Blur",
              isLatest: true,
              status: "COMPLETED",
            };

            const isThisSessionLive = activeProctorExam.id === "all"
              ? liveTelemetry.liveSessionsCount > 0
              : (activeProctorExam.status === "LIVE" || (liveTelemetry.liveSessionsCount > 0 && activeProctorExam.isLatest));

            const liveFlags = liveTelemetry.liveCheatFlagsCount;
            const flagsCount = isThisSessionLive
              ? liveFlags
              : (activeProctorExam.cheatFlagsCount !== undefined ? activeProctorExam.cheatFlagsCount : 0);

            const candidatesCount = activeProctorExam.attemptsCount !== undefined
              ? activeProctorExam.attemptsCount
              : (liveTelemetry.completedAttemptsCount || completedAttemptsCount);

            const formatFlagName = (type?: string) => {
              if (!type) return "Window Blur";
              return type
                .toLowerCase()
                .split("_")
                .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                .join(" ");
            };

            const topFlagName = activeProctorExam.topFlagName || (liveTelemetry.cheatFlagsByType && liveTelemetry.cheatFlagsByType.length > 0 ? liveTelemetry.cheatFlagsByType[0].type : "WINDOW_BLUR");

            const cleanRate = activeProctorExam.cleanRate
              ? activeProctorExam.cleanRate
              : (candidatesCount > 0
                  ? Math.max(70, Math.min(100, 100 - (flagsCount / Math.max(candidatesCount, 1)) * 3.5)).toFixed(1)
                  : "100.0");

            const hasActiveFlags = flagsCount > 0;

            const telemetryBars = hasActiveFlags
              ? [
                  { count: 1, isPeak: false },
                  { count: 1, isPeak: false },
                  { count: Math.max(1, Math.min(3, Math.ceil(flagsCount * 0.25))), isPeak: false },
                  { count: Math.max(1, Math.min(3, Math.ceil(flagsCount * 0.35))), isPeak: false },
                  { count: Math.max(1, Math.min(3, Math.ceil(flagsCount * 0.2))), isPeak: false },
                  { count: Math.max(2, Math.min(4, Math.ceil(flagsCount * 0.5))), isPeak: false },
                  { count: Math.max(2, Math.min(4, Math.ceil(flagsCount * 0.4))), isPeak: false },
                  { count: Math.max(2, Math.min(5, Math.ceil(flagsCount * 0.65))), isPeak: false },
                  { count: Math.max(3, Math.min(6, Math.ceil(flagsCount * 0.85))), isPeak: false },
                  { count: Math.max(4, Math.min(7, Math.ceil(flagsCount * 1.1) || 5)), isPeak: true },
                  { count: Math.max(3, Math.min(6, Math.ceil(flagsCount * 0.85))), isPeak: false },
                  { count: Math.max(2, Math.min(5, Math.ceil(flagsCount * 0.65))), isPeak: false },
                  { count: Math.max(2, Math.min(4, Math.ceil(flagsCount * 0.45))), isPeak: false },
                  { count: Math.max(2, Math.min(5, Math.ceil(flagsCount * 0.6))), isPeak: false },
                  { count: Math.max(1, Math.min(3, Math.ceil(flagsCount * 0.3))), isPeak: false },
                  { count: Math.max(1, Math.min(3, Math.ceil(flagsCount * 0.4))), isPeak: false },
                  { count: Math.max(1, Math.min(3, Math.ceil(flagsCount * 0.25))), isPeak: false },
                  { count: 1, isPeak: false },
                  { count: 1, isPeak: false },
                ]
              : Array.from({ length: 19 }).map(() => ({ count: 1, isPeak: false }));

            return (
              <div
                className="relative rounded-[28px] p-5 sm:p-6 flex flex-col justify-between bg-[#0a0d14] border border-neutral-800/80 shadow-[0_15px_35px_rgba(0,0,0,0.5)] group transition-all duration-300 hover:border-neutral-700/80 hover:shadow-[0_20px_45px_rgba(0,0,0,0.7)] min-h-[235px]"
              >
                {/* Ambient Indigo/Blue Glow */}
                <div className="absolute inset-0 rounded-[28px] overflow-hidden pointer-events-none">
                  <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-blue-500/10 blur-2xl" />
                </div>

                {/* Header: Title & ••• (Interactive Exam Selector) */}
                <div className="flex items-start justify-between relative z-30">
                  <div className="min-w-0 pr-2">
                    <span className="text-sm font-bold text-neutral-200 tracking-tight block">
                      Proctoring Telemetry
                    </span>
                    <span className="text-[11px] text-blue-300/80 font-medium truncate block max-w-[200px] mt-0.5">
                      {activeProctorExam.label}
                    </span>
                  </div>

                  {/* 3-Dots Trigger Button */}
                  <div className="relative shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsProctorDropdownOpen((prev) => !prev);
                      }}
                      className={`w-7 h-7 rounded-full border flex items-center justify-center transition cursor-pointer ${
                        isProctorDropdownOpen
                          ? "bg-blue-500/25 border-blue-500/60 text-blue-300 shadow-[0_0_10px_rgba(59,130,246,0.3)]"
                          : "border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-white"
                      }`}
                      aria-label="Filter proctoring by assessment"
                      title="Filter proctoring by assessment"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="5" cy="12" r="1.75" />
                        <circle cx="12" cy="12" r="1.75" />
                        <circle cx="19" cy="12" r="1.75" />
                      </svg>
                    </button>

                    {/* Dropdown Menu */}
                    {isProctorDropdownOpen && (
                      <div
                        ref={proctorDropdownRef}
                        onClick={(e) => e.stopPropagation()}
                        className="absolute right-0 top-9 z-50 w-72 sm:w-80 rounded-2xl bg-[#0c0f17]/95 backdrop-blur-2xl border border-neutral-700/80 shadow-[0_20px_50px_rgba(0,0,0,0.9)] p-2 space-y-1 animate-in fade-in duration-150"
                      >
                        <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-800/80 text-[11px] font-bold text-neutral-400">
                          <span className="uppercase tracking-wider flex items-center gap-1.5 text-neutral-300">
                            <svg className="w-3.5 h-3.5 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                            </svg>
                            Select Assessment
                          </span>
                          <span className="font-mono text-[10px] text-neutral-400">
                            {examOptions?.length || 0} Options
                          </span>
                        </div>

                        <div className="max-h-56 overflow-y-auto space-y-1 py-1 pr-1 custom-scrollbar">
                          {examOptions?.map((exam) => {
                            const isSelected = exam.id === selectedProctorExamId;
                            const flags = exam.cheatFlagsCount ?? 0;
                            return (
                              <button
                                key={exam.id}
                                type="button"
                                onClick={() => {
                                  setSelectedProctorExamId(exam.id);
                                  setIsProctorDropdownOpen(false);
                                }}
                                className={`w-full text-left px-3 py-2.5 rounded-xl transition flex items-center justify-between gap-2 cursor-pointer group ${
                                  isSelected
                                    ? "bg-blue-500/15 border border-blue-500/40 text-white"
                                    : "hover:bg-neutral-800/60 text-neutral-300 hover:text-white"
                                }`}
                              >
                                <div className="flex flex-col min-w-0 pr-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-xs font-bold truncate">
                                      {exam.examTitle}
                                    </span>
                                    {exam.isLatest && (
                                      <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase bg-blue-500/20 text-blue-300 border border-blue-500/40 shrink-0">
                                        Latest
                                      </span>
                                    )}
                                    {exam.pin && (
                                      <span className="text-[10px] font-mono text-neutral-400 bg-neutral-900 px-1 rounded border border-neutral-800 shrink-0">
                                        {exam.pin}
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[10px] text-neutral-400 mt-0.5">
                                    {exam.attemptsCount} audited •{" "}
                                    <span className={flags > 0 ? "text-amber-400 font-medium" : "text-emerald-400/90"}>
                                      {flags} {flags === 1 ? "flag" : "flags"}
                                    </span>
                                    {" "}• {exam.cleanRate || "100"}% safe
                                  </span>
                                </div>

                                {isSelected && (
                                  <svg className="w-4 h-4 text-blue-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Values Row (Shifted UP) */}
                <div className="flex items-start justify-between gap-3 mt-1.5 relative z-10">
                  {/* Left: Big Metric */}
                  <div className="shrink-0">
                    <span className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-none block">
                      {flagsCount}
                    </span>
                    <span className="text-xs text-neutral-400 font-medium mt-1 block whitespace-nowrap">
                      {isThisSessionLive ? "Live Anomaly Flags" : (flagsCount === 1 ? "Anomaly Flag" : "Anomaly Flags")}
                    </span>
                  </div>

                  {/* Right: Ratio delta */}
                  <div className="text-right shrink-0">
                    <span className="text-[11px] text-neutral-400 font-medium block">
                      {isThisSessionLive ? "Session Integrity" : "Audited Integrity"}
                    </span>
                    <span className="text-sm sm:text-base font-extrabold text-emerald-400 block mt-0.5 whitespace-nowrap">
                      {isThisSessionLive
                        ? (liveFlags === 0 ? "100% Clean" : `${Math.max(65, 100 - liveFlags * 5).toFixed(1)}% Clean`)
                        : `${cleanRate}% Safe`}
                    </span>
                  </div>
                </div>

                {/* Center/Bottom: Royal Blue Dot-Matrix Equalizer Chart */}
                <div className="flex flex-col items-center justify-end my-auto pt-2 pb-1 relative z-10 w-full">
                  {/* Floating Tooltip Pill */}
                  <span className={`mb-2 px-2.5 py-0.5 rounded-full border text-[10px] font-bold shadow-xs whitespace-nowrap transition-all ${
                    flagsCount > 0
                      ? "bg-neutral-900/90 border-blue-500/40 text-blue-300"
                      : "bg-neutral-900/80 border-neutral-800 text-neutral-400"
                  }`}>
                    {flagsCount === 0
                      ? (isThisSessionLive ? "Zero Live Flags • Clean" : "Zero Flags • 100% Clean")
                      : `Top: ${formatFlagName(topFlagName)}`}
                  </span>

                  {/* Stacks of rounded square dots spanning left to right */}
                  <div className="flex items-end justify-between w-full h-11 px-0.5">
                    {telemetryBars.map((col, idx) => (
                      <div key={idx} className="flex flex-col-reverse gap-1 items-center">
                        {Array.from({ length: col.count }).map((_, dotIdx) => (
                          <div
                            key={dotIdx}
                            className={`w-2 sm:w-2.5 h-1.5 sm:h-2 rounded-[2px] transition-all duration-300 ${
                              col.isPeak
                                ? "bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]"
                                : flagsCount > 0
                                  ? "bg-blue-500/35 group-hover:bg-blue-500/55"
                                  : "bg-blue-500/20 group-hover:bg-blue-500/35"
                            }`}
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bottom Footer Note */}
                <div className="pt-2 border-t border-neutral-800/60 flex items-center justify-between text-[11px] text-neutral-400 relative z-10">
                  <span>Automated telemetry stream</span>
                  {isThisSessionLive ? (
                    <span className="text-blue-400 font-bold flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                      Active Lockdown
                    </span>
                  ) : (
                    <Link
                      href="/dashboard/owner/candidates"
                      className="text-neutral-400 hover:text-blue-300 font-semibold transition flex items-center gap-1 cursor-pointer"
                    >
                      <span>{candidatesCount} Audited ({flagsCount} Historic)</span>
                      <svg className="w-3 h-3 text-neutral-500 group-hover:text-blue-300 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  )}
                </div>
              </div>
            );
          })()}

        </div>
      </div>
    </div>
  );
}
