"use client";

import React from "react";
import Link from "next/link";

interface ExecutiveHeroOverviewProps {
  userName?: string;
  liveSessionsCount: number;
  activeCandidatesCount: number;
  totalCheatFlagsCount: number;
  totalCandidatesCount: number;
  totalUsersCount: number;
  allQuestionsCount: number;
  templatesCount: number;
  totalCompletedAttemptsCount: number;
  onOpenLiveView?: () => void;
}

export function ExecutiveHeroOverview({
  userName = "Aarav",
  liveSessionsCount,
  activeCandidatesCount,
  totalCheatFlagsCount,
  totalCandidatesCount,
  totalUsersCount,
  allQuestionsCount,
  templatesCount,
  totalCompletedAttemptsCount,
}: ExecutiveHeroOverviewProps) {
  // Format today's date in style: WEDNESDAY, 17 JUNE
  const todayFormatted = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })
    .format(new Date())
    .toUpperCase();

  const handleScrollToLive = (e: React.MouseEvent) => {
    e.preventDefault();
    const liveSection = document.getElementById("active-sessions");
    if (liveSection) {
      liveSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top 2-Column Grid: Welcome Card (left) & 2x2 Stats Grid (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Left Hero Card (~58% width / col-span-7) */}
        <div className="lg:col-span-7 relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#071329] via-[#0b1b3a] to-[#040814] border border-[#1b2f56] p-7 sm:p-9 shadow-2xl flex flex-col justify-between min-h-[340px]">
          {/* Subtle Abstract Geometric Shapes Background */}
          <div className="absolute top-0 right-0 w-80 h-80 pointer-events-none opacity-40">
            <svg viewBox="0 0 300 300" fill="none" className="w-full h-full">
              <circle cx="200" cy="100" r="90" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="6 6" />
              <circle cx="230" cy="180" r="110" fill="url(#hero-radial)" fillOpacity="0.4" />
              <line x1="80" y1="20" x2="260" y2="240" stroke="#60a5fa" strokeWidth="1" opacity="0.3" />
              <defs>
                <radialGradient id="hero-radial" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(230 180) rotate(90) scale(110)">
                  <stop stopColor="#2563eb" />
                  <stop offset="1" stopColor="#0c1833" stopOpacity="0" />
                </radialGradient>
              </defs>
            </svg>
          </div>

          {/* Top Row: Date & Plan Tag */}
          <div className="relative z-10 flex items-center justify-between">
            <span className="text-[11px] font-extrabold tracking-widest text-[#93c5fd] uppercase">
              {todayFormatted}
            </span>
            <span className="px-3.5 py-1 rounded-full text-xs font-semibold bg-white/10 text-white/90 border border-white/15 backdrop-blur-md">
              Enterprise plan
            </span>
          </div>

          {/* Middle: Welcome Message */}
          <div className="relative z-10 my-6">
            <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-black text-white tracking-tight leading-tight">
              Welcome, {userName}
            </h1>
            <p className="text-sm sm:text-base text-neutral-300 font-medium mt-2 max-w-lg leading-relaxed">
              Your examination operations are healthy and ready for today&apos;s candidate traffic.
            </p>
          </div>

          {/* Bottom Floating White Card */}
          <div className="relative z-10 bg-white/95 text-neutral-900 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
            <div>
              <p className="font-extrabold text-sm sm:text-base text-neutral-900">
                {liveSessionsCount} {liveSessionsCount === 1 ? "assessment is" : "assessments are"} currently live
              </p>
              <p className="text-xs text-neutral-600 font-medium mt-0.5">
                {activeCandidatesCount || totalCandidatesCount} candidates connected · {totalCheatFlagsCount} signals under review
              </p>
            </div>
            <button
              onClick={handleScrollToLive}
              type="button"
              className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 bg-black hover:bg-neutral-800 text-white text-xs font-bold rounded-xl transition cursor-pointer self-start sm:self-auto shrink-0 shadow-sm"
            >
              <span>Open live view</span>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </div>
        </div>

        {/* Right 2x2 Stats Grid (~42% width / col-span-5) */}
        <div className="lg:col-span-5 grid grid-cols-2 gap-4">
          
          {/* Card 1: Active candidates */}
          <div className="bg-[#0b0c10] border border-neutral-800/80 rounded-2xl p-5 flex flex-col justify-between hover:border-neutral-700 transition">
            <span className="text-xs font-semibold text-neutral-400">Active candidates</span>
            <div className="my-2">
              <span className="text-3xl sm:text-4xl font-black text-white tracking-tight block">
                {activeCandidatesCount || totalCandidatesCount || 400}
              </span>
              <span className="text-xs text-neutral-500 font-medium mt-1 block">
                of {totalUsersCount || 520} seats
              </span>
            </div>
          </div>

          {/* Card 2: Assessments left */}
          <div className="bg-[#0b0c10] border border-neutral-800/80 rounded-2xl p-5 flex flex-col justify-between hover:border-neutral-700 transition">
            <span className="text-xs font-semibold text-neutral-400">Assessments left</span>
            <div className="my-2">
              <span className="text-3xl sm:text-4xl font-black text-white tracking-tight block">
                128
              </span>
              <span className="text-xs text-neutral-500 font-medium mt-1 block">
                this month
              </span>
            </div>
          </div>

          {/* Card 3: Proctoring hours */}
          <div className="bg-[#0b0c10] border border-neutral-800/80 rounded-2xl p-5 flex flex-col justify-between hover:border-neutral-700 transition">
            <span className="text-xs font-semibold text-neutral-400">Proctoring hours</span>
            <div className="my-2">
              <span className="text-3xl sm:text-4xl font-black text-white tracking-tight block">
                842
              </span>
              <span className="text-xs text-neutral-500 font-medium mt-1 block">
                of 1,000 hours
              </span>
            </div>
          </div>

          {/* Card 4: Question credits */}
          <div className="bg-[#0b0c10] border border-neutral-800/80 rounded-2xl p-5 flex flex-col justify-between hover:border-neutral-700 transition">
            <span className="text-xs font-semibold text-neutral-400">Question credits</span>
            <div className="my-2">
              <span className="text-3xl sm:text-4xl font-black text-white tracking-tight block">
                {(allQuestionsCount * 15 || 9574).toLocaleString()}
              </span>
              <span className="text-xs text-neutral-500 font-medium mt-1 block">
                available
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* Bottom Horizontal Strip: 6 Compact Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        
        {/* Metric 1: Assessments created */}
        <div className="bg-[#0b0c10] border border-neutral-800/80 rounded-2xl p-4 flex flex-col justify-between hover:border-neutral-700 transition">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs font-semibold truncate pr-1">Assessments created</span>
            <svg className="w-3.5 h-3.5 text-neutral-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <span className="text-2xl font-black text-white mt-2 block tracking-tight">
            {templatesCount}
          </span>
        </div>

        {/* Metric 2: Candidates invited */}
        <div className="bg-[#0b0c10] border border-neutral-800/80 rounded-2xl p-4 flex flex-col justify-between hover:border-neutral-700 transition">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs font-semibold truncate pr-1">Candidates invited</span>
            <svg className="w-3.5 h-3.5 text-neutral-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <span className="text-2xl font-black text-white mt-2 block tracking-tight">
            {totalCandidatesCount.toLocaleString()}
          </span>
        </div>

        {/* Metric 3: Questions authored */}
        <div className="bg-[#0b0c10] border border-neutral-800/80 rounded-2xl p-4 flex flex-col justify-between hover:border-neutral-700 transition">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs font-semibold truncate pr-1">Questions authored</span>
            <svg className="w-3.5 h-3.5 text-neutral-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <span className="text-2xl font-black text-white mt-2 block tracking-tight">
            {allQuestionsCount.toLocaleString()}
          </span>
        </div>

        {/* Metric 4: Sessions live */}
        <div className="bg-[#0b0c10] border border-neutral-800/80 rounded-2xl p-4 flex flex-col justify-between hover:border-neutral-700 transition">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs font-semibold truncate pr-1">Sessions live</span>
            <svg className="w-3.5 h-3.5 text-neutral-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.828a5 5 0 010-7.072m7.072 0a5 5 0 010 7.072M13 12a1 1 0 11-2 0 1 1 0 012 0z" />
            </svg>
          </div>
          <span className="text-2xl font-black text-white mt-2 block tracking-tight">
            {String(liveSessionsCount).padStart(2, "0")}
          </span>
        </div>

        {/* Metric 5: Integrity reviews */}
        <div className="bg-[#0b0c10] border border-neutral-800/80 rounded-2xl p-4 flex flex-col justify-between hover:border-neutral-700 transition">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs font-semibold truncate pr-1">Integrity reviews</span>
            <svg className="w-3.5 h-3.5 text-neutral-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <span className="text-2xl font-black text-white mt-2 block tracking-tight">
            {String(totalCheatFlagsCount).padStart(2, "0")}
          </span>
        </div>

        {/* Metric 6: Reports generated */}
        <div className="bg-[#0b0c10] border border-neutral-800/80 rounded-2xl p-4 flex flex-col justify-between hover:border-neutral-700 transition">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs font-semibold truncate pr-1">Reports generated</span>
            <svg className="w-3.5 h-3.5 text-neutral-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <span className="text-2xl font-black text-white mt-2 block tracking-tight">
            {totalCompletedAttemptsCount}
          </span>
        </div>

      </div>
    </div>
  );
}
